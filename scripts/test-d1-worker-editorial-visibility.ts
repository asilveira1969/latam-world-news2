import assert from "node:assert/strict";
import worker from "../cloudflare/worker/src/index";

type Row = Record<string, unknown>;

const ready: Row = { id: "ready-id", slug: "ready", title: "Ready", editorial_status: "ready", editorial_review_status: "approved", tags: "[]", countries: "[]" };
const rejected: Row = { id: "rejected-id", slug: "rejected", title: "Rejected", editorial_status: "rejected", editorial_review_status: "rejected", tags: "[]", countries: "[]" };
const pending: Row = { id: "pending-id", slug: "pending", title: "Pending", editorial_status: "pending_review", editorial_review_status: "pending", tags: "[]", countries: "[]" };
const queries: string[] = [];
const preparedQueries: string[] = [];
const queryValues: Array<{ query: string; values: unknown[] }> = [];
let batched = 0;
const presentSlugs = new Set(["ready", "rejected", "pending"]);

function statement(query: string) {
  preparedQueries.push(query);
  let values: unknown[] = [];
  return {
    bind(...next: unknown[]) { values = next; return this; },
    async all<T>() {
      queries.push(query);
      queryValues.push({ query, values });
      if (query.startsWith("DELETE FROM articles")) {
        const slug = String(values[0]);
        const row = ({ ready, rejected, pending } as Record<string, Row>)[slug];
        if (presentSlugs.has(slug) && row?.editorial_status === "pending_review" && row.editorial_review_status === "pending") {
          presentSlugs.delete(slug);
          return { results: [{ slug }] as T[] };
        }
        return { results: [] as T[] };
      }
      if (query.startsWith("SELECT slug, editorial_status, editorial_review_status FROM articles")) {
        const slug = String(values[0]);
        const row = ({ ready, rejected, pending } as Record<string, Row>)[slug];
        return { results: presentSlugs.has(slug) && row ? [row] as T[] : [] as T[] };
      }
      if (query.includes("SELECT * FROM articles")) {
        if (query.includes("editorial_status = 'ready'")) return { results: [ready] as T[] };
        return { results: [ready, rejected, pending] as T[] };
      }
      return { results: [] as T[] };
    },
    async first<T>() {
      queries.push(query);
      queryValues.push({ query, values });
      if (query === "SELECT 1 AS ok") return { ok: 1 } as T;
      if (query === "SELECT id FROM articles WHERE slug = ?") return ["ready", "rejected", "pending"].includes(String(values[0])) ? { id: String(values[0]) } as T : null;
      if (query.includes("SELECT * FROM articles WHERE slug")) {
        const slug = String(values[0]);
        if (query.includes("editorial_status = 'ready'")) return slug === "ready" ? ready as T : null;
        return ({ ready, rejected, pending } as Record<string, Row>)[slug] as T ?? null;
      }
      return null;
    },
    async run() {
      queries.push(query);
      queryValues.push({ query, values });
      return { success: true, meta: { changes: 1 } };
    }
  };
}

const db = {
  prepare: statement,
  async batch(statements: Array<ReturnType<typeof statement>>) { batched = statements.length; return statements.map(() => ({ success: true, meta: { changes: 1 } })); }
};
const env = { DB: db, INTERNAL_API_SECRET: "test-secret" };
const request = (path: string, init: RequestInit = {}) => new Request(`https://worker.test${path}`, init);

