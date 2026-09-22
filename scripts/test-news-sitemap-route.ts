import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { XMLValidator } from "fast-xml-parser";
import worker from "../cloudflare/worker/src/index";
import { newsSitemapArticlesPath } from "../lib/news-sitemap-query";
import { buildNewsSitemapXml } from "../lib/news-sitemap-xml";

type CapturedStatement = { query: string; values: unknown[] };

async function verifyWorkerQuery() {
  let captured: CapturedStatement | undefined;
  const db = {
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        bind(...next: unknown[]) {
          values = next;
          captured = { query, values };
          return this;
        },
        async all() {
          return { results: [] };
        }
      };
    }
  };

  const response = await worker.fetch(
    new Request("https://worker.test/articles?news_sitemap=1&page=1&pageSize=100"),
    { DB: db } as never
  );

  assert.equal(response.status, 200, "the public News sitemap query remains readable");
  assert.ok(captured, "the Worker must execute a D1 query");
  assert.match(captured.query, /editorial_status = 'ready'/);
  assert.match(captured.query, /editorial_review_status = 'approved'/);
  assert.match(captured.query, /editorial_reviewed_at IS NOT NULL/);
  assert.match(captured.query, /published_at >= \?/);
  assert.match(captured.query, /published_at <= \?/);
  assert.match(captured.query, /ORDER BY published_at DESC/);

  const [earliest, latest, pageSize, offset] = captured.values;
  assert.equal(pageSize, 100);
  assert.equal(offset, 0);
  assert.equal(Date.parse(String(latest)) - Date.parse(String(earliest)), 48 * 60 * 60 * 1_000);
}

async function verifyXmlRoute() {
  const now = Date.now();
  const recent = new Date(now - 60 * 60 * 1_000).toISOString();
  const xml = buildNewsSitemapXml([
    { slug: "recent-news", title: "Noticias <urgentes> & verificadas", published_at: recent }
  ]);
  const routeSource = readFileSync(resolve(process.cwd(), "app/sitemap-news.xml/route.ts"), "utf8");

  assert.equal(XMLValidator.validate(xml), true, "the News sitemap must be valid XML");
  assert.equal(newsSitemapArticlesPath(1, 100), "/articles?news_sitemap=1&page=1&pageSize=100");
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.match(xml, /xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/);
  assert.match(xml, /<news:name>LATAM World News<\/news:name>/);
  assert.match(xml, /<news:language>es<\/news:language>/);
  assert.match(xml, /Noticias &lt;urgentes&gt; &amp; verificadas/);

  const publicationDates = [...xml.matchAll(/<news:publication_date>([^<]+)<\/news:publication_date>/g)]
    .map((match) => Date.parse(match[1]));
  assert.equal(publicationDates.length, 1);
  assert.ok(publicationDates.every((date) => date >= now - 48 * 60 * 60 * 1_000 && date <= Date.now()));
  assert.match(routeSource, /export const revalidate = 300/);
  assert.match(routeSource, /public, s-maxage=300, stale-while-revalidate=60/);
}

async function main() {
  await verifyWorkerQuery();
  await verifyXmlRoute();
  console.log("news sitemap route checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
