import assert from "node:assert/strict";
import { normalizeRssItems } from "@/lib/rss/normalize";
import type { ParsedRssItem } from "@/lib/rss/parse-rss";

const baseSource = {
  name: "El Pais Espana",
  region: "Mundo" as const,
  tag: "rss-elpais"
};

const items: ParsedRssItem[] = [
  {
    title: "Aspiradora de agua para tapicerias",
    link: "https://elpais.com/escaparate/estilo-de-vida/2026-03-25/aspiradora-de-agua-para-tapicerias.html",
    pubDate: "2026-03-25T08:00:00Z",
    excerpt: "Contenido promocional de producto",
    categories: ["Tecnologia"]
  },
  {
    title: "El Roto: pasos de baile",
    link: "https://elpais.com/opinion/2026-03-25/el-roto-pasos-de-baile.html",
    pubDate: "2026-03-25T08:30:00Z",
    excerpt: "Vinetas y opinion",
    categories: ["Opinion"]
  },
  {
    title: "Europa refuerza su presion diplomatica",
    link: "https://elpais.com/internacional/2026-03-25/europa-refuerza-su-presion-diplomatica.html",
    pubDate: "2026-03-25T09:00:00Z",
    excerpt: "Cobertura internacional",
    categories: ["Internacional"]
  }
];

const normalized = normalizeRssItems(items, baseSource);

assert.equal(normalized.length, 1);
assert.equal(normalized[0]?.source_url, items[2]?.link);
assert.equal(normalized[0]?.title, items[2]?.title);

const [dw] = normalizeRssItems([{
  title: "España: análisis internacional",
  link: "https://www.dw.com/es/prueba/a-123",
  pubDate: "2026-10-19T14:44:00Z",
  excerpt: `<p>${"Información de prueba. ".repeat(30)}</p>`,
  content: "Texto completo que no debe almacenarse",
  imageUrl: "https://static.dw.com/image/prueba.jpg"
}], { name: "DW Español", region: "Mundo", tag: "rss-dw-es" });
assert.equal(dw.image_url, "");
assert.equal(dw.content, null);
assert.equal(dw.source_name, "DW Español");
assert.equal(dw.source_url, "https://www.dw.com/es/prueba/a-123");
assert.equal(dw.published_at, "2026-10-19T14:44:00.000Z");
assert.ok(dw.excerpt.length <= 280);
assert.doesNotMatch(dw.excerpt, /<[^>]+>/);

console.log("normalize-rss OK");
