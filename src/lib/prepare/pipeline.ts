import { extractConstraintsFromTags } from "../constraints";
import { bboxFromCenter, expandBBox, projectToLayout } from "../geo";
import { classifyPlaceKind, placeKindPriority } from "../placeKind";
import { enrichFromTags } from "../server/media";
import {
  buildLayoutQuery,
  buildPoiQuery,
  inferVenueKind,
  overpassQuery,
  type OverpassElement,
} from "../server/osm";
import type {
  Attraction,
  BBox,
  LatLng,
  LayoutZone,
  PlaceKind,
  PrepareResponse,
  SearchResult,
  Venue,
  VenueKind,
  VenueLayout,
} from "../types";

function elementCenter(el: OverpassElement): LatLng | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  if (el.geometry?.length) {
    const lat =
      el.geometry.reduce((sum, p) => sum + p.lat, 0) / el.geometry.length;
    const lon =
      el.geometry.reduce((sum, p) => sum + p.lon, 0) / el.geometry.length;
    return { lat, lng: lon };
  }
  return null;
}

function scoreAttraction(
  tags: Record<string, string>,
  name: string,
  placeKind: PlaceKind,
): number {
  let score = 35;
  if (tags.wikipedia || tags.wikidata) score += 25;
  if (tags.description || tags["description:en"] || tags["description:es"])
    score += 10;
  if (tags.website || tags.url) score += 5;
  if (tags.opening_hours) score += 5;
  if (tags.tourism === "attraction" || tags.attraction) score += 10;
  if (tags.tourism === "museum" || tags.tourism === "theme_park") score += 8;
  if (name.length > 3) score += 5;
  const thrill = `${tags.attraction ?? ""} ${tags.name ?? ""}`.toLowerCase();
  if (
    thrill.includes("roller") ||
    thrill.includes("coaster") ||
    thrill.includes("montaña")
  ) {
    score += 8;
  }

  // Keep rides ahead of food/shops in default ranking for parks
  switch (placeKind) {
    case "ride":
      score += 12;
      break;
    case "show":
      score += 6;
      break;
    case "exhibit":
      score += 4;
      break;
    case "restaurant":
      score -= 8;
      break;
    case "shop":
      score -= 18;
      break;
    case "service":
      score -= 28;
      break;
    case "other":
      break;
    default: {
      const _exhaustive: never = placeKind;
      void _exhaustive;
    }
  }

  return Math.max(1, Math.min(100, score));
}

function estimateMinutes(
  tags: Record<string, string>,
  venueKind: string,
  placeKind: PlaceKind,
): number {
  if (placeKind === "restaurant") return 40;
  if (placeKind === "shop") return 15;
  if (placeKind === "service") return 5;
  if (placeKind === "show") return 30;
  if (tags.tourism === "museum" || venueKind === "museum") return 35;
  if (tags.tourism === "artwork" || placeKind === "exhibit") return 15;
  if (tags.attraction || tags.tourism === "attraction" || placeKind === "ride")
    return 25;
  if (tags.tourism === "viewpoint") return 15;
  return 20;
}

function categoryFromTags(tags: Record<string, string>, placeKind: PlaceKind): string {
  if (placeKind === "restaurant") {
    return tags.amenity || tags.shop || "restaurant";
  }
  if (placeKind === "shop") return tags.shop || "shop";
  if (placeKind === "service") return tags.amenity || tags.tourism || "service";
  if (placeKind === "show") return tags.amenity || tags.attraction || "show";
  return (
    tags.attraction ||
    tags.tourism ||
    tags.historic ||
    tags.leisure ||
    placeKind
  );
}

