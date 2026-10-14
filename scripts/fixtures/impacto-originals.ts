import { readFileSync } from "node:fs";
import type { Article } from "../../lib/types/article";
import type { OriginalImpactFormat } from "../../lib/manual-editorial";

// Approved Brazil bytes are read locally; this fixture never republishes them.
export const brazilRecord = { ...JSON.parse(readFileSync(
  "docs/operations/editorials/brasil-2026/impacto-brasil-payload-previsto-NO-ENVIAR.json", "utf8"
)).article,
  // Publication time verified in the read-only diagnosis, supplied only locally.
  published_at: "2026-10-07T11:34:39.132Z", created_at: "2026-10-07T11:34:39.132Z", views: 0,
  editorial_reviewed_at: null
} as Article;

export function originalFixture(format: OriginalImpactFormat, index: number, extra: Partial<Article> = {}): Article {
  const published = new Date(Date.parse(brazilRecord.published_at) - (index + 1) * 3_600_000).toISOString();
  return {
    ...brazilRecord, id: `${format}-${index}`, slug: `${format}-${index}`, impact_format: format,
    title: `Original local ${format} ${index}`, excerpt: `Bajada propia ${format} ${index}`,
    content: `## Investigación propia\n\nTexto completo de ${format} ${index}.\n\n**Conclusión documentada.**`,
    editorial_author: format === "columnist" ? "Autora de prueba" : "Redacción de prueba",
    image_url: "/logo.svg", source_url: `https://fixture.invalid/${format}-${index}`, url: `https://fixture.invalid/${format}-${index}`,
    section_slug: `impacto-${format === "columnist" ? "columnista" : format}`,
    published_at: published, created_at: published,
    raw: { editorial_sources: [{ name: "Documento verificable", url: "https://example.test/documento", reference: "Fuente local de prueba" }] },
    ...extra
  } as Article;
}

export function impactoFixtures(history = 40): Article[] {
  const news = Array.from({ length: 350 }, (_, index) => ({
    ...originalFixture("editorial", index), id: `rss-${index}`, slug: `rss-${index}`,
    title: `Noticia RSS local ${index}`, source_type: "rss", is_impact: false, impact_format: null,
    source_name: "Fuente RSS local", source: "Fuente RSS local", source_url: `https://fixture.invalid/rss-${index}`, url: `https://fixture.invalid/rss-${index}`,
    image_url: `https://fixture.invalid/images/rss-${index}.png`, content: null, section_slug: "mundo", region: "Mundo",
    tags: ["rss", "mundo-rss"],
    published_at: new Date(Date.parse(brazilRecord.published_at) + (index + 1) * 60_000).toISOString(),
    editorial_reviewed_at: brazilRecord.published_at
  } as Article));
  return [brazilRecord, ...["editorial", "opinion", "columnist"].flatMap((format) =>
    Array.from({ length: history }, (_, i) => originalFixture(format as OriginalImpactFormat, i))
  ), ...news];
}
