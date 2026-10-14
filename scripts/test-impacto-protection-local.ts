import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import worker from "../cloudflare/worker/src/index";
import { brazilRecord, originalFixture, impactoFixtures } from "./fixtures/impacto-originals";

// Real SQLite/D1, memory-only storage, no remote binding or real secret.
const mf = new Miniflare({ workers: [{ config: {
  name: "impacto-protection-local", type: "worker", compatibilityDate: "2026-08-28",
  manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } },
  env: { DB: { type: "d1", id: "impacto-protection-local", dev: { remote: false } } }
} }] });
const originalFetch = globalThis.fetch;

async function main() {
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync("cloudflare/migrations").filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
    if (sql) await db.exec(sql);
  }
  const env = { DB: db, INTERNAL_API_SECRET: "impacto-local-only" };
  const post = (path: string, body: unknown) => worker.fetch(new Request(`http://localhost${path}`, {
    method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": env.INTERNAL_API_SECRET }, body: JSON.stringify(body)
  }), env);
  const all = async (): Promise<Record<string, unknown>[]> => (await db.prepare("SELECT * FROM articles ORDER BY slug").all()).results;
  const refs = async (): Promise<Record<string, unknown>[]> => (await db.prepare("SELECT * FROM rejected_article_urls ORDER BY url_hash").all()).results;
  const approved = [brazilRecord, originalFixture("opinion", 0), originalFixture("columnist", 0)];
  for (const article of approved) {
    const response = await post("/internal/articles/upsert", { article });
    assert.equal(response.status, 201, await response.text());
  }
  const snapshot = await all();
  const rss = (slug: string, created_at = new Date().toISOString()) => ({
    ...originalFixture("editorial", 0), id: slug, slug, source_type: "rss", is_impact: false, impact_format: null,
    source_url: `https://fixture.invalid/${slug}`, url: `https://fixture.invalid/${slug}`, created_at,
    editorial_status: "pending_review", editorial_review_status: "pending", content: null
  });
  assert.equal((await post("/internal/articles/upsert", { article: rss("expired-rss", "2000-01-01T00:00:00Z") })).status, 201);
  assert.equal((await post("/internal/articles/upsert", { article: rss("pending-rss") })).status, 201);
  async function scheduled(cron: string) {
    let task: Promise<unknown> = Promise.resolve();
    await worker.scheduled({ cron }, env, { waitUntil(p) { task = p; } });
    await task;
  }
  function checkOriginals(rows: Record<string, unknown>[]) {
    for (const expected of snapshot) assert.deepEqual(rows.find((row) => row.slug === expected.slug), expected);
  }
  await scheduled("0 3 * * *");
  checkOriginals(await all());
  assert.ok(!(await all()).some((row) => row.slug === "expired-rss"));
  assert.deepEqual(await refs(), []);

  for (const article of approved) {
    assert.equal((await post("/internal/articles/delete-batch", { slugs: [article.slug] })).status, 409);
    assert.equal((await post("/internal/articles/delete-batch", { slugs: ["pending-rss", article.slug] })).status, 409);
    checkOriginals(await all());
    assert.ok((await all()).some((row) => row.slug === "pending-rss"), "mixed rejection is atomic");
    assert.deepEqual(await refs(), [], "no rejected URL may be recorded for originals");
  }

  assert.equal((await post("/internal/articles/upsert", { article: rss("expired-rss-cron", "2000-01-01T00:00:00Z") })).status, 201);
  const now = new Date().toUTCString();
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.ok(["actualidad.rt.com", "feeds.elpais.com", "www.france24.com", "feeds.bbci.co.uk", "es.mercopress.com"].includes(url.hostname), "RSS fixture prevents outbound calls");
    return new Response(`<rss><channel><item><title>Noticia local sobre energía</title><link>https://fixture.invalid/cron-${url.hostname}</link><pubDate>${now}</pubDate><description>Extracto de prueba RSS</description></item></channel></rss>`);
  };
  await scheduled("0 */4 * * *");
  checkOriginals(await all());
  assert.ok(!(await all()).some((row) => row.slug === "expired-rss-cron"));
  assert.deepEqual(await refs(), []);
  const afterFirstCron = await all();
  await scheduled("0 */4 * * *");
  assert.deepEqual(await all(), afterFirstCron, "RSS remains deduplicated");
  assert.equal((await post("/internal/articles/delete-batch", { slugs: ["pending-rss"] })).status, 200);
  assert.equal((await refs()).length, 1, "rejecting RSS still records its tombstone");
  checkOriginals(await all());
  for (const format of ["editorial", "opinion", "columnist"]) {
    const response = await worker.fetch(new Request(`http://localhost/articles?source_type=manual&is_impact=1&impact_format=${format}&page=1&pageSize=16`), env);
    const body = await response.json() as { data: { slug: string; source_type: string }[] };
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].source_type, "manual");
  }
  console.log("PASS: real local D1, both cleanup routines, immutable approved originals in all categories, single/mixed rejection protection, no original tombstones, source filters, RSS rejection and deduplication.");

  if (process.argv.includes("--build") || process.argv.includes("--serve")) {
    // More fixtures for an actual Next build/browser flow; writes stay in memory.
    const fixtureRows = process.argv.includes("--single") ? [brazilRecord, ...impactoFixtures(0).filter((row) => row.source_type === "rss")] : impactoFixtures(20);
    for (const row of fixtureRows) {
      const image = "http://127.0.0.1:4185/images/brasil-voto-y-conexiones-globales.png";
      const local = {
        ...row, image_url: `${image}?fixture=${row.slug}`,
        ...(row.source_type === "rss" ? { source_url: `http://127.0.0.1:4185/source/${row.slug}`, url: `http://127.0.0.1:4185/source/${row.slug}` } : {})
      };
      const response = await post("/internal/articles/upsert", { article: local });
      assert.ok(response.status === 200 || response.status === 201, await response.text());
    }
    const server = createServer(async (req, res) => {
      try {
        if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
        const response = await worker.fetch(new Request(`http://localhost${req.url}`), env);
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
      } catch (error) { console.error(error); res.writeHead(500); res.end(); }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const siteEnv = { ...process.env, D1_WORKER_URL: `http://127.0.0.1:${address.port}`, D1_WORKER_INTERNAL_SECRET: env.INTERNAL_API_SECRET,
      NEXT_PUBLIC_SITE_URL: "https://latamworldnews.com", NEXT_TELEMETRY_DISABLED: "1" };
    try {
      const args = ["node_modules/next/dist/bin/next", process.argv.includes("--build") ? "build" : "start"];
      if (process.argv.includes("--serve")) args.push("--hostname", "127.0.0.1", "--port", "4185");
      const code = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, args, { stdio: "inherit", env: siteEnv });
        child.on("error", reject); child.on("exit", resolve);
        const stop = () => { child.kill(); };
        process.once("SIGINT", stop);
        child.once("exit", () => process.removeListener("SIGINT", stop));
      });
      assert.equal(code, 0, "Next against isolated local Worker/D1");
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  }
}
main().finally(async () => { globalThis.fetch = originalFetch; await mf.dispose(); }).catch((error) => { console.error(error); process.exitCode = 1; });
