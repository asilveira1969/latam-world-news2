import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildSync } from "esbuild";
import { Miniflare } from "miniflare";
import worker from "../cloudflare/worker/src/index";
import { editorialDayStart } from "../lib/editorial-dashboard/day-boundary";

type Row = Record<string, unknown>;
const secret = randomBytes(32).toString("hex");
// Fixed pre-change source from the preserved October 7 checkout, not HEAD at runtime.
const oldSource = execFileSync("git", ["show", "6ef102fd3f97770c6736c60febeee4c3fb8d1c34:cloudflare/worker/src/index.ts"], { encoding: "utf8" });
const oldBundle = buildSync({ stdin: { contents: oldSource, loader: "ts", resolveDir: resolve("cloudflare/worker/src"), sourcefile: "old-worker.ts" }, bundle: true, write: false, format: "esm", platform: "browser", target: "es2022" }).outputFiles[0].text;
const normalBundle = buildSync({ entryPoints: ["cloudflare/worker/src/index.ts"], bundle: true, write: false, format: "esm", platform: "browser", target: "es2022" }).outputFiles[0].text;
const mf = new Miniflare({ workers: [oldBundle, normalBundle].map((contents, i) => ({ config: {
  name: i ? "barrier-new" : "barrier-old", type: "worker" as const, compatibilityDate: "2026-08-28",
  manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm" as const, contents } } },
  env: { DB: { type: "d1" as const, id: "barrier-local-only", dev: { remote: false } },
    INTERNAL_API_SECRET: { type: "text" as const, value: secret } },
} })) });
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
console.error = (...args) => originalConsoleError("Expected negative-path diagnostic:", String(args[0]), args[1] instanceof Error ? args[1].message : "");
async function main() {
  const db = await mf.getD1Database("DB", "barrier-old");
  const migrate = async (file: string) => { const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim(); if (sql) await db.exec(sql); };
  const migrations = readdirSync("cloudflare/migrations").filter(f => f.endsWith(".sql")).sort();
  for (const file of migrations.filter(f => !f.includes("0015"))) await migrate(file);
  type Fetcher = { fetch(input: string, init?: RequestInit): Promise<Response> };
  const oldRuntime = await mf.getWorker("barrier-old") as unknown as Fetcher;
  const newRuntime = await mf.getWorker("barrier-new") as unknown as Fetcher;
  const post = (runtime: Fetcher, path: string, body: unknown) => runtime.fetch(`http://localhost${path}`, {
    method: "POST", headers: { "x-internal-api-secret": secret, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const now = new Date(Date.now() - 60000).toISOString();
  const cutoff = editorialDayStart();
  const yesterday = new Date(Date.parse(cutoff) - 1).toISOString();
  const article = (slug: string, extra: Row = {}) => ({ id: slug, slug, title: `Local ${slug}`, excerpt: "Local",
    source_url: `https://fixture.invalid/${slug}`, source_name: "Local fixture", source_type: "rss",
    published_at: now, created_at: now, editorial_status: "pending_review", editorial_review_status: "pending", ...extra });
  for (const a of [article("legacy"), article("legacy-expired", { created_at: yesterday }),
    article("approved", { created_at: yesterday, editorial_status: "ready", editorial_review_status: "approved" }),
    article("late-insert"), article("late-reject"), article("late-upsert")]) {
    assert.equal((await post(oldRuntime, "/internal/articles/upsert", { article: a })).status, 201);
  }
  const rows = async (table: string) => (await db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results as Row[];
  const snapshot = async () => ({ articles: await rows("articles"), refs: await rows("rejected_article_urls"), permits: await rows("article_write_permissions") });
  const noPermits = async () => assert.deepEqual(await rows("article_write_permissions"), []);
  const oldModule = (await import(`data:text/javascript;base64,${Buffer.from(oldBundle).toString("base64")}`)).default as typeof worker;

  // Start all dangerous old paths before installation; hold exactly their mutating SQL.
  const held: (() => void)[] = [];
  const started: Promise<void>[] = [];
  function delayedDb(prefix: string) {
    let mark!: () => void; started.push(new Promise<void>(r => { mark = r; }));
    let release!: () => void; const gate = new Promise<void>(r => { release = r; }); held.push(release);
    return { prepare(query: string) {
      const s = db.prepare(query);
      const wrap = (s: ReturnType<typeof db.prepare>): Parameters<typeof worker.fetch>[1]["DB"] extends { prepare(...a: never[]): infer P } ? P : never => ({
        bind(...v: unknown[]) { return wrap(s.bind(...v)); },
        async all<T>() { if (query.startsWith(prefix)) { mark(); await gate; } return s.all<T>(); },
        async first<T>() { return s.first<T>(); },
        async run() { if (query.startsWith(prefix)) { mark(); await gate; } return s.run(); },
      }) as never;
      return wrap(s);
    }, batch: (s: Parameters<typeof db.batch>[0]) => db.batch(s) } as unknown as Parameters<typeof worker.fetch>[1]["DB"];
  }
  const request = (path: string, body: unknown) => new Request(`http://localhost${path}`, { method: "POST",
    headers: { "x-internal-api-secret": secret, "content-type": "application/json" }, body: JSON.stringify(body) });
  const delayed = [
    oldModule.fetch(request("/internal/articles/upsert", { article: article("held-new") }), { DB: delayedDb("INSERT INTO articles"), INTERNAL_API_SECRET: secret }),
    oldModule.fetch(request("/internal/articles/delete-batch", { slugs: ["late-reject"] }), { DB: delayedDb("DELETE FROM articles"), INTERNAL_API_SECRET: secret }),
    oldModule.fetch(request("/internal/articles/upsert", { article: article("late-upsert", { source_url: "https://fixture.invalid/changed-late" }) }), { DB: delayedDb("INSERT INTO articles"), INTERNAL_API_SECRET: secret }),
  ];
  await Promise.all(started);
  await migrate(migrations.find(f => f.includes("0015"))!);
  const installed = await snapshot();
  held.forEach(release => release());
  assert.deepEqual((await Promise.all(delayed)).map(r => r.status), [400, 400, 400]);
  assert.deepEqual(await snapshot(), installed);
  assert.equal((await post(oldRuntime, "/internal/articles/upsert", { article: article("old-new") })).status, 400);
  assert.equal((await post(oldRuntime, "/internal/articles/upsert", { article: article("legacy") })).status, 400);
  await assert.rejects(db.prepare("UPDATE articles SET source_url=? WHERE id='legacy'").bind("https://fixture.invalid/stale").run(), /permission/);
  await assert.rejects(db.prepare("UPDATE articles SET url=? WHERE id='legacy'").bind("https://fixture.invalid/stale").run(), /permission/);
  await assert.rejects(db.prepare("UPDATE articles SET source_url_hash=? WHERE id='legacy'").bind("a".repeat(64)).run(), /permission/);
  await assert.rejects(db.prepare("DELETE FROM articles WHERE id='legacy-expired'").run(), /permission/);
  assert.deepEqual(await snapshot(), installed);

  // Test-only audit observes permissions inside the actual mutation, never after commit.
  await db.exec("CREATE TABLE test_permission_audit (kind TEXT, permitted INTEGER);");
  for (const [name, timing, kind, row] of [["insert", "INSERT", "write", "NEW"], ["update", "UPDATE OF source_url, url, source_url_hash", "write", "NEW"], ["delete", "DELETE", "delete", "OLD"]]) {
    await db.exec(`CREATE TRIGGER test_audit_${name} AFTER ${timing} ON articles BEGIN INSERT INTO test_permission_audit SELECT '${kind}', COUNT(*) FROM article_write_permissions WHERE article_id=${row}.id; END;`);
  }
  assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article("new") })).status, 201);
  await noPermits();
  assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article("new", { source_url: "https://fixture.invalid/new-link", url: "https://fixture.invalid/original-link" }) })).status, 200);
  await noPermits();
  const hashed = await db.prepare("SELECT * FROM articles WHERE id='new'").first<Row>();
  assert.match(String(hashed?.source_url_hash), /^[a-f0-9]{64}$/);
  assert.equal(hashed?.source_url_hash, createHash("sha256").update("https://fixture.invalid/new-link").digest("hex"));
  assert.equal((await post(newRuntime, "/internal/articles/delete-batch", { slugs: ["legacy"] })).status, 200);
  await noPermits();
  assert.deepEqual(Object.keys((await rows("rejected_article_urls"))[0]), ["url_hash"]);
  assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article("legacy", { source_url: "https://fixture.invalid/legacy?utm_source=repeat&fbclid=x" }) })).status, 409);

  // Force the FINAL cleanup statement to fail: previous content/hash writes roll back.
  await db.exec("CREATE TRIGGER test_fail_permission_cleanup BEFORE DELETE ON article_write_permissions BEGIN SELECT RAISE(ABORT, 'forced permission cleanup failure'); END;");
  const beforeFailures = await snapshot();
  assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article("fail-insert") })).status, 400);
  assert.deepEqual(await snapshot(), beforeFailures);
  assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article("new", { source_url: "https://fixture.invalid/fail-update" }) })).status, 400);
  assert.deepEqual(await snapshot(), beforeFailures);
  assert.equal((await post(newRuntime, "/internal/articles/delete-batch", { slugs: ["new"] })).status, 400);
  assert.deepEqual(await snapshot(), beforeFailures);
  assert.equal((await post(newRuntime, "/internal/ingestion/rss", {})).status, 400);
  assert.deepEqual(await snapshot(), beforeFailures);
  await db.exec("DROP TRIGGER test_fail_permission_cleanup;");
  await db.exec("CREATE TRIGGER test_fail_permission_create BEFORE INSERT ON article_write_permissions BEGIN SELECT RAISE(ABORT, 'forced permission creation failure'); END;");
  assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article("fail-grant") })).status, 400);
  assert.deepEqual(await snapshot(), beforeFailures);
  await db.exec("DROP TRIGGER test_fail_permission_create;");
  await assert.rejects(db.batch([
    db.prepare("INSERT INTO article_write_permissions (operation_id,kind,article_id,source_url,url,url_hash) SELECT 'invalid-hash','write',id,source_url,url,'bad' FROM articles WHERE id='new'"),
    db.prepare("UPDATE articles SET source_url_hash='bad' WHERE id='new'"),
    db.prepare("DELETE FROM article_write_permissions WHERE operation_id='invalid-hash'"),
  ]), /permission/);
  assert.deepEqual(await snapshot(), beforeFailures);
  // A permission without the rejection reference cannot authorize a delete.
  await assert.rejects(db.batch([
    db.prepare("INSERT INTO article_write_permissions (operation_id,kind,article_id,source_url,url,url_hash) SELECT 'invalid','reject',id,source_url,url,? FROM articles WHERE id='new'").bind("b".repeat(64)),
    db.prepare("DELETE FROM articles WHERE id='new'"),
    db.prepare("DELETE FROM article_write_permissions WHERE operation_id='invalid'"),
  ]), /permission/);
  assert.deepEqual(await snapshot(), beforeFailures);

  let tasks: Promise<unknown>[] = [];
  const scheduled = async (cron: string) => { tasks = []; await worker.scheduled({ cron }, { DB: db, INTERNAL_API_SECRET: secret }, { waitUntil(p) { tasks.push(p); } }); await Promise.all(tasks); };
  const protectedBefore = (await rows("articles")).filter(r => r.id !== "legacy-expired");
  await scheduled("0 3 * * *");
  assert.deepEqual(await rows("articles"), protectedBefore); await noPermits();
  assert.deepEqual(await rows("rejected_article_urls"), beforeFailures.refs);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input); const source = url.includes("bbci") ? "bbc" : url.includes("france24") ? "france24" : url.includes("elpais") ? "elpais" : "rt";
    return new Response(`<rss><channel><item><title>Local energia ${source}</title><link>https://fixture.invalid/rss-${source}</link><pubDate>${now}</pubDate><description>Local excerpt</description></item></channel></rss>`);
  }) as typeof fetch;
  await scheduled("0 */4 * * *"); await noPermits();
  const imported = (await rows("articles")).filter(r => String(r.source_url).includes("rss-"));
  assert.equal(imported.length, 4);
  for (const a of imported) { assert.equal(a.editorial_status, "pending_review"); assert.equal(a.editorial_review_status, "pending"); assert.equal(a.content, null); assert.match(String(a.source_url_hash), /^[a-f0-9]{64}$/); }
  const repeat = await snapshot(); await scheduled("0 */4 * * *"); assert.deepEqual(await snapshot(), repeat);
  const audit = await rows("test_permission_audit");
  assert.ok(audit.length > 0); assert.ok(audit.every(r => r.permitted === 1));
  // Approved historical rows require no backfill; metadata writes remain legitimate.
  assert.equal((await post(newRuntime, "/internal/articles/approved/views", {})).status, 200);
  assert.equal((await post(newRuntime, "/internal/articles/new/editorial", { editorial: { latamworldnews_summary: "Saved", editorial_key_takeaway: "Key", editorial_origin: "generated_metadata_only", editorial_status: "pending_review", editorial_review_status: "pending" } })).status, 200);
  assert.equal((await post(newRuntime, "/internal/impacto-drafts/upsert", { draft: { title: "Local draft", slug: "draft", source_articles: [] } })).status, 201);
  assert.equal((await post(newRuntime, "/internal/ingestion-errors", { source_id: "local", provider: "rss", message: "Local" })).status, 201);
  for (let i = 0; i < 100; i++) assert.equal((await post(newRuntime, "/internal/articles/upsert", { article: article(`batch-${i}`) })).status, 201);
  assert.equal((await post(newRuntime, "/internal/articles/delete-batch", { slugs: Array.from({ length: 100 }, (_, i) => `batch-${i}`) })).status, 200);
  await noPermits();
  console.log("PASS: real local D1; old in-flight insert/upsert/reject fenced at migration; matching new writes; permissions present only in transaction; final-step failure rolls back content/hash/permission; cleanup, four sources, metadata and 100-item rejection preserved.");
}
main().finally(async () => { globalThis.fetch = originalFetch; console.error = originalConsoleError; await mf.dispose(); }).catch(e => {
  console.error(String(e instanceof Error ? e.stack : e).replaceAll(secret, "[REDACTED]")); process.exitCode = 1;
});
