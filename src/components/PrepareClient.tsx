"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AttractionDetail } from "@/components/AttractionDetail";
import { Attribution } from "@/components/Attribution";
import { UiIcons, VenueKindIcon } from "@/components/Icons";
import { PrepareAttractionList } from "@/components/prepare/PrepareAttractionList";
import { PreparePrefs } from "@/components/prepare/PreparePrefs";
import { ThemeShell } from "@/components/ThemeShell";
import { useApp } from "@/components/Providers";
import { usePreparePack } from "@/hooks/usePreparePack";
import { themeForKind } from "@/lib/theme";

function PrepareInner() {
  const { tr } = useApp();
  const params = useSearchParams();
  const prepare = usePreparePack(params.get("id"));

  if (!prepare.place || (!prepare.online && prepare.phase !== "review")) {
    return (
      <ThemeShell>
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 py-8">
          <p className="text-[var(--danger)]">{tr("errorGeneric")}</p>
          <Link href="/" className="btn btn-secondary mt-4 w-fit">
            {tr("back")}
          </Link>
        </div>
      </ThemeShell>
    );
  }

  if (prepare.phase === "loading") {
    return (
      <ThemeShell>
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="pulse-dot mb-4" />
          <h1 className="display text-3xl font-bold">{tr("preparing")}</h1>
          <p className="mt-2 text-[var(--muted)]">{tr("prepareHint")}</p>
        </div>
      </ThemeShell>
    );
  }

  if (prepare.phase === "error" || !prepare.venue) {
    return (
      <ThemeShell>
        <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 py-8">
          <p className="text-[var(--danger)]">
            {prepare.error || tr("errorGeneric")}
          </p>
          <Link href="/" className="btn btn-secondary mt-4 w-fit">
            {tr("back")}
          </Link>
        </div>
      </ThemeShell>
    );
  }

  const { venue } = prepare;
  const kindTheme = themeForKind(venue.venueKind);

  return (
    <ThemeShell kind={venue.venueKind}>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-6">
        <Link href="/" className="mb-4 text-sm font-bold text-[var(--accent-2)]">
          ← {tr("back")}
        </Link>
        <header className="overflow-hidden rounded-2xl border border-[var(--line)]">
          {venue.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.imageUrl}
              alt={venue.name}
              className="h-28 w-full object-cover"
            />
          ) : null}
          <div className="bg-[var(--panel)] px-3 py-3">
            <p className="mb-0.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              <VenueKindIcon kind={venue.venueKind} className="h-3.5 w-3.5" />
              {tr(kindTheme.labelKey)}
            </p>
            <h1 className="display text-2xl font-bold leading-tight">
              {venue.name}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {prepare.visibleCount} {tr("attractionsFound")} · {tr("basedOnOsm")}
            </p>
            {venue.description && (
              <p className="mt-2 line-clamp-3 text-sm text-[var(--ink)]/85">
                {venue.description}
              </p>
            )}
          </div>
        </header>

        {venue.sparse && (
          <div className="card mt-4 border-[var(--accent)] p-4">
            <p className="font-extrabold text-[var(--accent)]">
              {tr("sparseTitle")}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{tr("sparseBody")}</p>
          </div>
        )}

        <PreparePrefs prefs={prepare.prefs} onChange={prepare.setPrefs} />

        <PrepareAttractionList
          attractions={prepare.attractions}
          availableKinds={prepare.availableKinds}
          kindFilters={prepare.kindFilters}
          onKindFiltersChange={prepare.setKindFilters}
          hidden={prepare.hidden}
          mustSee={prepare.mustSee}
          onToggleMustSee={prepare.toggleMustSee}
          onToggleHidden={prepare.toggleHidden}
          onOpenDetail={prepare.setDetailId}
        />

        <section className="card mt-6 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={prepare.smartRouteOn}
              disabled={
                !prepare.aiConfigured || !prepare.online || prepare.building
              }
              onChange={(e) => prepare.setUseSmartRoute(e.target.checked)}
            />
            <span>
              <span className="inline-flex items-center gap-2 font-extrabold">
                <UiIcons.sparkles className="h-4 w-4 text-[var(--accent)]" />
                {tr("smartRoute")}
              </span>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {!prepare.aiConfigured
                  ? tr("smartRouteUnavailable")
                  : tr("smartRouteLocked")}
              </p>
            </span>
          </label>
        </section>

        {prepare.buildNote && (
          <p className="mt-4 text-center text-sm text-[var(--accent-2)]">
            {prepare.buildNote}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          onClick={prepare.buildPlan}
          disabled={prepare.building}
        >
          <UiIcons.sparkles className="h-4 w-4" />
          {prepare.building ? tr("buildingSmart") : tr("buildPlan")}
        </button>
        <Attribution />
        {prepare.detail && (
          <AttractionDetail
            attraction={prepare.detail}
            onClose={() => prepare.setDetailId(null)}
          />
        )}
      </div>
    </ThemeShell>
  );
}

export function PrepareClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8">
          …
        </div>
      }
    >
      <PrepareInner />
    </Suspense>
  );
}
