import "server-only";
import type { Article } from "@/lib/types/article";

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

async function requestD1Worker<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    next: { revalidate: 60 }
  });
  if (!response.ok) throw new Error(`D1 Worker request failed (${response.status}).`);
  return (await response.json()) as T;
}

// This adapter is intentionally unused by the current Supabase repositories.
// It permits focused D1 development and later opt-in integration.
export async function listD1WorkerArticles(input?: {
  page?: number;
  pageSize?: number;
  region?: string;
  country?: string;
  sectionSlug?: string;
  sourceType?: string;
  query?: string;
}): Promise<D1WorkerArticleList> {
  const params = new URLSearchParams();
  if (input?.page) params.set("page", String(input.page));
  if (input?.pageSize) params.set("pageSize", String(input.pageSize));
  if (input?.region) params.set("region", input.region);
  if (input?.country) params.set("country", input.country);
  if (input?.sectionSlug) params.set("section_slug", input.sectionSlug);
  if (input?.sourceType) params.set("source_type", input.sourceType);
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
