"use client";

import { useApp } from "@/components/Providers";
import type { PartyType, PaceType, VisitPrefs } from "@/lib/types";

export function PreparePrefs({
  prefs,
  onChange,
}: {
  prefs: VisitPrefs;
  onChange: (next: VisitPrefs | ((prev: VisitPrefs) => VisitPrefs)) => void;
}) {
  const { tr } = useApp();

  return (
    <section className="card mt-6 p-4">
      <h2 className="display text-2xl font-bold">{tr("prefsTitle")}</h2>
      <p className="mt-3 text-sm font-bold text-[var(--muted)]">{tr("party")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["kids", "partyKids"],
            ["mixed", "partyMixed"],
            ["adults", "partyAdults"],
          ] as const
        ).map(([value, key]) => (
          <button
            key={value}
            type="button"
            className="chip"
            data-active={prefs.party === value}
            onClick={() =>
              onChange((p) => ({ ...p, party: value as PartyType }))
            }
          >
            {tr(key)}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-bold text-[var(--muted)]">{tr("pace")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ["relaxed", "paceRelaxed"],
            ["normal", "paceNormal"],
            ["packed", "pacePacked"],
          ] as const
        ).map(([value, key]) => (
          <button
            key={value}
            type="button"
            className="chip"
            data-active={prefs.pace === value}
            onClick={() =>
              onChange((p) => ({ ...p, pace: value as PaceType }))
            }
          >
            {tr(key)}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-[var(--muted)]">{tr("days")}</span>
          <input
            type="number"
            min={1}
            max={5}
            value={prefs.dayCount}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                dayCount: Math.max(1, Number(e.target.value) || 1),
              }))
            }
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">{tr("hoursPerDay")}</span>
          <input
            type="number"
            min={3}
            max={14}
            value={prefs.hoursPerDay}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                hoursPerDay: Math.max(3, Number(e.target.value) || 8),
              }))
            }
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">{tr("startHour")}</span>
          <input
            type="number"
            min={7}
            max={14}
            value={prefs.startHour}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                startHour: Math.max(7, Number(e.target.value) || 10),
              }))
            }
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">{tr("breakMinutes")}</span>
          <input
            type="number"
            min={0}
            max={120}
            step={15}
            value={prefs.breakMinutes}
            onChange={(e) =>
              onChange((p) => ({
                ...p,
                breakMinutes: Math.max(0, Number(e.target.value) || 0),
              }))
            }
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2"
          />
        </label>
      </div>
    </section>
  );
}
