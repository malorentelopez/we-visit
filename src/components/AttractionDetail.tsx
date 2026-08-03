"use client";

import { ExternalLink, Clock, Star, X } from "lucide-react";
import { PlaceKindIcon } from "@/components/Icons";
import { placeKindLabelKey } from "@/components/PlaceKindFilters";
import { useApp } from "@/components/Providers";
import type { Attraction, StopNote } from "@/lib/types";

export function AttractionDetail({
  attraction,
  note,
  onClose,
}: {
  attraction: Attraction;
  note?: StopNote;
  onClose: () => void;
}) {
  const { tr } = useApp();
  const requirements = note?.requirements ?? [];
  const tip = note?.tip;
  const hasGoodToKnow =
    requirements.length > 0 ||
    Boolean(tip) ||
    Boolean(attraction.minHeight) ||
    Boolean(attraction.accessNote);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div
        className="card max-h-[88vh] w-full max-w-lg overflow-y-auto p-0"
        role="dialog"
        aria-modal="true"
        aria-label={attraction.name}
      >
        {attraction.imageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attraction.imageUrl}
              alt={attraction.name}
              className="h-48 w-full object-cover"
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-black/55 p-2"
              onClick={onClose}
              aria-label={tr("back")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end px-3 pt-3">
            <button
              type="button"
              className="rounded-full bg-black/35 p-2"
              onClick={onClose}
              aria-label={tr("back")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 rounded-xl bg-[rgba(244,239,230,0.1)] p-2">
              <PlaceKindIcon
                kind={attraction.placeKind}
                className="h-5 w-5"
              />
            </span>
            <div>
              <h2 className="display text-2xl font-bold">{attraction.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(244,239,230,0.1)] px-2 py-0.5 text-xs font-bold">
                  {tr(placeKindLabelKey(attraction.placeKind))}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {attraction.worthScore}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />~
                  {attraction.estimatedMinutes}m
                </span>
              </p>
            </div>
          </div>
          {attraction.description ? (
            <p className="text-sm leading-relaxed text-[var(--ink)]/90">
              {attraction.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted)]">{tr("noDetails")}</p>
          )}
          {attraction.openingHours && (
            <p className="text-sm text-[var(--muted)]">
              {tr("hours")}: {attraction.openingHours}
            </p>
          )}
          {hasGoodToKnow && (
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--accent)]">
                {tr("goodToKnow")}
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-[var(--ink)]/90">
                {attraction.minHeight &&
                  !requirements.some((r) =>
                    r.toLowerCase().includes("height"),
                  ) && <li>Min height {attraction.minHeight}</li>}
                {attraction.accessNote &&
                  !requirements.some((r) => r.includes(attraction.accessNote!)) && (
                    <li>{attraction.accessNote}</li>
                  )}
                {requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {tip && <li className="text-[var(--muted)]">{tip}</li>}
              </ul>
            </div>
          )}
          {attraction.wikipediaUrl && (
            <a
              href={attraction.wikipediaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-2)]"
            >
              <ExternalLink className="h-4 w-4" />
              {tr("readMore")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
