import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {Miniflare} from "miniflare";
import worker from "../cloudflare/worker/src/index";
import {editorialDayStart} from "../lib/editorial-dashboard/day-boundary";

async function main(){
 const mf = new Miniflare({ workers: [{ config: { name: "infobae-cron-local", type: "worker", compatibilityDate: "2026-08-28", manifest: { mainModule: "index.js", modules: { "index.js": { type: "esm", contents: "export default {fetch(){return new Response('local')}}" } } }, env: { DB: { type: "d1", id: "infobae-cron-independent", dev: { remote: false } } } } }] });
 const nativeFetch=globalThis.fetch;
 try{
  const db=await mf.getD1Database("DB");
  for(const f of readdirSync("cloudflare/migrations").filter(f=>f.endsWith(".sql")).sort()){const sql=readFileSync(`cloudflare/migrations/${f}`,"utf8").replace(/--[^\n]*/g,"").replace(/\s+/g," ").trim();if(sql)await db.exec(sql);}
  const env={DB:db,INTERNAL_API_SECRET:"local-only",INFOBAE_MANUAL_ENABLED:"false",INFOBAE_SCHEDULED_ENABLED:undefined as string|undefined};
  const post=(path:string,body:unknown)=>worker.fetch(new Request(`http://localhost${path}`,{method:"POST",headers:{"content-type":"application/json","x-internal-api-secret":env.INTERNAL_API_SECRET},body:JSON.stringify(body)}),env);
  const now=new Date().toISOString(),cutoff=editorialDayStart(),old=new Date(Date.parse(cutoff)-1).toISOString();
  const insert=async(slug:string,approved=false)=>{const r=await post('/internal/articles/upsert',{article:{title:slug,slug,source_url:`https://example.test/${slug}`,source_name:"Local fixture",source_type:"rss",published_at:old,created_at:old,editorial_status:approved?"ready":"pending_review",editorial_review_status:approved?"approved":"pending"}});assert.equal(r.status,201);};
  await insert('approved',true);await insert('expired-defensive');
  const approvedBefore=await db.prepare("SELECT * FROM articles WHERE slug='approved'").first();
  let urls:string[]=[],tracking=false,fail=false;
  globalThis.fetch=(async(input:RequestInfo|URL)=>{
   const url=String(input);urls.push(url);const infobae=url.includes('infobae.com');
   if(infobae&&fail)return new Response('local unavailable',{status:403});
   const source=infobae?'infobae':url.includes('bbci')?'bbc':url.includes('france24')?'france24':url.includes('elpais')?'elpais':'rt';
   return new Response(`<rss><channel>${Array.from({length:infobae?7:1},(_,i)=>`<item><title>Noticia local ${source} ${i}</title><link>https://example.test/${source}-${i}${tracking&&infobae&&i===0?'?utm_campaign=repeat&amp;fbclid=x':''}</link><pubDate>${now}</pubDate><description><![CDATA[<p>${'Extracto '.repeat(100)}</p>]]></description><content:encoded>NO ALMACENAR</content:encoded></item>`).join('')}</channel></rss>`);
  }) as typeof fetch;
  async function cron(value='0 */4 * * *'){let pending:Promise<unknown>=Promise.resolve();await worker.scheduled({cron:value},env,{waitUntil(p){pending=p;}});await pending;}
  const infobaeRows=async()=>(await db.prepare("SELECT * FROM articles WHERE source_name='Infobae' ORDER BY source_url").all()).results as Record<string,unknown>[];
  await cron();assert.equal(urls.length,4);assert.equal((await infobaeRows()).length,0);assert.equal(await db.prepare("SELECT id FROM articles WHERE slug='expired-defensive'").first(),null);
  assert.equal((await post('/internal/ingestion/infobae',{})).status,503);
  env.INFOBAE_SCHEDULED_ENABLED='true';urls=[];await cron();assert.equal(urls.length,5);assert.equal(urls.filter(u=>u.includes('infobae')).length,1);
  const rows=await infobaeRows();assert.equal(rows.length,5);
  for(const row of rows){assert.equal(row.editorial_status,'pending_review');assert.equal(row.editorial_review_status,'pending');assert.equal(row.content,null);assert.ok(String(row.excerpt).length<=280);assert.doesNotMatch(String(row.excerpt),/<[^>]+>/);assert.equal(row.published_at,now);assert.equal(row.source,'Infobae');assert.equal(row.url,row.source_url);assert.equal(row.region,'Mundo');assert.ok(row.category);assert.equal(JSON.parse(String(row.raw)).imported_via,'cloudflare-scheduled-rss');assert.equal((await worker.fetch(new Request(`http://localhost/articles/${row.slug}`),env)).status,404);}
  const publicRows=await(await worker.fetch(new Request('http://localhost/articles'),env)).json() as {data:Record<string,unknown>[]};assert.equal(publicRows.data.length,1);assert.equal(publicRows.data[0].slug,'approved');
  await cron();assert.deepEqual(await infobaeRows(),rows);
  assert.equal((await post('/internal/articles/delete-batch',{slugs:[rows[0].slug]})).status,200);
  // Reject is synthetic; normal URL variation must not resurrect it.
  tracking=true;await cron();assert.equal((await infobaeRows()).some(r=>String(r.source_url).split('?')[0]===rows[0].source_url),false);
  // Existing exact-URL dedup is retained; use unchanged feed to check surviving rows.
  tracking=false;const current=await infobaeRows();assert.equal(current.length,4);await cron();assert.deepEqual(await infobaeRows(),current);
  await insert('expired-midnight');const refsBefore=(await db.prepare('SELECT * FROM rejected_article_urls').all()).results;
  urls=[];await cron('0 3 * * *');assert.equal(urls.length,0);assert.equal(await db.prepare("SELECT id FROM articles WHERE slug='expired-midnight'").first(),null);assert.deepEqual((await db.prepare('SELECT * FROM rejected_article_urls').all()).results,refsBefore);assert.deepEqual(await infobaeRows(),current);
  assert.deepEqual(await db.prepare("SELECT * FROM articles WHERE slug='approved'").first(),approvedBefore);
  fail=true;urls=[];await cron();assert.equal(urls.length,5);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM ingestion_errors WHERE source_id='rss-infobae'").first<{n:number}>())!.n,1);
  env.INFOBAE_SCHEDULED_ENABLED='false';urls=[];await cron();assert.equal(urls.length,4);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM article_write_permissions').first<{n:number}>())!.n,0);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM articles WHERE source_name IN ('RT Actualidad','El País España','France 24 Español','BBC Mundo')").first<{n:number}>())!.n,4);
  console.log('PASS local cron: independent off/on, first five of seven, pending/private/null/280, repeat dedup, rejection tracking blocked, expiry preserved/no rejection, approved intact, four sources unaffected, feed failure isolated, permissions=0.');
 }finally{globalThis.fetch=nativeFetch;await mf.dispose();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
