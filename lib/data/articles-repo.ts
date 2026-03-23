import { fallbackTickerHeadlines } from "@/lib/mock/ticker";
import { manualFallbackArticles, mockArticles } from "@/lib/mock/articles";
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
import { hasUsableRemoteImage, resolveCardImage } from "@/lib/images";
import { getArticleDisplayMeta } from "@/lib/editorial/article-display";
import { formatSourceDisplayName } from "@/lib/sources";
import {
  cleanExcerpt,
  cleanPlainText,
  looksCorruptedText,
  looksLikeSystemError
} from "@/lib/text/clean";
import {
  getCountryRegionCode,
  normalizeCountry,
  isLatamCountryCode,
  toTopicSlug
} from "@/lib/hubs";
import type {
  Article,
  EditorialSections,
  HomeData,
  RegionKey,
  SectionKey
} from "@/lib/types/article";

const LATAM_COUNTRIES = ["uy", "ar", "br", "mx", "cl"] as const;
const COUNTRY_REGION_CODES = ["UY", "AR", "BR", "MX", "CL"] as const;
const LATAM_REGION_VALUES = ["LatAm", ...COUNTRY_REGION_CODES] as const;
const MUNDO_RSS_TAG = "mundo-rss";
const INTERNAL_TAGS = new Set([
  "rss",
  "mundo-rss",
  "rss-rt",
  "rss-france24-es",
  "rss-bbc-mundo",
  "rss-dw-es"
]);
const GENERIC_TOPIC_TAGS = new Set(["internacional", "mundo", "latam", "america-latina"]);

export interface MundoSourceSummary {
  sourceName: string;
  articleCount: number;
  latest: Article[];
}

function getFallbackImpactArticles(limit: number): Article[] {
  return dedupeBySourceUrl(sortByPublishedDesc(mockArticles))
    .filter((article) => article.is_impact && article.impact_format === "analysis")
    .filter(isDisplayableArticle)
    .slice(0, limit);
}

function mergeWithManualArticles(articles: Article[]): Article[] {
  return dedupeBySourceUrl(sortByPublishedDesc([...articles, ...manualFallbackArticles])).filter(
    isDisplayableArticle
  );
}

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

function sanitizeArticleTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tag) => cleanPlainText(String(tag)).toLowerCase())
    .filter(Boolean)
    .filter((tag) => !INTERNAL_TAGS.has(tag));
}

function sanitizeCountryList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const countries = value
    .map((item) => normalizeCountry(String(item)))
    .filter((country): country is string => Boolean(country));

  return countries.length > 0 ? [...new Set(countries)] : null;
}

function mapRecordToArticle(record: Record<string, unknown>): Article {
  const rawTitle = String(record.title ?? "");
  const title = cleanPlainText(rawTitle) || "Actualizacion internacional";
  const rawExcerpt = String(record.summary ?? record.excerpt ?? "");
  const excerpt = cleanExcerpt(rawExcerpt, 280) || `${title}.`;
  const rawContent = (record.content as string | null) ?? null;
  const country = normalizeCountry(String(record.country ?? ""));
  const regionInput = String(record.region ?? "").trim();
  const regionFromCountry = getCountryRegionCode(country);
  const derivedRegion =
    (regionInput as Article["region"]) ||
    (regionFromCountry && isLatamCountry(regionFromCountry.toLowerCase())
      ? (regionFromCountry as Article["region"])
      : "Mundo");
  const sourceNameInput = String(record.source ?? record.source_name ?? "Fuente externa");
  const sourceUrlInput = String(record.url ?? record.source_url ?? "#");

  return {
    id: String(record.id ?? crypto.randomUUID()),
    title,
    slug: String(record.slug ?? ""),
    excerpt,
    content: rawContent ? cleanPlainText(rawContent) : null,
    seo_title: record.seo_title ? cleanPlainText(String(record.seo_title)) : null,
    seo_description: record.seo_description
      ? cleanExcerpt(String(record.seo_description), 180)
      : null,
    editorial_context: record.editorial_context
      ? cleanExcerpt(String(record.editorial_context), 320)
      : null,
    latam_angle: record.latam_angle ? cleanExcerpt(String(record.latam_angle), 260) : null,
    faq_items: Array.isArray(record.faq_items)
      ? (record.faq_items as Array<{ question: string; answer: string }>)
      : null,
    image_url: resolveCardImage(String(record.image_url ?? "")),
    source_name: formatSourceDisplayName(cleanPlainText(sourceNameInput) || "Fuente externa"),
    source_url: sourceUrlInput || "#",
    region: derivedRegion,
    country,
    category: cleanPlainText(String(record.category ?? "Geopolitica")) || "Geopolitica",
    tags: sanitizeArticleTags(record.tags),
    countries: sanitizeCountryList(record.countries),
    impact_format:
      record.impact_format === "editorial" ||
      record.impact_format === "analysis" ||
      record.impact_format === "opinion" ||
      record.impact_format === "columnist"
        ? (record.impact_format as Article["impact_format"])
        : Boolean(record.is_impact)
          ? "analysis"
          : null,
    editorial_sections:
      record.editorial_sections &&
      typeof record.editorial_sections === "object" &&
      !Array.isArray(record.editorial_sections)
        ? (record.editorial_sections as EditorialSections)
        : null,
    published_at: String(record.published_at ?? new Date().toISOString()),
    created_at: String(record.created_at ?? new Date().toISOString()),
    is_featured: Boolean(record.is_featured),
    is_impact: Boolean(record.is_impact),
    views: Number(record.views ?? 0)
  };
}

