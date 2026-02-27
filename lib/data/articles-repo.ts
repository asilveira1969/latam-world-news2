import { fallbackTickerHeadlines } from "@/lib/mock/ticker";
import { mockArticles } from "@/lib/mock/articles";
import {
  dedupeBySourceUrl,
  pickHero,
  sortByPublishedDesc,
  topTagsLastHours
} from "@/lib/ranking";
import {
  REGION_ROUTE_MAP,
  REGION_TITLE_MAP
} from "@/lib/constants/nav";
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
  hasSupabaseAnonEnv,
  hasSupabaseServiceEnv
} from "@/lib/supabase/server";
import { resolveCardImage } from "@/lib/images";
import {
  cleanExcerpt,
  cleanPlainText,
  looksCorruptedText,
  looksLikeSystemError
} from "@/lib/text/clean";
import type { Article, HomeData, RegionKey, SectionKey } from "@/lib/types/article";

const LATAM_COUNTRIES = ["uy", "ar", "br", "mx", "cl"] as const;
const COUNTRY_REGION_CODES = ["UY", "AR", "BR", "MX", "CL"] as const;
const LATAM_REGION_VALUES = ["LatAm", ...COUNTRY_REGION_CODES] as const;

function isLatamCountry(value: string): boolean {
  return LATAM_COUNTRIES.includes(value.toLowerCase() as (typeof LATAM_COUNTRIES)[number]);
}

function isLatamRegion(value: string): boolean {
  return LATAM_REGION_VALUES.includes(value as (typeof LATAM_REGION_VALUES)[number]);
}

function isDisplayableArticle(article: Article): boolean {
  const combined = `${article.title}\n${article.excerpt}\n${article.source_name}`;
  if (looksLikeSystemError(combined)) {
    return false;
  }
  if (looksCorruptedText(`${article.title}\n${article.excerpt}`)) {
    return false;
  }
  if (article.source_name.trim().toLowerCase() === "openclaw system") {
    return false;
  }
  if (article.title.trim().length < 8) {
    return false;
  }
  return true;
}

function mapRecordToArticle(record: Record<string, unknown>): Article {
  const rawTitle = String(record.title ?? "");
  const title = cleanPlainText(rawTitle) || "Actualizacion internacional";
  const rawExcerpt = String(record.summary ?? record.excerpt ?? "");
  const excerpt = cleanExcerpt(rawExcerpt, 280) || `${title}.`;
  const rawContent = (record.content as string | null) ?? null;
  const country = String(record.country ?? "").toLowerCase();
  const regionInput = String(record.region ?? "").trim();
  const derivedRegion =
    (regionInput as Article["region"]) ||
    (country && isLatamCountry(country)
      ? (country.toUpperCase() as Article["region"])
      : "Mundo");
  const sourceNameInput = String(record.source ?? record.source_name ?? "Fuente externa");
  const sourceUrlInput = String(record.url ?? record.source_url ?? "#");

  return {
    id: String(record.id ?? crypto.randomUUID()),
    title,
    slug: String(record.slug ?? ""),
    excerpt,
    content: rawContent ? cleanPlainText(rawContent) : null,
    image_url: resolveCardImage(String(record.image_url ?? "")),
    source_name: cleanPlainText(sourceNameInput) || "Fuente externa",
    source_url: sourceUrlInput || "#",
    region: derivedRegion,
    category: cleanPlainText(String(record.category ?? "Geopolitica")) || "Geopolitica",
    tags: Array.isArray(record.tags) ? (record.tags as string[]) : [],
    published_at: String(record.published_at ?? new Date().toISOString()),
    created_at: String(record.created_at ?? new Date().toISOString()),
    is_featured: Boolean(record.is_featured),
    is_impact: Boolean(record.is_impact),
    views: Number(record.views ?? 0)
  };
}

