import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { impactoFixtures, brazilRecord } from "./fixtures/impacto-originals";
import { isEligibleForNewsSitemap } from "../lib/news-sitemap-policy";

// Read-only HTTP fixture for browser QA. No remote endpoint, secret or database.
const args = process.argv.slice(2);
const rows = (args.includes("--single") ? [brazilRecord, ...impactoFixtures(0).filter((row) => row.source_type === "rss")] : impactoFixtures(20))
  .map((row) => ({ ...row,
    image_url: `http://127.0.0.1:4185/images/brasil-voto-y-conexiones-globales.png?fixture=${row.slug}`,
    ...(row.source_type === "rss" ? { source_url: `http://127.0.0.1:4185/source/${row.slug}`, url: `http://127.0.0.1:4185/source/${row.slug}` } : {})
  }));
const server = createServer((req, res) => {
  if (req.method !== "GET") { res.writeHead(405); res.end(); return; }
  const url = new URL(req.url!, "http://localhost");
  const params = url.searchParams;
  let data = rows.filter((row) => row.editorial_status === "ready" && row.editorial_review_status === "approved" && Date.parse(row.published_at) <= Date.now());
  if (url.pathname.startsWith("/articles/")) {
    const found = data.find((row) => row.slug === decodeURIComponent(url.pathname.split("/")[2]));
    res.writeHead(found ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ data: found })); return;
  }
  for (const key of ["source_type", "impact_format", "section_slug", "region", "country"] as const) {
    if (params.has(key)) data = data.filter((row) => String(row[key]) === params.get(key));
  }
  if (params.has("is_impact")) data = data.filter((row) => Boolean(row.is_impact) === (params.get("is_impact") === "1"));
  if (params.get("news_sitemap") === "1") data = data.filter((row) => isEligibleForNewsSitemap(row));
  data.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const page = Number(params.get("page") || 1), size = Math.min(Number(params.get("pageSize") || 20), 100);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ data: data.slice((page - 1) * size, page * size), pagination: { page, pageSize: size } }));
});
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture address unavailable");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", args.includes("--build") ? "build" : "start",
    ...(args.includes("--build") ? [] : ["--hostname", "127.0.0.1", "--port", "4185"])], {
    stdio: "inherit", env: { ...process.env, D1_WORKER_URL: `http://127.0.0.1:${address.port}`,
      NEXT_PUBLIC_SITE_URL: "https://latamworldnews.com", NEXT_TELEMETRY_DISABLED: "1" }
  });
  process.once("SIGINT", () => child.kill());
  child.on("error", (error) => { console.error(error); server.close(); process.exitCode = 1; });
  child.on("exit", (code) => { server.close(); process.exitCode = code ?? 0; });
});
