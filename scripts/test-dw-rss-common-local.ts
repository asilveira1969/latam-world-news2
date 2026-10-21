// Synthetic disposable D1 fixture only. No migration files or remote operations.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import worker from "../cloudflare/worker/src/index";
import { classifyD1EditorialInput } from "../lib/d1/editorial/classify";

type Row = Record<string, unknown>;
async function main() {
  const current = readFileSync("cloudflare/worker/src/index.ts", "utf8");
  const base = execFileSync("git", ["show", "2f3b9e04d4b7ca0283eb50a764c83e16dc638198:cloudflare/worker/src/index.ts"], { encoding: "utf8" });
  const publicHandlers = (text: string) => text.slice(text.indexOf("async function listArticles"), text.indexOf("export default")).replace(/\r\n/g, "\n");
  assert.equal(publicHandlers(current), publicHandlers(base), "public SQL, pagination and detail must remain byte-identical to production");
  assert.ok(!current.includes("hasReviewedDwSummary") && !current.includes("isDwArticle"), "no DW-specific editorial restrictions");
  const mf = new Miniflare({ workers: [{ config: {
    name: "dw-common-local", type: "worker", compatibilityDate: "2026-08-28",
    manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('fixture')}}" } } },
    env: { DB: { type: "d1", id: "dw-common-local-only", dev: { remote: false } } }
  } }] });
  try {
    const db = await mf.getD1Database("DB");
    const columns = JSON.parse("[" + current.match(/const ARTICLE_COLUMNS = \[([^\]]+)\]/)![1] + "]") as string[];
    await db.exec(`CREATE TABLE articles (${columns.map(c => `${c} ${["is_impact", "is_featured", "views"].includes(c) ? "INTEGER" : "TEXT"}${c === "id" ? " PRIMARY KEY" : ""}`).join(",")}, source_url_hash TEXT); CREATE UNIQUE INDEX fixture_slug ON articles(slug); CREATE TABLE article_write_permissions (operation_id TEXT, kind TEXT, article_id TEXT, source_url TEXT, url TEXT, url_hash TEXT, old_source_url TEXT, old_url TEXT, old_hash TEXT); CREATE TABLE rejected_article_urls (url_hash TEXT PRIMARY KEY);`);
    const env = { DB: db, INTERNAL_API_SECRET: "synthetic-local-only", DW_RSS_ENABLED: "true" };
    const post = (path: string, body: unknown) => worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": env.INTERNAL_API_SECRET }, body: JSON.stringify(body) }), env);
    async function list(query = "", internal = false) {
      const response = await worker.fetch(new Request(`http://localhost/${internal ? "internal/" : ""}articles?${query}`, { headers: internal ? { "x-internal-api-secret": env.INTERNAL_API_SECRET } : {} }), env);
      assert.equal(response.status, 200);
      return (await response.json() as { data: Row[] }).data;
    }
    const article = {
      id: "dw-synthetic", slug: "dw-synthetic", title: "Brasil anuncia nuevas medidas sobre comercio internacional",
      source_name: "DW Español", source_url: "https://www.dw.com/es/synthetic/a-1", source_type: "rss",
      excerpt: `<p>${"Extracto RSS común ".repeat(40)}</p>`, content: "FULL ARTICLE MUST NOT BE STORED",
      image_url: "https://static.dw.com/image/synthetic.jpg", published_at: new Date(Date.now() - 60_000).toISOString()
    };
    assert.equal((await post("/internal/articles/upsert", { article })).status, 201);
    const pending = await list("editorial_status=pending_review&editorial_review_status=pending", true);
    assert.equal(pending.length, 1, "same internal listing used by /editorial");
    assert.equal(pending[0].source_name, "DW Español");
    assert.equal(pending[0].content, null); assert.ok(String(pending[0].excerpt).length <= 280);
    assert.equal(pending[0].image_url, article.image_url);
    assert.equal((await list()).length, 0);
    assert.equal((await list("news_sitemap=1")).length, 0);
    assert.equal((await worker.fetch(new Request("http://localhost/articles/dw-synthetic"), env)).status, 404);
    const classification = classifyD1EditorialInput({ ...article, excerpt: String(pending[0].excerpt) });
    assert.equal(classification.region, "LatAm"); assert.equal(classification.country, "brasil");
    // Approval is performed ONLY on a synthetic local record, never a real story.
    const approved = await post("/internal/editorial/apply-batch", { changes: [{ slug: article.slug, editorial_status: "ready", editorial_review_status: "approved", ...classification }] });
    assert.equal(approved.status, 200, await approved.text());
    const visible = await list(); assert.equal(visible.length, 1);
    assert.equal(visible[0].source_name, "DW Español"); assert.equal(visible[0].source_url, article.source_url);
    assert.equal(visible[0].image_url, article.image_url); assert.equal(visible[0].latamworldnews_summary, null, "approval does not require a manual DW summary");
    assert.equal((await list("region=LatAm&country=brasil")).length, 1);
    assert.equal((await list("page=2&pageSize=1")).length, 0);
    assert.equal((await list("news_sitemap=1")).length, 1);
    assert.equal((await worker.fetch(new Request("http://localhost/articles/dw-synthetic"), env)).status, 200);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM article_write_permissions").first<{ n: number }>())?.n, 0);
    console.log("PASS DW common flow: pending/internal inbox, public exclusion, ordinary local approval, images, classification, filters, detail and sitemap; production pagination unchanged; no migration execution");
  } finally { await mf.dispose(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
