import type { BBox, SearchResult, VenueKind } from "../types";
import { cacheGet, cacheSet } from "./cache";
import { rateLimitOk, throttle } from "./throttle";

const USER_AGENT = "We-Visit/0.1 (https://github.com/malorentelopez/we-visit; visit planner)";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon"
  );
}

export function guardRequest(request: Request): Response | null {
  if (!rateLimitOk(`rl:${clientKey(request)}`, 30, 60_000)) {
    return Response.json(
      { error: "Too many requests. Slow down a bit." },
      { status: 429 },
    );
  }
  return null;
}

function parseBBox(raw: string | undefined, lat: number, lng: number): BBox {
  if (!raw) {
    return {
      south: lat - 0.01,
      west: lng - 0.01,
      north: lat + 0.01,
      east: lng + 0.01,
    };
  }
  const [south, north, west, east] = raw.split(",").map(Number);
  if ([south, north, west, east].some((n) => Number.isNaN(n))) {
    return {
      south: lat - 0.01,
      west: lng - 0.01,
      north: lat + 0.01,
      east: lng + 0.01,
    };
  }
  return { south, west, north, east };
}

export async function nominatimSearch(query: string): Promise<SearchResult[]> {
  const key = `nom:${query.trim().toLowerCase()}`;
  const cached = cacheGet<SearchResult[]>(key);
  if (cached) return cached;

  await throttle("nominatim", 1100);
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", "8");
  url.searchParams.set("extratags", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Nominatim failed: ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    osm_type: string;
    osm_id: number;
    name?: string;
    display_name: string;
    lat: string;
    lon: string;
    boundingbox?: string[];
    category?: string;
    type?: string;
  }>;

  const results: SearchResult[] = data.map((item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    const bb = item.boundingbox
      ? `${item.boundingbox[0]},${item.boundingbox[1]},${item.boundingbox[2]},${item.boundingbox[3]}`
      : undefined;
    return {
      osmType: (item.osm_type === "way" || item.osm_type === "relation"
        ? item.osm_type
        : "node") as SearchResult["osmType"],
      osmId: item.osm_id,
      name: item.name || item.display_name.split(",")[0] || "Place",
      displayName: item.display_name,
      lat,
      lng,
      bbox: parseBBox(bb, lat, lng),
      category: item.category || "tourism",
      type: item.type || "attraction",
    };
  });

  // Surface cities/towns near the top when Nominatim returns mixed place types.
  results.sort((a, b) => searchRank(a) - searchRank(b));

  cacheSet(key, results, 24 * 60 * 60 * 1000);
  return results;
}

function searchRank(result: SearchResult): number {
  const kind = inferVenueKind(result.category, result.type);
  if (kind === "city") return 0;
  if (kind === "theme_park" || kind === "zoo") return 1;
  if (kind === "museum" || kind === "historic") return 2;
  return 3;
}

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

