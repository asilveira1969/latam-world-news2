import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {Miniflare} from "miniflare";
import worker from "../cloudflare/worker/src/index";
import {decodeInfobaePilotResponse,infobaePilotMessage} from "../lib/editorial-dashboard/infobae-pilot-result";

async function main(){
  const mf = new Miniflare({ workers: [{ config: { name: "diagnostic-local", type: "worker", compatibilityDate: "2026-08-28", manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } }, env: { DB: { type: "d1", id: "diagnostic-local-db", dev: { remote: false } } } } }] });
  const originalFetch=globalThis.fetch;
  try{
    const db=await mf.getD1Database("DB");
    for(const file of readdirSync("cloudflare/migrations").filter(f=>f.endsWith(".sql")).sort()){const sql=readFileSync(`cloudflare/migrations/${file}`,"utf8").replace(/--[^\n]*/g,"").replace(/\s+/g," ").trim();if(sql)await db.exec(sql);}
    const env={DB:db,INTERNAL_API_SECRET:"synthetic-secret-only",INFOBAE_MANUAL_ENABLED:"false"};
    const post=()=>worker.fetch(new Request("http://localhost/internal/ingestion/infobae",{method:"POST",headers:{"content-type":"application/json","x-internal-api-secret":env.INTERNAL_API_SECRET},body:JSON.stringify({limit:5})}),env);
    async function result(){const r=await post();const body=await r.json();assert.ok(!JSON.stringify(body).includes("synthetic-secret-only"));return decodeInfobaePilotResponse(r.status,body);}
    assert.equal((await result()).status,"disabled");
    const unauthorized=await worker.fetch(new Request("http://localhost/internal/ingestion/infobae",{method:"POST"}),env);assert.equal(decodeInfobaePilotResponse(unauthorized.status,await unauthorized.json()).status,"auth_error");
    env.INFOBAE_MANUAL_ENABLED="true";
    globalThis.fetch=(async()=>new Response("private response must not escape",{status:403})) as typeof fetch;
    assert.deepEqual(await result(),{status:"feed_error",phase:"feed_fetch",created:0,skipped:0,httpStatus:403});
    globalThis.fetch=(async()=>{throw new DOMException("synthetic-secret-only","TimeoutError");}) as typeof fetch;
    assert.equal((await result()).status,"timeout");
    globalThis.fetch=(async()=>new Response("<html>not RSS</html>")) as typeof fetch;
    assert.equal((await result()).phase,"feed_parse");
    globalThis.fetch=(async()=>new Response(`<rss><channel>${[0,1].map(i=>`<item><title>Local diagnostic ${i}</title><link>https://example.test/diagnostic-${i}</link><pubDate>${new Date().toISOString()}</pubDate><description>Local only</description></item>`).join("")}</channel></rss>`)) as typeof fetch;
    let batches=0;
    const failingDb={prepare:db.prepare.bind(db),batch:async(statements: Parameters<typeof db.batch>[0])=>{batches++;if(batches===3)throw Error("synthetic-secret-only write failure");return db.batch(statements);}};
    const failed=await worker.fetch(new Request("http://localhost/internal/ingestion/infobae",{method:"POST",headers:{"content-type":"application/json","x-internal-api-secret":env.INTERNAL_API_SECRET},body:'{"limit":5}'}),{...env,DB:failingDb});
    const body=await failed.json();assert.ok(!JSON.stringify(body).includes("synthetic-secret-only"));
    const decoded=decodeInfobaePilotResponse(failed.status,body);assert.equal(decoded.status,"write_error");assert.equal(decoded.created,1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM articles").first<{n:number}>())!.n,1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM article_write_permissions").first<{n:number}>())!.n,0);
    assert.equal((await result()).status,"complete");
    assert.equal(decodeInfobaePilotResponse(503,{error:"upstream unavailable"}).status,"uncertain");
    assert.equal(decodeInfobaePilotResponse(504,null).status,"timeout");
    assert.equal(decodeInfobaePilotResponse(401,null).status,"auth_error");
    assert.equal(decodeInfobaePilotResponse(200,{data:{created:99,skipped:0}}).status,"uncertain");
    const hostile=decodeInfobaePilotResponse(502,{diagnostic:{code:"feed_error",phase:"synthetic-secret-only",httpStatus:403,secret:"synthetic-secret-only"}});
    assert.ok(!JSON.stringify(hostile).includes("synthetic-secret-only"));
    for(const status of ["blocked","disabled","auth_error","feed_error","timeout","write_error","uncertain","complete"] as const)assert.ok(infobaePilotMessage({status,created:1,skipped:1}).length>10);
    console.log("PASS: local feed/auth/off/timeout/parse/partial-write diagnostics; safe allowlist; malformed responses remain uncertain; no secret/error-body leakage; permits=0.");
  }finally{globalThis.fetch=originalFetch;await mf.dispose();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
