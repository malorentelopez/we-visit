"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AttractionDetail } from "@/components/AttractionDetail";
import { Attribution } from "@/components/Attribution";
import { UiIcons } from "@/components/Icons";
import { ThemeShell } from "@/components/ThemeShell";
import { VisitMapPane } from "@/components/visit/VisitMapPane";
import { VisitNow } from "@/components/visit/VisitNow";
import { VisitPlanTools } from "@/components/visit/VisitPlanTools";
import { VisitSideVisits } from "@/components/visit/VisitSideVisits";
import { VisitTimeline } from "@/components/visit/VisitTimeline";
import { useApp } from "@/components/Providers";
import { useVisitPack } from "@/hooks/useVisitPack";

export function VisitClient() {
  const { tr, online } = useApp();
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<"list" | "map">("list");
  const [mapMode, setMapMode] = useState<"schematic" | "street">("schematic");
  const visit = useVisitPack(params.id);

  if (visit.missing) {
    return (
      <ThemeShell>
        <div className="visit-shell">
          <p className="text-[var(--danger)]">{tr("errorGeneric")}</p>
          <Link href="/" className="btn btn-secondary mt-4 w-fit">
            {tr("back")}
          </Link>
        </div>
      </ThemeShell>
    );
  }

  if (!visit.pack) {
    return (
      <ThemeShell>
        <div className="visit-shell items-center justify-center">
          <span className="pulse-dot" />
        </div>
      </ThemeShell>
    );
  }

  const { pack, nextStop, progress } = visit;
  const WifiIcon = online ? UiIcons.wifi : UiIcons.wifiOff;
  const progressPct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const progressLabel = tr("progressOf")
    .replace("{done}", String(progress.done))
    .replace("{total}", String(progress.total));

  return (
    <ThemeShell kind={pack.venue.venueKind}>
      <div className="visit-shell">
        <div className="visit-top">
          <Link href="/" className="visit-top__back">
            ← {tr("back")}
          </Link>
          <h1 className="visit-top__title">{pack.venue.name}</h1>
          <span className="visit-top__icons">
            {pack.session.planSource === "ai" && (
              <span title={tr("usedSmartRoute")} aria-label={tr("usedSmartRoute")}>
                <UiIcons.sparkles className="h-4 w-4 text-[var(--accent)]" />
              </span>
            )}
            <span title={tr("savedOnPhone")} aria-label={tr("savedOnPhone")}>
              <UiIcons.phone className="h-4 w-4" />
            </span>
            <span
              title={online ? tr("online") : tr("offline")}
              aria-label={online ? tr("online") : tr("offline")}
            >
              <WifiIcon className="h-4 w-4" />
            </span>
          </span>
        </div>

        <div className="visit-progress" aria-label={progressLabel}>
          <div className="visit-progress__track">
            <div
              className="visit-progress__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="visit-progress__label">{progressLabel}</span>
        </div>

        {nextStop && (
          <VisitNow
            stop={nextStop}
            attraction={visit.nextAttraction}
            tip={visit.nextTip}
            remaining={visit.remaining}
            onOpenDetail={visit.setDetail}
            onDone={() => visit.setStatus(nextStop.id, "done")}
            onSkip={() => visit.setStatus(nextStop.id, "skipped")}
          />
        )}

        <div
          className="seg"
          role="tablist"
          aria-label={`${tr("list")} / ${tr("map")}`}
        >
          <button
            type="button"
            role="tab"
            data-active={tab === "list"}
            aria-selected={tab === "list"}
            onClick={() => setTab("list")}
          >
            <UiIcons.list className="h-4 w-4" />
            {tr("list")}
          </button>
          <button
            type="button"
            role="tab"
            data-active={tab === "map"}
            aria-selected={tab === "map"}
            onClick={() => setTab("map")}
          >
            <UiIcons.map className="h-4 w-4" />
            {tr("map")}
          </button>
        </div>

        {tab === "map" ? (
          <VisitMapPane
            venue={pack.venue}
            attractions={pack.attractions}
            stops={pack.session.stops}
            nextStop={nextStop}
            mapMode={mapMode}
            onMapModeChange={setMapMode}
            onSelectAttraction={visit.openAttraction}
          />
        ) : (
          <VisitTimeline
            pack={pack}
            days={visit.days}
            dayFilter={visit.dayFilter}
            onDayFilterChange={visit.setDayFilter}
            availableKinds={visit.availableKinds}
            kindFilters={visit.kindFilters}
            onKindFiltersChange={visit.setKindFilters}
            dayStops={visit.dayStops}
            focusedStopId={visit.focusedStopId}
            onFocusStop={visit.setFocusedStopId}
            onOpenAttraction={visit.openAttraction}
            onSetStatus={visit.setStatus}
            onMoveStop={visit.moveStop}
          />
        )}

        {pack.session.planExtras?.sideVisits?.length ? (
          <VisitSideVisits
            sideVisits={pack.session.planExtras.sideVisits}
            onOpenAttraction={visit.openAttraction}
          />
        ) : null}

        <VisitPlanTools
          customName={visit.customName}
          onCustomNameChange={visit.setCustomName}
          onAddCustom={visit.addCustom}
          regenerating={visit.regenerating}
          onRegenerateAi={visit.regenerateWithAi}
          onReplan={visit.replan}
          onRemoveVisit={visit.removeVisit}
          planNote={visit.planNote}
        />

        <Attribution />
        {visit.detail && (
          <AttractionDetail
            attraction={visit.detail}
            note={pack.session.stopNotes?.[visit.detail.id]}
            onClose={() => visit.setDetail(null)}
          />
        )}
      </div>
    </ThemeShell>
  );
}
