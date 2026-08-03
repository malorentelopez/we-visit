import { prepareVenue } from "@/lib/prepare/pipeline";
import { guardRequest } from "@/lib/server/osm";
import type { SearchResult } from "@/lib/types";

export async function POST(request: Request) {
  const limited = guardRequest(request);
  if (limited) return limited;

  try {
    const body = (await request.json()) as { place?: SearchResult };
    if (!body.place?.osmId || !body.place?.name) {
      return Response.json({ error: "Missing place" }, { status: 400 });
    }
    const prepared = await prepareVenue(body.place);
    return Response.json(prepared);
  } catch {
    return Response.json({ error: "Prepare failed" }, { status: 502 });
  }
}