export async function overpassQuery(query: string): Promise<OverpassElement[]> {
  const key = `ov:${query}`;
  const cached = cacheGet<OverpassElement[]>(key);
  if (cached) return cached;

  await throttle("overpass", 1500);
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        lastError = new Error(`Overpass ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { elements?: OverpassElement[] };
      const elements = data.elements ?? [];
      cacheSet(key, elements, 6 * 60 * 60 * 1000);
      return elements;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass error");
    }
  }
  throw lastError ?? new Error("Overpass failed");
}

export function inferVenueKind(
  category: string,
  type: string,
  tags: Record<string, string> = {},
): VenueKind {
  const blob = `${category} ${type} ${tags.tourism ?? ""} ${tags.leisure ?? ""} ${tags.historic ?? ""} ${tags.place ?? ""}`.toLowerCase();
  if (blob.includes("theme_park") || blob.includes("amusement")) return "theme_park";
  if (blob.includes("museum") || blob.includes("gallery")) return "museum";
  if (blob.includes("zoo") || blob.includes("aquarium")) return "zoo";
  // Cities/towns before generic historic — Nominatim uses place=city|town|municipality
  if (
    /\b(city|town|municipality|village|suburb|borough)\b/.test(blob) ||
    (category === "place" &&
      /^(city|town|municipality|village|administrative)$/.test(type)) ||
    type === "city" ||
    type === "town"
  ) {
    return "city";
  }
  if (blob.includes("historic") || blob.includes("castle") || blob.includes("monument"))
    return "historic";
  return "other";
}

export function buildPoiQuery(bbox: BBox, venueKind: VenueKind = "other"): string {
  const { south, west, north, east } = bbox;
  if (venueKind === "city") {
    // Focused city-core sightseeing + lunch options (avoid flooding Overpass).
    return `
[out:json][timeout:55];
(
  node["tourism"~"attraction|museum|artwork|gallery|viewpoint|zoo"]["name"](${south},${west},${north},${east});
  way["tourism"~"attraction|museum|artwork|gallery|viewpoint|zoo"]["name"](${south},${west},${north},${east});
  relation["tourism"~"museum|attraction"]["name"](${south},${west},${north},${east});
  node["historic"~"monument|memorial|castle|palace|ruins|archaeological_site|city_gate|yes"]["name"](${south},${west},${north},${east});
  way["historic"~"monument|memorial|castle|palace|ruins|archaeological_site|city_gate|yes"]["name"](${south},${west},${north},${east});
  way["building"="museum"]["name"](${south},${west},${north},${east});
  node["amenity"~"theatre|cinema|place_of_worship"]["name"]["tourism"](${south},${west},${north},${east});
  node["amenity"~"theatre|cinema"]["name"](${south},${west},${north},${east});
  way["leisure"="park"]["name"]["wikipedia"](${south},${west},${north},${east});
  node["leisure"="park"]["name"]["wikipedia"](${south},${west},${north},${east});
  node["amenity"~"restaurant|cafe|fast_food|food_court"]["name"](${south},${west},${north},${east});
  way["amenity"~"restaurant|cafe|fast_food|food_court"]["name"](${south},${west},${north},${east});
);
out body center tags;
`;
  }

  const museumExtras =
    venueKind === "museum" || venueKind === "historic"
      ? `
  node["tourism"]["name"](${south},${west},${north},${east});
  way["tourism"]["name"](${south},${west},${north},${east});
  node["artwork_type"]["name"](${south},${west},${north},${east});
  node["memorial"]["name"](${south},${west},${north},${east});
  node["information"="board"]["name"](${south},${west},${north},${east});
  node["tourism"="yes"]["name"](${south},${west},${north},${east});
  way["building"="museum"]["name"](${south},${west},${north},${east});
`
      : "";
  const parkExtras =
    venueKind === "theme_park" || venueKind === "zoo"
      ? `
  node["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|toilets|atm|bureau_de_change|information|drinking_water"]["name"](${south},${west},${north},${east});
  way["amenity"~"restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|toilets|information"]["name"](${south},${west},${north},${east});
  node["shop"]["name"](${south},${west},${north},${east});
  way["shop"]["name"](${south},${west},${north},${east});
  node["amenity"="theatre"]["name"](${south},${west},${north},${east});
  node["amenity"="cinema"]["name"](${south},${west},${north},${east});
`
      : "";
  return `
[out:json][timeout:45];
(
  node["tourism"~"attraction|theme_park|museum|artwork|gallery|zoo|viewpoint"](${south},${west},${north},${east});
  way["tourism"~"attraction|theme_park|museum|artwork|gallery|zoo|viewpoint"](${south},${west},${north},${east});
  node["attraction"](${south},${west},${north},${east});
  way["attraction"](${south},${west},${north},${east});
  node["historic"]["name"](${south},${west},${north},${east});
  way["historic"]["name"](${south},${west},${north},${east});
  node["leisure"~"amusement_arcade|water_park|park"]["name"](${south},${west},${north},${east});
  way["tourism"="theme_park"](${south},${west},${north},${east});
  relation["tourism"="theme_park"](${south},${west},${north},${east});
  way["tourism"="museum"](${south},${west},${north},${east});
  relation["tourism"="museum"](${south},${west},${north},${east});
  way["building"="museum"](${south},${west},${north},${east});
  way["name"]["tourism"](${south},${west},${north},${east});
  ${museumExtras}
  ${parkExtras}
);
out body center tags;
`;
}

export function buildLayoutQuery(bbox: BBox, venueKind: VenueKind = "other"): string {
  const { south, west, north, east } = bbox;
  if (venueKind === "city") {
    return `
[out:json][timeout:45];
(
  way["leisure"="park"]["name"](${south},${west},${north},${east});
  relation["leisure"="park"]["name"](${south},${west},${north},${east});
  way["place"~"neighbourhood|suburb|quarter"]["name"](${south},${west},${north},${east});
  relation["place"~"neighbourhood|suburb|quarter"]["name"](${south},${west},${north},${east});
  way["tourism"~"museum|attraction"]["name"](${south},${west},${north},${east});
  way["historic"~"castle|palace|walls"]["name"](${south},${west},${north},${east});
);
out geom tags;
`;
  }
  return `
[out:json][timeout:45];
(
  way["tourism"~"theme_park|museum|zoo"](${south},${west},${north},${east});
  relation["tourism"~"theme_park|museum|zoo"](${south},${west},${north},${east});
  way["leisure"="park"]["name"](${south},${west},${north},${east});
  way["landuse"="recreation_ground"]["name"](${south},${west},${north},${east});
  way["place"="neighbourhood"]["name"](${south},${west},${north},${east});
  way["building"]["name"](${south},${west},${north},${east});
);
out geom tags;
`;
}
