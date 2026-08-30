import "server-only";

export type D1ArticleWrite = Record<string, unknown>;
export type D1EditorialDecisionWrite = {
  slug: string;
  editorial_status: "ready" | "rejected" | "pending_review";
  editorial_review_status: "approved" | "rejected" | "pending";
  audit_note: string;
  editorial_reviewed_at?: string;
  region?: string;
  country?: string | null;
  countries?: string[];
  category?: string;
  tags?: string[];
  topic_slug?: string;
  section_slug?: string;
};

const workerUrl = process.env.D1_WORKER_URL;
const internalSecret = process.env.D1_WORKER_INTERNAL_SECRET;

function baseUrl(): string {
  if (!workerUrl || !internalSecret) {
    throw new Error("D1_WORKER_URL and D1_WORKER_INTERNAL_SECRET are required for D1 writes.");
  }
  return workerUrl.replace(/\/$/, "");
}

async function internalRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-api-secret": internalSecret as string
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const responseBody = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(responseBody.error || `D1 Worker request failed (${response.status}).`);
  return responseBody;
}

async function internalGet<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    headers: { "x-internal-api-secret": internalSecret as string },
    cache: "no-store"
  });
  const responseBody = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(responseBody.error || `D1 Worker request failed (${response.status}).`);
  return responseBody;
}

export async function upsertD1Article(article: D1ArticleWrite): Promise<{ created: boolean }> {
  return internalRequest<{ created: boolean }>("/internal/articles/upsert", { article });
}

export async function applyD1EditorialDecisions(changes: D1EditorialDecisionWrite[]): Promise<{
  requested: number;
  changed: number;
  approved: number;
  rejected: number;
  pending: number;
  slugs: string[];
}> {
  const response = await internalRequest<{ data: { requested: number; changed: number; approved: number; rejected: number; pending: number; slugs: string[] } }>("/internal/editorial/apply-batch", { changes });
  return response.data;
}

export async function recordD1IngestionError(input: {
  source_id: string;
  provider: "rss" | "newsdata";
  message: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  await internalRequest<{ ok: boolean }>("/internal/ingestion-errors", input);
}

export async function listD1InternalArticles(input: {
  editorialStatus?: string;
  editorialReviewStatus?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ data: Array<Record<string, unknown>>; pagination: { page: number; pageSize: number } }> {
  const params = new URLSearchParams();
  if (input.editorialStatus) params.set("editorial_status", input.editorialStatus);
  if (input.editorialReviewStatus) params.set("editorial_review_status", input.editorialReviewStatus);
  params.set("page", String(input.page ?? 1));
  params.set("pageSize", String(input.pageSize ?? 100));
  return internalGet(`/internal/articles?${params.toString()}`);
}

export async function getD1InternalArticleBySlug(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await internalGet<{ data: Record<string, unknown> }>(`/internal/articles/${encodeURIComponent(slug)}`);
    return response.data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("(404)")) return null;
    throw error;
  }
}
