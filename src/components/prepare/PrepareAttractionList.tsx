"use client";

import {
  PlaceKindFilters,
  placeKindLabelKey,
} from "@/components/PlaceKindFilters";
import { PlaceKindIcon, UiIcons } from "@/components/Icons";
import { useApp } from "@/components/Providers";
import type { Attraction, PlaceKind } from "@/lib/types";

export function PrepareAttractionList({
  attractions,
  availableKinds,
  kindFilters,
  onKindFiltersChange,
  hidden,
  mustSee,
  onToggleMustSee,
  onToggleHidden,
  onOpenDetail,
}: {
  attractions: Attraction[];
  availableKinds: PlaceKind[];
  kindFilters: PlaceKind[];
  onKindFiltersChange: (kinds: PlaceKind[]) => void;
  hidden: string[];
  mustSee: string[];
  onToggleMustSee: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  const { tr } = useApp();
  const filtered = attractions.filter(
    (a) => kindFilters.length === 0 || kindFilters.includes(a.placeKind),
  );

  return (
    <section className="mt-6">
      <h2 className="display text-2xl font-bold">{tr("reviewTitle")}</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">{tr("photosNote")}</p>
      <PlaceKindFilters
        available={availableKinds}
        selected={kindFilters}
        onChange={onKindFiltersChange}
      />
      <ul className="mt-3 space-y-2">
        {filtered.map((attraction) => {
          const isHidden = hidden.includes(attraction.id);
          const isMust = mustSee.includes(attraction.id);
          const placeKind = attraction.placeKind;
          return (
            <li
              key={attraction.id}
              className="card overflow-hidden p-0"
              style={{ opacity: isHidden ? 0.45 : 1 }}
            >
              <div className="flex gap-3 p-3">
                <button
                  type="button"
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[rgba(0,0,0,0.2)]"
                  onClick={() => onOpenDetail(attraction.id)}
                >
                  {attraction.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attraction.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <PlaceKindIcon kind={placeKind} className="h-6 w-6 opacity-80" />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpenDetail(attraction.id)}
                >
                  <p className="font-extrabold">{attraction.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {tr(placeKindLabelKey(placeKind))} · ★ {attraction.worthScore} · ~
                    {attraction.estimatedMinutes}m
                  </p>
                  {attraction.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--ink)]/75">
                      {attraction.description}
                    </p>
                  )}
                </button>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="chip px-2 py-1"
                    data-active={isMust}
                    aria-label={tr("mustSee")}
                    onClick={() => onToggleMustSee(attraction.id)}
                  >
                    <UiIcons.star className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="chip px-2 py-1"
                    aria-label={isHidden ? tr("show") : tr("hide")}
                    onClick={() => onToggleHidden(attraction.id)}
                  >
                    {isHidden ? (
                      <UiIcons.eye className="h-4 w-4" />
                    ) : (
                      <UiIcons.eyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
