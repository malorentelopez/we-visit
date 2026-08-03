"use client";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Attraction, BBox, PlannedStop } from "@/lib/types";
import "leaflet/dist/leaflet.css";

function FitBounds({ bbox }: { bbox: BBox }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [bbox.south, bbox.west],
        [bbox.north, bbox.east],
      ],
      { padding: [28, 28], maxZoom: 18 },
    );
    map.scrollWheelZoom.enable();
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
  }, [map, bbox]);
  return null;
}

export function GeoMap({
  bbox,
  attractions,
  stops,
  nextAttractionId,
  onSelect,
}: {
  bbox: BBox;
  attractions: Attraction[];
  stops: PlannedStop[];
  nextAttractionId?: string;
  onSelect?: (attractionId: string) => void;
}) {
  const center: [number, number] = [
    (bbox.north + bbox.south) / 2,
    (bbox.east + bbox.west) / 2,
  ];

  const orderedPins = stops
    .filter((s) => s.kind === "attraction" && s.attractionId && s.status === "todo")
    .map((s) => {
      const attraction = attractions.find((a) => a.id === s.attractionId);
      return attraction ? ([attraction.lat, attraction.lng] as [number, number]) : null;
    })
    .filter(Boolean) as Array<[number, number]>;

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--line)] shadow-[var(--shadow)]">
      <MapContainer
        center={center}
        zoom={15}
        className="h-[420px] w-full touch-manipulation"
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom
        zoomControl
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bbox={bbox} />
        {orderedPins.length > 1 && (
          <Polyline
            positions={orderedPins}
            pathOptions={{
              color: "var(--accent)",
              weight: 4,
              dashArray: "10 8",
              opacity: 0.9,
            }}
          />
        )}
        {attractions.map((attraction) => {
          const stop = stops.find((s) => s.attractionId === attraction.id);
          const isNext = attraction.id === nextAttractionId;
          const done = stop?.status === "done";
          const skipped = stop?.status === "skipped";
          const color = done
            ? "#3d8b6e"
            : skipped
              ? "#777"
              : isNext
                ? "var(--accent)"
                : "var(--accent-2)";
          return (
            <CircleMarker
              key={attraction.id}
              center={[attraction.lat, attraction.lng]}
              radius={isNext ? 11 : 8}
              pathOptions={{
                color: "#111",
                weight: 1,
                fillColor: color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => onSelect?.(attraction.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {attraction.name}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
