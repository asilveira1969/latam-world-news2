import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";

Object.assign(globalThis, { React });

async function main() {
  const { default: StructuredData } = await import("../components/StructuredData");
  const maliciousBody = "</script><script>alert(1)</script>";
  const normalArticle = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: "Noticia RSS existente: economía y región",
    articleBody: "Texto original con acentos, \"comillas\" y &.",
    image: ["https://example.com/imagen.png"],
    author: { "@type": "Organization", name: "Latam World News" }
  };

  for (const data of [
    normalArticle,
    { ...normalArticle, headline: "Texto </ScRiPt> literal", articleBody: maliciousBody },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [] },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [] }
  ]) {
    const original = JSON.stringify(data);
    const markup = renderToStaticMarkup(React.createElement(StructuredData, { data }));
    const $ = load(markup);
    assert.equal($("script").length, 1, "article text must not create another script");
    const serialized = $('script[type="application/ld+json"]').html();
    assert.ok(serialized, "JSON-LD script must exist");
    assert.ok(!serialized.toLowerCase().includes("</script>"), "no literal closing script in serialized data");
    assert.ok(!serialized.includes("<"), "all opening markup characters are escaped");
    assert.deepEqual(JSON.parse(serialized), data, "JSON-LD logical values must remain intact");
    assert.equal(JSON.stringify(data), original, "serialization must not mutate its input");
    if ("articleBody" in data && data.articleBody === maliciousBody) {
      assert.ok(serialized.includes("\\u003c/script>"));
      assert.equal(JSON.parse(serialized).articleBody, maliciousBody);
    }
  }
  console.log("PASS: JSON-LD script injection prevented; JSON values unchanged; normal article, FAQ and breadcrumbs preserved.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
