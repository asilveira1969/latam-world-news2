import assert from "node:assert/strict";
import worker from "../cloudflare/worker/src/index";

type Row = Record<string, unknown>;

const ready: Row = { id: "ready-id", slug: "ready", title: "Ready", editorial_status: "ready", editorial_review_status: "approved", tags: "[]", countries: "[]" };
const rejected: Row = { id: "rejected-id", slug: "rejected", title: "Rejected", editorial_status: "rejected", editorial_review_status: "rejected", tags: "[]", countries: "[]" };
const pending: Row = { id: "pending-id", slug: "pending", title: "Pending", editorial_status: "pending_review", editorial_review_status: "pending", tags: "[]", countries: "[]" };
const queries: string[] = [];
const queryValues: Array<{ query: string; values: unknown[] }> = [];
let batched = 0;

function statement(query: string) {
  let values: unknown[] = [];
  return {
    bind(...next: unknown[]) { values = next; return this; },
    async all<T>() {
      queries.push(query);
      queryValues.push({ query, values });
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
    async run() { return { success: true, meta: { changes: 1 } }; }
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
    { slug: "ready", editorial_status: "ready", editorial_review_status: "approved", audit_note: "review fixture", region: "LatAm", category: "Internacional", section_slug: "latinoamerica", topic_slug: "venezuela", country: "venezuela", countries: ["venezuela"], tags: ["rss", "venezuela"] },
    { slug: "rejected", editorial_status: "rejected", editorial_review_status: "rejected", audit_note: "review fixture" }
  ] })
}), env);
assert.equal(validBatch.status, 200);
assert.equal((await validBatch.json() as { data: { changed: number; rejected: number } }).data.changed, 2);
assert.equal(batched, 2);

const originalConsoleError = console.error;
console.error = () => undefined;
const invalidBatch = await worker.fetch(request("/internal/editorial/apply-batch", {
  method: "POST",
  headers: { "content-type": "application/json", "x-internal-api-secret": "test-secret" },
  body: JSON.stringify({ changes: [{ slug: "ready", editorial_status: "ready", editorial_review_status: "rejected", audit_note: "invalid" }] })
}), env);
console.error = originalConsoleError;
assert.equal(invalidBatch.status, 400);

console.log("d1-worker-editorial-visibility OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
