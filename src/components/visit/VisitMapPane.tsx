"use client";

import { GeoMapDynamic } from "@/components/GeoMapDynamic";
import { UiIcons } from "@/components/Icons";
import { SchematicMap } from "@/components/SchematicMap";
import { useApp } from "@/components/Providers";
import type { Attraction, PlannedStop, Venue } from "@/lib/types";

export function VisitMapPane({
  venue,
  attractions,
  stops,
  nextStop,
  mapMode,
  onMapModeChange,
  onSelectAttraction,
}: {
  venue: Venue;
  attractions: Attraction[];
  stops: PlannedStop[];
  nextStop?: PlannedStop;
  mapMode: "schematic" | "street";
  onMapModeChange: (mode: "schematic" | "street") => void;
  onSelectAttraction: (id: string) => void;
}) {
  const { tr } = useApp();

  return (
    <div className="mt-3 space-y-3">
      <div
        className="seg"
        role="tablist"
        aria-label={`${tr("schematic")} / ${tr("streetMap")}`}
      >
        <button
          type="button"
          role="tab"
          data-active={mapMode === "schematic"}
          aria-selected={mapMode === "schematic"}
          onClick={() => onMapModeChange("schematic")}
        >
          <UiIcons.compass className="h-4 w-4" />
          {tr("schematic")}
        </button>
        <button
          type="button"
          role="tab"
          data-active={mapMode === "street"}
          aria-selected={mapMode === "street"}
          onClick={() => onMapModeChange("street")}
        >
          <UiIcons.mapPinned className="h-4 w-4" />
          {tr("streetMap")}
        </button>
      </div>
      {mapMode === "schematic" ? (
        <SchematicMap
          layout={venue.layout}
          attractions={attractions}
          stops={stops}
          nextStopId={nextStop?.id}
          onSelectAttraction={onSelectAttraction}
        />
      ) : (
        <GeoMapDynamic
          bbox={venue.bbox}
          attractions={attractions}
          stops={stops}
          nextAttractionId={nextStop?.attractionId}
          onSelect={onSelectAttraction}
        />
      )}
    </div>
  );
}
