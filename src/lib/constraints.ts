import type { Attraction } from "./types";

/** Pull guest-facing constraints from OSM tags only — never invent. */
export function extractConstraintsFromTags(tags: Record<string, string>): {
  minHeight?: string;
  accessNote?: string;
  openingHours?: string;
} {
  const minHeight =
    tags.min_height ||
    tags["height:min"] ||
    tags["attraction:min_height"] ||
    tags["min_height:child"] ||
    tags["attraction:min_height:accompanied"];

  const parts: string[] = [];
  if (tags.fee === "yes") parts.push("fee");
  else if (tags.fee === "no") parts.push("free");
  if (tags.access && tags.access !== "yes" && tags.access !== "public") {
    parts.push(`access:${tags.access}`);
  }
  if (tags.wheelchair === "no") parts.push("not wheelchair accessible");
  else if (tags.wheelchair === "limited") parts.push("limited wheelchair access");
  if (tags.reservation === "required" || tags.reservation === "yes") {
    parts.push("reservation required");
  }

  const openingHours = tags.opening_hours || undefined;

  return {
    minHeight: minHeight?.trim() || undefined,
    accessNote: parts.length ? parts.join(" · ") : undefined,
    openingHours,
  };
}

export function applyConstraintsToAttraction(
  attraction: Attraction,
): Attraction {
  const extracted = extractConstraintsFromTags(attraction.tags ?? {});
  return {
    ...attraction,
    openingHours: attraction.openingHours || extracted.openingHours,
    minHeight: attraction.minHeight || extracted.minHeight,
    accessNote: attraction.accessNote || extracted.accessNote,
  };
}
