"use client";

import type { ReactNode } from "react";
import { themeForKind, themeStyleVars } from "@/lib/theme";
import type { VenueKind } from "@/lib/types";

export function ThemeShell({
  kind,
  children,
  className = "",
}: {
  kind?: VenueKind;
  children: ReactNode;
  className?: string;
}) {
  const theme = themeForKind(kind);
  return (
    <div
      className={`app-shell flex min-h-dvh flex-1 flex-col ${className}`.trim()}
      data-venue-kind={theme.kind}
      style={themeStyleVars(theme)}
    >
      {children}
    </div>
  );
}
