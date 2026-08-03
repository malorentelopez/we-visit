import type { VisitPrefs } from "@/lib/types";

export type VisitCapacity = {
  /** Minutes available for attractions across the visit (lunch reserved). */
  budgetMinutes: number;
  /** Soft per-day stop target from pace. */
  paceCap: number;
  /** Hard ceiling used when selecting attractions for the visit. */
  hardCap: number;
  /** Soft per-day stop ceiling when assigning day indexes. */
  dayStopSoftCap: number;
  /** AI prompt lower bound for main stops. */
  minStops: number;
  /** AI prompt / response upper bound for main stops. */
  maxStops: number;
  /** Clock minutes when a day ends (from midnight). */
  dayEndMinutes: number;
};

/** Single source for visit time/stop budgets (heuristic planner + AI prompt). */
export function visitCapacity(prefs: VisitPrefs): VisitCapacity {
  const lunchTotal = Math.max(0, prefs.breakMinutes) * prefs.dayCount;
  const budgetMinutes = Math.max(
    60,
    prefs.hoursPerDay * 60 * prefs.dayCount - lunchTotal,
  );
  const paceBase =
    prefs.hoursPerDay *
    (prefs.pace === "packed" ? 3.2 : prefs.pace === "relaxed" ? 1.8 : 2.4);
  const paceCap = Math.max(4, Math.floor(paceBase));
  const hardCap = Math.max(paceCap + 6, Math.ceil(budgetMinutes / 18));
  const dayStopSoftCap = Math.max(
    paceCap + 4,
    Math.ceil((prefs.hoursPerDay * 60) / 22),
  );
  const maxStops = Math.max(
    6,
    Math.ceil(budgetMinutes / 30) * prefs.dayCount,
  );
  const minStops = Math.max(4, Math.ceil(budgetMinutes / 45));

  return {
    budgetMinutes,
    paceCap,
    hardCap,
    dayStopSoftCap,
    minStops,
    maxStops,
    dayEndMinutes: prefs.startHour * 60 + prefs.hoursPerDay * 60,
  };
}
