import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import worker from "../cloudflare/worker/src/index";

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
      if (query.startsWith("INSERT INTO articles")) {
        const row = Object.fromEntries(ARTICLE_COLUMNS.map((column, index) => [column, values[index]]));
        rows.push(row);
      }
      return { success: true, meta: { changes: 1 } };
    }
  };
}
const db = { prepare: statement, async batch() { return []; } };
const env = { DB: db };
const originalFetch = globalThis.fetch;
const longHtml = `<p>${"Texto externo de prueba ".repeat(40)}</p>`;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  const id = url.includes("bbci") ? "bbc" : url.includes("france24") ? "france" : url.includes("elpais") ? "elpais" : "rt";
  const publishedAt = useFuturePublicationDate ? "2099-01-01T10:00:00.000Z" : "2026-08-30T10:00:00.000Z";
  return new Response(`<?xml version="1.0"?><rss><channel><item><title>Noticia ${id} sobre energía internacional</title><link>https://example.test/${id}</link><pubDate>${publishedAt}</pubDate><description><![CDATA[${longHtml}]]></description><content:encoded><![CDATA[${"CUERPO COMPLETO ".repeat(100)}]]></content:encoded></item></channel></rss>`, { status: 200, headers: { "content-type": "application/rss+xml" } });
}) as typeof fetch;

async function invokeScheduled() {
  let pending: Promise<unknown> | null = null;
  await worker.scheduled({}, env, { waitUntil(promise) { pending = promise; } });
  await pending;
}

async function main() {
  const wranglerConfig = readFileSync(resolve(process.cwd(), "cloudflare/worker/wrangler.toml"), "utf8");
  assert.match(wranglerConfig, /crons = \["0 \*\/4 \* \* \*"\]/, "the RSS schedule is prepared for every four hours");

  await invokeScheduled();
  assert.equal(rows.length, 4, "first cron run inserts one new item from each configured source");
  for (const row of rows) {
    assert.equal(row.content, null, "RSS content is never persisted");
    assert.ok(String(row.excerpt).length <= 280, "RSS excerpt remains bounded");
    assert.equal(row.editorial_status, "pending_review");
    assert.equal(row.editorial_review_status, "pending");
    assert.equal(row.source_type, "rss");
  }
  await invokeScheduled();
  assert.equal(rows.length, 4, "repeated cron run does not duplicate existing source URLs/slugs");
  rows.length = 0;
  useFuturePublicationDate = true;
  await invokeScheduled();
  assert.equal(rows.length, 0, "RSS entries dated too far in the future are skipped");
  console.log("d1-worker-rss-cron OK");
}

main().finally(() => { globalThis.fetch = originalFetch; }).catch((error) => { console.error(error); process.exit(1); });
