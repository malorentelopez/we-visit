"use client";

import { useApp } from "./Providers";

export function Attribution() {
  const { tr } = useApp();
  return (
    <footer className="mt-auto border-t border-[var(--line)] px-0 py-4 text-center text-xs leading-relaxed text-[var(--muted)]">
      <p>
        <a
          className="underline decoration-[var(--accent)] underline-offset-2"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          {tr("attribution")}
        </a>
      </p>
      <p className="mt-1">{tr("privacy")}</p>
    </footer>
  );
}
