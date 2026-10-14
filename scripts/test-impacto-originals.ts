import assert from "node:assert/strict";
import Module from "node:module";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { brazilRecord, originalFixture, impactoFixtures } from "./fixtures/impacto-originals";
import { loadImpactOriginalArchive, loadImpactOriginalCategory, IMPACT_SOURCE_PAGE_SIZE } from "../lib/impacto-originals";
import { isEligibleImpactOriginal, impactOriginalPath, ORIGINAL_IMPACT_FORMATS } from "../lib/manual-editorial";
import type { Article } from "../lib/types/article";

Object.assign(globalThis, { React });
const loader = Module as unknown as { _load: (...args: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (id, ...rest) {
  if (id === "server-only") return {};
  if (id === "next/cache") return { unstable_cache: (fn: unknown) => fn };
  return originalLoad.call(this, id, ...rest);
};
process.env.D1_WORKER_URL = "http://fixture.invalid";
process.env.NEXT_PUBLIC_SITE_URL = "https://latamworldnews.com";
const originalFetch = globalThis.fetch;
let records: Article[] = impactoFixtures();
const queries: URL[] = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "http://fixture.invalid", "only the local fixture may be read");
  queries.push(url);
  assert.equal((init as { next?: { revalidate: number } })?.next?.revalidate, 300);
  let eligible = records.filter((a) => a.editorial_status === "ready" && a.editorial_review_status === "approved");
  if (url.pathname.startsWith("/articles/")) {
    const item = eligible.find((a) => a.slug === decodeURIComponent(url.pathname.split("/")[2]));
    return Response.json({ data: item }, { status: item ? 200 : 404 });
  }
  const params = url.searchParams;
  for (const name of ["source_type", "impact_format", "section_slug", "region"] as const) {
    if (params.has(name)) eligible = eligible.filter((a) => String(a[name]) === params.get(name));
  }
  if (params.has("is_impact")) eligible = eligible.filter((a) => Boolean(a.is_impact) === (params.get("is_impact") === "1"));
  // Deliberately use only the Worker's date ordering; tie stability belongs to the reader.
  eligible.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const page = Number(params.get("page") || 1), pageSize = Number(params.get("pageSize") || 20);
  return Response.json({ data: eligible.slice((page - 1) * pageSize, page * pageSize), pagination: { page, pageSize } });
};