async function main() {
const publicList = await worker.fetch(request("/articles?q=ready"), env);
assert.equal(publicList.status, 200);
assert.deepEqual((await publicList.json() as { data: Row[] }).data.map((article) => article.slug), ["ready"]);
assert.ok(queries.some((query) => query.includes("editorial_status = 'ready' AND editorial_review_status = 'approved'")));

await worker.fetch(request("/articles?section_slug=energia&is_impact=0"), env);
const scopedQuery = queryValues.find(({ query }) => query.includes("section_slug = ?") && query.includes("is_impact = ?"));
assert.ok(scopedQuery, "public listings pass section and impact filters to D1");
assert.ok(scopedQuery.query.includes("published_at <= ?"), "public listings compare ISO publication dates without julianday()");
assert.equal(scopedQuery.query.includes("julianday("), false, "the publication-date predicate remains indexable");
assert.deepEqual(scopedQuery.values.slice(1, 3), ["energia", "0"]);

assert.equal((await worker.fetch(request("/articles/ready"), env)).status, 200);
assert.equal((await worker.fetch(request("/articles/rejected"), env)).status, 404);
assert.equal((await worker.fetch(request("/articles/pending"), env)).status, 404);

const internalList = await worker.fetch(request("/internal/articles", { headers: { "x-internal-api-secret": "test-secret" } }), env);
assert.equal(internalList.status, 200);
assert.equal((await internalList.json() as { data: Row[] }).data.length, 3);

const protectedWrite = await worker.fetch(request("/internal/editorial/apply-batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ changes: [] }) }), env);
assert.equal(protectedWrite.status, 401);

const validBatch = await worker.fetch(request("/internal/editorial/apply-batch", {
  method: "POST",
  headers: { "content-type": "application/json", "x-internal-api-secret": "test-secret" },
  body: JSON.stringify({ changes: [
    { slug: "ready", editorial_status: "ready", editorial_review_status: "approved", region: "LatAm", category: "Internacional", section_slug: "latinoamerica", topic_slug: "venezuela", country: "venezuela", countries: ["venezuela"], tags: ["rss", "venezuela"] }
  ] })
}), env);
assert.equal(validBatch.status, 200);
assert.equal((await validBatch.json() as { data: { changed: number; rejected: number } }).data.changed, 1);
assert.equal(batched, 1);

const protectedDelete = await worker.fetch(request("/internal/articles/delete-batch", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ slugs: ["rejected"] })
}), env);
assert.equal(protectedDelete.status, 401);

assert.equal(protectedDelete.headers.get("cache-control"), "no-store");

const deletePending = await worker.fetch(request("/internal/articles/delete-batch", {
  method: "POST",
  headers: { "content-type": "application/json", "x-internal-api-secret": "test-secret" },
  body: JSON.stringify({ slugs: ["pending"] })
}), env);
assert.equal(deletePending.status, 200);
assert.equal(deletePending.headers.get("cache-control"), "no-store");
assert.deepEqual((await deletePending.json() as { data: { requested: number; deleted: number; slugs: string[] } }).data, {
  requested: 1,
  deleted: 1,
  slugs: ["pending"]
});
assert.ok(preparedQueries.some((query) => query.startsWith("DELETE FROM articles WHERE slug IN (?) AND editorial_status = 'pending_review' AND editorial_review_status = 'pending'")), "the delete itself requires a pending editorial-review status");

const originalConsoleError = console.error;
console.error = () => undefined;
const deleteReady = await worker.fetch(request("/internal/articles/delete-batch", {
  method: "POST",
  headers: { "content-type": "application/json", "x-internal-api-secret": "test-secret" },
  body: JSON.stringify({ slugs: ["ready"] })
}), env);
assert.equal(deleteReady.status, 409);
assert.equal(deleteReady.headers.get("cache-control"), "no-store");
assert.match((await deleteReady.json() as { error: string }).error, /pending editorial review/i);

const deleteMissing = await worker.fetch(request("/internal/articles/delete-batch", {
  method: "POST",
  headers: { "content-type": "application/json", "x-internal-api-secret": "test-secret" },
  body: JSON.stringify({ slugs: ["missing"] })
}), env);
console.error = originalConsoleError;
assert.equal(deleteMissing.status, 404);
assert.equal(deleteMissing.headers.get("cache-control"), "no-store");
assert.match((await deleteMissing.json() as { error: string }).error, /not found/i);

console.error = () => undefined;
const invalidBatch = await worker.fetch(request("/internal/editorial/apply-batch", {
  method: "POST",
  headers: { "content-type": "application/json", "x-internal-api-secret": "test-secret" },
  body: JSON.stringify({ changes: [{ slug: "ready", editorial_status: "rejected", editorial_review_status: "rejected" }] })
}), env);
console.error = originalConsoleError;
assert.equal(invalidBatch.status, 400);

console.log("d1-worker-editorial-visibility OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
