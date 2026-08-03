"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useViewportTransform } from "@/hooks/useViewportTransform";
import type { Attraction, PlannedStop, VenueLayout } from "@/lib/types";
import { useApp } from "./Providers";

type Props = {
  layout: VenueLayout;
  attractions: Attraction[];
  stops: PlannedStop[];
  nextStopId?: string;
  onSelectAttraction?: (attractionId: string) => void;
};

export function SchematicMap({
  layout,
  attractions,
  stops,
  nextStopId,
  onSelectAttraction,
}: Props) {
  const { tr } = useApp();
  const {
    containerRef,
    view,
    zoomBy,
    resetView,
    consumeSuppressedClick,
    surfaceProps,
  } = useViewportTransform();

  const attractionById = new Map(attractions.map((a) => [a.id, a]));
  const pinByAttraction = new Map(layout.pins.map((p) => [p.attractionId, p]));
  const activeStops = stops.filter(
    (s) => s.kind === "attraction" && s.status === "todo" && s.attractionId,
  );
  const next = stops.find((s) => s.id === nextStopId) ?? activeStops[0];
  const nextPin = next?.attractionId
    ? pinByAttraction.get(next.attractionId)
    : undefined;

  const pathPoints = activeStops
    .map((s) => (s.attractionId ? pinByAttraction.get(s.attractionId) : null))
    .filter(Boolean) as Array<{ x: number; y: number }>;

  if (layout.pins.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-6 text-center text-sm text-[var(--muted)]">
        {tr("noLayout")}
      </div>
    );
  }

  const outline = layout.outline.map((p) => `${p.x},${p.y}`).join(" ");
  const pathD =
    pathPoints.length > 1
      ? pathPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
      <div
        ref={containerRef}
        className="h-[420px] w-full touch-none select-none"
        style={{ cursor: "grab" }}
        {...surfaceProps}
        role="application"
        aria-label={tr("schematic")}
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-full w-full"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <defs>
            <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--map-ground-0, #1a4a43)" />
              <stop offset="100%" stopColor="var(--map-ground-1, #0f2e2a)" />
            </linearGradient>
          </defs>
          <rect width={layout.width} height={layout.height} fill="url(#ground)" />
          {layout.zones.map((zone) => (
            <polygon
              key={zone.id}
              points={zone.path.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="color-mix(in srgb, var(--accent-2) 18%, transparent)"
              stroke="color-mix(in srgb, var(--accent-2) 45%, transparent)"
              strokeWidth="2"
            />
          ))}
          {outline && (
            <polygon
              points={outline}
              fill="rgba(255,255,255,0.04)"
              stroke="var(--accent-2)"
              strokeWidth="4"
            />
          )}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14 10"
              opacity="0.9"
            />
          )}
          {layout.pins.map((pin, index) => {
            const attraction = attractionById.get(pin.attractionId);
            const stop = stops.find((s) => s.attractionId === pin.attractionId);
            const isNext = nextPin?.attractionId === pin.attractionId;
            const done = stop?.status === "done";
            const skipped = stop?.status === "skipped";
            const order =
              stop && stop.kind === "attraction"
                ? stops
                    .filter((s) => s.kind === "attraction")
                    .findIndex((s) => s.id === stop.id) + 1
                : index + 1;
            return (
              <g
                key={pin.attractionId}
                transform={`translate(${pin.x} ${pin.y})`}
                style={{ cursor: onSelectAttraction ? "pointer" : "grab" }}
                onClick={(event) => {
                  if (consumeSuppressedClick()) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  onSelectAttraction?.(pin.attractionId);
                }}
              >
                <circle
                  r={isNext ? 22 : 16}
                  fill={
                    done
                      ? "#3d8b6e"
                      : skipped
                        ? "#5c5c5c"
                        : isNext
                          ? "var(--accent)"
                          : "var(--ink)"
                  }
                  stroke="var(--bg0)"
                  strokeWidth="3"
                />
                <text
                  textAnchor="middle"
                  y="5"
                  fontSize="14"
                  fontWeight="700"
                  fill="var(--bg0)"
                >
                  {order || ""}
                </text>
                {attraction && isNext && view.scale >= 0.9 && (
                  <text
                    textAnchor="middle"
                    y="-30"
                    fontSize="20"
                    fontWeight="700"
                    fill="var(--ink)"
                  >
                    {attraction.name.slice(0, 22)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          className="map-ctrl"
          aria-label={tr("zoomIn")}
          onClick={() => zoomBy(1.25)}
        >
          <Plus aria-hidden />
        </button>
        <button
          type="button"
          className="map-ctrl"
          aria-label={tr("zoomOut")}
          onClick={() => zoomBy(0.8)}
        >
          <Minus aria-hidden />
        </button>
        <button
          type="button"
          className="map-ctrl"
          aria-label={tr("resetMap")}
          onClick={resetView}
        >
          <RotateCcw aria-hidden />
        </button>
      </div>
      <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold text-[var(--ink)]">
        {tr("mapHint")}
      </p>
    </div>
  );
}
