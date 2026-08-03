"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Attribution } from "@/components/Attribution";
import { BrandLogo } from "@/components/BrandMark";
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
  const [searchFocused, setSearchFocused] = useState(false);
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
  const searching = trimmed.length >= 3;

  return (
    <ThemeShell>
      <div className="home">
        <div className="home__chrome rise">
          <span
            className="home__status"
            title={online ? tr("online") : tr("offline")}
            aria-label={online ? tr("online") : tr("offline")}
          >
            <span className="pulse-dot" data-offline={!online || undefined} />
            <WifiIcon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <label className="home__lang">
            <UiIcons.language className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{tr("language")}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value === "es" ? "es" : "en")}
              aria-label={tr("language")}
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>
        </div>

        <header className="home__hero rise">
          <div className="home__path" aria-hidden>
            <svg viewBox="0 0 320 120" fill="none" className="home__path-svg">
              <path
                d="M8 96C48 72 72 88 110 70C148 52 168 28 210 36C252 44 274 18 312 24"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="6 10"
                className="home__path-line"
              />
              <circle cx="110" cy="70" r="3.5" fill="var(--accent-2)" />
              <circle cx="210" cy="36" r="3.5" fill="var(--accent-2)" />
              <circle cx="312" cy="24" r="5" fill="var(--accent)" />
            </svg>
          </div>
          <h1 className="home__logo">
            <BrandLogo size="hero" />
          </h1>
          <p className="home__tagline">{tr("tagline")}</p>
        </header>

        <section
          className="home__search-block rise"
          data-focused={searchFocused || searching || undefined}
        >
          <div className="home-search">
            <UiIcons.mapPinned className="home-search__icon" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={tr("searchPlaceholder")}
              className="home-search__input"
              autoComplete="off"
              inputMode="search"
              aria-label={tr("search")}
            />
            {loading ? (
              <span className="home-search__hint">{tr("searching")}</span>
            ) : query ? (
              <button
                type="button"
                className="home-search__clear"
                aria-label="Clear"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setError(null);
                }}
              >
                ×
              </button>
            ) : null}
          </div>

          {(error || empty || shownResults.length > 0) && (
            <div className="home-results">
              {error && trimmed.length >= 3 && (
                <p className="home-results__msg home-results__msg--danger">
                  {error}
                </p>
              )}
              {empty && (
                <p className="home-results__msg">{tr("emptyResults")}</p>
              )}
              <ul className="home-results__list">
                {shownResults.map((place) => (
                  <li key={`${place.osmType}/${place.osmId}`}>
                    <button
                      type="button"
                      className="home-results__item"
                      onClick={() => {
                        const key = `${place.osmType}/${place.osmId}`;
                        sessionStorage.setItem(
                          `we-visit-place:${key}`,
                          JSON.stringify(place),
                        );
                        router.push(`/prepare?id=${encodeURIComponent(key)}`);
                      }}
                    >
                      <span className="home-results__pin" aria-hidden>
                        <UiIcons.mapPinned className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="home-results__name">{place.name}</span>
                        <span className="home-results__meta">
                          {place.displayName}
                        </span>
                      </span>
                      <UiIcons.right className="home-results__go" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {!searching && (
          <section className="home__recent rise">
            <h2 className="home__recent-title">{tr("recentVisits")}</h2>
            {recent.length === 0 ? (
              <p className="home__recent-empty">{tr("noRecent")}</p>
            ) : (
              <ul className="home-recent-list">
                {recent.map((session) => (
                  <li key={session.id} className="home-recent-list__row">
                    <Link
                      href={`/visit/${session.id}`}
                      className="home-recent-list__link"
                    >
                      <span className="home-recent-list__name">
                        {session.venueName}
                      </span>
                      <span className="home-recent-list__open">
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
        )}

        <Attribution />
      </div>
    </ThemeShell>
  );
}