function filterBySection(articles: Article[], section: SectionKey): Article[] {
  if (section === "impacto") {
    return articles.filter((article) => article.is_impact);
  }
  if (section === "economia-global") {
    return articles.filter(
      (article) => !article.is_impact && article.category.toLowerCase().includes("economia")
    );
  }
  if (section === "energia") {
    return articles.filter(
      (article) => !article.is_impact && article.category.toLowerCase().includes("energia")
    );
  }
  if (section === "tecnologia") {
    return articles.filter(
      (article) => !article.is_impact && article.category.toLowerCase().includes("tecnologia")
    );
  }

  const regionValue = REGION_ROUTE_MAP[section as RegionKey];
  return articles.filter((article) => !article.is_impact && article.region === regionValue);
}

async function fetchAllArticlesFromSource(): Promise<Article[]> {
  if (!hasSupabaseAnonEnv) {
    return mockArticles;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Supabase read failed, using mock data:", error.message);
      return mockArticles;
    }

    const mapped = (data ?? []).map((record: Record<string, unknown>) =>
      mapRecordToArticle(record)
    );
    if (mapped.length === 0) {
      return mockArticles;
    }
    return sortByPublishedDesc(mapped);
  } catch (error) {
    console.error("Supabase read failed, using mock data:", error);
    return mockArticles;
  }
}

async function fetchArticlesFromSupabaseQuery(input: {
  limit: number;
  countries?: string[];
  country?: string;
  region?: Article["region"];
  onlyNewsdata?: boolean;
}): Promise<Article[]> {
  if (!hasSupabaseAnonEnv) {
    return [];
  }

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(input.limit);

    if (input.country) {
      query = query.eq("country", input.country);
    } else if (input.region) {
      query = query.eq("region", input.region);
    } else if (input.countries && input.countries.length > 0) {
      query = query.in("country", input.countries);
    }

    if (input.onlyNewsdata) {
      query = query.contains("tags", ["newsdata"]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase filtered read failed:", error.message);
      return [];
    }

    const mapped = (data ?? []).map((record: Record<string, unknown>) => mapRecordToArticle(record));
    return dedupeBySourceUrl(sortByPublishedDesc(mapped)).filter(isDisplayableArticle);
  } catch (error) {
    console.error("Supabase filtered read failed:", error);
    return [];
  }
}

export async function getAllArticles(): Promise<Article[]> {
  const all = await fetchAllArticlesFromSource();
  return dedupeBySourceUrl(sortByPublishedDesc(all)).filter(isDisplayableArticle);
}

export async function getMundoArticles(
  limit = 50,
  region?: Article["region"],
  onlyNewsdata = false
): Promise<Article[]> {
  const filtered = await fetchArticlesFromSupabaseQuery({ limit, region, onlyNewsdata });
  if (filtered.length > 0) {
    return filtered.slice(0, limit);
  }

  const all = await getAllArticles();
  const base = onlyNewsdata
    ? all.filter((article) => article.tags.includes("newsdata"))
    : all;
  return region
    ? base.filter((article) => article.region === region).slice(0, limit)
    : base.slice(0, limit);
}

export async function getLatinoamericaArticles(
  limit = 50,
  region?: Article["region"]
): Promise<Article[]> {
  const latamCountry =
    region && isLatamRegion(region) && region !== "LatAm" ? region.toLowerCase() : undefined;
  const filtered = await fetchArticlesFromSupabaseQuery(
    latamCountry
      ? {
          limit,
          country: latamCountry
        }
      : {
          limit,
          countries: [...LATAM_COUNTRIES]
        }
  );
  if (filtered.length > 0) {
    const scoped = region ? filtered.filter((article) => article.region === region) : filtered;
    if (scoped.length > 0) {
      return scoped.slice(0, limit);
    }
    return filtered.slice(0, limit);
  }

  const all = await getAllArticles();
  if (region && isLatamRegion(region) && region !== "LatAm") {
    return all.filter((article) => article.region === region).slice(0, limit);
  }
  return all
    .filter((article) => isLatamRegion(article.region))
    .slice(0, limit);
}

