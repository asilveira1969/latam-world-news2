import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import worker, { parseRssItems } from "../cloudflare/worker/src/index";

async function main() {
  const xml = readFileSync(process.argv[2] || "../output/infobae-pilot-feed.xml", "utf8");
  const items = parseRssItems(xml).slice(0, 5);
  assert.equal(items.length, 5);
  for (const item of items) {
    assert.ok(item.title); assert.match(item.sourceUrl, /^https:\/\/www\.infobae\.com\//);
    assert.ok(Number.isFinite(Date.parse(item.publishedAt)));
    assert.ok(item.excerpt.length <= 280); assert.doesNotMatch(item.excerpt, /<[^>]*>/);
  }
  console.log("Parser real, sin DB:", JSON.stringify(items.map(({ title, excerpt, publishedAt, sourceUrl }) => ({ title, excerpt, publishedAt, sourceUrl }))));
  const mf = new Miniflare({ workers: [{ config: { name: "infobae-local-test", type: "worker", compatibilityDate: "2026-08-28", manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } }, env: { DB: { type: "d1", id: "infobae-local-test-db", dev: { remote: false } } } } }] });
  const originalFetch = globalThis.fetch;
  try {
    const db = await mf.getD1Database("DB");
    for (const file of readdirSync("cloudflare/migrations").filter(f => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
      if (sql) await db.exec(sql);
    }
    const env = { DB: db, INTERNAL_API_SECRET: "local-test-only", INFOBAE_MANUAL_ENABLED: "false" };
    const post = (body: unknown = {}, secret = env.INTERNAL_API_SECRET, path = "/internal/ingestion/infobae") => worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": secret }, body: JSON.stringify(body) }), env);
    let fetched = 0;
    globalThis.fetch = (async () => { fetched++; return new Response(xml); }) as typeof fetch;
    assert.equal((await post()).status, 503); assert.equal(fetched, 0);
    env.INFOBAE_MANUAL_ENABLED = "true";
    assert.equal((await post({}, "wrong")).status, 401);
    for (const limit of [0, 6, 1.5, "5"]) assert.equal((await post({ limit })).status, 400);
    assert.equal(fetched, 0);
    async function ingest(body: unknown = {}) { const response = await post(body); assert.equal(response.status, 200, response.statusText); return (await response.json() as { data: { created: number; skipped: number } }).data; }
    assert.equal((await ingest()).created, 5);
    const rows = (await db.prepare("SELECT * FROM articles ORDER BY published_at DESC").all()).results as Record<string, unknown>[];
    assert.equal(rows.length, 5);
    for (const item of items) {
      const row = rows.find(r => r.source_url === item.sourceUrl)!; assert.ok(row);
      assert.equal(row.title, item.title); assert.equal(row.excerpt, item.excerpt);
      assert.equal(row.published_at, new Date(item.publishedAt).toISOString());
      assert.equal(row.source_name, "Infobae"); assert.equal(row.source, "Infobae"); assert.equal(row.url, item.sourceUrl);
      assert.equal(row.content, null); assert.equal(row.editorial_status, "pending_review"); assert.equal(row.editorial_review_status, "pending");
      assert.equal(row.region, "Mundo"); assert.ok(row.category); assert.ok(row.section_slug); assert.ok(row.topic_slug);
      assert.match(String(row.source_url_hash), /^[a-f0-9]{64}$/);
      assert.equal((await worker.fetch(new Request(`http://localhost/articles/${row.slug}`), env)).status, 404);
    }
    assert.equal((await ingest()).created, 0);
    assert.deepEqual((await db.prepare("SELECT * FROM articles ORDER BY published_at DESC").all()).results, rows);
    assert.deepEqual((await (await worker.fetch(new Request("http://localhost/articles"), env)).json() as { data: unknown[] }).data, []);
    assert.equal((await (await worker.fetch(new Request("http://localhost/internal/articles" , { headers: { "x-internal-api-secret": env.INTERNAL_API_SECRET } }), env)).json() as { data: unknown[] }).data.length, 5);
    // Decisions use only synthetic URLs/content, never real Infobae articles.
    let suffix = "utm_source=fixture";
    globalThis.fetch = (async () => new Response(`<rss><channel><item><title>Fixture local</title><link>https://example.test/infobae-fixture?${suffix}</link><pubDate>${new Date().toISOString()}</pubDate><description><![CDATA[<p>Extracto local</p>]]></description></item></channel></rss>`)) as typeof fetch;
    assert.equal((await ingest({ limit: 1 })).created, 1);
    const synthetic = await db.prepare("SELECT slug FROM articles WHERE title = 'Fixture local'").first<{ slug: string }>();
    assert.equal((await post({ slugs: [synthetic!.slug] }, env.INTERNAL_API_SECRET, "/internal/articles/delete-batch")).status, 200);
    suffix = "utm_campaign=retry&amp;fbclid=x";
    assert.equal((await ingest()).created, 0);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM rejected_article_urls").first<{ n: number }>())!.n, 1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM article_write_permissions").first<{ n: number }>())!.n, 0);
    const urls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response("<rss><channel/></rss>"); }) as typeof fetch;
    let task: Promise<unknown> = Promise.resolve();
    await worker.scheduled({ cron: "0 */4 * * *" }, env, { waitUntil(p) { task = p; } }); await task;
    assert.equal(urls.length, 4); assert.ok(urls.every(u => !u.includes("infobae")));
    await worker.scheduled({ cron: "0 3 * * *" }, env, { waitUntil(p) { task = p; } }); await task;
    assert.equal(urls.length, 4);
    env.INFOBAE_MANUAL_ENABLED = "false"; assert.equal((await post()).status, 503);
    assert.deepEqual((await db.prepare("SELECT * FROM articles ORDER BY published_at DESC").all()).results, rows);
    console.log("PASS: 5 real items locally; repeat=0; synthetic rejection/tracking blocked; pending list/individual hidden; editorial=5; permissions=0; four cron sources only; disable preserves rows.");
  } finally { globalThis.fetch = originalFetch; await mf.dispose(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
