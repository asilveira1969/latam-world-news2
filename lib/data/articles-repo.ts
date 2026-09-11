import { unstable_cache } from "next/cache";
import {
  dedupeBySourceUrl,
  pickHero,
  sortByPublishedDesc,
  topTagsLastHours
} from "@/lib/ranking";
import { REGION_TITLE_MAP } from "@/lib/constants/nav";
import {
  getAllD1WorkerArticles,
  getD1WorkerArticleBySlug,
  listD1WorkerArticles
} from "@/lib/d1/worker-client";
import { hasUsableRemoteImage, resolveCardImage } from "@/lib/images";
import { getArticleDisplayMeta } from "@/lib/editorial/article-display";
import { formatSourceDisplayName } from "@/lib/sources";
import { deriveSectionSlug } from "@/lib/article-taxonomy";
import {
  cleanExcerpt,
  cleanPlainText,
  looksCorruptedText,
  looksLikeSystemError
} from "@/lib/text/clean";
import {
  getCountryRegionCode,
  getPrimaryTopicSlug,
  getTopicLabel,
  normalizeCountry,
  isLatamCountryCode,
  toTopicSlug
} from "@/lib/hubs";
import type {
  Article,
  EditorialSections,
  HomeData,
  RegionKey
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

function isLatamCountry(value: string): boolean {
  return LATAM_COUNTRIES.includes(value.toLowerCase() as (typeof LATAM_COUNTRIES)[number]);
}

function isLatamRegion(value: string): boolean {
  return LATAM_REGION_VALUES.includes(value as (typeof LATAM_REGION_VALUES)[number]);
}

function isExcludedElPaisArticle(article: Pick<Article, "source_name" | "source_url">): boolean {
  const sourceName = article.source_name.trim().toLowerCase();
  const sourceUrl = article.source_url.trim();

  if (!sourceUrl) {
    return false;
  }

  const isElPais =
    sourceName === "el pais" ||
    sourceName === "el pais espana" ||
    sourceName === "el paÃƒÂ­s espaÃƒÂ±a";

  if (!isElPais) {
    return false;
  }

  try {
    const pathname = new URL(sourceUrl).pathname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return pathname.includes("/escaparate/") || pathname.includes("/opinion/");
  } catch {
    const normalizedUrl = sourceUrl
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return normalizedUrl.includes("/escaparate/") || normalizedUrl.includes("/opinion/");
  }
}

function hasPersistedEditorialCuration(article: Pick<Article, "latamworldnews_summary" | "curated_news" | "editorial_status">): boolean {
  const summary = article.latamworldnews_summary?.trim() ?? "";
  const curated = article.curated_news?.trim() ?? "";

  if (article.editorial_status === "failed") {
    return false;
  }

  return summary.length > 0 && curated.length > 0;
}

function passesBaseDisplayChecks(article: Article): boolean {
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
  if (isExcludedElPaisArticle(article)) {
    return false;
  }
  return true;
}

function isDisplayableArticle(article: Article): boolean {
  if (!passesBaseDisplayChecks(article)) {
    return false;
  }

  return true;
}

function matchesLatamRegionFilter(article: Article, region: Article["region"]): boolean {
  if (article.region === region) {
    return true;
  }

  const primaryCountryRegion = getCountryRegionCode(article.country);
  if (primaryCountryRegion === region) {
    return true;
  }

  const displayMetaRegion = getCountryRegionCode(getArticleDisplayMeta(article).countrySlug);
  return displayMetaRegion === region;
}

function isLatamDisplayableArticle(article: Article): boolean {
  if (!passesBaseDisplayChecks(article)) {
    return false;
  }

  if (article.is_impact) {
    return true;
  }

  if (article.source_type === "api" && article.section_slug === "latinoamerica") {
    return true;
  }

  return hasPersistedEditorialCuration(article);
}

function hasDisplayableListingImage(article: Pick<Article, "image_url">): boolean {
  return hasUsableRemoteImage(article.image_url);
}

function isPublishedLatamApiNote(article: Pick<Article, "is_impact" | "source_type" | "section_slug">): boolean {
  return !article.is_impact && article.source_type === "api" && article.section_slug === "latinoamerica";
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

export function mapRecordToArticle(record: Record<string, unknown>): Article {
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
  const tags = sanitizeArticleTags(record.tags);
  const category = cleanPlainText(String(record.category ?? "Geopolitica")) || "Geopolitica";
  const topicSlug = getPrimaryTopicSlug({
    topic: String(record.topic_slug ?? ""),
    tags,
    category,
    title,
    excerpt,
    content: rawContent,
    sourceName: sourceNameInput
  });
  const sectionSlugInput = cleanPlainText(String(record.section_slug ?? ""));

  return {
    id: String(record.id ?? crypto.randomUUID()),
    title,
    slug: String(record.slug ?? ""),
    excerpt,
    content: rawContent ? cleanPlainText(rawContent) : null,
    source_type:
      record.source_type === "api" || record.source_type === "rss"
        ? (record.source_type as Article["source_type"])
        : null,
    topic_slug: topicSlug,
    section_slug: sectionSlugInput || deriveSectionSlug({
      is_impact: Boolean(record.is_impact),
      impact_format:
        record.impact_format === "editorial" ||
        record.impact_format === "analysis" ||
        record.impact_format === "opinion" ||
        record.impact_format === "columnist"
          ? (record.impact_format as Article["impact_format"])
          : Boolean(record.is_impact)
            ? "analysis"
            : null,
      region: derivedRegion
    }),
    latamworldnews_summary: record.latamworldnews_summary
      ? cleanExcerpt(String(record.latamworldnews_summary), 320)
      : null,
    curated_news: record.curated_news
      ? cleanExcerpt(String(record.curated_news), 700)
      : null,
    editorial_status:
      record.editorial_status === "pending" ||
      record.editorial_status === "ready" ||
      record.editorial_status === "failed"
        ? (record.editorial_status as Article["editorial_status"])
        : null,
    editorial_generated_at: record.editorial_generated_at
      ? String(record.editorial_generated_at)
      : null,
    editorial_model: record.editorial_model ? cleanPlainText(String(record.editorial_model)) : null,
    editorial_format: record.editorial_format === "brief" || record.editorial_format === "context" || record.editorial_format === "latam_impact" ? record.editorial_format : null,
    editorial_key_takeaway: record.editorial_key_takeaway ? cleanExcerpt(String(record.editorial_key_takeaway), 240) : null,
    editorial_what_to_watch: record.editorial_what_to_watch ? cleanExcerpt(String(record.editorial_what_to_watch), 500) : null,
    editorial_latam_impact: record.editorial_latam_impact ? cleanExcerpt(String(record.editorial_latam_impact), 500) : null,
    editorial_author: record.editorial_author ? cleanPlainText(String(record.editorial_author)) : null,
    editorial_updated_at: record.editorial_updated_at ? String(record.editorial_updated_at) : null,
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
    category,
    tags,
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

async function fetchAllArticlesFromSource(): Promise<Article[]> {
  return (await getAllD1WorkerArticles()).map((article) =>
    mapRecordToArticle(article as unknown as Record<string, unknown>)
  );
}

const getCachedAllArticles = unstable_cache(
  async (): Promise<Article[]> => {
    const all = await fetchAllArticlesFromSource();
    return dedupeBySourceUrl(sortByPublishedDesc(all)).filter(isDisplayableArticle);
  },
  ["all-articles", "d1"],
  { revalidate: 300 }
);

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

async function fetchMundoRssArticles(limit: number): Promise<Article[]> {
  const result = await listD1WorkerArticles({
    page: 1,
    pageSize: Math.min(Math.max(limit, 1), 100),
    region: "Mundo",
    sourceType: "rss"
  });
  return dedupeBySourceUrl(sortByPublishedDesc(result.data.map((article) => mapRecordToArticle(article as unknown as Record<string, unknown>))))
    .filter((article) => article.tags.includes(MUNDO_RSS_TAG))
    .filter(isDisplayableArticle);
}

async function fetchArticlesFromD1Query(input: {
  limit: number;
  countries?: string[];
  country?: string;
  region?: Article["region"];
  onlyNewsdata?: boolean;
  sectionSlug?: string;
  isImpact?: boolean;
  impactFormat?: string;
  displayFilter?: (article: Article) => boolean;
}): Promise<Article[]> {
  const pageSize = Math.min(Math.max(input.limit, 1), 100);
  const countries = input.country ? [input.country] : input.countries?.length ? input.countries : [undefined];
  const responses = await Promise.all(countries.map((country) => listD1WorkerArticles({
    page: 1,
    pageSize,
    country,
    region: input.country || input.countries?.length ? undefined : input.region,
    sectionSlug: input.sectionSlug,
    isImpact: input.isImpact,
    impactFormat: input.impactFormat
  })));
  let articles = responses.flatMap((response) => response.data).map((article) =>
    mapRecordToArticle(article as unknown as Record<string, unknown>)
  );

  if (input.onlyNewsdata) articles = articles.filter((article) => article.tags.includes("newsdata"));

  return dedupeBySourceUrl(sortByPublishedDesc(articles))
    .filter(input.displayFilter ?? isDisplayableArticle)
    .slice(0, input.limit);
}

async function getListingArticles(input: {
  limit: number;
  region?: Article["region"];
  onlyNewsdata?: boolean;
  sectionSlug?: string;
  isImpact?: boolean;
  impactFormat?: string;
  displayFilter?: (article: Article) => boolean;
}): Promise<Article[]> {
  const queryLimit = Math.max(input.limit, 1);
  const queried = await fetchArticlesFromD1Query({
    limit: queryLimit,
    region: input.region,
    onlyNewsdata: input.onlyNewsdata,
    sectionSlug: input.sectionSlug,
    isImpact: input.isImpact,
    impactFormat: input.impactFormat,
    displayFilter: input.displayFilter
  });

  if (queried.length > 0) {
    return queried.slice(0, input.limit);
  }

  const all = await getAllArticles();
  let filtered = all;

  if (input.region) {
    filtered = filtered.filter((article) => article.region === input.region);
  }

  if (input.sectionSlug) {
    filtered = filtered.filter((article) => article.section_slug === input.sectionSlug);
  }

  if (input.onlyNewsdata) {
    filtered = filtered.filter((article) => article.tags.includes("newsdata"));
  }

  if (input.displayFilter) {
    filtered = filtered.filter(input.displayFilter);
  }

  return filtered.slice(0, input.limit);
}

export async function getAllArticles(): Promise<Article[]> {
  return getCachedAllArticles();
}

export async function getMundoArticles(
  limit = 24,
  region?: Article["region"],
  onlyNewsdata = false
): Promise<Article[]> {
  return getListingArticles({ limit, region, onlyNewsdata });
}

export async function getMundoRssArticles(limit = 24): Promise<Article[]> {
  const filtered = await fetchMundoRssArticles(Math.max(limit, 30));
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
  const filtered = await fetchMundoRssArticles(30);
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
  limit = 24,
  region?: Article["region"]
): Promise<Article[]> {
  const filtered = await fetchArticlesFromD1Query({
    limit: Math.max(limit * 4, 60),
    sectionSlug: "latinoamerica",
    displayFilter: isLatamDisplayableArticle
  });
  if (filtered.length > 0) {
    const withImage = filtered.filter(hasDisplayableListingImage);
    const scoped = region
      ? withImage.filter((article) => matchesLatamRegionFilter(article, region))
      : withImage;
    if (scoped.length > 0) {
      return scoped.slice(0, limit);
    }
    return withImage.slice(0, limit);
  }

  const all = await getAllArticles();
  if (region && isLatamRegion(region) && region !== "LatAm") {
    return all
      .filter((article) => matchesLatamRegionFilter(article, region))
      .filter(hasDisplayableListingImage)
      .slice(0, limit);
  }
  return all
    .filter((article) => article.section_slug === "latinoamerica" || isLatamRegion(article.region))
    .filter(hasDisplayableListingImage)
    .slice(0, limit);
}

export async function getHomeData(input?: {
  region?: Article["region"];
  onlyNewsdata?: boolean;
}): Promise<HomeData> {
  const listingLimit = input?.region ? 180 : 240;
  const allArticles = await getListingArticles({ limit: listingLimit, region: input?.region, onlyNewsdata: input?.onlyNewsdata });
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

  const regionItems = await Promise.all(
    regionKeys.map((regionKey) => getListingArticles({ limit: 4, sectionSlug: regionKey, isImpact: false }))
  );
  const regionBlocks = regionKeys.map((regionKey, index) => ({
    key: regionKey,
    title: REGION_TITLE_MAP[regionKey],
    href: `/${regionKey}`,
    items: regionItems[index]
  }));

  const ticker = pool.slice(0, 10).map((article) => article.title);

  const impactArticles = all.filter((article) => article.is_impact);
  const editorialArticles = impactArticles.filter((article) => article.impact_format === "editorial");
  const analysisArticles = impactArticles.filter((article) => article.impact_format !== "editorial");
  const fallbackImpact = analysisArticles;

  return {
    ticker,
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
  const listingLimit = Math.max(offset + limit, 90);
  const recent = await getListingArticles({ limit: listingLimit });
  return recent.slice(offset, offset + limit);
}

export async function getRegionArticles(
  section: RegionKey | "economia-global" | "energia" | "tecnologia",
  limit = 30
): Promise<Article[]> {
  // D1 editorial decisions persist the route's canonical section identifier.
  // Prefer it to presentation labels such as "Energía" or regional values so
  // the local D1 read path does not depend on accent-sensitive comparisons.
  return getListingArticles({ limit, sectionSlug: section });
}

export async function getImpactArticles(limit = 3): Promise<Article[]> {
  const recent = await getListingArticles({ limit: Math.max(limit * 12, 48) });
  const impactArticles = recent
    .filter((article) => article.is_impact && article.impact_format === "analysis")
    .slice(0, limit);
  if (impactArticles.length > 0) {
    return impactArticles;
  }

  return [];
}

export async function getEditorialArticles(limit = 12): Promise<Article[]> {
  const recent = await getListingArticles({ limit: Math.max(limit * 8, 48) });
  return recent
    .filter((article) => article.is_impact && article.impact_format === "editorial")
    .slice(0, limit);
}

export async function getLatestEditorial(): Promise<Article | null> {
  const items = await getEditorialArticles(1);
  return items[0] ?? null;
}

export async function getOpinionArticles(limit = 6): Promise<Article[]> {
  const recent = await getListingArticles({ limit: Math.max(limit * 8, 48) });
  return recent
    .filter((article) => article.is_impact && article.impact_format === "opinion")
    .slice(0, limit);
}

export async function getColumnistArticles(limit = 6): Promise<Article[]> {
  const recent = await getListingArticles({ limit: Math.max(limit * 8, 48) });
  return recent
    .filter((article) => article.is_impact && article.impact_format === "columnist")
    .slice(0, limit);
}

export async function getArticleBySlug(
  slug: string,
  kind: "nota" | "impacto" | "impacto-editorial" | "impacto-opinion" | "impacto-columnista"
): Promise<Article | null> {
  const cachedArticle = await getCachedArticleBySlug(slug);
  if (cachedArticle) {
    if (kind === "nota" && cachedArticle.is_impact) {
      return null;
    }
    if (kind === "nota" && !isDisplayableArticle(cachedArticle) && !isPublishedLatamApiNote(cachedArticle)) {
      return null;
    }
    if (kind === "impacto" && (!cachedArticle.is_impact || cachedArticle.impact_format === "editorial")) {
      return null;
    }
    if (kind === "impacto-editorial" && cachedArticle.impact_format !== "editorial") {
      return null;
    }
    if (kind === "impacto-opinion" && cachedArticle.impact_format !== "opinion") {
      return null;
    }
    if (kind === "impacto-columnista" && cachedArticle.impact_format !== "columnist") {
      return null;
    }
    return cachedArticle;
  }

  const all = await getAllArticles();
  const article = all.find((item) => item.slug === slug);
  if (!article) return null;
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

const getCachedArticleBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<Article | null> => {
      const article = await getD1WorkerArticleBySlug(slug);
      return article && passesBaseDisplayChecks(article)
        ? mapRecordToArticle(article as unknown as Record<string, unknown>)
        : null;
    },
    ["article-by-slug", "d1", slug],
    { revalidate: 3600 }
  )();

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
        article.latamworldnews_summary ?? "",
        article.curated_news ?? "",
        article.category,
        article.region,
        article.country ?? "",
        article.topic_slug ?? "",
        article.section_slug ?? "",
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
  void slug;
  // Public reads use the Worker only. Views are intentionally not mutated from Vercel.
  return false;
}

export async function getSitemapArticles(): Promise<
  Array<{
    slug: string;
    kind: "nota" | "impacto" | "impacto/editorial" | "impacto/opinion" | "impacto/columnistas";
    lastModified: string;
  }>
> {
  const all = await getSitemapEligibleArticles();
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
  const all = await getSitemapEligibleArticles();
  const topicMap = new Map<string, number>();
  const topicLastModified = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const countryLastModified = new Map<string, number>();

  for (const article of all) {
    const modifiedAt = new Date(article.published_at || article.created_at).getTime();

    if (article.topic_slug && !GENERIC_TOPIC_TAGS.has(article.topic_slug)) {
      topicMap.set(article.topic_slug, (topicMap.get(article.topic_slug) ?? 0) + 1);
      topicLastModified.set(
        article.topic_slug,
        Math.max(topicLastModified.get(article.topic_slug) ?? 0, modifiedAt)
      );
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

async function getSitemapEligibleArticles(): Promise<Article[]> {
  return getAllArticles();
}

export async function getArticlesByTag(tag: string, limit = 24): Promise<Article[]> {
  const normalized = toTopicSlug(tag);
  const all = await getAllArticles();
  return all
    .filter((article) => article.topic_slug === normalized)
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
    .filter(hasDisplayableListingImage)
    .slice(0, limit);
}

export async function getRelatedArticles(article: Article, limit = 4): Promise<Article[]> {
  const all = await getAllArticles();
  const displayMeta = getArticleDisplayMeta(article);
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
      if (candidate.topic_slug && displayMeta.topicSlug && candidate.topic_slug === displayMeta.topicSlug) {
        score += 5;
      }
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
      if (candidate.topic_slug === "internacional") {
        score -= 1;
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