async function main() {
  const repo = await import("../lib/data/articles-repo");
  const { buildNewsArticleJsonLd } = await import("../lib/jsonld");
  const { default: Hub, generateMetadata: hubMetadata } = await import("../app/impacto/page");
  const { default: Editorial, generateMetadata: editorialMetadata } = await import("../app/impacto/editorial/[slug]/page");
  const { default: Opinion, generateMetadata: opinionMetadata } = await import("../app/impacto/opinion/[slug]/page");
  const { default: Column, generateMetadata: columnMetadata } = await import("../app/impacto/columnistas/[slug]/page");
  const { default: Hero } = await import("../components/Hero");
  const { default: Sitemap } = await import("../app/sitemap");

  const first = await repo.getImpactOriginalArchive();
  assert.equal(first.featured.editorial?.slug, brazilRecord.slug);
  assert.equal(first.featured.opinion?.slug, "opinion-0");
  assert.equal(first.featured.columnist?.slug, "columnist-0");
  assert.equal(first.archive.length, 12);
  assert.equal(first.hasNext, true);
  assert.equal(queries.length, 3, "first page must not walk all category histories");
  for (const url of queries) {
    assert.equal(url.searchParams.get("source_type"), "manual");
    assert.equal(url.searchParams.get("is_impact"), "1");
    assert.ok(ORIGINAL_IMPACT_FORMATS.includes(url.searchParams.get("impact_format") as never));
    assert.equal(url.searchParams.get("pageSize"), String(IMPACT_SOURCE_PAGE_SIZE));
  }
  const mappedBrazil = repo.mapRecordToArticle(brazilRecord as unknown as Record<string, unknown>);
  assert.equal(mappedBrazil.content, brazilRecord.content);
  const originalJson = buildNewsArticleJsonLd(mappedBrazil, impactOriginalPath(mappedBrazil));
  assert.equal(originalJson["@type"], "Article");
  assert.equal(originalJson.articleBody, brazilRecord.content);
  assert.equal(originalJson.author.name, brazilRecord.editorial_author);

  const home = await repo.getHomeData();
  assert.equal(home.latestEditorial?.slug, brazilRecord.slug, "homepage independent of 350 newer RSS records");
  assert.match(renderToStaticMarkup(React.createElement(Hero, { lead: home.heroLead, secondary: home.heroSecondary, editorial: home.latestEditorial })), /brasil-segunda-vuelta-2026-impacto-sudamerica/);
  const hub = load(renderToStaticMarkup(await Hub({})));
  assert.equal(hub('section').filter((_, el) => hub(el).find('h2').first().text() === "Editoriales").find('a').attr('href'), impactOriginalPath(mappedBrazil));
  assert.equal(hub('nav[aria-label="Paginación del archivo Impacto"] a[rel="next"]').attr('href'), "/impacto?pagina=2");
  assert.equal(hub('#editoriales article').length, 12);
  assert.ok(!hub('#editoriales').text().includes(brazilRecord.title));
  assert.ok(!hub('#editoriales').text().includes("RSS"));

  const expected = records.filter(isApprovedOriginal).sort((a, b) =>
    b.published_at.localeCompare(a.published_at) || a.slug.localeCompare(b.slug));
  const featuredSlugs = new Set(Object.values(first.featured).map((a) => a?.slug));
  const expectedArchive = expected.filter((a) => !featuredSlugs.has(a.slug));
  const collected: string[] = [];
  for (let page = 1; ; page++) {
    const result = await repo.getImpactOriginalArchive(page);
    collected.push(...result.archive.map((a) => a.slug));
    assert.deepEqual(result.archive.map((a) => a.slug), expectedArchive.slice((page - 1) * 12, page * 12).map((a) => a.slug));
    if (!result.hasNext) break;
  }
  assert.equal(new Set(collected).size, collected.length);
  assert.equal(collected.length, expectedArchive.length);
  const meta = await hubMetadata({ searchParams: Promise.resolve({ pagina: "2" }) });
  assert.equal(meta.alternates?.canonical, "https://latamworldnews.com/impacto?pagina=2");
  await assert.rejects(Hub({ searchParams: Promise.resolve({ pagina: "1" }) }), /NEXT_REDIRECT/);
  await assert.rejects(Hub({ searchParams: Promise.resolve({ pagina: "99999" }) }), /404/);

  const secondEditorial = originalFixture("editorial", 99, { slug: "segundo-editorial", published_at: new Date(Date.parse(brazilRecord.published_at) + 1).toISOString() });
  records.push(secondEditorial);
  const second = await repo.getImpactOriginalArchive();
  assert.equal(second.featured.editorial?.slug, secondEditorial.slug);
  assert.equal(second.archive[0].slug, brazilRecord.slug);
  const opinion = originalFixture("opinion", 99, { slug: "opinion-nueva", published_at: secondEditorial.published_at });
  records.push(opinion);
  assert.equal((await repo.getImpactOriginalArchive()).featured.editorial?.slug, secondEditorial.slug);
  const column = originalFixture("columnist", 99, { slug: "columna-nueva", published_at: secondEditorial.published_at });
  records.push(column);
  assert.equal((await repo.getImpactOriginalArchive()).featured.opinion?.slug, opinion.slug);

  for (const [article, Page, metadata] of [[mappedBrazil, Editorial, editorialMetadata], [opinion, Opinion, opinionMetadata], [column, Column, columnMetadata]] as const) {
    const params = Promise.resolve({ slug: article.slug });
    const html = renderToStaticMarkup(await Page({ params }));
    const $ = load(html);
    assert.ok($("article").text().includes(article.excerpt));
    assert.ok($("article").text().includes(article.editorial_author!));
    assert.ok($("article h2").length > 0);
    assert.ok(html.includes("Fuentes") && !html.includes("FAQPage"));
    const parsed = $('script[type="application/ld+json"]').toArray().map((el) => JSON.parse($(el).html()!));
    const json = parsed.find((item) => item["@type"] === "Article");
    assert.equal(json.articleBody, article.content);
    assert.equal(json.mainEntityOfPage, `https://latamworldnews.com${impactOriginalPath(article)}`);
    const result = await metadata({ params });
    assert.equal(result.alternates?.canonical, json.mainEntityOfPage);
    assert.equal(result.openGraph && "publishedTime" in result.openGraph ? result.openGraph.publishedTime : null, article.published_at);
    assert.ok(result.authors);
    assert.equal(await repo.getArticleBySlug(article.slug, "impacto"), null, "no duplicate generic route");
    assert.equal(await repo.getArticleBySlug(article.slug, "nota"), null);
  }
  const sitemap = await Sitemap();
  assert.equal(sitemap.filter((item) => item.url.endsWith(impactOriginalPath(mappedBrazil))).length, 1);
  assert.ok(sitemap.some((item) => item.url.endsWith(impactOriginalPath(opinion))));
  const newsJson = buildNewsArticleJsonLd(repo.mapRecordToArticle(records.find((a) => a.source_type === "rss")! as unknown as Record<string, unknown>), "/nota/rss-0");
  assert.equal(newsJson["@type"], "NewsArticle");

  // Defence against inconsistent public responses, including invalid dates and bodies.
  const base = originalFixture("editorial", 0);
  const invalid = [
    { editorial_review_status: "pending" }, { editorial_review_status: "rejected" }, { editorial_status: "pending_review" },
    { published_at: "2099-01-01T00:00:00Z" }, { published_at: "invalid" }, { published_at: "" },
    { content: " " }, { source_type: "rss" }, { is_impact: false }
  ];
  for (const patch of invalid) assert.equal(isEligibleImpactOriginal({ ...base, ...patch } as Article), false);
  const noReviewDate = { ...base, editorial_reviewed_at: null };
  assert.equal(isEligibleImpactOriginal(noReviewDate), true);
  assert.equal(isEligibleImpactOriginal(repo.mapRecordToArticle({ ...base, published_at: null })), false);
  const empty = originalFixture("opinion", 0, { slug: "sin-cuerpo", content: " " });
  const future = originalFixture("columnist", 0, { slug: "columna-futura", published_at: "2099-01-01T00:00:00Z" });
  records.push(empty, future);
  assert.equal(await repo.getArticleBySlug(empty.slug, "impacto-opinion"), null);
  assert.equal(await repo.getArticleBySlug(future.slug, "impacto-columnista"), null);
  const defendedSitemap = await Sitemap();
  assert.ok(!defendedSitemap.some((entry) => entry.url.endsWith(empty.slug) || entry.url.endsWith(future.slug)));
  await assert.rejects(Opinion({ params: Promise.resolve({ slug: empty.slug }) }), /404/);
  const readInvalid = async () => invalid.map((patch, i) => ({ ...base, ...patch, slug: `invalid-${i}` } as Article));
  assert.equal((await loadImpactOriginalArchive(readInvalid)).archive.length, 0);
  assert.deepEqual((await loadImpactOriginalArchive(readInvalid)).featured, { editorial: null, opinion: null, columnist: null });

  const tied = Array.from({ length: 35 }, (_, i) => ({ ...base, id: `tie-${i}`, slug: `tie-${String(34 - i).padStart(2, "0")}` }));
  let reads = 0;
  const reader = async (format: string, page: number, size: number) => {
    reads++;
    return format === "editorial" ? tied.slice((page - 1) * size, page * size) : [];
  };
  const tieResult = await loadImpactOriginalCategory(reader, "editorial", 1);
  assert.equal(tieResult[0].slug, "tie-00", "date ties across source pages are resolved by slug");
  assert.equal(reads, 3);
  records = [brazilRecord, ...records.filter((a) => a.source_type === "rss")];
  const alone = await repo.getImpactOriginalArchive();
  assert.equal(alone.featured.editorial?.slug, brazilRecord.slug);
  assert.equal(alone.featured.opinion, null);
  assert.equal(alone.featured.columnist, null);
  assert.equal(alone.archive.length, 0);
  assert.equal(alone.hasNext, false);
  globalThis.fetch = async () => new Response("Local simulated outage", { status: 503 });
  await assert.rejects(repo.getImpactOriginalArchive(), /D1 Worker request failed \(503\)/, "no general-news fallback during an outage");
  console.log("PASS: source filters/cache, bounded merge, full archive, tie ordering, 350 RSS isolation, category replacement, Brazil bytes, all three manual pages, canonicals, sitemap and Article/NewsArticle.");
}
function isApprovedOriginal(article: Article) { return isEligibleImpactOriginal(article); }
main().finally(() => { globalThis.fetch = originalFetch; loader._load = originalLoad; }).catch((error) => { console.error(error); process.exitCode = 1; });
