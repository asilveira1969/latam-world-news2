import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import worker from "../cloudflare/worker/src/index";
import { isDwArticle, hasReviewedDwSummary } from "../lib/editorial/dw-summary";

type Row = Record<string, unknown>;
async function main() {
  const mf = new Miniflare({ workers: [{ config: {
    name: "dw-pagination-local", type: "worker", compatibilityDate: "2026-08-28",
    manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } },
    env: { DB: { type: "d1", id: "dw-pagination-ephemeral", dev: { remote: false } } }
  } }] });
  try {
    const db = await mf.getD1Database("DB");
    for (const file of readdirSync("cloudflare/migrations").filter(f => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
      if (sql) await db.exec(sql);
    }
    const sqlSemantics = await db.prepare("SELECT length(?) AS characters, lower(?) AS name, json_type(?, '$.dw_summary_reviewed') AS review_type")
      .bind("😀".repeat(141), "DW ESPAÑOL", JSON.stringify({ dw_summary_reviewed: 1 })).first<{ characters: number; name: string; review_type: string }>();
    assert.equal(sqlSemantics!.characters, 141);
    assert.equal("😀".repeat(141).length, 282, "SQLite character count is not the existing UTF-16 summary limit");
    assert.notEqual(sqlSemantics!.name, "DW ESPAÑOL".toLowerCase(), "SQLite lower does not implement JS Unicode case conversion");
    assert.equal(sqlSemantics!.review_type, "integer", "numeric review must not be confused with JSON true");
    const env = { DB: db, INTERNAL_API_SECRET: "pagination-synthetic-only", DW_RSS_ENABLED: "false", INFOBAE_MANUAL_ENABLED: "false", INFOBAE_SCHEDULED_ENABLED: "false" };
    const post = (path: string, body: unknown) => worker.fetch(new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": env.INTERNAL_API_SECRET }, body: JSON.stringify(body) }), env);
    const get = async (query: string) => {
      const response = await worker.fetch(new Request(`http://localhost/articles?${query}`), env);
      assert.equal(response.status, 200);
      return await response.json() as { data: Row[]; pagination: { page: number; pageSize: number } };
    };
    const sources = ["RT Actualidad", "El País España", "France 24 Español", "BBC Mundo", "MercoPress"];
    const now = Date.now() - 60_000;
    let sequence = 0;
    const seed = async (slug: string, source: string, summary?: string, validation: unknown = {}) => {
      const published = new Date(now - sequence++ * 1_000).toISOString();
      // Seed through the real write barrier; only the disposable local DB is
      // then changed to simulate historical records the current API rejects.
      assert.equal((await post("/internal/articles/upsert", { article: {
        id: slug, slug, title: `Noticia sintética ${slug}`, source_name: source,
        source_url: source === "DW Español" ? `https://www.dw.com/es/${slug}` : `https://example.test/${slug}`,
        ...(slug === "source-alias" ? { source_name: "Otra fuente", source: " DW ESPAÑOL ", source_url: "https://example.test/source-alias" } : {}),
        ...(slug === "url-alias" ? { source_name: "Otra fuente", source: "Otra fuente", source_url: "https://example.test/url-alias", url: "https://DW.COM:443/es/alias" } : {}),
        ...(slug === "encoded-host" ? { source_name: "Otra fuente", source: "Otra fuente", source_url: "https://%64w.com/es/encoded-host" } : {}),
        ...(slug === "unicode-host" ? { source_name: "Otra fuente", source: "Otra fuente", source_url: "https://ｄｗ.com/es/unicode-host" } : {}),
        source_type: "rss", excerpt: "Referencia RSS privada", published_at: published
      } })).status, 201);
      await db.prepare("UPDATE articles SET editorial_status='ready', editorial_review_status='approved', editorial_reviewed_at=?, latamworldnews_summary=?, editorial_validation=? WHERE slug=?")
        .bind(published, summary ?? null, JSON.stringify(validation), slug).run();
    };
    await seed("invalid-before-rt", "DW Español", "<b>Resumen</b>", { dw_summary_reviewed: true });
    await seed("rt-first", sources[0]);
    assert.deepEqual((await get("pageSize=1&page=1")).data.map(row => row.slug), ["rt-first"], "invalid DW cannot consume RT's position");
    assert.equal((await get("pageSize=1&page=2")).data.length, 0);

    const invalidCases: Array<[string, string | undefined, unknown]> = [
      ["historical-no-review", "Resumen antiguo", {}],
      ["numeric-review", "Resumen numérico", { dw_summary_reviewed: 1 }],
      ["false-review", "Resumen no confirmado", { dw_summary_reviewed: false }],
      ["missing-summary", undefined, { dw_summary_reviewed: true }],
      ["spaces", "\t\n\u00a0", { dw_summary_reviewed: true }],
      ["overlength", "x".repeat(281), { dw_summary_reviewed: true }],
      ["unicode-overlength", "😀".repeat(141), { dw_summary_reviewed: true }],
      ["html", "Texto <em>no permitido</em>", { dw_summary_reviewed: true }],
      ["bad-json", "Resumen con JSON inválido", {}],
      ["source-alias", "<b>Alias</b>", { dw_summary_reviewed: true }],
      ["url-alias", "<b>URL alternativa</b>", { dw_summary_reviewed: true }],
      ["encoded-host", "<b>Host escapado</b>", { dw_summary_reviewed: true }],
      ["unicode-host", "<b>Host Unicode</b>", { dw_summary_reviewed: true }]
    ];
    // More than 100 valid rows exercise the actual public-client page size.
    for (let i = 0; i < 106; i++) {
      if (i < invalidCases.length) {
        const [slug, summary, validation] = invalidCases[i];
        await seed(slug, "DW Español", summary, validation);
        if (slug === "bad-json") await db.prepare("UPDATE articles SET editorial_validation='not-json' WHERE slug=?").bind(slug).run();
      }
      await seed(`valid-${i.toString().padStart(3, "0")}`, sources[i % sources.length]);
    }
    await seed("dw-valid-280", "DW Español", "x".repeat(280), { dw_summary_reviewed: true });
    await seed("dw-valid-whitespace", "DW Español", `\t${"x".repeat(140)}\n${"y".repeat(139)}\u00a0`, { dw_summary_reviewed: true });
    // Stable tie-breaker is essential when feeds publish articles at the same time.
    await db.prepare("UPDATE articles SET published_at=? WHERE slug IN ('valid-104','valid-105')").bind(new Date(now - 200_000).toISOString()).run();
    const allRows = (await db.prepare("SELECT * FROM articles ORDER BY published_at DESC, id DESC").all()).results as Row[];
    const before = JSON.stringify(allRows);
    const expected = allRows.filter(row => !isDwArticle(row) || hasReviewedDwSummary(row)).map(row => row.slug);
    assert.equal(expected.length, 109);
    assert.deepEqual(new Set(expected), new Set([
      "rt-first", ...Array.from({ length: 106 }, (_, i) => `valid-${i.toString().padStart(3, "0")}`),
      "dw-valid-280", "dw-valid-whitespace"
    ]), "visibility oracle must include exactly the independently seeded valid records");
    assert.deepEqual(new Set(allRows.filter(row => sources.includes(String(row.source_name))).map(row => row.source_name)), new Set(sources));
    console.log("Seeded disposable D1: 109 valid articles and interleaved invalid historical DW records.");
    for (const sitemap of [false, true]) {
      for (const size of [1, 7, 25, 100]) {
        const seen: unknown[] = [];
        const last = Math.ceil(expected.length / size);
        const pages = size === 1 ? [1, 2, last, last + 1] : Array.from({ length: last + 1 }, (_, i) => i + 1);
        for (const page of pages) {
          const response = await get(`page=${page}&pageSize=${size}${sitemap ? "&news_sitemap=1" : ""}`);
          assert.deepEqual(response.pagination, { page, pageSize: size });
          const slice = expected.slice((page - 1) * size, page * size);
          assert.deepEqual(response.data.map(row => row.slug), slice, `${sitemap ? "sitemap" : "public"} LIMIT ${size} OFFSET ${(page - 1) * size}`);
          seen.push(...response.data.map(row => row.slug));
        }
        if (size !== 1) assert.deepEqual(seen, expected, "no omissions or duplicate positions across pages");
        assert.equal(new Set(seen).size, seen.length);
      }
      console.log(`PASS ${sitemap ? "sitemap" : "public"} pagination: first, second, last and empty pages; sizes 1/7/25/100.`);
    }
    for (const [slug] of invalidCases) {
      assert.equal((await worker.fetch(new Request(`http://localhost/articles/${slug}`), env)).status, 404, `detail agrees with SQL exclusion: ${slug}`);
    }
    assert.equal((await worker.fetch(new Request("http://localhost/articles/invalid-before-rt"), env)).status, 404);
    for (const slug of ["dw-valid-280", "dw-valid-whitespace"]) {
      assert.equal((await worker.fetch(new Request(`http://localhost/articles/${slug}`), env)).status, 200);
    }
    // Both visibility selection and the final query must retain the same filters
    // and bindings (including LIKE's three parameters and the sitemap window).
    const searched = expected.filter(slug => String(slug).includes("valid-"));
    for (const sitemap of [false, true]) {
      const filter = `q=valid-&source_type=rss&editorial_status=ready${sitemap ? "&news_sitemap=1" : ""}`;
      for (const page of [1, 2, 5, 6]) {
        assert.deepEqual((await get(`${filter}&pageSize=25&page=${page}`)).data.map(row => row.slug),
          searched.slice((page - 1) * 25, page * 25), "filtered queries preserve pagination and SQL parameter order");
      }
      assert.deepEqual((await get(`q=historical-no-review&pageSize=1${sitemap ? "&news_sitemap=1" : ""}`)).data, []);
    }
    assert.equal(JSON.stringify((await db.prepare("SELECT * FROM articles ORDER BY published_at DESC, id DESC").all()).results), before, "public and sitemap reads preserve all historical records");
    // Migration safety and index-absent compatibility, in this disposable DB.
    const schemaSnapshot = async () => JSON.stringify({
      columns: (await db.prepare("PRAGMA table_info(articles)").all()).results,
      triggers: (await db.prepare("SELECT name, sql FROM sqlite_schema WHERE type='trigger' ORDER BY name").all()).results
    });
    const schemaBefore = await schemaSnapshot();
    const indexSql = readFileSync("cloudflare/migrations/20261020_0016_public_article_seek_index.sql", "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
    assert.match(indexSql, /^CREATE INDEX IF NOT EXISTS idx_articles_public_seek\s+ON articles\(editorial_review_status, editorial_status, published_at DESC, id DESC\);$/);
    const indexColumns = (await db.prepare("PRAGMA index_info(idx_articles_public_seek)").all()).results as Array<{ name: string }>;
    assert.deepEqual(indexColumns.map(row => row.name), ["editorial_review_status", "editorial_status", "published_at", "id"]);
    await db.prepare("DROP INDEX idx_articles_public_seek").run();
    await assert.rejects(db.prepare("CREATE INDEX idx_articles_public_seek ON articles(missing_synthetic_column)").run(), /column/i);
    for (const sitemap of [false, true]) {
      for (const page of [1, 2, 5, 6]) {
        assert.deepEqual((await get(`pageSize=25&page=${page}${sitemap ? "&news_sitemap=1" : ""}`)).data.map(row => row.slug),
          expected.slice((page - 1) * 25, page * 25), "missing/failed index affects cost, not public correctness");
      }
    }
    await db.exec(indexSql);
    await db.exec(indexSql); // Idempotent with the expected definition.
    assert.equal(await schemaSnapshot(), schemaBefore, "index-only DDL preserves article columns and all rejection/dedup triggers");
    assert.equal(JSON.stringify((await db.prepare("SELECT * FROM articles ORDER BY published_at DESC, id DESC").all()).results), before, "index failure and retry do not modify news");
    assert.deepEqual((await get("pageSize=25&page=1")).data.map(row => row.slug), expected.slice(0, 25));
    console.log("PASS index migration: existing columns, no article/trigger changes, failed DDL isolated, no-index public+sitemap parity and idempotent recovery.");
    const internal = await worker.fetch(new Request("http://localhost/internal/articles?pageSize=100", { headers: { "x-internal-api-secret": env.INTERNAL_API_SECRET } }), env);
    assert.equal(internal.status, 200);
    assert.ok((await internal.text()).includes("invalid-before-rt"), "editorial access still sees hidden records");
    // More equal timestamps than fit in a batch: the ID part of the cursor
    // must advance within a date group, not skip or repeat that entire group.
    await db.prepare("UPDATE articles SET published_at=?").bind(new Date(now).toISOString()).run();
    const tiedRows = (await db.prepare("SELECT * FROM articles ORDER BY published_at DESC, id DESC").all()).results as Row[];
    const tiedExpected = tiedRows.filter(row => !isDwArticle(row) || hasReviewedDwSummary(row)).map(row => row.slug);
    for (const sitemap of [false, true]) {
      const collected: unknown[] = [];
      for (let page = 1; page <= Math.ceil(tiedExpected.length / 25) + 1; page++) {
        const response = await get(`pageSize=25&page=${page}${sitemap ? "&news_sitemap=1" : ""}`);
        assert.deepEqual(response.data.map(row => row.slug), tiedExpected.slice((page - 1) * 25, page * 25));
        collected.push(...response.data.map(row => row.slug));
      }
      assert.deepEqual(collected, tiedExpected, "cursor advances correctly within a shared timestamp");
      assert.deepEqual((await get(`pageSize=25&page=12${sitemap ? "&news_sitemap=1" : ""}`)).data, [], "a metadata-only skip can exhaust a short archive");
    }
    // A whole batch can be unpublishable. It must not terminate the public list.
    await db.prepare("UPDATE articles SET source_name='DW Español', latamworldnews_summary=NULL").run();
    await db.prepare("UPDATE articles SET source_name='RT Actualidad', source='RT Actualidad' WHERE slug IN ('valid-000','valid-001')").run();
    for (const sitemap of [false, true]) {
      const suffix = sitemap ? "&news_sitemap=1" : "";
      assert.deepEqual((await get(`pageSize=2&page=1${suffix}`)).data.map(row => row.slug), ["valid-001", "valid-000"]);
      assert.deepEqual((await get(`pageSize=1&page=2${suffix}`)).data.map(row => row.slug), ["valid-000"]);
      assert.deepEqual((await get(`pageSize=1&page=3${suffix}`)).data, []);
    }
    console.log("PASS DW pagination: 109 valid records, five sources, interleaved invalid DW, exact LIMIT/OFFSET slices, final short/empty pages, public+sitemap, Unicode/HTML/review/identity parity, no writes during reads.");
  } finally { await mf.dispose(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
