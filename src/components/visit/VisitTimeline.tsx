"use client";

import {
  PlaceKindFilters,
  placeKindLabelKey,
} from "@/components/PlaceKindFilters";
import { UiIcons } from "@/components/Icons";
import { useApp } from "@/components/Providers";
import { formatMinutesAsTime } from "@/lib/geo";
import { tipLine } from "@/lib/planner/stopTip";
import type {
  PlaceKind,
  PlannedStop,
  StopNote,
  VenuePack,
} from "@/lib/types";

export function VisitTimeline({
  pack,
  days,
  dayFilter,
  onDayFilterChange,
  availableKinds,
  kindFilters,
  onKindFiltersChange,
  dayStops,
  focusedStopId,
  onFocusStop,
  onOpenAttraction,
  onSetStatus,
  onMoveStop,
}: {
  pack: VenuePack;
  days: number[];
  dayFilter: number;
  onDayFilterChange: (day: number) => void;
  availableKinds: PlaceKind[];
  kindFilters: PlaceKind[];
  onKindFiltersChange: (kinds: PlaceKind[]) => void;
  dayStops: PlannedStop[];
  focusedStopId: string | null;
  onFocusStop: (id: string | null) => void;
  onOpenAttraction: (id: string) => void;
  onSetStatus: (stopId: string, status: "done" | "skipped") => void;
  onMoveStop: (stopId: string, direction: -1 | 1) => void;
}) {
  const { tr } = useApp();

  return (
    <>
      {days.length > 1 && (
        <div className="day-tabs mt-3" role="tablist">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              role="tab"
              data-active={dayFilter === day}
              aria-selected={dayFilter === day}
              onClick={() => onDayFilterChange(day)}
            >
              {tr("day")} {day + 1}
            </button>
          ))}
        </div>
      )}
      <PlaceKindFilters
        available={availableKinds}
        selected={kindFilters}
        onChange={onKindFiltersChange}
      />
      <ul className="visit-timeline">
        {dayStops.map((stop) => {
          const attraction = stop.attractionId
            ? pack.attractions.find((a) => a.id === stop.attractionId)
            : undefined;
          const placeKind =
            stop.kind === "break"
              ? ("restaurant" as const)
              : (attraction?.placeKind ?? "other");
          const note: StopNote | undefined = stop.attractionId
            ? pack.session.stopNotes?.[stop.attractionId]
            : undefined;
          const rowTip = tipLine(note, attraction);
          const focused = focusedStopId === stop.id;

          if (stop.kind === "break") {
            const lunchTip = stop.tip || pack.session.planExtras?.lunchTip;
            return (
              <li key={stop.id}>
                <div className="visit-stop visit-break">
                  <span className="visit-stop__time">
                    {formatMinutesAsTime(stop.suggestedStartMinutes)}
                  </span>
                  <div className="visit-stop__body">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        if (stop.attractionId) {
                          onOpenAttraction(stop.attractionId);
                        }
                      }}
                    >
                      <p className="visit-stop__name">
                        {stop.name || tr("lunchBreak")}
                      </p>
                      {lunchTip && (
                        <p className="visit-tip line-clamp-2">{lunchTip}</p>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={stop.id}>
              <StopRow
                stop={stop}
                placeKind={placeKind}
                rowTip={rowTip}
                focused={focused}
                onFocus={() => {
                  if (stop.status !== "todo") {
                    if (attraction) onOpenAttraction(attraction.id);
                    return;
                  }
                  if (focusedStopId === stop.id) {
                    if (attraction) onOpenAttraction(attraction.id);
                    return;
                  }
                  onFocusStop(stop.id);
                }}
                onDone={() => onSetStatus(stop.id, "done")}
                onSkip={() => onSetStatus(stop.id, "skipped")}
                onMoveUp={() => onMoveStop(stop.id, -1)}
                onMoveDown={() => onMoveStop(stop.id, 1)}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function StopRow({
  stop,
  placeKind,
  rowTip,
  focused,
  onFocus,
  onDone,
  onSkip,
  onMoveUp,
  onMoveDown,
}: {
  stop: PlannedStop;
  placeKind: PlaceKind;
  rowTip: string | null;
  focused: boolean;
  onFocus: () => void;
  onDone: () => void;
  onSkip: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { tr } = useApp();

  return (
    <div className="visit-stop" data-status={stop.status} data-focused={focused}>
      <span className="visit-stop__time">
        {formatMinutesAsTime(stop.suggestedStartMinutes)}
      </span>
      <span className="visit-stop__spine" aria-hidden>
        <span className="visit-stop__dot" />
      </span>
      <div className="visit-stop__body">
        <button type="button" className="w-full text-left" onClick={onFocus}>
          <p className="visit-stop__name">{stop.name}</p>
          <p className="visit-stop__meta">
            {tr(placeKindLabelKey(placeKind))} · ~{stop.estimatedMinutes}m
          </p>
          {rowTip && stop.status === "todo" && (
            <p className="visit-tip line-clamp-1">{rowTip}</p>
          )}
        </button>
        {focused && stop.status === "todo" && (
          <div className="visit-stop__actions">
            <button
              type="button"
              className="visit-icon-btn"
              data-primary="true"
              aria-label={tr("markDone")}
              onClick={onDone}
            >
              <UiIcons.check className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="visit-icon-btn"
              aria-label={tr("markSkip")}
              onClick={onSkip}
            >
              <UiIcons.skip className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="visit-icon-btn"
              aria-label={tr("moveUp")}
              onClick={onMoveUp}
            >
              <UiIcons.up className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="visit-icon-btn"
              aria-label={tr("moveDown")}
              onClick={onMoveDown}
            >
              <UiIcons.down className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
