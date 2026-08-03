"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Attribution } from "@/components/Attribution";
import { UiIcons } from "@/components/Icons";
import { ThemeShell } from "@/components/ThemeShell";
import { useApp } from "@/components/Providers";
import { deletePack, listRecentSessions } from "@/lib/db/idb";
import type { SearchResult, VisitSession } from "@/lib/types";

export function HomeClient() {
  const router = useRouter();
  const { tr, locale, setLocale, online } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<VisitSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    let active = true;
    listRecentSessions()
      .then((sessions) => {
        if (active) setRecent(sessions);
      })
      .catch(() => {
        if (active) setRecent([]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function removeVisit(sessionId: string) {
    if (!window.confirm(tr("deleteVisitConfirm"))) return;
    await deletePack(sessionId);
    setRecent((list) => list.filter((s) => s.id !== sessionId));
  }

  useEffect(() => {
    if (trimmed.length < 3) return;
    if (!online) {
      const handle = window.setTimeout(() => {
        setError(tr("errorGeneric"));
        setResults([]);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(handle);
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as {
          results?: SearchResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "fail");
        setResults(data.results ?? []);
      } catch {
        setError(tr("errorGeneric"));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => window.clearTimeout(handle);
  }, [trimmed, online, tr]);

  const shownResults = trimmed.length < 3 ? [] : results;

  const empty = useMemo(
    () =>
      !loading && trimmed.length >= 3 && shownResults.length === 0 && !error,
    [loading, trimmed, shownResults.length, error],
  );

  const WifiIcon = online ? UiIcons.wifi : UiIcons.wifiOff;

  return (
    <ThemeShell>
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="rise mb-8 flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
            <WifiIcon className="h-3.5 w-3.5" />
            {online ? tr("online") : tr("offline")}
          </p>
          <h1 className="display text-5xl font-bold tracking-tight text-[var(--ink)]">
            {tr("brand")}
          </h1>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--muted)]">
            {tr("tagline")}
          </p>
        </div>
        <label className="chip inline-flex items-center gap-2 text-sm">
          <UiIcons.language className="h-4 w-4" />
          <span className="sr-only">{tr("language")}</span>
          <select
            className="bg-transparent outline-none"
            value={locale}
            onChange={(e) => setLocale(e.target.value === "es" ? "es" : "en")}
            aria-label={tr("language")}
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
        </label>
      </header>

      <section className="card rise p-4">
        <label className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
          <UiIcons.mapPinned className="h-4 w-4" />
          {tr("search")}
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr("searchPlaceholder")}
          className="w-full rounded-2xl border border-[var(--line)] bg-[rgba(0,0,0,0.18)] px-4 py-3 text-base outline-none ring-[var(--accent)] focus:ring-2"
          autoComplete="off"
          inputMode="search"
        />
        {loading && (
          <p className="mt-3 text-sm text-[var(--accent-2)]">{tr("searching")}</p>
        )}
        {error && trimmed.length >= 3 && (
          <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
        )}
        {empty && (
          <p className="mt-3 text-sm text-[var(--muted)]">{tr("emptyResults")}</p>
        )}
        <ul className="mt-3 space-y-2">
          {shownResults.map((place) => (
            <li key={`${place.osmType}/${place.osmId}`}>
              <button
                type="button"
                className="w-full rounded-2xl border border-transparent bg-[rgba(244,239,230,0.06)] px-4 py-3 text-left transition hover:border-[var(--accent-2)]"
                onClick={() => {
                  const key = `${place.osmType}/${place.osmId}`;
                  sessionStorage.setItem(
                    `we-visit-place:${key}`,
                    JSON.stringify(place),
                  );
                  router.push(`/prepare?id=${encodeURIComponent(key)}`);
                }}
              >
                <p className="font-extrabold">{place.name}</p>
                <p className="text-sm text-[var(--muted)] line-clamp-2">
                  {place.displayName}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rise mt-8">
        <h2 className="display mb-3 text-2xl font-bold">{tr("recentVisits")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{tr("noRecent")}</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((session) => (
              <li
                key={session.id}
                className="card flex items-center gap-2 px-3 py-3 transition hover:border-[var(--accent-2)]"
              >
                <Link
                  href={`/visit/${session.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-0.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <p className="truncate font-extrabold">{session.venueName}</p>
                    <span
                      className="inline-flex shrink-0 text-[var(--accent-2)]"
                      title={tr("savedOnPhone")}
                      aria-label={tr("savedOnPhone")}
                    >
                      <UiIcons.phone className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-extrabold text-[var(--accent)]">
                    {tr("openVisit")}
                    <UiIcons.right className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
                <button
                  type="button"
                  className="visit-icon-btn shrink-0"
                  aria-label={tr("deleteVisit")}
                  title={tr("deleteVisit")}
                  onClick={() => removeVisit(session.id)}
                >
                  <UiIcons.trash className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Attribution />
    </div>
    </ThemeShell>
  );
}
