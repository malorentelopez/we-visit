"use client";

import { UiIcons } from "@/components/Icons";
import { useApp } from "@/components/Providers";

export function VisitPlanTools({
  customName,
  onCustomNameChange,
  onAddCustom,
  regenerating,
  onRegenerateAi,
  onReplan,
  onRemoveVisit,
  planNote,
}: {
  customName: string;
  onCustomNameChange: (value: string) => void;
  onAddCustom: () => void;
  regenerating: boolean;
  onRegenerateAi: () => void;
  onReplan: () => void;
  onRemoveVisit: () => void;
  planNote: string | null;
}) {
  const { tr } = useApp();

  return (
    <details className="visit-tools">
      <summary>{tr("planTools")}</summary>
      <div className="visit-tools__body">
        <div className="flex gap-2">
          <input
            value={customName}
            onChange={(e) => onCustomNameChange(e.target.value)}
            placeholder={tr("customPlaceholder")}
            className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="btn btn-secondary min-h-10"
            onClick={onAddCustom}
            aria-label={tr("addCustom")}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full text-sm"
          onClick={onRegenerateAi}
          disabled={regenerating}
        >
          <UiIcons.sparkles className="h-4 w-4" />
          {regenerating ? tr("regeneratingAi") : tr("regenerateAi")}
        </button>
        <button
          type="button"
          className="btn btn-secondary w-full text-sm"
          onClick={onReplan}
          disabled={regenerating}
        >
          <UiIcons.refresh className="h-4 w-4" />
          {tr("replan")}
        </button>
        <button
          type="button"
          className="btn btn-secondary w-full text-sm text-[var(--danger)]"
          onClick={onRemoveVisit}
          disabled={regenerating}
        >
          <UiIcons.trash className="h-4 w-4" />
          {tr("deleteVisit")}
        </button>
        {planNote && <p className="text-xs text-[var(--muted)]">{planNote}</p>}
      </div>
    </details>
  );
}
