import type { CSSProperties } from "react";
import type { VenueKind } from "./types";

export type VenueTheme = {
  kind: VenueKind;
  labelKey: "kindThemePark" | "kindMuseum" | "kindZoo" | "kindHistoric" | "kindOther";
  bg0: string;
  bg1: string;
  panel: string;
  accent: string;
  accent2: string;
  ink: string;
  muted: string;
  mapGround0: string;
  mapGround1: string;
};

const themes: Record<VenueKind, VenueTheme> = {
  theme_park: {
    kind: "theme_park",
    labelKey: "kindThemePark",
    bg0: "#2a1035",
    bg1: "#4a1d5c",
    panel: "#5c2870",
    accent: "#ffb703",
    accent2: "#fb8500",
    ink: "#fff6e8",
    muted: "#e6c9f0",
    mapGround0: "#3d1850",
    mapGround1: "#241030",
  },
  museum: {
    kind: "museum",
    labelKey: "kindMuseum",
    bg0: "#1b2430",
    bg1: "#2c3a4d",
    panel: "#36485f",
    accent: "#e0b15a",
    accent2: "#8fb8d8",
    ink: "#f4efe6",
    muted: "#b7c3d1",
    mapGround0: "#2a384c",
    mapGround1: "#17202b",
  },
  zoo: {
    kind: "zoo",
    labelKey: "kindZoo",
    bg0: "#14301f",
    bg1: "#1f4a2e",
    panel: "#2a5c3a",
    accent: "#f4a261",
    accent2: "#90be6d",
    ink: "#f3f7ef",
    muted: "#c4d8c2",
    mapGround0: "#1d4d30",
    mapGround1: "#102418",
  },
  historic: {
    kind: "historic",
    labelKey: "kindHistoric",
    bg0: "#2c1810",
    bg1: "#4a2c1c",
    panel: "#5c3824",
    accent: "#d4a373",
    accent2: "#c9ada7",
    ink: "#faf3eb",
    muted: "#d8c4b4",
    mapGround0: "#3d2618",
    mapGround1: "#21120c",
  },
  other: {
    kind: "other",
    labelKey: "kindOther",
    bg0: "#0f2e2a",
    bg1: "#163a34",
    panel: "#1c4a42",
    accent: "#f28f4a",
    accent2: "#7ec8b4",
    ink: "#f4efe6",
    muted: "#b7cfc7",
    mapGround0: "#1a4a43",
    mapGround1: "#0f2e2a",
  },
};

export function themeForKind(kind: VenueKind | undefined): VenueTheme {
  return themes[kind ?? "other"];
}

export function themeStyleVars(theme: VenueTheme): CSSProperties {
  return {
    ["--bg0" as string]: theme.bg0,
    ["--bg1" as string]: theme.bg1,
    ["--panel" as string]: theme.panel,
    ["--accent" as string]: theme.accent,
    ["--accent-2" as string]: theme.accent2,
    ["--ink" as string]: theme.ink,
    ["--muted" as string]: theme.muted,
    ["--map-ground-0" as string]: theme.mapGround0,
    ["--map-ground-1" as string]: theme.mapGround1,
    backgroundColor: theme.bg0,
    backgroundImage: `
      radial-gradient(1100px 560px at 12% -8%, color-mix(in srgb, ${theme.accent} 28%, transparent), transparent 55%),
      radial-gradient(900px 480px at 100% 0%, color-mix(in srgb, ${theme.accent2} 20%, transparent), transparent 50%),
      linear-gradient(165deg, ${theme.bg0}, ${theme.bg1} 45%, ${theme.bg0})
    `,
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
    color: theme.ink,
    minHeight: "100dvh",
  };
}
