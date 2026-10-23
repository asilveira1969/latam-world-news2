import assert from "node:assert/strict";
import Module from "node:module";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { DatabaseSync } from "node:sqlite";
import { impactoFixtures } from "./fixtures/impacto-originals";
import { latamActivationTimestamp } from "../lib/impacto-latam-editoriales";
import worker from "../cloudflare/worker/src/index";
import type { Article } from "../lib/types/article";

Object.assign(globalThis, { React });
const activation = "2026-10-20T12:00:00.000Z";
const base = impactoFixtures(0).find(a => a.source_type === "rss")!;
const sample: Article = { ...base, slug: "impacto-rss-aprobado", title: "Impacto regional aprobado de prueba",
  editorial_format: "latam_impact", editorial_reviewed_at: "2026-10-21T10:00:00.000Z",
  editorial_updated_at: null, editorial_latam_impact: null };
// Newer RSS publication dates must not let historical approvals through.
const historical = Array.from({length: 9}, (_, i) => ({ ...sample, slug: `historical-${i}`,
  published_at: "2026-10-22T08:00:00.000Z", editorial_reviewed_at: "2026-10-19T10:00:00.000Z" }));
const excluded = [
  { editorial_format: "brief" }, { editorial_format: "context" }, { source_type: "manual" },
  { editorial_status: "pending_review" }, { editorial_review_status: "pending" },
  { editorial_review_status: "rejected" }, { editorial_reviewed_at: null },
  { editorial_reviewed_at: activation }, { published_at: "2099-01-01T00:00:00.000Z" }
].map((patch, i) => ({ ...sample, slug: `excluded-${i}`, ...patch }));
const accepted = [sample, { ...sample, slug: "short-impact", editorial_latam_impact: "Breve." }];
const records = [...impactoFixtures(20), ...historical, ...excluded, ...accepted];
const sqlite = new DatabaseSync(":memory:");
const columns = [...new Set(records.flatMap(row => Object.keys(row)))];
sqlite.exec(`CREATE TABLE articles (${columns.map(name => `"${name}" ${name === "is_impact" ? "INTEGER" : "TEXT"}`).join(",")})`);
sqlite.exec("CREATE INDEX idx_articles_editorial_format_review ON articles(editorial_format, editorial_review_status, published_at DESC)");
const insert = sqlite.prepare(`INSERT INTO articles (${columns.map(name => `"${name}"`).join(",")}) VALUES (${columns.map(()=>"?").join(",")})`);
for (const row of records) insert.run(...columns.map(key => {
  const value = (row as unknown as Record<string, unknown>)[key];
  return value == null ? null : typeof value === "boolean" ? Number(value) : typeof value === "object" ? JSON.stringify(value) : value as string | number;
}));
const snapshot = () => JSON.stringify(sqlite.prepare("SELECT * FROM articles ORDER BY slug").all());
const beforeData = snapshot();
const sqlReads: Array<{sql: string; values: unknown[]}> = [];
const db = { prepare(sql: string) {
  assert.match(sql, /^SELECT /, "Worker must only read in this test");
  let values: unknown[] = [];
  return { bind(...args: unknown[]) { values = args; return this; },
    async all() { sqlReads.push({sql, values}); return { results: sqlite.prepare(sql).all(...values as never[]) }; },
    async first() { return sqlite.prepare(sql).get(...values as never[]) ?? null; },
    async run() { throw new Error("Writes forbidden"); }
  };
}, async batch() { throw new Error("Writes forbidden"); } };
const request = (path: string) => worker.fetch(new Request(`http://fixture.invalid${path}`), { DB: db } as never);
const path = `/articles?source_type=rss&editorial_format=latam_impact&reviewed_after=${activation}&pageSize=1`;
async function main() {
  assert.equal(latamActivationTimestamp(), null);
  for (const value of ["bad", "2026-02-30T00:00:00.000Z", "2026-10-20"]) assert.equal(latamActivationTimestamp(value), null);
  assert.equal(latamActivationTimestamp(activation), activation);
  const baseline = await request("/articles?pageSize=100");
  assert.equal(baseline.status, 200);
  const baselineSql = sqlReads.at(-1)!.sql;
  assert.equal(baselineSql, "SELECT * FROM articles WHERE editorial_status = 'ready' AND editorial_review_status = 'approved' AND published_at <= ? ORDER BY published_at DESC LIMIT ? OFFSET ?");
  for (const page of [1, 2]) {
    const response = await request(`${path}&page=${page}`);
    const body = await response.json() as {data: Article[]};
    assert.equal(response.status, 200); assert.equal(body.data.length, 1);
    assert.ok(accepted.some(a => a.slug === body.data[0].slug));
    const query = sqlReads.at(-1)!;
    assert.match(query.sql, /editorial_format = \? AND editorial_reviewed_at > \?/);
    assert.deepEqual(query.values.slice(-4), ["latam_impact", activation, 1, page - 1]);
    const plan = sqlite.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.values as never[]);
    assert.match(JSON.stringify(plan), /idx_articles_editorial_format_review/);
  }
  assert.equal((await request(`${path}&page=3`)).status, 200);
  const third = await (await request(`${path}&page=3`)).json() as {data: Article[]};
  assert.equal(third.data.length, 0);
  for (const query of ["editorial_format=unknown", "editorial_format=latam_impact%27%20OR%201%3D1", "reviewed_after=bad", "reviewed_after=2026-02-30T00:00:00.000Z"]) {
    assert.equal((await request(`/articles?${query}`)).status, 400);
  }
  const loader = Module as unknown as { _load: (...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  loader._load = function(id, ...rest) {
    if (id === "server-only") return {};
    if (id === "next/cache") return { unstable_cache: (fn: unknown) => fn };
    return originalLoad.call(this, id, ...rest);
  };
  const originalFetch = globalThis.fetch;
  const oldActivation = process.env.IMPACTO_LATAM_ACTIVATED_AT;
  process.env.D1_WORKER_URL = "http://fixture.invalid";
  const reads: URL[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); assert.equal(url.origin, "http://fixture.invalid");
    assert.equal(init?.method ?? "GET", "GET"); reads.push(url);
    return request(url.pathname + url.search);
  };
  try {
    const repo = await import("../lib/data/articles-repo");
    const { default: Hub } = await import("../app/impacto/page");
    delete process.env.IMPACTO_LATAM_ACTIVATED_AT;
    const count = reads.length;
    assert.deepEqual(await repo.getLatamImpactEditoriales(), []); assert.equal(reads.length, count);
    const before = load(renderToStaticMarkup(await Hub({})));
    const originals = await repo.getImpactOriginalArchive();
    const opinions = await repo.getOpinionArticles(), columns = await repo.getColumnistArticles();
    process.env.IMPACTO_LATAM_ACTIVATED_AT = activation;
    const after = load(renderToStaticMarkup(await Hub({})));
    assert.equal(after('#editoriales [data-latam-editoriales] a').length, 2);
    for (const row of accepted) assert.equal(after(`[href="/nota/${row.slug}"]`).length, 1);
    assert.equal(after('[data-latam-editoriales]').parent().attr('id'), "editoriales");
    for (const row of historical) assert.equal(after(`[href="/nota/${row.slug}"]`).length, 0);
    assert.equal(before('#editoriales > .grid').html(), after('#editoriales > .grid').html());
    assert.equal(before('script[type="application/ld+json"]').text(), after('script[type="application/ld+json"]').text());
    assert.deepEqual(await repo.getImpactOriginalArchive(), originals);
    assert.deepEqual(await repo.getOpinionArticles(), opinions); assert.deepEqual(await repo.getColumnistArticles(), columns);
    const direct = reads.filter(url => url.searchParams.has("editorial_format"));
    assert.equal(direct.length, 1); assert.equal(direct[0].searchParams.get("pageSize"), "12");
    assert.equal(direct[0].searchParams.get("reviewed_after"), activation);
    const second = load(renderToStaticMarkup(await Hub({searchParams: Promise.resolve({pagina: "2"})})));
    assert.equal(second('[data-latam-editoriales]').length, 0);
    assert.equal(reads.filter(url => url.searchParams.has("editorial_format")).length, 1);
    assert.equal(snapshot(), beforeData, "no historical or other rows changed");
    console.log("PASS: real SQLite direct indexed SELECT, optional filters, pagination, invalid parameters, nine historical exclusions, approval boundary, old RSS/new approval, no content filters, disabled activation, one GET, /nota links, originals/categories/JSON-LD unchanged, zero writes.");
  } finally {
    globalThis.fetch = originalFetch; loader._load = originalLoad;
    if (oldActivation === undefined) delete process.env.IMPACTO_LATAM_ACTIVATED_AT; else process.env.IMPACTO_LATAM_ACTIVATED_AT = oldActivation;
    sqlite.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
