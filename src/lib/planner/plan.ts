import { haversineKm } from "../geo";
import { visitCapacity } from "./capacity";
import type {
  Attraction,
  CustomStop,
  LunchPlan,
  PlannedStop,
  VisitPrefs,
  VisitSession,
} from "../types";

function preferenceScore(attraction: Attraction, prefs: VisitPrefs): number {
  let score = attraction.worthScore;
  const kind = attraction.placeKind;
  const blob = `${attraction.name} ${attraction.category} ${Object.values(attraction.tags).join(" ")}`.toLowerCase();
  const thrill =
    blob.includes("roller") ||
    blob.includes("coaster") ||
    blob.includes("thrill") ||
    blob.includes("montaña rusa");
  const kidFriendly =
    blob.includes("carousel") ||
    blob.includes("kids") ||
    blob.includes("family") ||
    blob.includes("playground") ||
    attraction.category === "artwork" ||
    kind === "exhibit";

  if (prefs.party === "kids") {
    if (thrill) score -= 18;
    if (kidFriendly) score += 12;
  } else if (prefs.party === "adults") {
    if (thrill) score += 8;
  }

  // Prefer rides/shows (parks) or exhibits (cities); food/shops secondary
  if (kind === "ride") score += 10;
  else if (kind === "exhibit") score += 8;
  else if (kind === "show") score += 4;
  else if (kind === "restaurant") score -= 6;
  else if (kind === "shop") score -= 20;
  else if (kind === "service") score -= 35;

  if (attraction.mustSee) score += 40;
  return score;
}

function nearestNeighborOrder(
  items: Attraction[],
  prefs: VisitPrefs,
): Attraction[] {
  if (items.length <= 1) return items;
  const remaining = [...items].sort(
    (a, b) => preferenceScore(b, prefs) - preferenceScore(a, prefs),
  );
  const ordered: Attraction[] = [remaining.shift()!];
  while (remaining.length) {
    const current = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const dist = haversineKm(current, candidate);
      const worthBias = (100 - preferenceScore(candidate, prefs)) / 200;
      const cost = dist + worthBias;
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = i;
      }
    }
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return twoOpt(ordered);
}

function twoOpt(route: Attraction[]): Attraction[] {
  if (route.length < 4) return route;
  const path = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < path.length - 2; i += 1) {
      for (let k = i + 1; k < path.length - 1; k += 1) {
        const a = path[i - 1];
        const b = path[i];
        const c = path[k];
        const d = path[k + 1];
        const before = haversineKm(a, b) + haversineKm(c, d);
        const after = haversineKm(a, c) + haversineKm(b, d);
        if (after + 0.01 < before) {
          const reversed = path.slice(i, k + 1).reverse();
          path.splice(i, k - i + 1, ...reversed);
          improved = true;
        }
      }
    }
  }
  return path;
}

/**
 * Pick stops in priority order until the visit hours are filled.
 * Walk buffer (~8m) is included between attractions.
 */
function selectForVisitHours(
  ordered: Attraction[],
  prefs: VisitPrefs,
): Attraction[] {
  const { budgetMinutes, hardCap } = visitCapacity(prefs);
  const selected: Attraction[] = [];
  let used = 0;

  for (const attraction of ordered) {
    if (attraction.placeKind === "restaurant" && !attraction.mustSee) {
      continue;
    }
    const walk = selected.length > 0 ? 8 : 0;
    const cost = attraction.estimatedMinutes + walk;
    if (selected.length > 0 && used + cost > budgetMinutes) {
      // Fit one more short stop if it nearly completes the day.
      if (used + attraction.estimatedMinutes <= budgetMinutes + 12) {
        selected.push(attraction);
        used += attraction.estimatedMinutes + walk;
      }
      continue;
    }
    selected.push(attraction);
    used += cost;
    if (selected.length >= hardCap || used >= budgetMinutes - 8) break;
  }

  return selected;
}

