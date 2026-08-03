export type VenueKind =
  | "theme_park"
  | "museum"
  | "zoo"
  | "historic"
  | "city"
  | "other";

/** What kind of stop this is inside a venue (especially theme parks). */
export type PlaceKind =
  | "ride"
  | "show"
  | "restaurant"
  | "shop"
  | "service"
  | "exhibit"
  | "other";

export type PartyType = "kids" | "mixed" | "adults";
export type PaceType = "relaxed" | "normal" | "packed";
export type StopStatus = "todo" | "done" | "skipped";

export type Locale = "en" | "es";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface SearchResult {
  osmType: "node" | "way" | "relation";
  osmId: number;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  bbox: BBox;
  category: string;
  type: string;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutZone {
  id: string;
  name: string;
  path: LayoutPoint[];
}

export interface VenueLayout {
  width: number;
  height: number;
  outline: LayoutPoint[];
  zones: LayoutZone[];
  pins: Array<{ attractionId: string; x: number; y: number }>;
}

export interface Attraction {
  id: string;
  venueId: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  placeKind: PlaceKind;
  worthScore: number;
  estimatedMinutes: number;
  openingHours?: string;
  /** From OSM when present, e.g. "1.20 m". */
  minHeight?: string;
  /** Short OSM-derived access note (fee, reservation, etc.). */
  accessNote?: string;
  zoneId?: string;
  tags: Record<string, string>;
  description?: string;
  imageUrl?: string;
  wikipediaUrl?: string;
  userHidden?: boolean;
  userAdded?: boolean;
  mustSee?: boolean;
}

/** AI / planner notes keyed by attraction id. */
export interface StopNote {
  requirements?: string[];
  tip?: string;
  reason?: string;
}

export interface Venue {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  bbox: BBox;
  osmType: "node" | "way" | "relation";
  osmId: number;
  venueKind: VenueKind;
  layout: VenueLayout;
  imageUrl?: string;
  description?: string;
  source: {
    nominatim: boolean;
    overpass: boolean;
    preparedAt: string;
  };
  preparedAt: string;
  sparse: boolean;
}

export interface VisitPrefs {
  party: PartyType;
  pace: PaceType;
  breakMinutes: number;
  dayCount: number;
  startHour: number;
  hoursPerDay: number;
}

export interface CustomStop {
  id: string;
  name: string;
  estimatedMinutes: number;
  afterStopId?: string;
}

export interface PlannedStop {
  id: string;
  kind: "attraction" | "break" | "custom";
  attractionId?: string;
  customId?: string;
  name: string;
  dayIndex: number;
  order: number;
  suggestedStartMinutes: number;
  estimatedMinutes: number;
  status: StopStatus;
  lat?: number;
  lng?: number;
  /** Short planner tip (e.g. lunch reason). */
  tip?: string;
}

/** Extra AI guidance saved with the visit (lunch + side ideas). */
export interface PlanExtras {
  summary?: string;
  lunchTip?: string;
  sideVisits?: Array<{
    attractionId?: string;
    title: string;
    tip: string;
  }>;
}

export interface LunchPlan {
  /** Insert lunch after this attraction id when present in the day plan. */
  afterAttractionId?: string;
  /** Prefer this restaurant/cafe attraction as the lunch place. */
  restaurantId?: string;
  label?: string;
  tip?: string;
}

export interface VisitSession {
  id: string;
  venueId: string;
  venueName: string;
  createdAt: string;
  updatedAt: string;
  readyForPark: boolean;
  prefs: VisitPrefs;
  stops: PlannedStop[];
  customStops: CustomStop[];
  hiddenAttractionIds: string[];
  mustSeeAttractionIds: string[];
  /** Optional AI notes for attractions in this visit. */
  stopNotes?: Record<string, StopNote>;
  /** How the current stop order was produced. Survives offline after save. */
  planSource?: "ai" | "heuristic";
  /** Lunch tip + side visits from AI (or heuristic lunch pick). */
  planExtras?: PlanExtras;
}

export interface VenuePack {
  venue: Venue;
  attractions: Attraction[];
  session: VisitSession;
}

export interface PrepareResponse {
  venue: Venue;
  attractions: Attraction[];
  sparse: boolean;
  message?: string;
}
