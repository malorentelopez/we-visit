"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

export const GeoMapDynamic = dynamic(
  () => import("./GeoMap").then((mod) => mod.GeoMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-3xl border border-[var(--line)] bg-[var(--panel)] text-sm text-[var(--muted)]">
        …
      </div>
    ),
  },
);

export type GeoMapProps = ComponentProps<typeof GeoMapDynamic>;