function pickLunchRestaurant(
  selected: Attraction[],
  allCandidates: Attraction[],
  lunch?: LunchPlan,
): Attraction | undefined {
  if (lunch?.restaurantId) {
    const hit =
      allCandidates.find((a) => a.id === lunch.restaurantId) ||
      selected.find((a) => a.id === lunch.restaurantId);
    if (hit) return hit;
  }
  const mid = selected[Math.floor(selected.length / 2)];
  const restaurants = allCandidates.filter(
    (a) => a.placeKind === "restaurant",
  );
  if (!restaurants.length || !mid) return undefined;
  return [...restaurants].sort(
    (a, b) => haversineKm(mid, a) - haversineKm(mid, b),
  )[0];
}

export function buildItinerary(options: {
  attractions: Attraction[];
  prefs: VisitPrefs;
  hiddenAttractionIds: string[];
  mustSeeAttractionIds: string[];
  customStops?: CustomStop[];
  preserveStatuses?: PlannedStop[];
  /** Preferred attraction id order (e.g. from AI). Remaining candidates fill the day. */
  preferredOrderIds?: string[];
  /** Preferred lunch placement / restaurant from AI or heuristic. */
  lunch?: LunchPlan;
}): PlannedStop[] {
  const {
    attractions,
    prefs,
    hiddenAttractionIds,
    mustSeeAttractionIds,
    customStops = [],
    preserveStatuses = [],
    preferredOrderIds,
    lunch,
  } = options;

  const statusMap = new Map(preserveStatuses.map((s) => [s.id, s.status]));
  const hidden = new Set(hiddenAttractionIds);
  const mustSee = new Set(mustSeeAttractionIds);

  const candidates = attractions
    .filter((a) => !hidden.has(a.id) && !a.userHidden)
    .map((a) => ({ ...a, mustSee: mustSee.has(a.id) || a.mustSee }));

  const byId = new Map(candidates.map((a) => [a.id, a]));
  let ordered: Attraction[];
  if (preferredOrderIds?.length) {
    const seen = new Set<string>();
    ordered = [];
    for (const id of preferredOrderIds) {
      const hit = byId.get(id);
      if (!hit || seen.has(id)) continue;
      ordered.push(hit);
      seen.add(id);
    }
    const leftovers = candidates.filter((a) => !seen.has(a.id));
    // Preferred order first, then must-sees, then remaining fillers for the day.
    ordered.push(
      ...leftovers.filter((a) => a.mustSee),
      ...leftovers.filter((a) => !a.mustSee),
    );
  } else {
    ordered = nearestNeighborOrder(candidates, prefs);
  }

  const capacity = visitCapacity(prefs);
  const selected = selectForVisitHours(ordered, prefs);
  const lunchSpot = pickLunchRestaurant(selected, candidates, lunch);
  const lunchAfterId =
    lunch?.afterAttractionId &&
    selected.some((a) => a.id === lunch.afterAttractionId)
      ? lunch.afterAttractionId
      : selected[Math.max(0, Math.floor(selected.length / 2) - 1)]?.id;

  const stops: PlannedStop[] = [];
  let dayIndex = 0;
  let minutesIntoDay = prefs.startHour * 60;
  let dayStopCount = 0;
  let order = 0;
  const dayEnd = capacity.dayEndMinutes;
  let breakPlacedForDay = false;

  const pushBreak = () => {
    const id = `break-day-${dayIndex}`;
    const placeName = lunchSpot?.name || lunch?.label;
    stops.push({
      id,
      kind: "break",
      attractionId: lunchSpot?.id,
      name: placeName ? `Lunch · ${placeName}` : "Lunch break",
      dayIndex,
      order: order++,
      suggestedStartMinutes: minutesIntoDay,
      estimatedMinutes: prefs.breakMinutes,
      status: statusMap.get(id) ?? "todo",
      lat: lunchSpot?.lat,
      lng: lunchSpot?.lng,
      tip: lunch?.tip,
    });
    minutesIntoDay += prefs.breakMinutes;
    breakPlacedForDay = true;
  };

  for (const attraction of selected) {
    const wouldEnd = minutesIntoDay + attraction.estimatedMinutes;
    if (wouldEnd > dayEnd || dayStopCount >= capacity.dayStopSoftCap) {
      dayIndex += 1;
      if (dayIndex >= prefs.dayCount) break;
      minutesIntoDay = prefs.startHour * 60;
      dayStopCount = 0;
      breakPlacedForDay = false;
    }

    // Skip if this stop still cannot fit in the current day window.
    if (minutesIntoDay + attraction.estimatedMinutes > dayEnd) {
      continue;
    }

    const id = `attr-${attraction.id}`;
    stops.push({
      id,
      kind: "attraction",
      attractionId: attraction.id,
      name: attraction.name,
      dayIndex,
      order: order++,
      suggestedStartMinutes: minutesIntoDay,
      estimatedMinutes: attraction.estimatedMinutes,
      status: statusMap.get(id) ?? "todo",
      lat: attraction.lat,
      lng: attraction.lng,
    });
    minutesIntoDay += attraction.estimatedMinutes + 8;
    dayStopCount += 1;

    if (
      !breakPlacedForDay &&
      prefs.breakMinutes > 0 &&
      (attraction.id === lunchAfterId ||
        (!lunchAfterId &&
          dayStopCount >= Math.max(1, Math.floor(capacity.dayStopSoftCap / 2))))
    ) {
      pushBreak();
    }
  }

  if (!breakPlacedForDay && prefs.breakMinutes > 0 && selected.length > 0) {
    pushBreak();
  }

  for (const custom of customStops) {
    const id = `custom-${custom.id}`;
    const insertAt = custom.afterStopId
      ? stops.findIndex((s) => s.id === custom.afterStopId) + 1
      : stops.length;
    const at = insertAt > 0 ? insertAt : stops.length;
    const day = stops[Math.max(0, at - 1)]?.dayIndex ?? 0;
    const start =
      stops[Math.max(0, at - 1)]?.suggestedStartMinutes ??
      prefs.startHour * 60;
    stops.splice(at, 0, {
      id,
      kind: "custom",
      customId: custom.id,
      name: custom.name,
      dayIndex: day,
      order: 0,
      suggestedStartMinutes: start,
      estimatedMinutes: custom.estimatedMinutes,
      status: statusMap.get(id) ?? "todo",
    });
  }

  return stops.map((stop, index) => ({ ...stop, order: index }));
}

