"use client";

import { UiIcons } from "@/components/Icons";
import { useApp } from "@/components/Providers";
import { formatMinutesAsTime } from "@/lib/geo";
import type { Attraction, PlannedStop } from "@/lib/types";

export function VisitNow({
  stop,
  attraction,
  tip,
  remaining,
  onOpenDetail,
  onDone,
  onSkip,
}: {
  stop: PlannedStop;
  attraction: Attraction | null;
  tip: string | null;
  remaining: number;
  onOpenDetail: (attraction: Attraction) => void;
  onDone: () => void;
  onSkip: () => void;
}) {
  const { tr } = useApp();

  return (
    <section className="visit-now rise">
      <p className="visit-now__overline">
        <UiIcons.footprints className="h-3.5 w-3.5 shrink-0" />
        {tr("nextUp")}
      </p>
      <button
        type="button"
        className="mt-0 block w-full text-left"
        onClick={() => {
          if (attraction) onOpenDetail(attraction);
        }}
      >
        <h2 className="visit-now__title">{stop.name}</h2>
      </button>
      <p className="visit-now__meta">
        {formatMinutesAsTime(stop.suggestedStartMinutes)} · ~
        {stop.estimatedMinutes}m · {remaining} {tr("remaining")}
      </p>
      {tip && <p className="visit-tip">{tip}</p>}
      <div className="visit-now__actions">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          <UiIcons.check className="h-4 w-4" />
          {tr("markDone")}
        </button>
        <button type="button" className="visit-skip" onClick={onSkip}>
          {tr("markSkip")}
        </button>
      </div>
    </section>
  );
}
