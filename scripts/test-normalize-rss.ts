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

console.log("normalize-rss OK");
