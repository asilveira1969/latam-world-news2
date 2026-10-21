import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare} from 'miniflare';
import worker from '../cloudflare/worker/src/index';
import {editorialDayStart} from '../lib/editorial-dashboard/day-boundary';
import {classifyD1EditorialInput} from '../lib/d1/editorial/classify';

async function main(){
  const mf=new Miniflare({workers:[{config:{
    name:'dw-local',type:'worker',compatibilityDate:'2026-08-28',
    manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:"export default {fetch(){return new Response('local')}}"}}},
    env:{DB:{type:'d1',id:'dw-independent',dev:{remote:false}}}
  }}]});
  const nativeFetch=globalThis.fetch;
  try{
    const db=await mf.getD1Database('DB');
    for(const file of readdirSync('cloudflare/migrations').filter(f=>f.endsWith('.sql')).sort()){const sql=readFileSync(`cloudflare/migrations/${file}`,'utf8').replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();if(sql)await db.exec(sql);}
    const env={DB:db,INTERNAL_API_SECRET:'local-only',DW_RSS_ENABLED:'true',INFOBAE_MANUAL_ENABLED:'false',INFOBAE_SCHEDULED_ENABLED:'false'};
    const post=(path:string,body:unknown)=>worker.fetch(new Request('http://localhost'+path,{method:'POST',headers:{'content-type':'application/json','x-internal-api-secret':'local-only'},body:JSON.stringify(body)}),env);
    const old=new Date(Date.parse(editorialDayStart())-1).toISOString(),now=new Date().toISOString();
    for(const slug of ['expired','approved']){const approved=slug==='approved';assert.equal((await post('/internal/articles/upsert',{article:{title:slug,slug,source_url:'https://example.test/'+slug,source_name:'Synthetic fixture',published_at:old,created_at:old,source_type:'rss',editorial_status:approved?'ready':'pending_review',editorial_review_status:approved?'approved':'pending'}})).status,201);}
    const approvedBefore=await db.prepare("SELECT * FROM articles WHERE slug='approved'").first();
    let requested:string[]=[],tracking=false,fail=false,empty=false;
    globalThis.fetch=(async(input:RequestInfo|URL)=>{
      const url=String(input);requested.push(url);assert.ok(!url.includes('infobae'));
      const isDw=url.includes('rss.dw.com');if(isDw&&fail)return new Response('Synthetic failure',{status:503});
      if(isDw&&empty)return new Response('<rss version="2.0"><channel/></rss>');
      const source=isDw?'dw':url.includes('mercopress')?'mercopress':url.includes('bbci')?'bbc':url.includes('france24')?'france24':url.includes('elpais')?'elpais':'rt';
      return new Response(`<rss><channel>${Array.from({length:isDw?30:1},(_,i)=>`<item><title>Synthetic noticia ${source} ${i}</title><link>https://example.test/${source}-${i}${isDw&&tracking&&i===0?'?utm_source=repeat&amp;fbclid=local':''}</link><pubDate>${now}</pubDate><description><![CDATA[<p>${'Extracto '.repeat(80)}</p>]]></description><enclosure url="https://example.test/dw-image.jpg" type="image/jpeg"/><content:encoded>BODY MUST NOT BE STORED</content:encoded></item>`).join('')}</channel></rss>`);
    }) as typeof fetch;
    const cron=async(value='0 */4 * * *')=>{let p:Promise<unknown>=Promise.resolve();await worker.scheduled({cron:value},env,{waitUntil(next){p=next;}});await p;};
    const rows=async()=>(await db.prepare("SELECT * FROM articles WHERE source_name='DW Español' ORDER BY source_url").all()).results;
    await cron();assert.equal(requested.length,6);assert.equal(requested.filter(u=>u==='https://rss.dw.com/xml/rss-sp-all').length,1);
    const imported=await rows();assert.equal(imported.length,25);
    const otherSources=async()=>(await db.prepare("SELECT * FROM articles WHERE source_name IN ('RT Actualidad','El País España','France 24 Español','BBC Mundo','MercoPress') ORDER BY source_url").all()).results;
    const existingSourcesBefore=await otherSources();assert.equal(existingSourcesBefore.length,5);
    const inbox=await(await worker.fetch(new Request('http://localhost/internal/articles?editorial_status=pending_review&editorial_review_status=pending&created_after='+encodeURIComponent(editorialDayStart())+'&pageSize=100',{headers:{'x-internal-api-secret':'local-only'}}),env)).json() as {data:{source_name:string}[]};
    assert.equal(inbox.data.filter(row=>row.source_name==='DW Español').length,25);
    const classification=classifyD1EditorialInput({id:'dw-synthetic',slug:'dw-synthetic',title:'Brasil anuncia aranceles al comercio',excerpt:'El gobierno de Brasil anunció medidas para la economía.',source_name:'DW Español',source_url:'https://www.dw.com/es/prueba/a-123',published_at:now});
    assert.equal(classification.country,'brasil');assert.equal(classification.region,'LatAm');assert.ok(classification.category);assert.ok(classification.tags.length);
    for(const row of imported){assert.equal(row.editorial_status,'pending_review');assert.equal(row.editorial_review_status,'pending');assert.equal(row.content,null);assert.equal(row.image_url,'');assert.equal(row.source,'DW Español');assert.equal(row.url,row.source_url);assert.equal(row.published_at,now);assert.ok(String(row.excerpt).length<=280);assert.doesNotMatch(String(row.excerpt),/<[^>]+>/);assert.ok(row.category);assert.equal((await worker.fetch(new Request('http://localhost/articles/'+row.slug),env)).status,404);}
    const publicRows=await(await worker.fetch(new Request('http://localhost/articles'),env)).json() as {data:{slug:string}[]};assert.deepEqual(publicRows.data.map(r=>r.slug),['approved']);
    assert.equal(await db.prepare("SELECT id FROM articles WHERE slug='expired'").first(),null);
    await cron();assert.deepEqual(await rows(),imported);
    // Only synthetic local records are rejected; no real article is touched.
    assert.equal((await post('/internal/articles/delete-batch',{slugs:[imported[0].slug]})).status,200);tracking=true;await cron();assert.equal((await rows()).length,24);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM rejected_article_urls').first<{n:number}>())!.n,1);
    const current=await rows();
    // The existing daily cleanup must also expire yesterday's unreviewed DW,
    // while keeping today's inbox and approved articles intact. Expiry is not
    // an editorial rejection and must not add a permanent URL rejection.
    assert.equal((await post('/internal/articles/upsert',{article:{title:'Expired DW fixture',slug:'expired-dw',source_name:'DW Español',source_url:'https://www.dw.com/es/expired-fixture/a-999',published_at:old,created_at:old,source_type:'rss'}})).status,201);
    assert.ok(await db.prepare("SELECT id FROM articles WHERE slug='expired-dw'").first());
    requested=[];await cron('0 3 * * *');assert.equal(requested.length,0);assert.deepEqual(await rows(),current);
    assert.equal(await db.prepare("SELECT id FROM articles WHERE slug='expired-dw'").first(),null);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM rejected_article_urls').first<{n:number}>())!.n,1);
    assert.deepEqual(await db.prepare("SELECT * FROM articles WHERE slug='approved'").first(),approvedBefore);
    fail=true;requested=[];await cron();assert.equal(requested.length,6);assert.deepEqual(await rows(),current);assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM ingestion_errors WHERE source_id='rss-dw-es'").first<{n:number}>())!.n,1);
    fail=false;empty=true;requested=[];await cron();assert.equal(requested.length,6);assert.deepEqual(await rows(),current);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM articles WHERE source_name='MercoPress'").first<{n:number}>())!.n,1);
    assert.deepEqual(await otherSources(),existingSourcesBefore,'all fields of the five existing sources remain unchanged');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM article_write_permissions').first<{n:number}>())!.n,0);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM articles WHERE source_name IN ('RT Actualidad','El País España','France 24 Español','BBC Mundo')").first<{n:number}>())!.n,4);
    console.log('PASS independent local D1: regular six-source cron, limit 25, Infobae off, pending/private/null/280, repeat dedup, synthetic rejection tracking, daily expiry, approved intact, failure isolated and permissions zero.');
  }finally{globalThis.fetch=nativeFetch;await mf.dispose();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
