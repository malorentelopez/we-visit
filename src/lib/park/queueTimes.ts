/**
 * Optional later enrichment: match a prepared venue to Queue-Times.com.
 * Not required for v1 museums/generic venues. Kept as a hook for online refresh.
 */

export type QueueTimesPark = {
  id: number;
  name: string;
  country: string;
  latitude: string;
  longitude: string;
};

export async function fetchQueueTimesParks(): Promise<QueueTimesPark[]> {
  const res = await fetch("https://queue-times.com/parks.json", {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Queue-Times parks failed");
  const groups = (await res.json()) as Array<{
    parks: QueueTimesPark[];
  }>;
  return groups.flatMap((g) => g.parks);
}

export function matchParkByName(
  venueName: string,
  parks: QueueTimesPark[],
): QueueTimesPark | undefined {
  const norm = venueName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return parks.find((park) => {
    const p = park.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return p.includes(norm) || norm.includes(p);
  });
}
