import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Exercise server components locally without Next request state or remote calls.
Object.assign(globalThis, { React });
const loader = Module as unknown as { _load: (...args: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (id, ...rest) {
  if (id === "server-only") return {};
  if (id === "next/cache") return { unstable_cache: (fn: unknown) => fn };
  return originalLoad.call(this, id, ...rest);
};
process.env.D1_WORKER_URL = "https://worker.test";

async function main() {
  const { mapRecordToArticle } = await import("../lib/data/articles-repo");
  const { buildNewsArticleJsonLd } = await import("../lib/jsonld");
  const { default: Page } = await import("../app/impacto/editorial/[slug]/page");
  const { default: Body } = await import("../components/ManualEditorialBody");
  const { default: ImpactoPage } = await import("../app/impacto/page");
  const { deriveSectionSlug } = await import("../lib/article-taxonomy");
  const { normalizeCountry, normalizeTopicSlug } = await import("../lib/hubs");
  const approved = readFileSync(process.argv[2], "utf8");
  const body = approved.split(/\r?\n/).slice(4).join("\n");
  const record = {
    id: "manual-test", slug: "manual-test", title: "Editorial manual de prueba",
    excerpt: "Bajada aprobada " + "íntegra ".repeat(50), summary: "No sustituir la bajada",
    content: body, source_type: "manual", is_impact: true, impact_format: "editorial",
    editorial_author: "Redacción Latam World News", image_url: "/logo.svg",
    source_name: "Latam World News", source_url: "https://example.com/manual-test",
    region: "LatAm", country: "brasil", tags: ["elecciones-brasil-2026"], category: "Política",
    topic_slug: "politica", published_at: "2026-10-06T12:00:00Z", countries: ["brasil"],
    raw: { editorial_sources: [
      { name: "Documento", url: "https://example.com/documento.pdf?version=2", reference: "Informe 2025" },
      { name: "Inválida", url: "javascript:alert(1)" }
    ] }
  };
  const manual = mapRecordToArticle(record);
  assert.equal(manual.source_type, "manual");
  assert.equal(manual.content, body);
  assert.equal(manual.excerpt, record.excerpt);
  assert.equal(manual.editorial_sources?.length, 1);
  assert.equal(manual.editorial_sources?.[0].url, record.raw.editorial_sources[0].url);
  assert.equal(deriveSectionSlug(manual), "impacto-editorial");
  assert.equal(normalizeCountry("BR"), "brasil");
  assert.equal(normalizeTopicSlug("politica"), "politica");
  const markup = renderToStaticMarkup(React.createElement(Body, { content: body }));
  assert.match(markup, /<h2[^>]*>Una elección brasileña nunca es solamente brasileña<\/h2>/);
  assert.match(markup, /<strong>47,03% de los votos válidos y 56,1 millones de votos<\/strong>/);
  assert.match(markup, /Pero buena parte de Sudamérica sentirá las consecuencias\./);
  const escaped = renderToStaticMarkup(React.createElement(Body, { content: "<script>alert(1)</script>" }));
  assert.ok(!escaped.includes("<script>"));
  const json = buildNewsArticleJsonLd(manual, "/impacto/editorial/manual-test");
  assert.equal(json.description, record.excerpt);
  assert.equal(json.articleBody, body);
  assert.equal(json.author.name, record.editorial_author);
  assert.deepEqual(json.isBasedOn, [record.raw.editorial_sources[0].url]);

  const legacyRecord = { ...record, id: "rss-test", slug: "rss-test", source_type: "rss", editorial_author: null,
    source_url: "https://example.com/rss-test", published_at: "2026-10-05T12:00:00Z",
    editorial_sections: { que_esta_pasando: "Resumen histórico", claves_del_dia: "Claves", que_significa_para_america_latina: "Impacto", por_que_importa: "Importancia" } };
  const rss = mapRecordToArticle(legacyRecord);
  assert.equal(rss.source_type, "rss");
  assert.equal(rss.editorial_sources, undefined);
  assert.notEqual(rss.excerpt, record.excerpt);
  assert.equal(mapRecordToArticle({ ...record, source_type: "api" }).source_type, "api");
  assert.equal(mapRecordToArticle({ ...record, source_type: "unknown" }).source_type, null);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://worker.test", "no real endpoint may be contacted");
    const slug = url.pathname.split("/")[2];
    const data = slug ? [record, legacyRecord].find((item) => item.slug === slug) : [record, legacyRecord];
    return new Response(JSON.stringify({ data, pagination: { page: 1, pageSize: 100 } }), { status: 200 });
  };
  const manualPage = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "manual-test" }) }));
  assert.match(manualPage, /Redacción Latam World News/);
  assert.match(manualPage, /Informe 2025/);
  assert.ok(!manualPage.includes("Preguntas frecuentes") && !manualPage.includes("FAQPage"));
  assert.ok(!manualPage.includes("Que esta pasando"));
  assert.ok(manualPage.includes(record.excerpt));
  const legacyPage = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "rss-test" }) }));
  assert.match(legacyPage, /Preguntas frecuentes/);
  assert.match(legacyPage, /FAQPage/);
  assert.match(legacyPage, /Resumen histórico/);
  assert.ok(!legacyPage.includes("Informe 2025"));
  const home = renderToStaticMarkup(await ImpactoPage());
  assert.ok(home.includes(record.title) && home.includes(record.excerpt));
  assert.match(home, /href="\/impacto\/editorial\/manual-test"/);
  assert.match(home, /Editoriales recientes/);
  assert.match(home, /Opinión/);
  assert.match(home, /Columnistas/);
  assert.ok(!home.includes("Resumen histórico"), "manual lead must not show generated four-block previews");
  console.log("PASS: manual mapping, approved body, safe rendering, sources, metadata, manual/legacy pages and taxonomy; no remote calls.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
