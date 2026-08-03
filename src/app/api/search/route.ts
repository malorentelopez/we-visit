import { guardRequest, nominatimSearch } from "@/lib/server/osm";

export async function GET(request: Request) {
  const limited = guardRequest(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }
  if (q.length > 120) {
    return Response.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const results = await nominatimSearch(q);
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Search failed" }, { status: 502 });
  }
}
