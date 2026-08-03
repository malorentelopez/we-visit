import {
  toAiAttractionPayload,
  type AiPlanRequest,
} from "@/lib/planner/aiPlan";
import type { AiPlanErrorCode } from "@/lib/planner/aiErrors";
import type {
  Attraction,
  LunchPlan,
  PlanExtras,
  StopNote,
  VenueKind,
  VisitPrefs,
} from "@/lib/types";

export type { AiPlanErrorCode } from "@/lib/planner/aiErrors";
export { aiPlanErrorMessageKey } from "@/lib/planner/aiErrors";

export type AiPlanSuccess = {
  ok: true;
  orderedIds: string[];
  notes: Record<string, StopNote>;
  lunch?: LunchPlan;
  extras?: PlanExtras;
  summary?: string;
  model?: string;
};

export type AiPlanFailure = {
  ok: false;
  code: AiPlanErrorCode;
};

export type AiPlanClientResult = AiPlanSuccess | AiPlanFailure;

type AiPlanApiBody = {
  orderedIds?: string[];
  notes?: Record<string, StopNote>;
  lunch?: LunchPlan;
  extras?: PlanExtras;
  summary?: string;
  model?: string;
  error?: string;
  errorCode?: AiPlanErrorCode;
  detail?: string;
};

export async function requestAiPlan(input: {
  venueName: string;
  venueKind: VenueKind;
  prefs: VisitPrefs;
  mustSeeIds: string[];
  attractions: Attraction[];
  hiddenIds: string[];
}): Promise<AiPlanClientResult> {
  const body: AiPlanRequest = {
    venueName: input.venueName,
    venueKind: input.venueKind,
    prefs: input.prefs,
    mustSeeIds: input.mustSeeIds,
    attractions: toAiAttractionPayload(input.attractions, input.hiddenIds),
  };

  try {
    const res = await fetch("/api/plan-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AiPlanApiBody;

    if (res.ok && data.orderedIds?.length) {
      return {
        ok: true,
        orderedIds: data.orderedIds,
        notes: data.notes ?? {},
        lunch: data.lunch,
        extras: data.extras,
        summary: data.summary,
        model: data.model,
      };
    }

    if (data.errorCode) {
      return { ok: false, code: data.errorCode };
    }

    if (res.status === 503) return { ok: false, code: "not_configured" };
    if (res.status === 429) return { ok: false, code: "quota" };
    if (data.error?.includes("few valid") || data.error?.includes("invalid JSON")) {
      return { ok: false, code: "bad_response" };
    }
    if (
      res.status === 404 ||
      /no longer available|model unavailable|NOT_FOUND/i.test(
        `${data.error ?? ""} ${data.detail ?? ""}`,
      )
    ) {
      return { ok: false, code: "model" };
    }
    return { ok: false, code: "failed" };
  } catch {
    return { ok: false, code: "network" };
  }
}