export async function getHomeData(input?: {
  region?: Article["region"];
  onlyNewsdata?: boolean;
}): Promise<HomeData> {
  const allArticles = await getAllArticles();
  const sourceScoped = input?.onlyNewsdata
    ? allArticles.filter((article) => article.tags.includes("newsdata"))
    : allArticles;
  const scoped = input?.region
    ? sourceScoped.filter((article) => article.region === input.region)
    : sourceScoped;
  const all = scoped.length > 0 ? scoped : allArticles;
  const nonImpact = all.filter((article) => !article.is_impact);
  const pool = nonImpact.length > 0 ? nonImpact : all;
  const hero = pickHero(pool);

  const regionKeys: RegionKey[] = [
    "mundo",
    "latinoamerica",
    "eeuu",
    "europa",
    "asia",
    "medio-oriente"
  ];

  const regionBlocks = regionKeys.map((regionKey) => ({
    key: regionKey,
    title: REGION_TITLE_MAP[regionKey],
    href: `/${regionKey}`,
    items: filterBySection(nonImpact, regionKey).slice(0, 4)
  }));

  const ticker = pool.slice(0, 10).map((article) => article.title);

  return {
    ticker: ticker.length >= 6 ? ticker : fallbackTickerHeadlines,
    heroLead: hero.lead,
    heroSecondary: hero.secondary,
    impact: all.filter((article) => article.is_impact).slice(0, 3),
    latest: all.slice(0, 30),
    regionBlocks,
    trendingTags: topTagsLastHours(all, 24, 10),
    mostRead: [...all].sort((a, b) => b.views - a.views).slice(0, 8)
  };
}

export async function getLatest(input?: {
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  const limit = input?.limit ?? 30;
  const offset = input?.offset ?? 0;
  const all = await getAllArticles();
  return all.slice(offset, offset + limit);
}

export async function getRegionArticles(
  section: RegionKey | "economia-global" | "energia" | "tecnologia",
  limit = 30
): Promise<Article[]> {
  const all = await getAllArticles();
  return filterBySection(all, section).slice(0, limit);
}

export async function getImpactArticles(limit = 3): Promise<Article[]> {
  const all = await getAllArticles();
  return all.filter((article) => article.is_impact).slice(0, limit);
}

export async function getArticleBySlug(
  slug: string,
  kind: "nota" | "impacto"
): Promise<Article | null> {
  const all = await getAllArticles();
  const article = all.find((item) => item.slug === slug);
  if (!article) {
    return null;
  }
  if (kind === "nota" && article.is_impact) {
    return null;
  }
  if (kind === "impacto" && !article.is_impact) {
    return null;
  }
  return article;
}

export async function getTrendingTags(hours = 24, limit = 10): Promise<string[]> {
  const all = await getAllArticles();
  return topTagsLastHours(all, hours, limit);
}

export async function getMostRead(limit = 8): Promise<Article[]> {
  const all = await getAllArticles();
  return [...all].sort((a, b) => b.views - a.views).slice(0, limit);
}

export async function searchArticles(query: string, limit = 30): Promise<Article[]> {
  const all = await getAllArticles();
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return all.slice(0, limit);
  }

  return all
    .filter((article) => {
      const haystack = [
        article.title,
        article.excerpt,
        article.category,
        article.region,
        article.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}

export async function getAllArticleSlugs(): Promise<{
  notes: string[];
  impact: string[];
}> {
  const all = await getAllArticles();
  return {
    notes: all.filter((item) => !item.is_impact).map((item) => item.slug),
    impact: all.filter((item) => item.is_impact).map((item) => item.slug)
  };
}

export async function incrementArticleViews(slug: string): Promise<boolean> {
  if (!hasSupabaseServiceEnv) {
    return false;
  }
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("articles")
      .select("views")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return false;
    }

    const nextViews = Number(data?.views ?? 0) + 1;
    const { error: updateError } = await supabase
      .from("articles")
      .update({ views: nextViews })
      .eq("slug", slug);

    return !updateError;
  } catch {
    return false;
  }
}

export function parseCountryRegionFilter(
  value: string | string[] | undefined
): Article["region"] | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) {
    return undefined;
  }

  return COUNTRY_REGION_CODES.includes(normalized as (typeof COUNTRY_REGION_CODES)[number])
    ? (normalized as Article["region"])
    : undefined;
}
