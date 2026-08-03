import {
  sanitizeAiNotes,
  sanitizeAiOrder,
  sanitizeLunchPlan,
  sanitizePlanExtras,
  type AiPlanRequest,
} from "@/lib/planner/aiPlan";
import { visitCapacity } from "@/lib/planner/capacity";
import type { AiPlanErrorCode } from "@/lib/planner/aiErrors";
import { guardRequest } from "@/lib/server/osm";

function classifyGeminiFailure(
  status: number | undefined,
  detail: string,
): { code: AiPlanErrorCode; error: string; httpStatus: number } {
  const text = detail.toLowerCase();
  if (
    status === 429 ||
    /resource_exhausted|credits|quota|billing|prepayment/.test(text)
  ) {
    return {
      code: "quota",
      error: "Gemini credits are depleted or quota exceeded",
      httpStatus: 429,
    };
  }
  if (
    status === 404 ||
    /no longer available|not found|not_found/.test(text)
  ) {
    return {
      code: "model",
      error: "Gemini model unavailable. Set GEMINI_MODEL to a current Flash model.",
      httpStatus: 502,
    };
  }
  return {
    code: "failed",
    error: "AI provider failed",
    httpStatus: 502,
  };
}

/**
 * One preferred model per request. On 404 only, try a short fallback list
 * so a retired model id does not burn extra successful Gemini calls.
 */
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MODEL_CANDIDATES = [
  PRIMARY_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
].filter((value, index, all): value is string =>
  Boolean(value && all.indexOf(value) === index),
);

export async function GET() {
  return Response.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: MODEL_CANDIDATES[0],
    models: MODEL_CANDIDATES,
    provider: "google-gemini",
  });
}

