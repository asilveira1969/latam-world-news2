import assert from "node:assert/strict";
import { logInfobaeDownloadFailure } from "../cloudflare/worker/src/infobae-download-diagnostic";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import worker from "../cloudflare/worker/src/index";

async function main() {
  const original = console.warn;
  const logs: Array<Record<string, unknown>> = [];
  console.warn = (label, record) => { assert.equal(label, "Infobae download diagnostic"); logs.push(record); };
  const url = "https://www.infobae.com/arc/outboundfeeds/rss/?token=SECRET#SECRET";
  let delivered = 0, cancelled = false;
  try {
    const body = new ReadableStream({ type: "bytes", pull(controller) {
      const request = controller.byobRequest!;
      const view = new Uint8Array(request.view!.buffer, request.view!.byteOffset, request.view!.byteLength);
      const text = new TextEncoder().encode('<h1>Access denied</h1> token=SECRET Authorization: Bearer SECRET <script>SECRET</script> https://x.test/?key=SECRET ' + 'x'.repeat(10000));
      view.set(text.subarray(0, view.length)); delivered += view.length; request.respond(view.length);
    }, cancel() { cancelled = true; } } as UnderlyingByteSource);
    await logInfobaeDownloadFailure(url, new Response(body, {status: 403, headers: {"content-type": "text/html", server: "openresty", "cf-ray": "0123456789abcdef-MIA", "set-cookie": "SECRET", authorization: "SECRET"}}));
    assert.equal(delivered, 2048); assert.equal(cancelled, true);
    assert.equal(logs[0].status, 403); assert.equal(logs[0].url, url.split('?')[0]);
    assert.equal(logs[0].cfRay, "0123456789abcdef-MIA");
    assert.equal(String(logs[0].fragment).includes('Access denied'), true);
    assert.equal(JSON.stringify(logs[0]).includes('SECRET'), false);
    assert.ok(String(logs[0].fragment).length <= 300);
    assert.deepEqual(Object.keys(logs[0]).sort(), ['utc','status','url','contentType','server','cfRay','fragment'].sort());
    assert.ok(Number.isFinite(Date.parse(String(logs[0].utc))));
    let stalledCancelled = false;
    const start = Date.now();
    await logInfobaeDownloadFailure(url, new Response(new ReadableStream({type:'bytes', pull() {}, cancel(){stalledCancelled=true;}} as UnderlyingByteSource), {status:503}));
    assert.ok(Date.now()-start < 1600); assert.equal(stalledCancelled, true);
    await logInfobaeDownloadFailure(url, new Response(new ReadableStream({type:'bytes', pull(c){c.error(Error('SECRET'));}} as UnderlyingByteSource), {status:502}));
    assert.equal(logs[2].status,502); assert.equal(JSON.stringify(logs[2]).includes('SECRET'),false);
    await logInfobaeDownloadFailure(url, new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('fallback SECRET'));c.close();}}),{status:403}));
    assert.equal(logs[3].fragment,'[body unavailable: byte-limited reader unsupported]');
    await logInfobaeDownloadFailure(url, undefined, new DOMException('SECRET', 'TimeoutError'));
    assert.equal(logs[4].status,null); assert.equal(logs[4].fragment,'TimeoutError');
    await logInfobaeDownloadFailure(url, undefined, Error('SECRET'));
    assert.equal(JSON.stringify(logs).includes('SECRET'),false);
    console.warn = () => { throw Error('logger failed'); };
    await logInfobaeDownloadFailure(url, undefined, Error('SECRET'));
  } finally { console.warn = original; }

  const nativeFetch = globalThis.fetch, originalLog = console.log;
  const sourceDiagnostics: unknown[] = [], errors: unknown[][] = [];
  const db = {batch:async()=>[{meta:{changes:0}},{meta:{changes:0}},{meta:{changes:0}}],prepare:()=>({bind:(...args:unknown[])=>({run:async()=>{errors.push(args);return {success:true};}})})};
  try {
    console.warn=(_label,value)=>{sourceDiagnostics.push(value);};console.log=()=>{};
    globalThis.fetch=(async()=>new Response('Forbidden',{status:403})) as typeof fetch;
    let pending:Promise<unknown>=Promise.resolve();
    await worker.scheduled({cron:'0 */4 * * *'},{DB:db,INFOBAE_SCHEDULED_ENABLED:'true'} as never,{waitUntil(p){pending=p;}});await pending;
    assert.equal(errors.length,5);assert.equal(sourceDiagnostics.length,1);
    assert.ok(errors.every(args=>args.includes('RSS request failed (403).')));
    sourceDiagnostics.length=0;
    globalThis.fetch=(async()=>new Response('<rss><channel/></rss>')) as typeof fetch;
    await worker.scheduled({cron:'0 */4 * * *'},{DB:db,INFOBAE_SCHEDULED_ENABLED:'true'} as never,{waitUntil(p){pending=p;}});await pending;
    assert.equal(sourceDiagnostics.length,0);assert.equal(errors.length,5);
  } finally {globalThis.fetch=nativeFetch;console.warn=original;console.log=originalLog;}

  const fixture={event:{request:{headers:{authorization:'SECRET'}}},logs:[{message:['unrelated','SECRET']},{message:['Infobae download diagnostic',{utc:'2026-10-13T00:00:00.000Z',status:403,url:'https://www.infobae.com/arc/outboundfeeds/rss/',contentType:'text/html',server:'openresty',cfRay:null,fragment:'Forbidden',extra:'SECRET'}]}]};
  const filtered=spawnSync(process.execPath,['scripts/filter-infobae-download-diagnostic.mjs'],{input:JSON.stringify(fixture,null,2)+'\n',encoding:'utf8'});
  assert.equal(filtered.status,0);assert.equal(filtered.stdout.includes('SECRET'),false);assert.equal(Object.keys(JSON.parse(filtered.stdout)).length,7);

  // Check the actual local Workers runtime, not just Node's stream implementation.
  const bundle = await build({stdin:{contents:`import {logInfobaeDownloadFailure} from './cloudflare/worker/src/infobae-download-diagnostic'; export default {async fetch(){let record;console.warn=(_label,value)=>{record=value};await logInfobaeDownloadFailure('https://www.infobae.com/arc/outboundfeeds/rss/',new Response('Access denied '+ 'x'.repeat(10000),{status:403}));return Response.json(record)}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
  const mf = new Miniflare({workers:[{config:{name:'infobae-diagnostic-local',type:'worker',compatibilityDate:'2026-08-28',manifest:{mainModule:'index.js',modules:{'index.js':{type:'esm',contents:bundle.outputFiles[0].text}}}}}]});
  try { const response=await mf.dispatchFetch('http://localhost/');assert.equal(response.status,200);const record=await response.json() as {fragment:string};assert.ok(record.fragment.includes('Access denied')); assert.ok(!record.fragment.includes('reader unsupported')); }
  finally { await mf.dispose(); }
  console.log('PASS: byte cap, deadline, cancellation, stream errors, unsupported reader, sanitization, no-response errors, logger failure and local Workers BYOB.');
}
main().catch(error => {console.error(error);process.exitCode=1;});
