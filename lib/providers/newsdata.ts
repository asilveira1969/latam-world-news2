import { normalizeArticle } from "@/lib/normalize/article";
import type { IngestSource, NormalizedArticle } from "@/lib/types";

const NEWSDATA_BASE_URL = "https://newsdata.io/api/1/latest";

type NewsdataResponse = {
  results?: Array<Record<string, unknown>>;
  nextPage?: string;
  next_page?: string;
  message?: string;
};

async function fetchNewsdataPage(input: {
  apiKey: string;
  region: string;
  language: string;
  params: Record<string, string | number | boolean>;
  pageToken?: string;
}): Promise<NewsdataResponse> {
  const url = new URL(NEWSDATA_BASE_URL);
  url.searchParams.set("apikey", input.apiKey);
  url.searchParams.set("country", input.region.toLowerCase());
  url.searchParams.set("language", input.language);

  for (const [key, value] of Object.entries(input.params)) {
    url.searchParams.set(key, String(value));
  }

  if (input.pageToken) {
    url.searchParams.set("page", input.pageToken);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  let payload: NewsdataResponse;
  try {
    payload = (await response.json()) as NewsdataResponse;
  } catch {
    throw new Error(`NewsData invalid JSON response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(`NewsData request failed: ${payload.message || `HTTP ${response.status}`}`);
  }

  if (!Array.isArray(payload.results)) {
    throw new Error("NewsData response missing results array.");
  }

  return payload;
}

export async function fetchNewsdataArticles(
  source: IngestSource,
  maxPages = 2
): Promise<NormalizedArticle[]> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEWSDATA_API_KEY.");
  }

  const pageLimit = Math.min(Math.max(maxPages, 1), 2);
  const articles: NormalizedArticle[] = [];
  let nextPage: string | undefined;

  for (let page = 0; page < pageLimit; page += 1) {
    const payload = await fetchNewsdataPage({
      apiKey,
      region: source.region,
      language: source.language,
      params: source.params,
      pageToken: nextPage
    });

    for (const item of payload.results ?? []) {
      const normalized = normalizeArticle({
        title: item.title,
        source_url: item.link ?? item.url,
        published_at: item.pubDate ?? item.published_at ?? item.publishedAt,
        summary: item.description ?? item.content ?? item.snippet,
        image_url: item.image_url ?? item.imageUrl,
        source_name: item.source_name ?? item.source_id ?? "NewsData",
        region: source.region,
        language: source.language,
        raw: item
      });

      if (normalized) {
        articles.push(normalized);
      }
    }

    nextPage = payload.nextPage || payload.next_page;
    if (!nextPage) {
      break;
    }
  }

  return articles;
}
