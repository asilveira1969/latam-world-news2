import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import {createRequire} from 'node:module';
import {transformSync} from 'esbuild';
import worker,{parseRssItems} from '../cloudflare/worker/src/index';
import {editorialDayStart} from '../lib/editorial-dashboard/day-boundary';

async function main(){
  const testModule={exports:{}};
  const code=transformSync(readFileSync('lib/editorial-dashboard/ai-drafts.ts','utf8').replace('import "server-only";',''),{loader:'ts',format:'cjs'}).code;
  new Function('require','module','exports',code)(createRequire(import.meta.url),testModule,testModule.exports);
  const allowed=(testModule.exports as {isAllowedEditorialSource:(url:string)=>boolean}).isAllowedEditorialSource;
  assert.equal(allowed('https://es.mercopress.com/2026/10/13/noticia'),true);
  for(const url of ['http://es.mercopress.com/noticia','https://es.mercopress.com.evil.test/noticia','https://user:password@es.mercopress.com/noticia','https://127.0.0.1/noticia'])assert.equal(allowed(url),false);
  if(process.argv[2]){
    const items=parseRssItems(readFileSync(process.argv[2],'utf8'));
    assert.ok(items.length>0);
    for(const item of items){assert.ok(item.title);assert.ok(Number.isFinite(Date.parse(item.publishedAt)));assert.equal(new URL(item.sourceUrl).hostname,'es.mercopress.com');assert.ok(item.excerpt.length<=280);assert.doesNotMatch(item.excerpt,/<[^>]+>/);}
    console.log(`PASS real Cloudflare-downloaded XML: ${items.length} items, titles, original links, dates and plain bounded excerpts.`);
  }
  const mf=new Miniflare({workers:[{config:{
    name:'mercopress-local',type:'worker',compatibilityDate:'2026-08-28',
    manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:"export default {fetch(){return new Response('local')}}"}}},
    env:{DB:{type:'d1',id:'mercopress-independent',dev:{remote:false}}}
  }}]});
  const nativeFetch=globalThis.fetch;
  try{
    const db=await mf.getD1Database('DB');
    for(const file of readdirSync('cloudflare/migrations').filter(f=>f.endsWith('.sql')).sort()){const sql=readFileSync(`cloudflare/migrations/${file}`,'utf8').replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();if(sql)await db.exec(sql);}
    const env={DB:db,INTERNAL_API_SECRET:'local-only',INFOBAE_MANUAL_ENABLED:'false',INFOBAE_SCHEDULED_ENABLED:'false'};
    const post=(path:string,body:unknown)=>worker.fetch(new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json','x-internal-api-secret':'local-only'},body:JSON.stringify(body)}),env);
    const old=new Date(Date.parse(editorialDayStart())-1).toISOString(),now=new Date().toISOString();
    for(const slug of ['expired','approved']){const approved=slug==='approved';assert.equal((await post('/internal/articles/upsert',{article:{title:slug,slug,source_url:'https://example.test/'+slug,source_name:'Synthetic fixture',published_at:old,created_at:old,source_type:'rss',editorial_status:approved?'ready':'pending_review',editorial_review_status:approved?'approved':'pending'}})).status,201);}
    const approvedBefore=await db.prepare("SELECT * FROM articles WHERE slug='approved'").first();
    let requested:string[]=[],tracking=false,fail=false;
    globalThis.fetch=(async(input:RequestInfo|URL)=>{
      const url=String(input);requested.push(url);assert.ok(!url.includes('infobae'));
      const merco=url.includes('mercopress');if(merco&&fail)return new Response('Synthetic failure',{status:503});
      const source=merco?'mercopress':url.includes('bbci')?'bbc':url.includes('france24')?'france24':url.includes('elpais')?'elpais':'rt';
      return new Response(`<rss><channel>${Array.from({length:merco?30:1},(_,i)=>`<item><title>Synthetic noticia ${source} ${i}</title><link>https://example.test/${source}-${i}${merco&&tracking&&i===0?'?utm_source=repeat&amp;fbclid=local':''}</link><pubDate>${now}</pubDate><description><![CDATA[<p>${'Extracto '.repeat(80)}</p>]]></description><content:encoded>BODY MUST NOT BE STORED</content:encoded></item>`).join('')}</channel></rss>`);
    }) as typeof fetch;
    const cron=async(value='0 */4 * * *')=>{let p:Promise<unknown>=Promise.resolve();await worker.scheduled({cron:value},env,{waitUntil(next){p=next;}});await p;};
    const rows=async()=>(await db.prepare("SELECT * FROM articles WHERE source_name='MercoPress' ORDER BY source_url").all()).results;
    await cron();assert.equal(requested.length,5);assert.equal(requested.filter(u=>u==='https://es.mercopress.com/rss/america-latina').length,1);
    const imported=await rows();assert.equal(imported.length,25);
    for(const row of imported){assert.equal(row.editorial_status,'pending_review');assert.equal(row.editorial_review_status,'pending');assert.equal(row.content,null);assert.equal(row.source,'MercoPress');assert.equal(row.url,row.source_url);assert.equal(row.published_at,now);assert.ok(String(row.excerpt).length<=280);assert.doesNotMatch(String(row.excerpt),/<[^>]+>/);assert.ok(row.category);assert.equal((await worker.fetch(new Request('http://localhost/articles/'+row.slug),env)).status,404);}
    const publicRows=await(await worker.fetch(new Request('http://localhost/articles'),env)).json() as {data:{slug:string}[]};assert.deepEqual(publicRows.data.map(r=>r.slug),['approved']);
    assert.equal(await db.prepare("SELECT id FROM articles WHERE slug='expired'").first(),null);
    await cron();assert.deepEqual(await rows(),imported);
    // Only synthetic local records are rejected; no real article is touched.
    assert.equal((await post('/internal/articles/delete-batch',{slugs:[imported[0].slug]})).status,200);tracking=true;await cron();assert.equal((await rows()).length,24);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM rejected_article_urls').first<{n:number}>())!.n,1);
    const current=await rows();requested=[];await cron('0 3 * * *');assert.equal(requested.length,0);assert.deepEqual(await rows(),current);
    assert.deepEqual(await db.prepare("SELECT * FROM articles WHERE slug='approved'").first(),approvedBefore);
    fail=true;requested=[];await cron();assert.equal(requested.length,5);assert.deepEqual(await rows(),current);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM ingestion_errors WHERE source_id='rss-mercopress'").first<{n:number}>())!.n,1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM article_write_permissions').first<{n:number}>())!.n,0);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM articles WHERE source_name IN ('RT Actualidad','El País España','France 24 Español','BBC Mundo')").first<{n:number}>())!.n,4);
    console.log('PASS independent local D1: regular five-source cron, limit 25, Infobae off, pending/private/null/280, repeat dedup, synthetic rejection tracking, daily expiry, approved intact, failure isolated and permissions zero.');
  }finally{globalThis.fetch=nativeFetch;await mf.dispose();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
