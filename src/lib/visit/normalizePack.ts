import { applyConstraintsToAttraction } from "@/lib/constraints";
import { classifyPlaceKind } from "@/lib/placeKind";
import type { Attraction, VenuePack } from "@/lib/types";

/** Ensure placeKind + OSM constraint fields are present on an attraction. */
export function normalizeAttraction(attraction: Attraction): Attraction {
  return applyConstraintsToAttraction({
    ...attraction,
    placeKind:
      attraction.placeKind ?? classifyPlaceKind(attraction.tags ?? {}),
  });
}

/** Normalize older IndexedDB packs once at load. */
export function normalizePack(pack: VenuePack): VenuePack {
  return {
    ...pack,
    attractions: pack.attractions.map(normalizeAttraction),
    session: {
      ...pack.session,
      stopNotes: pack.session.stopNotes ?? {},
    },
  };
}
