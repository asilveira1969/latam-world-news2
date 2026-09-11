import "server-only";
import type { Article } from "@/lib/types/article";
import { isEligibleForNewsSitemap } from "@/lib/news-sitemap-policy";

export interface D1WorkerPagination {
  page: number;
  pageSize: number;
}

export interface D1WorkerArticleList {
  data: Article[];
  pagination: D1WorkerPagination;
}

interface D1WorkerArticleResponse {
  data: Article;
}

const workerUrl = process.env.D1_WORKER_URL;

export const hasD1WorkerEnv = Boolean(workerUrl);

function getBaseUrl(): string {
  if (!workerUrl) throw new Error("D1_WORKER_URL is missing.");
  return workerUrl.replace(/\/$/, "");
}

async function requestD1Worker<T>(path: string, revalidate = 300): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    // Public articles are editorially curated. Reusing each Worker response for
    // ten minutes prevents Vercel from repeatedly asking D1 for the same list.
    next: { revalidate }
  });
  if (!response.ok) throw new Error(`D1 Worker request failed (${response.status}).`);
  return (await response.json()) as T;
}

export interface D1WorkerNewsSitemapArticle {
  slug: string;
  title: string;
  language?: string | null;
  published_at?: string | null;
  editorial_status?: string | null;
  editorial_review_status?: string | null;
  editorial_reviewed_at?: string | null;
}

interface D1WorkerNewsSitemapArticleList {
  data: D1WorkerNewsSitemapArticle[];
}

/**
 * Reads only from the existing public D1 Worker endpoint. The Worker remains
 * the source of truth for public visibility; this second filter narrows that
 * public set to Google News' 48-hour publication window.
 */
export async function getD1WorkerNewsSitemapArticles(
  now = new Date()
): Promise<D1WorkerNewsSitemapArticle[]> {
  const pageSize = 100;
  const articles: D1WorkerNewsSitemapArticle[] = [];
  let page = 1;

  while (true) {
    const result = await requestD1Worker<D1WorkerNewsSitemapArticleList>(
      `/articles?page=${page}&pageSize=${pageSize}`,
      300
    );
    articles.push(...result.data);
    if (result.data.length < pageSize) break;
    page += 1;
  }

  return articles.filter((article) => isEligibleForNewsSitemap(article, now));
}

// The Cloudflare Worker is the sole public article read path.
export async function listD1WorkerArticles(input?: {
  page?: number;
  pageSize?: number;
  region?: string;
  country?: string;
  sectionSlug?: string;
  sourceType?: string;
  isImpact?: boolean;
  impactFormat?: string;
  query?: string;
}): Promise<D1WorkerArticleList> {
  const params = new URLSearchParams();
  if (input?.page) params.set("page", String(input.page));
  if (input?.pageSize) params.set("pageSize", String(input.pageSize));
  if (input?.region) params.set("region", input.region);
  if (input?.country) params.set("country", input.country);
  if (input?.sectionSlug) params.set("section_slug", input.sectionSlug);
  if (input?.sourceType) params.set("source_type", input.sourceType);
  if (input?.isImpact !== undefined) params.set("is_impact", input.isImpact ? "1" : "0");
  if (input?.impactFormat) params.set("impact_format", input.impactFormat);
  if (input?.query) params.set("q", input.query);
  const suffix = params.size ? `?${params.toString()}` : "";
  return requestD1Worker<D1WorkerArticleList>(`/articles${suffix}`);
}

export async function getAllD1WorkerArticles(): Promise<Article[]> {
  const pageSize = 100;
  const articles: Article[] = [];
  let page = 1;

  while (true) {
    const result = await listD1WorkerArticles({ page, pageSize });
    articles.push(...result.data);
    if (result.data.length < pageSize) return articles;
    page += 1;
  }
}

export async function getD1WorkerArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const result = await requestD1Worker<D1WorkerArticleResponse>(
      `/articles/${encodeURIComponent(slug)}`
    );
    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("(404)")) return null;
    throw error;
  }
}
