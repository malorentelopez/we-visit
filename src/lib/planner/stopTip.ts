import type { Attraction, StopNote } from "@/lib/types";

/** Single priority for guest-facing tip lines (requirements > tip > OSM facts). */
export function tipLine(
  note?: StopNote,
  attraction?: Attraction | null,
): string | null {
  if (note?.requirements?.[0]) return note.requirements[0];
  if (note?.tip) return note.tip;
  if (attraction?.minHeight) return `Min height ${attraction.minHeight}`;
  if (attraction?.accessNote) return attraction.accessNote;
  if (attraction?.openingHours) return attraction.openingHours;
  return null;
}
