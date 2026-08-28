export type D1ArticleWrite = Record<string, unknown>;

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

export async function upsertD1Article(article: D1ArticleWrite): Promise<{ created: boolean }> {
  return internalRequest<{ created: boolean }>("/internal/articles/upsert", { article });
}

export async function recordD1IngestionError(input: {
  source_id: string;
  provider: "rss" | "newsdata";
  message: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  await internalRequest<{ ok: boolean }>("/internal/ingestion-errors", input);
}