function filterBySection(articles: Article[], section: SectionKey): Article[] {
  if (section === "impacto") {
    return articles.filter(
      (article) => article.is_impact && article.impact_format === "analysis"
    );
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
      return mergeWithManualArticles(mapped);
  } catch (error) {
    console.error("Supabase read failed, using mock data:", error);
    return mockArticles;
  }
}

function sortMundoFeedForDisplay(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const aHasImage = hasUsableRemoteImage(a.image_url);
    const bHasImage = hasUsableRemoteImage(b.image_url);

    if (aHasImage !== bHasImage) {
      return aHasImage ? -1 : 1;
    }

    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
}

export function sortMundoArticlesForDisplay(articles: Article[]): Article[] {
  return sortMundoFeedForDisplay(articles);
}

async function fetchMundoRssArticlesFromSupabase(limit: number): Promise<Article[]> {
  if (!hasSupabaseAnonEnv) {
    return [];
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("region", "Mundo")
      .contains("tags", [MUNDO_RSS_TAG])
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase mundo-rss read failed:", error.message);
      return [];
    }

    const mapped = (data ?? []).map((record: Record<string, unknown>) => mapRecordToArticle(record));
    return dedupeBySourceUrl(sortByPublishedDesc(mapped)).filter(isDisplayableArticle);
  } catch (error) {
    console.error("Supabase mundo-rss read failed:", error);
    return [];
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

export async function getMundoRssArticles(limit = 50): Promise<Article[]> {
  const filtered = await fetchMundoRssArticlesFromSupabase(Math.max(limit, 120));
  if (filtered.length >= 3) {
    return sortMundoFeedForDisplay(filtered).slice(0, limit);
  }

  const fallback = await getMundoArticles(limit);
  if (filtered.length === 0) {
    return sortMundoFeedForDisplay(fallback);
  }

  const combined = dedupeBySourceUrl(sortByPublishedDesc([...filtered, ...fallback]));
  return sortMundoFeedForDisplay(combined).slice(0, limit);
}

export async function getMundoRssSourceSummaries(limitPerSource = 3): Promise<MundoSourceSummary[]> {
  const filtered = await fetchMundoRssArticlesFromSupabase(120);
  if (filtered.length === 0) {
    return [];
  }

  const groups = new Map<string, Article[]>();
  for (const article of filtered) {
    const current = groups.get(article.source_name) ?? [];
    current.push(article);
    groups.set(article.source_name, current);
  }

  return [...groups.entries()]
    .map(([sourceName, items]) => ({
      sourceName,
      articleCount: items.length,
      latest: items.slice(0, limitPerSource)
    }))
    .sort((a, b) => b.articleCount - a.articleCount || a.sourceName.localeCompare(b.sourceName));
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

  const impactArticles = all.filter((article) => article.is_impact);
  const editorialArticles = impactArticles.filter((article) => article.impact_format === "editorial");
  const analysisArticles = impactArticles.filter((article) => article.impact_format !== "editorial");
  const fallbackImpact = analysisArticles.length > 0 ? analysisArticles : getFallbackImpactArticles(3);

  return {
    ticker: ticker.length >= 6 ? ticker : fallbackTickerHeadlines,
    heroLead: hero.lead,
    heroSecondary: hero.secondary,
    latestEditorial: editorialArticles[0] ?? null,
    impact: fallbackImpact.slice(0, 3),
    latest: pool.slice(0, 30),
    regionBlocks,
    trendingTags: topTagsLastHours(pool, 24, 10),
    mostRead: [...pool].sort((a, b) => b.views - a.views).slice(0, 8)
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
  const impactArticles = all
    .filter((article) => article.is_impact && article.impact_format === "analysis")
    .slice(0, limit);
  if (impactArticles.length > 0) {
    return impactArticles;
  }

  return getFallbackImpactArticles(limit);
}

export async function getEditorialArticles(limit = 12): Promise<Article[]> {
  const all = await getAllArticles();
  return all
    .filter((article) => article.is_impact && article.impact_format === "editorial")
    .slice(0, limit);
}

export async function getLatestEditorial(): Promise<Article | null> {
  const items = await getEditorialArticles(1);
  return items[0] ?? null;
}

export async function getOpinionArticles(limit = 6): Promise<Article[]> {
  const all = await getAllArticles();
  return all
    .filter((article) => article.is_impact && article.impact_format === "opinion")
    .slice(0, limit);
}

export async function getColumnistArticles(limit = 6): Promise<Article[]> {
  const all = await getAllArticles();
  return all
    .filter((article) => article.is_impact && article.impact_format === "columnist")
    .slice(0, limit);
}

export async function getArticleBySlug(
  slug: string,
  kind: "nota" | "impacto" | "impacto-editorial" | "impacto-opinion" | "impacto-columnista"
): Promise<Article | null> {
  if (hasSupabaseAnonEnv) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        const article = mapRecordToArticle(data as Record<string, unknown>);
        if (!isDisplayableArticle(article)) {
          return null;
        }
        if (kind === "nota" && article.is_impact) {
          return null;
        }
        if (kind === "impacto" && (!article.is_impact || article.impact_format === "editorial")) {
          return null;
        }
        if (kind === "impacto-editorial" && article.impact_format !== "editorial") {
          return null;
        }
        if (kind === "impacto-opinion" && article.impact_format !== "opinion") {
          return null;
        }
        if (kind === "impacto-columnista" && article.impact_format !== "columnist") {
          return null;
        }
        return article;
      }
    } catch (error) {
      console.error("Supabase slug lookup failed, falling back to in-memory scan:", error);
    }
  }

  const all = await getAllArticles();
  const article = all.find((item) => item.slug === slug);
  if (!article) {
    if (kind === "impacto") {
      const fallbackImpact = getFallbackImpactArticles(20).find((item) => item.slug === slug);
      return fallbackImpact ?? null;
    }
    return null;
  }
  if (kind === "nota" && article.is_impact) {
    return null;
  }
  if (kind === "impacto" && (!article.is_impact || article.impact_format === "editorial")) {
    return null;
  }
  if (kind === "impacto-editorial" && article.impact_format !== "editorial") {
    return null;
  }
  if (kind === "impacto-opinion" && article.impact_format !== "opinion") {
    return null;
  }
  if (kind === "impacto-columnista" && article.impact_format !== "columnist") {
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

export async function getSitemapArticles(): Promise<
  Array<{
    slug: string;
    kind: "nota" | "impacto" | "impacto/editorial" | "impacto/opinion" | "impacto/columnistas";
    lastModified: string;
  }>
> {
  const all = await getAllArticles();
  return all.map((article) => ({
    slug: article.slug,
    kind:
      article.impact_format === "editorial"
        ? "impacto/editorial"
        : article.impact_format === "opinion"
          ? "impacto/opinion"
          : article.impact_format === "columnist"
            ? "impacto/columnistas"
            : article.is_impact
              ? "impacto"
              : "nota",
    lastModified: article.published_at || article.created_at
  }));
}

export async function getSitemapHubs(): Promise<
  Array<{
    pathname: string;
    lastModified: string;
    priority: number;
  }>
> {
  const all = await getAllArticles();
  const topicMap = new Map<string, number>();
  const topicLastModified = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const countryLastModified = new Map<string, number>();

  for (const article of all) {
    const modifiedAt = new Date(article.published_at || article.created_at).getTime();

    for (const tag of article.tags) {
      const slug = toTopicSlug(tag);
      if (!slug || GENERIC_TOPIC_TAGS.has(slug)) {
        continue;
      }

      topicMap.set(slug, (topicMap.get(slug) ?? 0) + 1);
      topicLastModified.set(slug, Math.max(topicLastModified.get(slug) ?? 0, modifiedAt));
    }

    const countries = new Set<string>();
    const primaryCountry = normalizeCountry(article.country);
    if (primaryCountry) {
      countries.add(primaryCountry);
    }
    for (const country of article.countries ?? []) {
      const normalizedCountry = normalizeCountry(country);
      if (normalizedCountry) {
        countries.add(normalizedCountry);
      }
    }
    if (isLatamCountryCode(article.region)) {
      const regionCountry = normalizeCountry(article.region);
      if (regionCountry) {
        countries.add(regionCountry);
      }
    }

    for (const country of countries) {
      if (!country) {
        continue;
      }
      countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
      countryLastModified.set(country, Math.max(countryLastModified.get(country) ?? 0, modifiedAt));
    }
  }

  const topics = [...topicMap.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([slug]) => ({
      pathname: `/tema/${slug}`,
      lastModified: new Date(topicLastModified.get(slug) ?? Date.now()).toISOString(),
      priority: 0.64
    }));

  const countries = [...countryMap.entries()]
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([slug]) => ({
      pathname: `/pais/${slug}`,
      lastModified: new Date(countryLastModified.get(slug) ?? Date.now()).toISOString(),
      priority: 0.66
    }));

  return [...topics, ...countries];
}

