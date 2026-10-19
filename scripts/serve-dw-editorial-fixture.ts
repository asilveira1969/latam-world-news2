// Local visual QA only: synthetic credentials, ephemeral D1, no remote bindings.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import worker from "../cloudflare/worker/src/index";

async function main() {
  const mf = new Miniflare({ workers: [{ config: { name: "dw-ui-local", type: "worker", compatibilityDate: "2026-08-28", manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } }, env: { DB: { type: "d1", id: "dw-ui-ephemeral", dev: { remote: false } } } } }] });
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync("cloudflare/migrations").filter(f => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(`cloudflare/migrations/${file}`, "utf8").replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim(); if (sql) await db.exec(sql);
  }
  const env = { DB: db, INTERNAL_API_SECRET: "dw-ui-local-only", DW_RSS_ENABLED: "false", INFOBAE_MANUAL_ENABLED: "false", INFOBAE_SCHEDULED_ENABLED: "false" };
  for (const slug of ["dw-mundo-sintetica", "dw-latam-sintetica"]) {
    const article = { title: slug.includes("latam") ? "Brasil anuncia medidas sobre comercio: prueba sintética" : "España anuncia medidas sobre comercio: prueba sintética", slug, source_name: "DW Español", source_url: `https://www.dw.com/es/prueba/a-${slug}`, excerpt: "DESCRIPCION_RSS_PRIVADA: información sintética para revisión; no publicar esta descripción.", summary: "DESCRIPCION_RSS_PRIVADA", source_type: "rss", published_at: new Date().toISOString() };
    const response = await worker.fetch(new Request("http://localhost/internal/articles/upsert", { method: "POST", headers: { "content-type": "application/json", "x-internal-api-secret": env.INTERNAL_API_SECRET }, body: JSON.stringify({ article }) }), env);
    if (response.status !== 201) throw new Error(await response.text());
  }
  const server = createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const response = await worker.fetch(new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers as HeadersInit, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) }), env);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
    } catch (error) { res.writeHead(500); res.end(String(error)); }
  });
  server.listen(0, "127.0.0.1", () => {
    const address = server.address(); if (!address || typeof address === "string") throw new Error("No local port");
    const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "4187"], { stdio: "inherit", env: { ...process.env, D1_WORKER_URL: `http://127.0.0.1:${address.port}`, D1_WORKER_INTERNAL_SECRET: env.INTERNAL_API_SECRET, EDITORIAL_DASHBOARD_PASSWORD: "dw-fixture-only", EDITORIAL_DASHBOARD_SESSION_SECRET: "dw-fixture-only-session-secret", D1_EDITORIAL_ENABLED: "false", EDITORIAL_AUTOMATION_ENABLED: "false", OPENAI_API_KEY: "", NEXT_TELEMETRY_DISABLED: "1" } });
    const stop = () => child.kill(); process.once("SIGINT", stop); process.once("SIGTERM", stop);
    child.on("exit", async code => { server.close(); await mf.dispose(); process.exitCode = code ?? 0; });
  });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