function capByPlaceKind(
  items: Attraction[],
  venueKind: VenueKind,
  totalCap: number,
): Attraction[] {
  if (venueKind !== "theme_park" && venueKind !== "zoo") {
    return items.slice(0, totalCap);
  }

  const budgets: Record<PlaceKind, number> = {
    ride: 45,
    show: 10,
    exhibit: 10,
    restaurant: 12,
    shop: 8,
    service: 5,
    other: 5,
  };

  const taken: Attraction[] = [];
  const counts: Partial<Record<PlaceKind, number>> = {};
  const sorted = [...items].sort((a, b) => {
    const kindDelta = placeKindPriority(a.placeKind) - placeKindPriority(b.placeKind);
    if (kindDelta !== 0) return kindDelta;
    return b.worthScore - a.worthScore;
  });

  for (const item of sorted) {
    const count = counts[item.placeKind] ?? 0;
    if (count >= budgets[item.placeKind]) continue;
    taken.push(item);
    counts[item.placeKind] = count + 1;
    if (taken.length >= totalCap) break;
  }

  // Fill remaining slots with leftover rides/shows if under cap
  if (taken.length < totalCap) {
    const takenIds = new Set(taken.map((a) => a.id));
    for (const item of sorted) {
      if (takenIds.has(item.id)) continue;
      taken.push(item);
      if (taken.length >= totalCap) break;
    }
  }

  return taken.sort((a, b) => b.worthScore - a.worthScore);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveBBox(result: SearchResult, venueKind: string): BBox {
  const spanLat = result.bbox.north - result.bbox.south;
  const spanLng = result.bbox.east - result.bbox.west;
  if (spanLat > 0.0005 && spanLng > 0.0005) {
    return expandBBox(result.bbox, venueKind === "museum" ? 0.05 : 0.12);
  }
  const radius =
    venueKind === "museum" ? 0.55 : venueKind === "theme_park" ? 1.2 : 0.7;
  return bboxFromCenter(result.lat, result.lng, radius);
}

function buildLayout(
  venueBBox: BBox,
  layoutElements: OverpassElement[],
  attractions: Attraction[],
): VenueLayout {
  const width = 1000;
  const height = 1000;
  const outlineSource =
    layoutElements.find((el) => (el.geometry?.length ?? 0) > 3) ??
    layoutElements[0];
  const outlineLatLng: LatLng[] =
    outlineSource?.geometry?.map((p) => ({ lat: p.lat, lng: p.lon })) ??
    [
      { lat: venueBBox.north, lng: venueBBox.west },
      { lat: venueBBox.north, lng: venueBBox.east },
      { lat: venueBBox.south, lng: venueBBox.east },
      { lat: venueBBox.south, lng: venueBBox.west },
    ];

  const zones: LayoutZone[] = layoutElements
    .filter((el) => el.tags?.name && (el.geometry?.length ?? 0) > 2)
    .slice(0, 24)
    .map((el) => ({
      id: `zone-${el.type}-${el.id}`,
      name: el.tags!.name!,
      path: projectToLayout(
        el.geometry!.map((p) => ({ lat: p.lat, lng: p.lon })),
        venueBBox,
        width,
        height,
      ),
    }))
    .slice(0, 16);

  const pins = attractions.map((attraction) => {
    const [point] = projectToLayout(
      [{ lat: attraction.lat, lng: attraction.lng }],
      venueBBox,
      width,
      height,
    );
    return { attractionId: attraction.id, x: point.x, y: point.y };
  });

  return {
    width,
    height,
    outline: projectToLayout(outlineLatLng, venueBBox, width, height),
    zones,
    pins,
  };
}

export async function prepareVenue(result: SearchResult): Promise<PrepareResponse> {
  const venueKind = inferVenueKind(result.category, result.type);
  const bbox = resolveBBox(result, venueKind);
  const venueId = `${result.osmType}/${result.osmId}`;

  const [poiElements, layoutElements] = await Promise.all([
    overpassQuery(buildPoiQuery(bbox, venueKind)),
    overpassQuery(buildLayoutQuery(bbox)),
  ]);

  const seen = new Set<string>();
  const attractions: Attraction[] = [];

  for (const el of poiElements) {
    const tags = el.tags ?? {};
    const name = tags.name || tags["name:en"] || tags["name:es"];
    if (!name) continue;
    const center = elementCenter(el);
    if (!center) continue;
    const key = `${normalizeName(name)}:${center.lat.toFixed(5)}:${center.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Skip the venue itself as an attraction when names match closely
    if (
      normalizeName(name) === normalizeName(result.name) &&
      (tags.tourism === "theme_park" || tags.tourism === "museum" || tags.tourism === "zoo")
    ) {
      continue;
    }

    const id = `${el.type}/${el.id}`;
    const placeKind = classifyPlaceKind(tags);
    const constraints = extractConstraintsFromTags(tags);
    attractions.push({
      id,
      venueId,
      name,
      lat: center.lat,
      lng: center.lng,
      placeKind,
      category: categoryFromTags(tags, placeKind),
      worthScore: scoreAttraction(tags, name, placeKind),
      estimatedMinutes: estimateMinutes(tags, venueKind, placeKind),
      openingHours: constraints.openingHours,
      minHeight: constraints.minHeight,
      accessNote: constraints.accessNote,
      tags,
    });
  }

  // Always keep the venue itself as a stop when POIs are thin (common for museums).
  if (attractions.length < 6) {
    attractions.unshift({
      id: `${result.osmType}/${result.osmId}`,
      venueId,
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      placeKind: venueKind === "museum" ? "exhibit" : "ride",
      category: venueKind,
      worthScore: 95,
      estimatedMinutes: venueKind === "museum" ? 120 : 60,
      tags: { tourism: venueKind === "other" ? "attraction" : venueKind },
    });
  }

  attractions.sort((a, b) => b.worthScore - a.worthScore);

  // Cap for phone UX / offline size; keep a mix of kinds in parks
  const capped = capByPlaceKind(attractions, venueKind, 80);
  const sparse =
    capped.filter((a) => a.placeKind === "ride" || a.placeKind === "exhibit")
      .length < 6;

  // Enrich top attractions + venue with free Wikipedia/Commons media (parallel)
  const enrichCount = Math.min(18, capped.length);
  const [attractionMedia, venueMedia] = await Promise.all([
    Promise.all(
      capped
        .slice(0, enrichCount)
        .map((item) => enrichFromTags(item.tags, item.name)),
    ),
    enrichFromTags({}, result.name, { allowNameLookup: true }),
  ]);
  for (let i = 0; i < attractionMedia.length; i += 1) {
    const media = attractionMedia[i];
    capped[i] = {
      ...capped[i],
      description: media.description,
      imageUrl: media.imageUrl,
      wikipediaUrl: media.wikipediaUrl,
    };
  }

  const layout = buildLayout(bbox, layoutElements, capped);
  const now = new Date().toISOString();

  const venue: Venue = {
    id: venueId,
    name: result.name,
    displayName: result.displayName,
    lat: result.lat,
    lng: result.lng,
    bbox,
    osmType: result.osmType,
    osmId: result.osmId,
    venueKind,
    layout,
    imageUrl: venueMedia.imageUrl || capped.find((a) => a.imageUrl)?.imageUrl,
    description: venueMedia.description,
    source: {
      nominatim: true,
      overpass: true,
      preparedAt: now,
    },
    preparedAt: now,
    sparse,
  };

  return {
    venue,
    attractions: capped,
    sparse,
    message: sparse
      ? "OpenStreetMap has limited named attractions for this place."
      : undefined,
  };
}
