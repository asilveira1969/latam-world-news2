import assert from "node:assert/strict";
import { resolveDwImage } from "../lib/rss/dw-image";
import { LOCAL_NEWS_IMAGE_FALLBACK, isImageLikelyFromSource } from "../lib/images";

const originalFetch = globalThis.fetch;
const source = "https://www.dw.com/es/noticia/a-79728650";
const image = "https://static.dw.com/image/79728040_6.jpg";
let calls = 0;
let html = `<meta content="${image}" property="og:image"/>`;
let status = 200;
let fail = false;
globalThis.fetch = (async (url, init) => {
  calls++;
  assert.equal(url, source, "only fetch this article's own source URL");
  assert.ok(init?.signal, "lookup is bounded by a timeout");
  if (fail) throw new Error("unavailable");
  return new Response(html, { status });
}) as typeof fetch;

async function main() {
  assert.equal(await resolveDwImage(source, image), image);
  assert.equal(calls, 0, "valid RSS image avoids the page lookup");
  assert.equal(await resolveDwImage(source, null), image, "real DW meta attribute order");
  assert.equal(await resolveDwImage(source, "javascript:invalid"), image);
  assert.ok(isImageLikelyFromSource(image, source), "DW CDN passes existing display checks");
  for (const value of ["", "javascript:alert(1)", "https://other.test/photo.jpg", "https://rss.dw.com/images/DW-L-RGB_whitebg.png"]) {
    html = `<meta property="og:image" content="${value}"/>`;
    assert.equal(await resolveDwImage(source, null), LOCAL_NEWS_IMAGE_FALLBACK);
  }
  html = "<html>No image</html>";
  assert.equal(await resolveDwImage(source, null), LOCAL_NEWS_IMAGE_FALLBACK);
  status = 403;
  assert.equal(await resolveDwImage(source, null), LOCAL_NEWS_IMAGE_FALLBACK);
  fail = true;
  assert.equal(await resolveDwImage(source, null), LOCAL_NEWS_IMAGE_FALLBACK);
  const before = calls;
  assert.equal(await resolveDwImage("https://other.test/article", null), LOCAL_NEWS_IMAGE_FALLBACK);
  assert.equal(calls, before);
  console.log("PASS DW images: RSS priority, article OG, CDN validation, missing/invalid/blocked/failed fallback");
}
main().finally(() => { globalThis.fetch = originalFetch; }).catch(error => { console.error(error); process.exitCode = 1; });
