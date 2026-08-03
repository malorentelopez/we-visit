import type { MessageKey } from "@/lib/i18n";

/** Shared AI planning error contract (API + client). */
export type AiPlanErrorCode =
  | "not_configured"
  | "quota"
  | "model"
  | "bad_response"
  | "network"
  | "failed";

export function aiPlanErrorMessageKey(code: AiPlanErrorCode): MessageKey {
  switch (code) {
    case "not_configured":
      return "smartRouteUnavailable";
    case "quota":
      return "regenerateAiQuota";
    case "model":
      return "regenerateAiModel";
    case "bad_response":
      return "regenerateAiBadResponse";
    case "network":
      return "regenerateAiNeedNet";
    case "failed":
      return "regenerateAiFail";
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}
