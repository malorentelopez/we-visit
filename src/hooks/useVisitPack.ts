"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import { deletePack, getPack, savePack } from "@/lib/db/idb";
import { defaultPlaceKindFilters } from "@/lib/placeKind";
import { mergeOsmIntoNotes } from "@/lib/planner/aiPlan";
import { buildItinerary, replanRemaining } from "@/lib/planner/plan";
import { aiPlanErrorMessageKey } from "@/lib/planner/aiErrors";
import { requestAiPlan } from "@/lib/planner/requestAiPlan";
import { tipLine } from "@/lib/planner/stopTip";
import type {
  Attraction,
  CustomStop,
  PlaceKind,
  VenuePack,
} from "@/lib/types";
import { normalizePack } from "@/lib/visit/normalizePack";

export function useVisitPack(sessionId: string) {
  const { tr, online, aiConfigured } = useApp();
  const router = useRouter();
  const [pack, setPack] = useState<VenuePack | null>(null);
  const [missing, setMissing] = useState(false);
  const [customName, setCustomName] = useState("");
  const [dayFilter, setDayFilter] = useState(0);
  const [detail, setDetail] = useState<Attraction | null>(null);
  const [kindFilters, setKindFilters] = useState<PlaceKind[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [planNote, setPlanNote] = useState<string | null>(null);
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);

  useEffect(() => {
    getPack(sessionId).then((found) => {
      if (!found) {
        setMissing(true);
        return;
      }
      const normalized = normalizePack(found);
      setPack(normalized);
      const available = [
        ...new Set(normalized.attractions.map((a) => a.placeKind)),
      ];
      setKindFilters(
        defaultPlaceKindFilters(available, normalized.venue.venueKind),
      );
    });
  }, [sessionId]);

  const nextStop = useMemo(
    () => pack?.session.stops.find((s) => s.status === "todo"),
    [pack],
  );

  const nextAttraction = useMemo(() => {
    if (!pack || !nextStop?.attractionId) return null;
    return (
      pack.attractions.find((a) => a.id === nextStop.attractionId) ?? null
    );
  }, [pack, nextStop]);

  const nextTip = useMemo(() => {
    if (!pack || !nextStop?.attractionId) return null;
    return tipLine(
      pack.session.stopNotes?.[nextStop.attractionId],
      nextAttraction,
    );
  }, [pack, nextStop, nextAttraction]);

  const progress = useMemo(() => {
    if (!pack) return { done: 0, total: 0 };
    const actionable = pack.session.stops.filter((s) => s.kind !== "break");
    const done = actionable.filter(
      (s) => s.status === "done" || s.status === "skipped",
    ).length;
    return { done, total: actionable.length };
  }, [pack]);

  const remaining = useMemo(
    () => pack?.session.stops.filter((s) => s.status === "todo").length ?? 0,
    [pack],
  );

  const days = useMemo(() => {
    if (!pack) return [0];
    const max = Math.max(0, ...pack.session.stops.map((s) => s.dayIndex));
    return Array.from({ length: max + 1 }, (_, i) => i);
  }, [pack]);

  const availableKinds = useMemo(() => {
    if (!pack) return [] as PlaceKind[];
    return [...new Set(pack.attractions.map((a) => a.placeKind))] as PlaceKind[];
  }, [pack]);

  const dayStops = useMemo(() => {
    if (!pack) return [];
    return pack.session.stops.filter((s) => {
      if (s.dayIndex !== dayFilter) return false;
      if (s.kind === "break" || s.kind === "custom") return true;
      if (!s.attractionId || kindFilters.length === 0) return true;
      const attraction = pack.attractions.find((a) => a.id === s.attractionId);
      if (!attraction) return true;
      return kindFilters.includes(attraction.placeKind);
    });
  }, [pack, dayFilter, kindFilters]);

  async function persist(next: VenuePack) {
    await savePack(next);
    setPack({ ...next, session: { ...next.session } });
  }

  async function setStatus(stopId: string, status: "done" | "skipped" | "todo") {
    if (!pack) return;
    const stops = pack.session.stops.map((s) =>
      s.id === stopId ? { ...s, status } : s,
    );
    setFocusedStopId(null);
    await persist({
      ...pack,
      session: { ...pack.session, stops, readyForPark: true },
    });
  }

  async function moveStop(stopId: string, direction: -1 | 1) {
    if (!pack) return;
    const stops = [...pack.session.stops];
    const index = stops.findIndex((s) => s.id === stopId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= stops.length) return;
    const tmp = stops[index];
    stops[index] = stops[target];
    stops[target] = tmp;
    await persist({
      ...pack,
      session: {
        ...pack.session,
        stops: stops.map((s, order) => ({ ...s, order })),
      },
    });
  }

  async function addCustom() {
    if (!pack || !customName.trim()) return;
    const custom: CustomStop = {
      id: `c-${Date.now().toString(36)}`,
      name: customName.trim(),
      estimatedMinutes: 30,
      afterStopId: nextStop?.id,
    };
    const customStops = [...pack.session.customStops, custom];
    const stops = buildItinerary({
      attractions: pack.attractions,
      prefs: pack.session.prefs,
      hiddenAttractionIds: pack.session.hiddenAttractionIds,
      mustSeeAttractionIds: pack.session.mustSeeAttractionIds,
      customStops,
      preserveStatuses: pack.session.stops,
    });
    setCustomName("");
    await persist({
      ...pack,
      session: { ...pack.session, customStops, stops, readyForPark: true },
    });
  }

  async function replan() {
    if (!pack) return;
    const stops = replanRemaining(pack.session, pack.attractions);
    setPlanNote(tr("usedBasicRoute"));
    await persist({
      ...pack,
      session: {
        ...pack.session,
        stops,
        readyForPark: true,
        planSource: "heuristic",
      },
    });
  }

  async function regenerateWithAi() {
    if (!pack || regenerating) return;
    if (!online || !aiConfigured) {
      setPlanNote(
        !online ? tr("regenerateAiNeedNet") : tr("smartRouteUnavailable"),
      );
      return;
    }

    setRegenerating(true);
    setPlanNote(tr("regeneratingAi"));
    try {
      const finishedIds = new Set(
        pack.session.stops
          .filter(
            (s) =>
              s.attractionId &&
              (s.status === "done" || s.status === "skipped"),
          )
          .map((s) => s.attractionId!),
      );
      const poolHidden = [
        ...new Set([...pack.session.hiddenAttractionIds, ...finishedIds]),
      ];
      const result = await requestAiPlan({
        venueName: pack.venue.name,
        venueKind: pack.venue.venueKind,
        prefs: pack.session.prefs,
        mustSeeIds: pack.session.mustSeeAttractionIds.filter(
          (id) => !finishedIds.has(id),
        ),
        attractions: pack.attractions,
        hiddenIds: poolHidden,
      });

      if (!result.ok) {
        setPlanNote(tr(aiPlanErrorMessageKey(result.code)));
        return;
      }

      const stops = replanRemaining(pack.session, pack.attractions, {
        preferredOrderIds: result.orderedIds,
        lunch: result.lunch,
      });
      const stopNotes = mergeOsmIntoNotes(pack.attractions, {
        ...(pack.session.stopNotes ?? {}),
        ...result.notes,
      });
      await persist({
        ...pack,
        session: {
          ...pack.session,
          stops,
          stopNotes,
          readyForPark: true,
          planSource: "ai",
          planExtras: result.extras,
        },
      });
      setPlanNote(null);
    } finally {
      setRegenerating(false);
    }
  }

  function openAttraction(id: string) {
    const found = pack?.attractions.find((a) => a.id === id);
    if (found) setDetail(found);
  }

  async function removeVisit() {
    if (!pack) return;
    if (!window.confirm(tr("deleteVisitConfirm"))) return;
    await deletePack(pack.session.id);
    router.replace("/");
  }

  return {
    pack,
    missing,
    nextStop,
    nextAttraction,
    nextTip,
    progress,
    remaining,
    days,
    availableKinds,
    dayStops,
    dayFilter,
    setDayFilter,
    kindFilters,
    setKindFilters,
    detail,
    setDetail,
    customName,
    setCustomName,
    regenerating,
    planNote,
    focusedStopId,
    setFocusedStopId,
    setStatus,
    moveStop,
    addCustom,
    replan,
    regenerateWithAi,
    openAttraction,
    removeVisit,
  };
}
