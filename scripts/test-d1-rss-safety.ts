import assert from "node:assert/strict";
import { normalizeRssItems } from "@/lib/rss/normalize";
import {
  dedupeBySourceUrl,
  findPossibleTopicDuplicate
} from "@/lib/d1/topic-dedup";
import type { ParsedRssItem } from "@/lib/rss/parse-rss";

const source = { name: "Fuente Uno", region: "Mundo" as const, tag: "rss-test" };
const longBody = "contenido externo ".repeat(200);
const [normalized] = normalizeRssItems([{
  title: "Canada responde a los aranceles de Estados Unidos",
  link: "https://source-one.example/article",
  pubDate: "2026-08-29T10:00:00Z",
  excerpt: "extracto autorizado ".repeat(40),
  content: longBody
} satisfies ParsedRssItem], source);

assert.equal(normalized?.content, null);
assert.ok((normalized?.excerpt.length ?? 0) <= 280);
assert.ok(!(normalized?.excerpt ?? "").includes(longBody.slice(0, 100)));

const duplicateUrls = dedupeBySourceUrl([
  { source_url: "https://source-one.example/article" },
  { source_url: "https://source-one.example/article" }
]);
assert.equal(duplicateUrls.unique.length, 1);
assert.equal(duplicateUrls.skipped, 1);

const topicMatch = findPossibleTopicDuplicate(
  {
    slug: "canada-aranceles-nueva",
    title: "Canada responde a los aranceles de Estados Unidos con nuevas medidas",
    source_name: "Fuente Dos",
    source_url: "https://source-two.example/article",
    published_at: "2026-08-29T12:00:00Z"
  },
  [{
    slug: "canada-aranceles-original",
    title: "Canada responde a los aranceles de Estados Unidos con medidas nuevas",
    source_name: "Fuente Uno",
    source_url: "https://source-one.example/article",
    published_at: "2026-08-29T10:00:00Z"
  }]
);
assert.ok(topicMatch);

const distinctAngle = findPossibleTopicDuplicate(
  {
    slug: "exportadores-canada",
    title: "Exportadores de Canada analizan cambios logisticos para vender en Asia",
    source_name: "Fuente Tres",
    source_url: "https://source-three.example/article",
    published_at: "2026-08-29T12:00:00Z"
  },
  [{
    slug: "canada-aranceles-original",
    title: "Canada responde a los aranceles de Estados Unidos con medidas nuevas",
    source_name: "Fuente Uno",
    source_url: "https://source-one.example/article",
    published_at: "2026-08-29T10:00:00Z"
  }]
);
assert.equal(distinctAngle, null);

console.log("d1-rss-safety OK");
