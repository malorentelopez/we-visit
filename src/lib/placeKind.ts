import type { PlaceKind, VenueKind } from "./types";

export function classifyPlaceKind(tags: Record<string, string>): PlaceKind {
  const amenity = (tags.amenity ?? "").toLowerCase();
  const shop = (tags.shop ?? "").toLowerCase();
  const tourism = (tags.tourism ?? "").toLowerCase();
  const attraction = (tags.attraction ?? "").toLowerCase();
  const leisure = (tags.leisure ?? "").toLowerCase();
  const historic = (tags.historic ?? "").toLowerCase();
  const name = `${tags.name ?? ""} ${tags["name:en"] ?? ""}`.toLowerCase();

  if (
    amenity === "restaurant" ||
    amenity === "cafe" ||
    amenity === "fast_food" ||
    amenity === "food_court" ||
    amenity === "ice_cream" ||
    amenity === "bar" ||
    amenity === "pub" ||
    amenity === "biergarten" ||
    shop === "bakery" ||
    shop === "pastry" ||
    shop === "coffee" ||
    name.includes("restaurant") ||
    name.includes("café") ||
    name.includes("cafe ")
  ) {
    return "restaurant";
  }

  if (
    shop ||
    amenity === "marketplace" ||
    (tourism === "yes" && name.includes("shop")) ||
    name.includes("boutique") ||
    name.includes("souvenir")
  ) {
    return "shop";
  }

  if (
    amenity === "toilets" ||
    amenity === "baby_hatch" ||
    amenity === "childcare" ||
    amenity === "locker" ||
    amenity === "luggage_locker" ||
    amenity === "first_aid" ||
    amenity === "bureau_de_change" ||
    amenity === "atm" ||
    amenity === "information" ||
    tourism === "information" ||
    amenity === "drinking_water" ||
    amenity === "charging_station"
  ) {
    return "service";
  }

  if (
    attraction === "animal" ||
    attraction === "maze" ||
    tourism === "museum" ||
    tourism === "gallery" ||
    tourism === "artwork" ||
    historic ||
    leisure === "nature_reserve"
  ) {
    return "exhibit";
  }

  if (
    attraction.includes("cinema") ||
    attraction.includes("theatre") ||
    attraction.includes("theater") ||
    amenity === "theatre" ||
    amenity === "cinema" ||
    name.includes("show") ||
    name.includes("parade") ||
    name.includes("spectacle")
  ) {
    return "show";
  }

  if (
    tags.attraction ||
    tourism === "attraction" ||
    tourism === "theme_park" ||
    leisure === "amusement_arcade" ||
    leisure === "water_park" ||
    attraction.length > 0
  ) {
    return "ride";
  }

  if (tourism === "viewpoint" || tourism === "zoo") return "exhibit";

  return "other";
}

export function placeKindPriority(kind: PlaceKind): number {
  switch (kind) {
    case "ride":
      return 0;
    case "show":
      return 1;
    case "exhibit":
      return 2;
    case "restaurant":
      return 3;
    case "shop":
      return 4;
    case "service":
      return 5;
    case "other":
      return 6;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export const PLACE_KIND_FILTERS: PlaceKind[] = [
  "ride",
  "show",
  "restaurant",
  "shop",
  "service",
  "exhibit",
  "other",
];

export function defaultPlaceKindFilters(
  available: PlaceKind[],
  venueKind: VenueKind,
): PlaceKind[] {
  const preferred: PlaceKind[] | null =
    venueKind === "theme_park" || venueKind === "zoo"
      ? ["ride", "show", "exhibit", "restaurant"]
      : venueKind === "city"
        ? ["exhibit", "other", "show", "restaurant"]
        : null;

  if (!preferred) return available;
  const selected = preferred.filter((k) => available.includes(k));
  return selected.length > 0 ? selected : available;
}

/** In cities, OSM "attraction" tags are landmarks — not park rides. */
export function placeKindForVenue(
  tags: Record<string, string>,
  venueKind: VenueKind,
): PlaceKind {
  const kind = classifyPlaceKind(tags);
  if (venueKind === "city" && kind === "ride") return "exhibit";
  if (
    venueKind === "city" &&
    kind === "other" &&
    (tags.leisure === "park" || tags.historic)
  ) {
    return "exhibit";
  }
  return kind;
}
