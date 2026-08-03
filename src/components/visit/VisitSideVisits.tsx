"use client";

import { useApp } from "@/components/Providers";
import type { PlanExtras } from "@/lib/types";

export function VisitSideVisits({
  sideVisits,
  onOpenAttraction,
}: {
  sideVisits: NonNullable<PlanExtras["sideVisits"]>;
  onOpenAttraction: (id: string) => void;
}) {
  const { tr } = useApp();

  return (
    <section className="mt-4 border-t border-[var(--line)] pt-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">
        {tr("alsoWorth")}
      </p>
      <ul className="mt-2 space-y-2">
        {sideVisits.map((item) => (
          <li key={`${item.attractionId ?? item.title}-${item.tip}`}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                if (item.attractionId) onOpenAttraction(item.attractionId);
              }}
            >
              <p className="text-sm font-extrabold">{item.title}</p>
              <p className="visit-tip mt-0.5">{item.tip}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
