"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/Providers";
import { savePack } from "@/lib/db/idb";
import { defaultPlaceKindFilters } from "@/lib/placeKind";
import { mergeOsmIntoNotes } from "@/lib/planner/aiPlan";
import {
  buildItinerary,
  createSessionId,
  defaultPrefs,
} from "@/lib/planner/plan";
import { aiPlanErrorMessageKey } from "@/lib/planner/aiErrors";
import { requestAiPlan } from "@/lib/planner/requestAiPlan";
import type {
  Attraction,
  LunchPlan,
  PlaceKind,
  PlanExtras,
  PrepareResponse,
  SearchResult,
  StopNote,
  Venue,
  VisitPrefs,
} from "@/lib/types";
import { normalizeAttraction } from "@/lib/visit/normalizePack";

function readPlace(id: string | null): SearchResult | null {
  if (!id || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`we-visit-place:${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as SearchResult;
  } catch {
    return null;
  }
}

export function usePreparePack(placeId: string | null) {
  const { tr, online, aiConfigured } = useApp();
  const router = useRouter();
  const place = useMemo(() => readPlace(placeId), [placeId]);
  const [phase, setPhase] = useState<"loading" | "review" | "error">(
    place ? "loading" : "error",
  );
  const [venue, setVenue] = useState<Venue | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [prefs, setPrefs] = useState<VisitPrefs>(defaultPrefs());
  const [hidden, setHidden] = useState<string[]>([]);
  const [mustSee, setMustSee] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [kindFilters, setKindFilters] = useState<PlaceKind[]>([]);
  const [useSmartRoute, setUseSmartRoute] = useState(true);
  const [building, setBuilding] = useState(false);
  const [buildNote, setBuildNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    place ? null : "missing-place",
  );
  const smartRouteOn = useSmartRoute && aiConfigured;

  useEffect(() => {
    if (!place || !online) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place }),
        });
        const data = (await res.json()) as PrepareResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || "fail");
        if (cancelled) return;
        const normalized = data.attractions.map(normalizeAttraction);
        setVenue(data.venue);
        setAttractions(normalized);
        const available = [
          ...new Set(normalized.map((a) => a.placeKind)),
        ] as PlaceKind[];
        const parkish =
          data.venue.venueKind === "theme_park" ||
          data.venue.venueKind === "zoo";
        setKindFilters(defaultPlaceKindFilters(available, parkish));
        setPhase("review");
      } catch {
        if (!cancelled) {
          setError(tr("errorGeneric"));
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place, online, tr]);

  const availableKinds = useMemo(
    () => [...new Set(attractions.map((a) => a.placeKind))] as PlaceKind[],
    [attractions],
  );

  const visibleCount = useMemo(
    () =>
      attractions.filter(
        (a) =>
          !hidden.includes(a.id) &&
          (kindFilters.length === 0 || kindFilters.includes(a.placeKind)),
      ).length,
    [attractions, hidden, kindFilters],
  );

  const detail = useMemo(
    () => attractions.find((a) => a.id === detailId) ?? null,
    [attractions, detailId],
  );

  function toggleMustSee(id: string) {
    setMustSee((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  function toggleHidden(id: string) {
    setHidden((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  async function buildPlan() {
    if (!venue || building) return;
    const wantAi = smartRouteOn && online;
    setBuilding(true);
    setBuildNote(wantAi ? tr("buildingSmart") : null);
    try {
      const now = new Date().toISOString();
      const sessionId = createSessionId();
      const kindHidden = attractions
        .filter(
          (a) =>
            !mustSee.includes(a.id) &&
            kindFilters.length > 0 &&
            !kindFilters.includes(a.placeKind),
        )
        .map((a) => a.id);
      const hiddenAttractionIds = [...new Set([...hidden, ...kindHidden])];

      let preferredOrderIds: string[] | undefined;
      let routeSource: "ai" | "heuristic" = "heuristic";
      let aiNotes: Record<string, StopNote> | undefined;
      let lunch: LunchPlan | undefined;
      let planExtras: PlanExtras | undefined;

      if (wantAi) {
        const result = await requestAiPlan({
          venueName: venue.name,
          venueKind: venue.venueKind,
          prefs,
          mustSeeIds: mustSee,
          attractions,
          hiddenIds: hiddenAttractionIds,
        });
        if (!result.ok) {
          setBuildNote(tr(aiPlanErrorMessageKey(result.code)));
          return;
        }
        preferredOrderIds = result.orderedIds;
        routeSource = "ai";
        aiNotes = result.notes;
        lunch = result.lunch;
        planExtras = result.extras;
      }

      const stops = buildItinerary({
        attractions,
        prefs,
        hiddenAttractionIds,
        mustSeeAttractionIds: mustSee,
        preferredOrderIds,
        lunch,
      });
      const stopNotes = mergeOsmIntoNotes(attractions, aiNotes ?? {});
      await savePack({
        venue,
        attractions,
        session: {
          id: sessionId,
          venueId: venue.id,
          venueName: venue.name,
          createdAt: now,
          updatedAt: now,
          readyForPark: true,
          prefs,
          stops,
          customStops: [],
          hiddenAttractionIds,
          mustSeeAttractionIds: mustSee,
          stopNotes,
          planSource: routeSource,
          planExtras,
        },
      });
      setBuildNote(
        routeSource === "ai" ? tr("usedSmartRoute") : tr("usedBasicRoute"),
      );
      router.push(`/visit/${sessionId}`);
    } finally {
      setBuilding(false);
    }
  }

  return {
    place,
    phase,
    venue,
    attractions,
    prefs,
    setPrefs,
    hidden,
    mustSee,
    kindFilters,
    setKindFilters,
    availableKinds,
    visibleCount,
    detail,
    setDetailId,
    smartRouteOn,
    setUseSmartRoute,
    building,
    buildNote,
    error,
    online,
    aiConfigured,
    toggleMustSee,
    toggleHidden,
    buildPlan,
  };
}