export async function getArticlesByTag(tag: string, limit = 24): Promise<Article[]> {
  const normalized = cleanPlainText(tag).toLowerCase().replace(/\s+/g, "-");
  const all = await getAllArticles();
  return all
    .filter((article) =>
      article.tags.some((item) => item === normalized || item.replace(/\s+/g, "-") === normalized)
    )
    .slice(0, limit);
}

export async function getArticlesByCountry(country: string, limit = 24): Promise<Article[]> {
  const normalized = normalizeCountry(country);
  if (!normalized) {
    return [];
  }

  const all = await getAllArticles();
  return all
    .filter((article) => {
      if (normalizeCountry(article.country) === normalized) {
        return true;
      }

      if ((article.countries ?? []).some((item) => normalizeCountry(item) === normalized)) {
        return true;
      }

      if (normalizeCountry(article.region) === normalized) {
        return true;
      }

      const displayMeta = getArticleDisplayMeta(article);
      return displayMeta.countrySlug === normalized;
    })
    .slice(0, limit);
}

export async function getRelatedArticles(article: Article, limit = 4): Promise<Article[]> {
  const all = await getAllArticles();
  const countries = new Set<string>();
  const primaryCountry = normalizeCountry(article.country);
  if (primaryCountry) {
    countries.add(primaryCountry);
  }
  for (const country of article.countries ?? []) {
    const normalizedCountry = normalizeCountry(country);
    if (normalizedCountry) {
      countries.add(normalizedCountry);
    }
  }
  if (isLatamCountryCode(article.region)) {
    const regionCountry = normalizeCountry(article.region);
    if (regionCountry) {
      countries.add(regionCountry);
    }
  }

  return all
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => {
      let score = 0;
      if (candidate.region === article.region) {
        score += 3;
      }
      if (candidate.category === article.category) {
        score += 3;
      }
      const sharedTags = candidate.tags.filter((tag) => article.tags.includes(tag)).length;
      score += sharedTags * 2;
      const candidateCountries = new Set<string>();
      const candidatePrimaryCountry = normalizeCountry(candidate.country);
      if (candidatePrimaryCountry) {
        candidateCountries.add(candidatePrimaryCountry);
      }
      for (const country of candidate.countries ?? []) {
        const normalizedCountry = normalizeCountry(country);
        if (normalizedCountry) {
          candidateCountries.add(normalizedCountry);
        }
      }
      if (isLatamCountryCode(candidate.region)) {
        const regionCountry = normalizeCountry(candidate.region);
        if (regionCountry) {
          candidateCountries.add(regionCountry);
        }
      }
      const sharedCountries = [...candidateCountries].filter((country) => countries.has(country)).length;
      score += sharedCountries * 3;
      if (article.is_impact !== candidate.is_impact && sharedTags > 0) {
        score += 2;
      }
      if (candidate.is_impact === article.is_impact) {
        score += 1;
      }

      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(b.candidate.published_at).getTime() - new Date(a.candidate.published_at).getTime();
    })
    .slice(0, limit)
    .map((item) => item.candidate);
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
