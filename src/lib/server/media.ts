import { throttle } from "./throttle";
import { cacheGet, cacheSet } from "./cache";

const USER_AGENT =
  "We-Visit/0.1 (https://github.com/malorentelopez/we-visit; visit planner)";

export type MediaEnrichment = {
  imageUrl?: string;
  description?: string;
  wikipediaUrl?: string;
};

function parseWikipediaTag(tag: string): { lang: string; title: string } | null {
  const match = tag.match(/^([a-z]{2,3}):(.+)$/i);
  if (!match) return null;
  return { lang: match[1].toLowerCase(), title: match[2].replace(/ /g, "_") };
}

async function commonsThumb(fileName: string): Promise<string | undefined> {
  const title = fileName.startsWith("File:") ? fileName : `File:${fileName}`;
  const key = `commons:${title}`;
  const cached = cacheGet<string>(key);
  if (cached) return cached;

  await throttle("wikimedia", 200);
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url");
  url.searchParams.set("iiurlwidth", "640");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        { imageinfo?: Array<{ thumburl?: string; url?: string }> }
      >;
    };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  const image = info?.thumburl || info?.url;
  if (image) cacheSet(key, image, 7 * 24 * 60 * 60 * 1000);
  return image;
}

async function wikipediaSummary(
  lang: string,
  title: string,
): Promise<MediaEnrichment> {
  const key = `wiki:${lang}:${title}`;
  const cached = cacheGet<MediaEnrichment>(key);
  if (cached) return cached;

  await throttle("wikipedia", 200);
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
  };
  const enrichment: MediaEnrichment = {
    description: data.extract?.slice(0, 420),
    wikipediaUrl: data.content_urls?.desktop?.page,
    imageUrl: data.thumbnail?.source || data.originalimage?.source,
  };
  cacheSet(key, enrichment, 7 * 24 * 60 * 60 * 1000);
  return enrichment;
}

export async function enrichFromTags(
  tags: Record<string, string>,
  name: string,
  options?: { allowNameLookup?: boolean },
): Promise<MediaEnrichment> {
  const result: MediaEnrichment = {};
  const allowNameLookup = options?.allowNameLookup ?? false;

  const description =
    tags.description ||
    tags["description:en"] ||
    tags["description:es"] ||
    tags["description:fr"];
  if (description) result.description = description.slice(0, 420);

  const directImage = tags.image || tags["image:0"];
  if (directImage?.startsWith("http")) {
    result.imageUrl = directImage;
  }

  const commons = tags.wikimedia_commons;
  if (!result.imageUrl && commons) {
    const file = commons
      .split(";")
      .find((part) => /^(File:|.*\.(jpg|jpeg|png|webp))/i.test(part.trim()));
    if (file) {
      const normalized = file.trim().startsWith("File:")
        ? file.trim()
        : `File:${file.trim()}`;
      result.imageUrl = await commonsThumb(normalized);
    }
  }

  const wikiTag = tags.wikipedia || tags["wikipedia:en"] || tags["wikipedia:es"];
  if (wikiTag) {
    const parsed = parseWikipediaTag(
      wikiTag.includes(":") ? wikiTag : `en:${wikiTag}`,
    );
    if (parsed) {
      const summary = await wikipediaSummary(parsed.lang, parsed.title);
      result.description = result.description || summary.description;
      result.imageUrl = result.imageUrl || summary.imageUrl;
      result.wikipediaUrl = summary.wikipediaUrl;
    }
  }

  // Optional name lookup (venue hero / sparse cases only — keep prepare fast)
  if (
    allowNameLookup &&
    !result.imageUrl &&
    !result.description &&
    name.length > 3
  ) {
    for (const lang of ["en", "es", "fr"]) {
      const summary = await wikipediaSummary(lang, name.replace(/ /g, "_"));
      if (summary.imageUrl || summary.description) {
        result.description = result.description || summary.description;
        result.imageUrl = result.imageUrl || summary.imageUrl;
        result.wikipediaUrl = result.wikipediaUrl || summary.wikipediaUrl;
        break;
      }
    }
  }

  return result;
}
