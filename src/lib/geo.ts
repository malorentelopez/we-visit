import type { BBox, LatLng, LayoutPoint } from "./types";

const EARTH_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

export function expandBBox(bbox: BBox, padRatio: number): BBox {
  const latPad = (bbox.north - bbox.south) * padRatio || 0.002;
  const lngPad = (bbox.east - bbox.west) * padRatio || 0.002;
  return {
    south: bbox.south - latPad,
    west: bbox.west - lngPad,
    north: bbox.north + latPad,
    east: bbox.east + lngPad,
  };
}

export function bboxFromCenter(
  lat: number,
  lng: number,
  radiusKm: number,
): BBox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    south: lat - latDelta,
    west: lng - lngDelta,
    north: lat + latDelta,
    east: lng + lngDelta,
  };
}

export function projectToLayout(
  points: LatLng[],
  bbox: BBox,
  width = 1000,
  height = 1000,
  padding = 40,
): LayoutPoint[] {
  const spanLat = Math.max(bbox.north - bbox.south, 0.0001);
  const spanLng = Math.max(bbox.east - bbox.west, 0.0001);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return points.map((p) => ({
    x: padding + ((p.lng - bbox.west) / spanLng) * innerW,
    y: padding + ((bbox.north - p.lat) / spanLat) * innerH,
  }));
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
