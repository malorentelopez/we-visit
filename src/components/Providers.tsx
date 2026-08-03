"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { getStoredLocale, setStoredLocale, t, type MessageKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

type AppContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  online: boolean;
  /** Whether Gemini is configured server-side. Cached; not a planning call. */
  aiConfigured: boolean;
  aiConfigKnown: boolean;
  tr: (key: MessageKey) => string;
};

const AppContext = createContext<AppContextValue | null>(null);
const LOCALE_EVENT = "we-visit-locale";
const AI_CONFIG_KEY = "we-visit-ai-configured";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function subscribeLocale(onChange: () => void) {
  window.addEventListener(LOCALE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCALE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCachedAiConfigured(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(AI_CONFIG_KEY);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

async function syncServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Dev + SW fighting Next HMR causes endless full reloads.
  if (process.env.NODE_ENV !== "production") {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("we-visit-"))
          .map((key) => caches.delete(key)),
      );
    }
    return;
  }

  await navigator.serviceWorker.register("/sw.js");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const locale = useSyncExternalStore(
    subscribeLocale,
    getStoredLocale,
    () => "en" as Locale,
  );
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiConfigKnown, setAiConfigKnown] = useState(false);

  useEffect(() => {
    syncServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const apply = (configured: boolean) => {
      if (cancelled) return;
      window.sessionStorage.setItem(AI_CONFIG_KEY, configured ? "1" : "0");
      setAiConfigured(configured);
      setAiConfigKnown(true);
    };

    const cached = readCachedAiConfigured();
    if (cached !== null) {
      const handle = window.setTimeout(() => apply(cached), 0);
      return () => {
        cancelled = true;
        window.clearTimeout(handle);
      };
    }

    fetch("/api/plan-ai")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        apply(Boolean(data.configured));
      })
      .catch(() => {
        apply(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setStoredLocale(next);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const tr = useCallback((key: MessageKey) => t(locale, key), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      online,
      aiConfigured,
      aiConfigKnown,
      tr,
    }),
    [locale, setLocale, online, aiConfigured, aiConfigKnown, tr],
  );

  return (
    <AppContext.Provider value={value}>
      <div className="flex min-h-dvh flex-1 flex-col">{children}</div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}
