import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { buildSync } from "esbuild";
import { Miniflare } from "miniflare";
import maintenance from "../cloudflare/worker/src/maintenance";

// Secret is synthetic, ephemeral, never printed or written. No production config.
const secret = randomBytes(32).toString("hex");
const mf = new Miniflare({ workers: ["index", "maintenance"].map((entry) => ({
  config: {
    name: `local-${entry}`, type: "worker" as const, compatibilityDate: "2026-08-28",
    manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm" as const,
      contents: buildSync({ entryPoints: [`cloudflare/worker/src/${entry}.ts`], bundle: true,
        write: false, format: "esm", platform: "browser", target: "es2022" }).outputFiles[0].text } } },
    env: { DB: { type: "d1" as const, id: "maintenance-local-only", dev: { remote: false } },
      INTERNAL_API_SECRET: { type: "text" as const, value: secret } },
  },
})) });

async function main() {
  const db = await mf.getD1Database("DB", "local-index");
  for (const file of readdirSync("cloudflare/migrations").filter(f => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8")
      .replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
    if (sql) await db.exec(sql);
  }
  // Miniflare 5 alpha declarations misclassify this runtime Fetcher as Request.
  type LocalFetcher = { fetch(input: string, init?: RequestInit): Promise<Response> };
  const normal = await mf.getWorker("local-index") as unknown as LocalFetcher;
  const closed = await mf.getWorker("local-maintenance") as unknown as LocalFetcher;
  const headers = { "content-type": "application/json", "x-internal-api-secret": secret };
  const article = { title: "Local maintenance fixture", slug: "maintenance-fixture",
    source_url: "https://fixture.invalid/maintenance", source_name: "Local fixture",
    source_type: "rss", excerpt: "Local only", published_at: new Date(Date.now() - 60000).toISOString(),
    editorial_status: "ready", editorial_review_status: "approved" };
  assert.equal((await normal.fetch("http://localhost/internal/articles/upsert", {
    method: "POST", headers, body: JSON.stringify({ article }),
  })).status, 201);
  for (const path of ["/health", "/articles", "/articles/maintenance-fixture", "/articles/missing"]) {
    const expected = await normal.fetch(`http://localhost${path}`);
    const actual = await closed.fetch(`http://localhost${path}`);
    assert.equal(actual.status, expected.status);
    assert.deepEqual(await actual.json(), await expected.json());
  }
  const snapshot = async () => {
    const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results as { name: string }[];
    return Promise.all(tables.filter(t => !String(t.name).startsWith("_cf_")).map(async (t) => ({ name: t.name,
      rows: (await db.prepare(`SELECT * FROM "${String(t.name).replaceAll('"', '""')}"`).all()).results })));
  };
  const before = await snapshot();
  const paths = ["/internal/articles", "/internal/articles/maintenance-fixture",
    "/internal/editorial/apply-batch", "/internal/articles/delete-batch",
    "/internal/articles/upsert", "/internal/ingestion/rss",
    "/internal/articles/maintenance-fixture/editorial", "/internal/articles/maintenance-fixture/views",
    "/internal/impacto-drafts/upsert", "/internal/ingestion-errors",
    "/internal/unknown", "/unknown", "/health", "/articles", "/articles/maintenance-fixture"];
  let blocked = 0;
  for (const path of paths) for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    if (method === "GET" && ["/health", "/articles", "/articles/maintenance-fixture"].includes(path)) continue;
    for (const credential of [undefined, "wrong", secret]) {
      const r = await closed.fetch(`http://localhost${path}`, { method,
        headers: credential ? { "x-internal-api-secret": credential } : {} });
      assert.equal(r.status, 503, `${method} ${path}`);
      assert.equal(r.headers.get("cache-control"), "no-store");
      blocked++;
    }
  }
  assert.deepEqual(await snapshot(), before);
  // Any access to DB or waitUntil throws: no scheduled work is started at all.
  const poisonDb = new Proxy({} as Parameters<typeof maintenance.fetch>[1]["DB"], {
    get() { throw new Error("Scheduled maintenance accessed DB"); },
  });
  for (const cron of ["0 */4 * * *", "0 3 * * *", "unexpected", undefined]) {
    await maintenance.scheduled({ cron }, { DB: poisonDb, INTERNAL_API_SECRET: secret }, {
      waitUntil() { throw new Error("Scheduled maintenance queued background work"); },
    });
  }
  assert.deepEqual(await snapshot(), before);
  // Switch back to the normal entrypoint on the same local DB and same secret.
  assert.equal((await normal.fetch("http://localhost/internal/articles", { headers })).status, 200);
  assert.equal((await normal.fetch("http://localhost/internal/articles")).status, 401);
  assert.equal((await normal.fetch("http://localhost/internal/articles/maintenance-fixture/editorial", {
    method: "POST", headers, body: JSON.stringify({ editorial: {
      editorial_key_takeaway: "Access restored locally", latamworldnews_summary: "Local restored draft",
      editorial_origin: "generated_metadata_only", editorial_status: "pending_review", editorial_review_status: "pending",
    } }),
  })).status, 200);
  const edited = await db.prepare("SELECT editorial_key_takeaway FROM articles WHERE slug=?").bind(article.slug).first();
  assert.equal(edited?.editorial_key_takeaway, "Access restored locally");
  assert.equal((await normal.fetch("http://localhost/internal/articles/maintenance-fixture/views", {
    method: "POST", headers,
  })).status, 200);
  const views = await db.prepare("SELECT views FROM articles WHERE slug=?").bind(article.slug).first();
  assert.equal(views?.views, 1);
  console.log(`PASS: bundled Workers on local workerd/D1; public reads unchanged; ${blocked} requests blocked with 503; all tables unchanged; both cron and unexpected schedules inert; editorial read/write restored with unchanged in-memory secret.`);
}
main().finally(() => mf.dispose()).catch((error: unknown) => {
  // Do not log request/binding objects or assertion values containing credentials.
  const message = error instanceof Error ? error.message : "Unknown validation error";
  console.error("FAIL:", message.replaceAll(secret, "[REDACTED]")); process.exitCode = 1;
});
