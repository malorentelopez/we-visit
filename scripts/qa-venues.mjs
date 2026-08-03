/**
 * QA prepare pipeline against reference venues (Nominatim + Overpass).
 * Run: node scripts/qa-venues.mjs
 */

const USER_AGENT = "We-Visit-QA/0.1 (https://github.com/malorentelopez/we-visit)";

const venues = [
  "Parque Warner Madrid",
  "Museo del Prado",
  "Disneyland Paris",
];

async function nominatim(q) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

async function overpass(bbox, museumish) {
  const [south, north, west, east] = bbox;
  const extras = museumish
    ? `
  node["tourism"]["name"](${south},${west},${north},${east});
  node["artwork_type"]["name"](${south},${west},${north},${east});
  node["tourism"="yes"]["name"](${south},${west},${north},${east});
`
    : "";
  const query = `
[out:json][timeout:45];
(
  node["tourism"~"attraction|theme_park|museum|artwork|gallery|zoo|viewpoint"](${south},${west},${north},${east});
  way["tourism"~"attraction|theme_park|museum|artwork|gallery|zoo|viewpoint"](${south},${west},${north},${east});
  node["attraction"](${south},${west},${north},${east});
  way["attraction"](${south},${west},${north},${east});
  ${extras}
);
out body center tags;
`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) {
        lastError = new Error(`Overpass ${res.status}`);
        continue;
      }
      return res.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Overpass failed");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const report = [];

for (const name of venues) {
  try {
    await sleep(1100);
    const results = await nominatim(name);
    const hit = results[0];
    if (!hit) {
      report.push({ name, ok: false, reason: "no nominatim hit" });
      continue;
    }
    await sleep(1500);
    const museumish = /museo|museum|prado/i.test(name);
    const data = await overpass(hit.boundingbox.map(Number), museumish);
    const named = (data.elements || []).filter((el) => el.tags?.name);
    const unique = [...new Set(named.map((el) => el.tags.name))];
    const sparse = unique.length < 6;
    report.push({
      name,
      ok: true,
      osm: `${hit.osm_type}/${hit.osm_id}`,
      attractionsNamed: unique.length,
      sparse,
      sample: unique.slice(0, 5),
    });
    console.log(
      `${name}: ${unique.length} named POIs${sparse ? " (SPARSE)" : ""}`,
    );
  } catch (error) {
    report.push({
      name,
      ok: false,
      reason: error instanceof Error ? error.message : "unknown error",
    });
    console.log(`${name}: FAILED (${error instanceof Error ? error.message : "error"})`);
  }
}

console.log("\nQA report JSON:");
console.log(JSON.stringify(report, null, 2));