export function replanRemaining(
  session: VisitSession,
  attractions: Attraction[],
  options?: {
    preferredOrderIds?: string[];
    lunch?: LunchPlan;
  },
): PlannedStop[] {
  const frozen = session.stops.filter(
    (s) => s.status === "done" || s.status === "skipped",
  );
  const stopByAttractionId = new Map(
    session.stops
      .filter((s) => s.attractionId)
      .map((s) => [s.attractionId!, s]),
  );
  const remainingAttractions = attractions.filter((a) => {
    const stop = stopByAttractionId.get(a.id);
    if (!stop) return !session.hiddenAttractionIds.includes(a.id);
    return stop.status === "todo";
  });

  const rebuilt = buildItinerary({
    attractions: remainingAttractions,
    prefs: session.prefs,
    hiddenAttractionIds: session.hiddenAttractionIds,
    mustSeeAttractionIds: session.mustSeeAttractionIds,
    customStops: session.customStops.filter((c) => {
      const stop = session.stops.find((s) => s.customId === c.id);
      return !stop || stop.status === "todo";
    }),
    preferredOrderIds: options?.preferredOrderIds,
    lunch: options?.lunch,
  });

  // Keep frozen day indices/order prefix, append rebuilt todos
  const frozenSorted = [...frozen].sort((a, b) => a.order - b.order);
  const next = [
    ...frozenSorted,
    ...rebuilt.map((s) => ({ ...s, status: "todo" as const })),
  ];
  return next.map((stop, index) => ({ ...stop, order: index }));
}

export function defaultPrefs(): VisitPrefs {
  return {
    party: "mixed",
    pace: "normal",
    breakMinutes: 45,
    dayCount: 1,
    startHour: 10,
    hoursPerDay: 8,
  };
}

export function createSessionId(): string {
  return `visit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
