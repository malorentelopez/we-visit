"use client";

import { PlaceKindIcon } from "@/components/Icons";
import { useApp } from "@/components/Providers";
import type { MessageKey } from "@/lib/i18n";
import { PLACE_KIND_FILTERS } from "@/lib/placeKind";
import type { PlaceKind } from "@/lib/types";

export { defaultPlaceKindFilters } from "@/lib/placeKind";

const LABEL_KEYS: Record<PlaceKind, MessageKey> = {
  ride: "placeKindRide",
  show: "placeKindShow",
  restaurant: "placeKindRestaurant",
  shop: "placeKindShop",
  service: "placeKindService",
  exhibit: "placeKindExhibit",
  other: "placeKindOther",
};

export function PlaceKindFilters({
  available,
  selected,
  onChange,
}: {
  available: PlaceKind[];
  selected: PlaceKind[];
  onChange: (next: PlaceKind[]) => void;
}) {
  const { tr } = useApp();
  const options = PLACE_KIND_FILTERS.filter((kind) => available.includes(kind));
  if (options.length <= 1) return null;

  function toggle(kind: PlaceKind) {
    if (selected.includes(kind)) {
      if (selected.length === 1) return;
      onChange(selected.filter((k) => k !== kind));
      return;
    }
    onChange([...selected, kind]);
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
        {tr("filterTypes")}
      </p>
      <div className="filter-row min-w-0 flex-1">
        {options.map((kind) => {
          const label = tr(LABEL_KEYS[kind]);
          const active = selected.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              className="filter-chip"
              data-active={active}
              aria-pressed={active}
              title={label}
              onClick={() => toggle(kind)}
            >
              <PlaceKindIcon kind={kind} className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function placeKindLabelKey(kind: PlaceKind): MessageKey {
  return LABEL_KEYS[kind];
}
