import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

type Row = Record<string, unknown>;
type Result = { results?: Row[]; success?: boolean };
const [source, target] = process.argv.slice(2);
if (!source || !target || process.argv.includes("--help")) {
  console.error("Usage: tsx scripts/compare-d1-migration.ts <source-d1-name> <target-d1-name>");
  process.exit(process.argv.includes("--help") ? 0 : 2);
}
const wrangler = createRequire(import.meta.url).resolve("wrangler");
const ignored = new Set(["sqlite_sequence", "_cf_KV"]);
const configByDatabase: Record<string, string> = {
  "latam-world-news-staging": "cloudflare/worker/wrangler.toml",
  "latam-world-news-production": "cloudflare/worker/wrangler.production.toml"
};
const q = (name: string) => `"${name.replaceAll('"', '""')}"`;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Row).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Row)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
const hash = (rows: Row[]) => createHash("sha256").update(rows.map(canonical).join("\n")).digest("hex");
function sql(database: string, command: string): Row[] {
  const config = configByDatabase[database];
  if (!config) throw new Error(`No read-only Wrangler configuration is registered for ${database}.`);
  const run = spawnSync(process.execPath, [wrangler, "d1", "execute", database, "--remote", "--config", config, "--json", "--command", command], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = String(run.stdout ?? ""); const err = String(run.stderr ?? "");
  if (run.error || run.status !== 0) throw new Error(`D1 query failed for ${database}: ${err.trim() || run.error?.message || "Wrangler exited without a readable error."}`);
  const start = out.indexOf("["); const end = out.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error(`D1 returned no JSON for ${database}.`);
  const result = JSON.parse(out.slice(start, end + 1)) as Result[];
  if (!result.every((item) => item.success !== false)) throw new Error(`D1 query failed for ${database}.`);
  return result.flatMap((item) => item.results ?? []);
}
function snapshot(database: string) {
  const schema = sql(database, "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV' ORDER BY type,name");
  const tables = sql(database, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map((row) => String(row.name)).filter((name) => !ignored.has(name));
  const counts = Object.fromEntries(tables.map((table) => {
    const fields = sql(database, `PRAGMA table_info(${q(table)})`);
    const primary = fields.filter((field) => Number(field.pk) > 0).sort((a, b) => Number(a.pk) - Number(b.pk)).map((field) => q(String(field.name)));
    const rows = sql(database, `SELECT * FROM ${q(table)} ORDER BY ${primary.length ? primary.join(",") : "rowid"}`);
    return [table, { count: rows.length, hash: hash(rows) }];
  }));
  return { schema: { count: schema.length, hash: hash(schema) }, tables: counts, editorial: tables.includes("articles") ? {
    states: sql(database, "SELECT editorial_status, editorial_review_status, COUNT(*) AS count FROM articles GROUP BY editorial_status, editorial_review_status ORDER BY editorial_status, editorial_review_status"),
    sections: sql(database, "SELECT section_slug, COUNT(*) AS count FROM articles GROUP BY section_slug ORDER BY section_slug"),
    publicApproved: sql(database, "SELECT COUNT(*) AS count FROM articles WHERE editorial_status='ready' AND editorial_review_status='approved'")
  } : null };
}
const sourceSnapshot = snapshot(source);
const targetSnapshot = source === target ? sourceSnapshot : snapshot(target);
const equal = canonical(sourceSnapshot) === canonical(targetSnapshot);
console.log(JSON.stringify({ source, target, equal, sourceSnapshot, targetSnapshot }, null, 2));
process.exitCode = equal ? 0 : 1;
