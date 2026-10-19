import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import worker from "../cloudflare/worker/src/index";
import { editorialDayStart } from "../lib/editorial-dashboard/day-boundary";
import { getEnabledMundoRssSources } from "../lib/sources";
import { parseRssItems } from "../cloudflare/worker/src/index";

const ARTICLE_COLUMNS = ["id","title","slug","excerpt","content","image_url","source_name","source_url","region","category","tags","published_at","created_at","is_featured","is_impact","views","url","summary","source","source_type","country","language","raw","latamworldnews_summary","curated_news","editorial_status","editorial_generated_at","editorial_model","topic_slug","section_slug","countries","impact_format","editorial_sections","latam_angle","faq_items","seo_title","seo_description","possible_topic_duplicate","topic_duplicate_group","topic_duplicate_confidence","topic_duplicate_of_slug","editorial_origin","editorial_input_hash","editorial_prompt_version","editorial_validation","editorial_review_status","editorial_reviewed_at","editorial_review_notes"] as const;
type Row = Record<string, unknown>;
const rows: Row[] = [];
let useFuturePublicationDate = false;

function statement(query: string) {
  let values: unknown[] = [];
  return {
    bind(...next: unknown[]) { values = next; return this; },
    async all<T>() {
      if (query.includes("SELECT slug, title, source_name, source_url, published_at")) return { results: rows as T[] };
      return { results: [] as T[] };
    },
    async first<T>() {
      if (query.includes("SELECT id FROM articles WHERE slug")) {
        const [slug, sourceUrl, url] = values.map(String);
        const match = rows.find((row) => row.slug === slug || row.source_url === sourceUrl || row.url === url);
        return (match ? { id: match.id } : null) as T | null;
      }
      if (query === "SELECT 1 AS ok") return { ok: 1 } as T;
      return null;
    },
    async run() {
      if (query.startsWith("DELETE FROM articles WHERE editorial_status = 'pending_review'")) {
        const cutoff = String(values[0]);
        const deleted = rows.filter((row) => row.editorial_status === "pending_review" && row.editorial_review_status === "pending" && String(row.created_at) < cutoff);
        for (const row of deleted) rows.splice(rows.indexOf(row), 1);
        return { success: true, meta: { changes: deleted.length } };
      }
      if (query.startsWith("INSERT INTO articles")) {
        const row = Object.fromEntries(ARTICLE_COLUMNS.map((column, index) => [column, values[index]]));
        rows.push(row);
      }
      return { success: true, meta: { changes: 1 } };
    }
  };
}
const db = { prepare: statement, async batch(statements: ReturnType<typeof statement>[]) { const results = []; for (const s of statements) results.push(await s.run()); return results; } };
const env = { DB: db, DW_RSS_ENABLED: "false" };
const originalFetch = globalThis.fetch;
const longHtml = `<p>${"Texto externo de prueba ".repeat(40)}</p>`;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  assert.ok(!url.includes("infobae"), "Infobae stays disabled");
  const id = url.includes("rss.dw.com") ? "dw" : url.includes("mercopress") ? "mercopress" : url.includes("bbci") ? "bbc" : url.includes("france24") ? "france" : url.includes("elpais") ? "elpais" : "rt";
  if (id === "dw") assert.equal(url, "https://rss.dw.com/xml/rss-sp-all");
  const publishedAt = useFuturePublicationDate ? "2099-01-01T10:00:00.000Z" : "2026-08-30T10:00:00.000Z";
  const items = Array.from({ length: id === "dw" ? 30 : 1 }, (_, i) => `<item><guid isPermaLink="false">${id}-${i}</guid><title>Noticia ${id} ${i} sobre energía internacional</title><link>https://example.test/${id}/${i}</link><pubDate>${publishedAt}</pubDate><description><![CDATA[${longHtml}]]></description><content:encoded><![CDATA[${"CUERPO COMPLETO ".repeat(100)}]]></content:encoded></item>`).join("");
  return new Response(`<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
}) as typeof fetch;

async function invokeScheduled(controller: { cron?: string } = {}) {
  let pending: Promise<unknown> | null = null;
  await worker.scheduled(controller, env, { waitUntil(promise) { pending = promise; } });
  await pending;
}

async function main() {
  assert.deepEqual(getEnabledMundoRssSources().map(source => source.id), ["rss-rt", "rss-elpais-ultimas", "rss-france24-es", "rss-bbc-mundo", "rss-mercopress"]);
  const [dw] = parseRssItems(`<rss version="2.0"><channel><item><guid isPermaLink="false">123</guid><title>España: análisis &amp; política</title><link>https://www.dw.com/es/prueba/a-123?maca=spa-rss-sp-all-1122-xml-mrss</link><pubDate>Mon, 19 Oct 2026 14:44:00 GMT</pubDate><description>Información en español.</description><category>Política</category></item></channel></rss>`);
  assert.equal(dw.title, "España: análisis & política");
  assert.equal(dw.publishedAt, "Mon, 19 Oct 2026 14:44:00 GMT");
  assert.equal(dw.sourceUrl, "https://www.dw.com/es/prueba/a-123?maca=spa-rss-sp-all-1122-xml-mrss");
  assert.equal(dw.excerpt, "Información en español.");
  assert.equal(dw.imageUrl, null);
  const wranglerConfig = readFileSync(resolve(process.cwd(), "cloudflare/worker/wrangler.toml"), "utf8");
  assert.match(wranglerConfig, /crons = \["0 \*\/4 \* \* \*", "0 3 \* \* \*"\]/, "the RSS schedule and daily Montevideo cleanup trigger are configured");
  assert.equal(editorialDayStart(new Date("2026-09-07T12:00:00.000Z")), "2026-09-07T03:00:00.000Z", "the editorial day starts at midnight in Montevideo");

  await invokeScheduled();
  assert.equal(rows.length, 5, "DW is disabled by default; existing five sources work");
  rows.length = 0;
  env.DW_RSS_ENABLED = "true";
  await invokeScheduled();
  assert.equal(rows.length, 30, "five existing sources plus at most 25 DW items");
  assert.equal(rows.filter(row => row.source_name === "DW Español").length, 25);
  assert.equal(new Set(rows.map(row => row.source_name)).size, 6);
  assert.ok(rows.filter(row => row.source_name === "DW Español").every(row => row.image_url === ""));
  for (const row of rows) {
    assert.equal(row.content, null, "RSS content is never persisted");
    assert.ok(String(row.excerpt).length <= 280, "RSS excerpt remains bounded");
    assert.equal(row.editorial_status, "pending_review");
    assert.equal(row.editorial_review_status, "pending");
    assert.equal(row.source_type, "rss");
  }
  await invokeScheduled();
  assert.equal(rows.length, 30, "repeated cron run does not duplicate existing source URLs/slugs");
  rows.push(
    { id: "old-pending", slug: "old-pending", editorial_status: "pending_review", editorial_review_status: "pending", created_at: "2000-01-01T00:00:00.000Z" },
    { id: "old-ready", slug: "old-ready", editorial_status: "ready", editorial_review_status: "approved", created_at: "2000-01-01T00:00:00.000Z" }
  );
  await invokeScheduled({ cron: "0 3 * * *" });
  assert.equal(rows.some((row) => row.slug === "old-pending"), false, "the midnight cleanup permanently removes expired pending inbox items");
  assert.equal(rows.some((row) => row.slug === "old-ready"), true, "the midnight cleanup never removes approved articles");
  rows.length = 0;
  useFuturePublicationDate = true;
  await invokeScheduled();
  assert.equal(rows.length, 0, "RSS entries dated too far in the future are skipped");
  console.log("d1-worker-rss-cron OK");
}

main().finally(() => { globalThis.fetch = originalFetch; }).catch((error) => { console.error(error); process.exit(1); });
