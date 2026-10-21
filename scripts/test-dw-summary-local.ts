import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import worker from "../cloudflare/worker/src/index";
import { publicDwArticle, validateDwSummary, hasReviewedDwSummary } from "../lib/editorial/dw-summary";
import { getEditorialBlocks } from "../lib/article-seo";
import { buildNewsArticleJsonLd } from "../lib/jsonld";
import type { Article } from "../lib/types/article";

async function main() {
  const mf = new Miniflare({ workers: [{ config: {
    name: "dw-summary-local", type: "worker", compatibilityDate: "2026-08-28",
    manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } },
    env: { DB: { type: "d1", id: "dw-summary-ephemeral", dev: { remote: false } } }
  } }] });
  try {
    const db = await mf.getD1Database("DB");
    for (const file of readdirSync("cloudflare/migrations").filter(f => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
      if (sql) await db.exec(sql);
    }
    const env = { DB: db, INTERNAL_API_SECRET: "synthetic-only", DW_RSS_ENABLED: "false", INFOBAE_MANUAL_ENABLED: "false", INFOBAE_SCHEDULED_ENABLED: "false" };
    const post = (path: string, body: unknown) => worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": env.INTERNAL_API_SECRET }, body: JSON.stringify(body) }), env);
    const get = (path: string) => worker.fetch(new Request(`http://localhost${path}`), env);
    const now = new Date().toISOString();
    const base = (slug: string) => ({ title: "Información sintética sobre comercio en Brasil", slug, source_name: "DW Español", source_url: `https://www.dw.com/es/synthetic/a-${slug}`, excerpt: "DESCRIPCION_RSS_PRIVADA", summary: "DESCRIPCION_RSS_PRIVADA", source_type: "rss", published_at: now, editorial_status: "pending_review", editorial_review_status: "pending" });
    for (const [index, source] of ["RT Actualidad", "El País España", "France 24 Español", "BBC Mundo", "MercoPress"].entries()) {
      assert.equal((await post("/internal/articles/upsert", { article: { ...base(`other-${index}`), source_name: source, source_url: `https://example.test/source-${index}`, excerpt: "Extracto previo de otra fuente", summary: "Resumen previo de otra fuente", editorial_status: "ready", editorial_review_status: "approved" } })).status, 201);
    }
    const otherRows = async () => (await db.prepare("SELECT * FROM articles WHERE slug LIKE 'other-%' ORDER BY slug").all()).results;
    const otherBefore = await otherRows(); assert.equal(otherBefore.length, 5);
    const decision = (slug: string) => ({ changes: [{ slug, editorial_status: "ready", editorial_review_status: "approved", region: "LatAm", country: "brasil", countries: ["brasil"], category: "Economía", tags: ["rss-dw-es", "comercio"], section_slug: "latinoamerica", topic_slug: "economia" }] });
    const patch = (summary: string, reviewed = true) => ({ editorial: { latamworldnews_summary: summary, editorial_model: "editorial-manual-dw", editorial_origin: "generated_metadata_only", editorial_status: "pending_review", editorial_review_status: "pending", editorial_validation: { dw_summary_reviewed: reviewed } } });
    for (const slug of ["empty", "length150", "length280", "length281", "copied"]) assert.equal((await post("/internal/articles/upsert", { article: base(slug) })).status, 201);
    assert.equal((await post("/internal/editorial/apply-batch", decision("empty"))).status, 400);
    for (const text of ["", "   ", "x".repeat(281)]) {
      assert.throws(() => validateDwSummary(text));
      assert.equal((await post("/internal/articles/length281/editorial", patch(text))).status, 400);
    }
    assert.equal((await post("/internal/articles/copied/editorial", patch("DESCRIPCION_RSS_PRIVADA"))).status, 400);
    assert.equal((await post("/internal/articles/empty/editorial", patch("Texto propio", false))).status, 400);
    assert.equal((await get("/articles/empty")).status, 404);
    for (const length of [150, 280]) {
      const slug = `length${length}`, summary = `Resumen editorial sintético revisado. ${"z".repeat(length)}`.slice(0, length);
      assert.equal(summary.length, length);
      assert.equal((await post(`/internal/articles/${slug}/editorial`, patch(summary))).status, 200);
      assert.equal((await get(`/articles/${slug}`)).status, 404, "saving never publishes");
      assert.equal((await post("/internal/editorial/apply-batch", decision(slug))).status, 200);
      const response = await get(`/articles/${slug}`); assert.equal(response.status, 200);
      const { data } = await response.json() as { data: Article & { summary: string } };
      assert.equal(data.excerpt, summary); assert.equal(data.summary, summary); assert.equal(data.latamworldnews_summary, summary);
      assert.equal(data.source_name, "Deutsche Welle"); assert.equal(data.source_url, base(slug).source_url);
      assert.equal(data.content, null); assert.equal(data.image_url, "");
      assert.equal(data.country, "brasil"); assert.equal(data.region, "LatAm"); assert.deepEqual(data.tags, ["rss-dw-es", "comercio"]);
      assert.ok(hasReviewedDwSummary(data));
      assert.equal(getEditorialBlocks(data).seoDescription, summary);
      const jsonld = buildNewsArticleJsonLd(data, `/nota/${slug}`);
      assert.equal(jsonld.description, summary); assert.equal(jsonld.articleBody, summary);
      assert.ok(!JSON.stringify(jsonld).includes("DESCRIPCION_RSS_PRIVADA"));
      assert.equal((await db.prepare("SELECT excerpt FROM articles WHERE slug = ?").bind(slug).first<{ excerpt: string }>())?.excerpt, "DESCRIPCION_RSS_PRIVADA", "RSS remains independent/private");
    }
    const list = await (await get("/articles?pageSize=100")).text(); assert.ok(!list.includes("DESCRIPCION_RSS_PRIVADA"));
    assert.equal((await post("/internal/articles/upsert", { article: { ...base("bypass"), editorial_status: "ready", editorial_review_status: "approved", latamworldnews_summary: "bypass" } })).status, 400);
    assert.equal((await post("/internal/articles/upsert", { article: { ...base("length150"), source_name: "BBC Mundo", source_url: "https://example.test/disguise", editorial_status: "ready", editorial_review_status: "approved" } })).status, 400);
    assert.equal((await worker.fetch(new Request("http://localhost/internal/articles/empty/editorial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch("Sin permiso")) }), env)).status, 401);
    const historical = { ...base("historic"), latamworldnews_summary: "", editorial_status: "ready", editorial_review_status: "approved" };
    assert.equal(publicDwArticle(historical).excerpt, "");
    // Simulate an old approved row inside this disposable database only.
    await db.prepare("UPDATE articles SET editorial_status='ready',editorial_review_status='approved' WHERE slug='empty'").run();
    assert.equal((await get("/articles/empty")).status, 404);
    assert.ok(!(await (await get("/articles?pageSize=100")).text()).includes('"slug":"empty"'));
    assert.equal((await db.prepare("SELECT editorial_status FROM articles WHERE slug='length281'").first<{ editorial_status: string }>())?.editorial_status, "pending_review");
    const other = { source_name: "BBC Mundo", excerpt: "Descripción previa", summary: "Resumen previo" };
    assert.equal(publicDwArticle(other), other, "other sources are untouched");
    assert.deepEqual(await otherRows(), otherBefore, "all existing-source columns remain unchanged by DW save and approval");
    console.log("PASS DW summaries: empty/whitespace/281 rejected, 150/280 approved, private RSS preserved, no public fallback, direct API guards, historical protection, attribution, classification and JSON-LD.");
  } finally { await mf.dispose(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