export async function POST(request: Request) {
  const limited = guardRequest(request);
  if (limited) return limited;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "AI planning is not configured. Add GEMINI_API_KEY to .env.local.",
        errorCode: "not_configured" satisfies AiPlanErrorCode,
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as AiPlanRequest;
    if (!body.venueName || !Array.isArray(body.attractions) || !body.prefs) {
      return Response.json({ error: "Invalid plan request" }, { status: 400 });
    }

    const attractions = body.attractions.slice(0, 60);
    const validIds = new Set(attractions.map((a) => a.id));
    const { minStops, maxStops } = visitCapacity(body.prefs);

    const restaurantIds = attractions
      .filter((a) => a.placeKind === "restaurant")
      .map((a) => a.id);

    const isCity = body.venueKind === "city";
    const prompt = [
      isCity
        ? "You are an expert city sightseeing planner for walking-friendly day itineraries."
        : "You are an expert theme-park / museum visit planner.",
      "Create an optimized visit plan for the guest using ONLY the provided stop ids.",
      "Do not invent stop ids.",
      isCity
        ? "Prefer iconic landmarks and museums early when opening hours allow; cluster by neighbourhood to cut walking."
        : "Prefer rope-drop / high-demand attractions early when useful.",
      "Cluster nearby stops to reduce walking.",
      "Respect party type (kids/mixed/adults), pace, and must-see ids.",
      isCity
        ? "Main stops should focus on exhibits, landmarks, viewpoints, and parks. Restaurants are mainly for lunch choice."
        : "Main stops should focus on rides/shows/exhibits. Restaurants are mainly for lunch choice.",
      "Prefer a full day: include enough main stops to fill the visit hours.",
      "You may omit low-value shops/services, but do not leave large empty gaps in the afternoon.",
      "Include every must-see id. Keep the main stop list between the min and max stop counts.",
      "Also choose the best lunch: after which attraction, which restaurant id (if any from the list), label, and tip.",
      isCity
        ? "Also suggest up to 5 sideVisits worth seeing aside from the main plan (viewpoints, shops, food spots, parks) using provided ids when possible."
        : "Also suggest up to 5 sideVisits worth seeing aside from the main plan (shops, viewpoints, exhibits, food spots) using provided ids when possible.",
      "For each main stop, add guest-facing requirements and an optional tip.",
      "Requirements must prefer facts from the provided fields (minHeight, openingHours, accessNote, description).",
      "Never invent hard safety rules like minimum height if minHeight is missing.",
      "Return JSON only with this shape:",
      '{"summary":"short day strategy","stops":[{"id":"exact-id","reason":"brief why","requirements":["short fact"],"tip":"optional one line"}],"lunch":{"afterAttractionId":"exact-id","restaurantId":"exact-restaurant-id-or-omit","label":"Lunch spot name","tip":"why this time/place"},"sideVisits":[{"attractionId":"optional-id","title":"short name","tip":"why worth a look"}]}',
      "",
      `Venue: ${body.venueName} (${body.venueKind})`,
      `Days: ${body.prefs.dayCount}, hours/day: ${body.prefs.hoursPerDay}, start hour: ${body.prefs.startHour}`,
      `Day ends around hour: ${body.prefs.startHour + body.prefs.hoursPerDay}`,
      `Party: ${body.prefs.party}, pace: ${body.prefs.pace}, lunch break minutes: ${body.prefs.breakMinutes}`,
      `Must-see ids: ${JSON.stringify(body.mustSeeIds ?? [])}`,
      `Restaurant ids available for lunch: ${JSON.stringify(restaurantIds)}`,
      `Main stop count target: ${minStops}–${maxStops} (fill the day)`,
      "Stops:",
      JSON.stringify(attractions),
    ].join("\n");

    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    let usedModel = MODEL_CANDIDATES[0];
    let res: Response | null = null;
    let lastDetail = "";

    for (const model of MODEL_CANDIDATES) {
      usedModel = model;
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: requestBody,
        },
      );
      if (res.ok) break;
      lastDetail = await res.text();
      const classified = classifyGeminiFailure(res.status, lastDetail);
      if (classified.code !== "model") break;
      // Try next candidate when the model is retired / unavailable.
    }

    if (!res || !res.ok) {
      const classified = classifyGeminiFailure(res?.status, lastDetail);
      return Response.json(
        {
          error: classified.error,
          errorCode: classified.code,
          detail: lastDetail.slice(0, 400),
          configured: true,
          model: usedModel,
        },
        { status: classified.httpStatus },
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: {
      summary?: string;
      lunch?: unknown;
      sideVisits?: unknown;
      stops?: Array<{
        id?: string;
        reason?: string;
        requirements?: string[];
        tip?: string;
      }>;
    } = {};
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return Response.json(
        {
          error: "AI returned invalid JSON",
          errorCode: "bad_response" satisfies AiPlanErrorCode,
        },
        { status: 502 },
      );
    }

    const rawIds = (parsed.stops ?? [])
      .map((s) => s.id)
      .filter((id): id is string => Boolean(id));
    // Keep restaurants out of the main ride/exhibit order when possible.
    const mainIds = sanitizeAiOrder(
      rawIds.filter((id) => {
        const hit = attractions.find((a) => a.id === id);
        return hit?.placeKind !== "restaurant";
      }),
      validIds,
    );
    const orderedIds = (
      mainIds.length >= 2 ? mainIds : sanitizeAiOrder(rawIds, validIds)
    ).slice(0, maxStops);
    if (orderedIds.length < 2) {
      return Response.json(
        {
          error: "AI returned too few valid stops",
          errorCode: "bad_response" satisfies AiPlanErrorCode,
        },
        { status: 502 },
      );
    }

    const notes = sanitizeAiNotes(parsed.stops, validIds);
    const lunch = sanitizeLunchPlan(parsed.lunch, validIds);
    const extras = sanitizePlanExtras(
      { sideVisits: parsed.sideVisits },
      validIds,
      parsed.summary,
      lunch,
    );

    return Response.json({
      source: "ai",
      model: usedModel,
      summary: extras.summary,
      orderedIds,
      notes,
      lunch,
      extras,
    });
  } catch {
    return Response.json(
      {
        error: "AI planning failed",
        errorCode: "failed" satisfies AiPlanErrorCode,
      },
      { status: 502 },
    );
  }
}
