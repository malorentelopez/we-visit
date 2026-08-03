import { applyConstraintsToAttraction } from "../constraints";
import type {
  Attraction,
  LunchPlan,
  PlaceKind,
  PlanExtras,
  StopNote,
  VenueKind,
  VisitPrefs,
} from "../types";

export type AiPlanStop = {
  id: string;
  reason?: string;
  requirements?: string[];
  tip?: string;
};

export type AiPlanResult = {
  orderedIds: string[];
  notes: Record<string, StopNote>;
  lunch?: LunchPlan;
  extras?: PlanExtras;
  summary?: string;
  source: "ai" | "heuristic";
};

export type AiPlanRequest = {
  venueName: string;
  venueKind: VenueKind;
  prefs: VisitPrefs;
  mustSeeIds: string[];
  attractions: Array<{
    id: string;
    name: string;
    placeKind: PlaceKind;
    worthScore: number;
    estimatedMinutes: number;
    lat: number;
    lng: number;
    description?: string;
    openingHours?: string;
    minHeight?: string;
    accessNote?: string;
  }>;
};

export function toAiAttractionPayload(
  attractions: Attraction[],
  hiddenIds: string[],
  limit = 60,
) {
  const hidden = new Set(hiddenIds);
  const visible = attractions.filter((a) => !hidden.has(a.id) && !a.userHidden);
  const restaurants = visible
    .filter((a) => a.placeKind === "restaurant")
    .slice(0, 14);
  const restaurantIds = new Set(restaurants.map((a) => a.id));
  const main = visible
    .filter((a) => !restaurantIds.has(a.id))
    .slice(0, Math.max(8, limit - restaurants.length));
  const mixed = [...main, ...restaurants].slice(0, limit);

  return mixed.map((raw) => {
    const a = applyConstraintsToAttraction(raw);
    return {
      id: a.id,
      name: a.name,
      placeKind: a.placeKind,
      worthScore: a.worthScore,
      estimatedMinutes: a.estimatedMinutes,
      lat: Number(a.lat.toFixed(5)),
      lng: Number(a.lng.toFixed(5)),
      description: a.description?.slice(0, 180),
      openingHours: a.openingHours,
      minHeight: a.minHeight,
      accessNote: a.accessNote,
    };
  });
}

export function sanitizeAiOrder(
  orderedIds: unknown,
  validIds: Set<string>,
): string[] {
  if (!Array.isArray(orderedIds)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of orderedIds) {
    if (typeof value !== "string") continue;
    if (!validIds.has(value) || seen.has(value)) continue;
    out.push(value);
    seen.add(value);
  }
  return out;
}

function sanitizeStringList(value: unknown, maxItems = 4, maxLen = 120): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, maxLen);
    if (!trimmed) continue;
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function sanitizeAiNotes(
  stops: unknown,
  validIds: Set<string>,
): Record<string, StopNote> {
  if (!Array.isArray(stops)) return {};
  const notes: Record<string, StopNote> = {};
  for (const raw of stops) {
    if (!raw || typeof raw !== "object") continue;
    const stop = raw as AiPlanStop;
    if (typeof stop.id !== "string" || !validIds.has(stop.id)) continue;
    const requirements = sanitizeStringList(stop.requirements);
    const tip =
      typeof stop.tip === "string" ? stop.tip.trim().slice(0, 160) : "";
    const reason =
      typeof stop.reason === "string" ? stop.reason.trim().slice(0, 160) : "";
    const note: StopNote = {};
    if (requirements.length) note.requirements = requirements;
    if (tip) note.tip = tip;
    if (reason) note.reason = reason;
    if (note.requirements || note.tip || note.reason) {
      notes[stop.id] = note;
    }
  }
  return notes;
}

export function sanitizeLunchPlan(
  raw: unknown,
  validIds: Set<string>,
): LunchPlan | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const lunch = raw as Record<string, unknown>;
  const afterAttractionId =
    typeof lunch.afterAttractionId === "string" &&
    validIds.has(lunch.afterAttractionId)
      ? lunch.afterAttractionId
      : undefined;
  const restaurantId =
    typeof lunch.restaurantId === "string" && validIds.has(lunch.restaurantId)
      ? lunch.restaurantId
      : undefined;
  const label =
    typeof lunch.label === "string" ? lunch.label.trim().slice(0, 80) : undefined;
  const tip =
    typeof lunch.tip === "string" ? lunch.tip.trim().slice(0, 180) : undefined;
  if (!afterAttractionId && !restaurantId && !label && !tip) return undefined;
  return { afterAttractionId, restaurantId, label, tip };
}

export function sanitizePlanExtras(
  raw: unknown,
  validIds: Set<string>,
  summary?: string,
  lunch?: LunchPlan,
): PlanExtras {
  const extras: PlanExtras = {};
  if (summary?.trim()) extras.summary = summary.trim().slice(0, 280);
  if (lunch?.tip) extras.lunchTip = lunch.tip;

  const sideRaw =
    raw && typeof raw === "object"
      ? (raw as { sideVisits?: unknown }).sideVisits
      : undefined;
  if (Array.isArray(sideRaw)) {
    const sideVisits: NonNullable<PlanExtras["sideVisits"]> = [];
    for (const item of sideRaw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const tip =
        typeof row.tip === "string" ? row.tip.trim().slice(0, 160) : "";
      const title =
        typeof row.title === "string" ? row.title.trim().slice(0, 80) : "";
      const attractionId =
        typeof row.attractionId === "string" && validIds.has(row.attractionId)
          ? row.attractionId
          : undefined;
      if (!tip && !title && !attractionId) continue;
      sideVisits.push({
        attractionId,
        title: title || "Worth a look",
        tip: tip || title,
      });
      if (sideVisits.length >= 5) break;
    }
    if (sideVisits.length) extras.sideVisits = sideVisits;
  }
  return extras;
}

/** Merge OSM hard facts into AI notes so height/hours always surface when tagged. */
export function mergeOsmIntoNotes(
  attractions: Attraction[],
  notes: Record<string, StopNote>,
): Record<string, StopNote> {
  const next = { ...notes };
  for (const raw of attractions) {
    const a = applyConstraintsToAttraction(raw);
    const existing = next[a.id] ?? {};
    const requirements = [...(existing.requirements ?? [])];
    if (a.minHeight) {
      const heightLine = `Min height ${a.minHeight}`;
      if (!requirements.some((r) => r.toLowerCase().includes("height"))) {
        requirements.unshift(heightLine);
      }
    }
    if (a.openingHours) {
      const hoursLine = `Hours: ${a.openingHours}`;
      if (!requirements.some((r) => r.toLowerCase().includes("hours"))) {
        requirements.push(hoursLine.slice(0, 120));
      }
    }
    if (a.accessNote) {
      if (!requirements.some((r) => r.includes(a.accessNote!))) {
        requirements.push(a.accessNote.slice(0, 120));
      }
    }
    if (requirements.length || existing.tip || existing.reason) {
      next[a.id] = {
        ...existing,
        requirements: requirements.length ? requirements.slice(0, 4) : undefined,
      };
    }
  }
  return next;
}
