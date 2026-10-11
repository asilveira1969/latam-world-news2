import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import worker, { normalizeRejectionUrl } from "../cloudflare/worker/src/index";
import { editorialDayStart } from "../lib/editorial-dashboard/day-boundary";

// Real local D1 (workerd/SQLite), ephemeral storage, no remote bindings or credentials.
const mf = new Miniflare({ workers: [{ config: { name: "rejection-local-test", type: "worker", compatibilityDate: "2026-08-28", manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } }, env: { DB: { type: "d1", id: "rejection-local-test-db", dev: { remote: false } } } } }] });
const originalFetch = globalThis.fetch;
async function main() {
  assert.equal(editorialDayStart(new Date("2026-10-11T02:59:59.999Z")), "2026-10-10T03:00:00.000Z");
  assert.equal(editorialDayStart(new Date("2026-10-11T03:00:00.000Z")), "2026-10-11T03:00:00.000Z");
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync("cloudflare/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    // D1 exec takes one SQL statement per line; prepared statements support complete SQL scripts here.
    const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8");
    const executable = sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
    if (executable) await db.exec(executable);
  }
  const env = { DB: db, INTERNAL_API_SECRET: "local-test-only" };
  const post = (path: string, body: unknown) => worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": env.INTERNAL_API_SECRET }, body: JSON.stringify(body) }), env);
  const now = new Date().toISOString();
  const cutoff = editorialDayStart();
  const old = new Date(Date.parse(cutoff) - 1).toISOString();
  const article = (slug: string, source_url = `https://example.test/${slug}`) => ({ title: `Noticia ${slug}`, slug, source_url, source_name: "Fuente", excerpt: "Extracto", source_type: "rss", published_at: now, created_at: now, editorial_status: "pending_review", editorial_review_status: "pending" });
  async function insert(value: Record<string, unknown>) { const r = await post("/internal/articles/upsert", { article: value }); assert.equal(r.status, 201, await r.text()); }
  async function scheduled(cron: string) { let task: Promise<unknown> = Promise.resolve(); await worker.scheduled({ cron }, env, { waitUntil(p) { task = p; } }); await task; }
  const all = async (): Promise<Record<string, unknown>[]> => (await db.prepare("SELECT * FROM articles ORDER BY slug").all()).results;
  const base = "https://example.test/reject?article=42";
  await insert({ ...article("reject", `${base}&utm_source=rss`), latamworldnews_summary: "Borrador privado", editorial_key_takeaway: "Clave privada" });
  assert.equal((await worker.fetch(new Request("http://localhost/articles/reject"), env)).status, 404);
  assert.equal((await post("/internal/articles/delete-batch", { slugs: ["reject"] })).status, 200);
  assert.equal((await all()).length, 0);
  const refs = (await db.prepare("SELECT * FROM rejected_article_urls").all()).results;
  assert.equal(refs.length, 1); assert.deepEqual(Object.keys(refs[0]), ["url_hash"]); assert.match(String(refs[0].url_hash), /^[a-f0-9]{64}$/);
  for (const suffix of ["", "&utm_campaign=new&fbclid=x#anchor", "&at_medium=RSS&at_campaign=rss", "&gclid=x&msclkid=y", "&UTM_SOURCE=other"]) {
    assert.equal((await post("/internal/articles/upsert", { article: article("reject-variant", base + suffix) })).status, 409);
  }
  assert.equal(normalizeRejectionUrl("https://example.test/x?b=2&utm_source=x&a=1#z"), "https://example.test/x?a=1&b=2");
  await insert(article("functional", "https://example.test/reject?article=43"));
  await insert({ ...article("expired"), created_at: old });
  await insert({ ...article("today"), created_at: cutoff });
  await insert({ ...article("approved-old"), created_at: old, editorial_status: "ready", editorial_review_status: "approved" });
  await insert({ ...article("approved-today"), editorial_status: "ready", editorial_review_status: "approved" });
  const before = await all();
  await scheduled("0 3 * * *");
  assert.deepEqual(await all(), before.filter((r) => r.slug !== "expired"));
  assert.deepEqual((await db.prepare("SELECT * FROM rejected_article_urls").all()).results, refs);
  await insert({ ...article("expired-defensive"), created_at: old });
  const protectedRows = await all();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input); const source = url.includes("bbci") ? "bbc" : url.includes("france24") ? "france24" : url.includes("elpais") ? "elpais" : "rt";
    return new Response(`<rss><channel><item><title>Noticia ${source} sobre energia</title><link>https://example.test/${source}</link><pubDate>${now}</pubDate><description><![CDATA[<p>${"Extracto ".repeat(80)}</p>]]></description><content:encoded>CUERPO EXTERNO</content:encoded></item><item><title>Rechazada</title><link>${base.replace(/&/g, "&amp;")}&amp;utm_source=repeat</link><pubDate>${now}</pubDate></item></channel></rss>`);
  }) as typeof fetch;
  await scheduled("0 */4 * * *");
  const after = await all();
  for (const row of protectedRows.filter((r) => r.slug !== "expired-defensive")) assert.deepEqual(after.find((r) => r.slug === row.slug), row);
  const imported = after.filter((r) => ["RT Actualidad", "El País España", "France 24 Español", "BBC Mundo"].includes(String(r.source_name)));
  assert.equal(imported.length, 4);
  for (const r of imported) { assert.equal(r.editorial_status, "pending_review"); assert.equal(r.editorial_review_status, "pending"); assert.equal(r.content, null); assert.ok(String(r.excerpt).length <= 280); assert.equal((await worker.fetch(new Request(`http://localhost/articles/${r.slug}`), env)).status, 404); }
  const publicList = await (await worker.fetch(new Request("http://localhost/articles"), env)).json() as { data: Record<string, unknown>[] };
  assert.equal(publicList.data.length, 2);
  await scheduled("0 */4 * * *"); assert.deepEqual(await all(), after);
  const reviewed = imported[0];
  assert.equal((await post("/internal/editorial/apply-batch", { changes: [{ slug: reviewed.slug, editorial_status: "ready", editorial_review_status: "approved", region: "Mundo", country: null, countries: [], category: "Energía", tags: ["rss"], topic_slug: "energia", section_slug: "energia" }] })).status, 200);
  assert.equal((await worker.fetch(new Request(`http://localhost/articles/${reviewed.slug}`), env)).status, 200);
  const rejectedImported = imported[1];
  assert.equal((await post("/internal/articles/delete-batch", { slugs: [rejectedImported.slug] })).status, 200);
  const refsAfterReview = (await db.prepare("SELECT * FROM rejected_article_urls ORDER BY url_hash").all()).results;
  await scheduled("0 */4 * * *");
  assert.equal((await all()).some((r) => r.slug === rejectedImported.slug), false);
  assert.equal((await all()).find((r) => r.slug === reviewed.slug)?.editorial_review_status, "approved");
  // A rejected URL cannot be inserted even after the application precheck (race).
  const columns: string[] = (await db.prepare("PRAGMA table_info(articles)").all()).results.map((r: Record<string, unknown>) => String(r.name));
  const raceRow: Record<string, unknown> = { ...after.find((r) => r.slug === "functional")!, id: "race", slug: "race", source_url: base, url: base, source_url_hash: refs[0].url_hash };
  const unsafeInsert = db.prepare(`INSERT INTO articles (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).bind(...columns.map((c) => raceRow[c as keyof typeof raceRow] ?? null));
  await assert.rejects(unsafeInsert.run(), /permission/);
  const guarded = await db.batch([
    db.prepare("INSERT INTO article_write_permissions (operation_id,kind,article_id,source_url,url,url_hash) VALUES ('race','write',?,?,?,?)").bind(raceRow.id, base, base, refs[0].url_hash),
    unsafeInsert,
    db.prepare("DELETE FROM article_write_permissions WHERE operation_id='race'"),
  ]);
  assert.equal(guarded[1].meta.changes, 0);
  assert.deepEqual((await db.prepare("SELECT * FROM article_write_permissions").all()).results, []);
  const approved = after.find((r) => r.slug === "approved-old")!;
  assert.equal((await post("/internal/articles/delete-batch", { slugs: ["today", "approved-old"] })).status, 409);
  assert.deepEqual((await all()).find((r) => r.slug === approved.slug), approved);
  assert.deepEqual((await db.prepare("SELECT * FROM rejected_article_urls ORDER BY url_hash").all()).results, refsAfterReview);
  // Force the delete to fail after tombstone insertion; real D1 batch must roll back.
  await db.exec("CREATE TRIGGER test_fail_delete BEFORE DELETE ON articles WHEN OLD.slug = 'today' BEGIN SELECT RAISE(ABORT, 'forced failure'); END;");
  assert.equal((await post("/internal/articles/delete-batch", { slugs: ["today"] })).status, 400);
  assert.ok((await all()).some((r) => r.slug === "today"));
  assert.deepEqual((await db.prepare("SELECT * FROM rejected_article_urls ORDER BY url_hash").all()).results, refsAfterReview);
  await db.exec("DROP TRIGGER test_fail_delete;");
  // An expired URL was not rejected and can be imported again.
  await insert(article("expired"));
  console.log("PASS: real local D1 migrations, rejection variants, transactional rollback, both cleanup paths, unchanged approved/today rows, four RSS workflows, repeat ingestion and public visibility.");
  if (process.argv.includes("--build")) {
    const server = createServer(async (req, res) => {
      try {
        if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
        const response = await worker.fetch(new Request(`http://localhost${req.url}`), env);
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
      } catch { res.writeHead(500); res.end(); }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    try {
      const code = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], { stdio: "inherit", env: { ...process.env, D1_WORKER_URL: `http://127.0.0.1:${address.port}`, D1_WORKER_INTERNAL_SECRET: env.INTERNAL_API_SECRET } });
        child.on("error", reject); child.on("exit", resolve);
      });
      assert.equal(code, 0, "build against the isolated local Worker");
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  }
}
main().finally(async () => { globalThis.fetch = originalFetch; await mf.dispose(); }).catch((e) => { console.error(e); process.exitCode = 1; });
