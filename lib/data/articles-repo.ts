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
import type { Article, HomeData, RegionKey, SectionKey } from "@/lib/types/article";

function mapRecordToArticle(record: Record<string, unknown>): Article {
  return {
    id: String(record.id ?? crypto.randomUUID()),
    title: String(record.title ?? ""),
    slug: String(record.slug ?? ""),
    excerpt: String(record.excerpt ?? ""),
    content: (record.content as string | null) ?? null,
    image_url: String(record.image_url ?? "https://picsum.photos/seed/fallback/1200/675"),
    source_name: String(record.source_name ?? "Fuente externa"),
    source_url: String(record.source_url ?? "#"),
    region: (record.region as Article["region"]) ?? "Mundo",
    category: String(record.category ?? "Geopolitica"),
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

export async function getAllArticles(): Promise<Article[]> {
  const all = await fetchAllArticlesFromSource();
  return dedupeBySourceUrl(sortByPublishedDesc(all));
}

export async function getHomeData(): Promise<HomeData> {
  const all = await getAllArticles();
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
