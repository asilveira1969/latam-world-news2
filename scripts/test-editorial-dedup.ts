import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditEditorialDuplication, getEditorialBlocks } from "../lib/article-seo";

type TestArticle = {
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  editorial_context?: string | null;
  latam_angle?: string | null;
  source_name: string;
  source_url: string;
  region: string;
  category: string;
  tags: string[];
  countries?: string[] | null;
  impact_format?: string | null;
  editorial_sections?: {
    que_esta_pasando: string;
    claves_del_dia: string;
    que_significa_para_america_latina: string;
    por_que_importa: string;
  } | null;
  is_impact: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
};

function readJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

function getBySlug(slug: string): TestArticle {
  const manual = readJson<TestArticle[]>("data/manual-articles.json");
  const seed = readJson<TestArticle[]>("data/seed/articles.json");
  const article = [...manual, ...seed].find((item) => item.slug === slug);
  assert.ok(article, `Article not found for slug ${slug}`);
  return article;
}

const noteWithoutContent = getBySlug("mas-de-45-muertos-en-tres-nuevos-ataques-en-nigeria");
const noteEditorial = getEditorialBlocks(noteWithoutContent as never);
const noteSummaryWords = noteEditorial.latamWorldNewsSummary.split(/\s+/).filter(Boolean).length;
const noteCuratedWords = noteEditorial.curatedNews.split(/\s+/).filter(Boolean).length;
assert.ok(noteSummaryWords >= 20 && noteSummaryWords <= 40, "Note summary should stay within 20 to 40 words");
assert.ok(noteCuratedWords >= 60 && noteCuratedWords <= 100, "Curated note should stay within 60 to 100 words");
const noteReport = auditEditorialDuplication(noteWithoutContent as never, noteEditorial);
assert.ok(
  !noteReport.flaggedPairs.some(
    (pair) =>
      (pair.left === "summary" && pair.right === "conclusion") ||
      (pair.left === "body" && pair.right === "conclusion") ||
      (pair.left === "summary" && pair.right === "body")
  ),
  "Notes should not duplicate the LatamWorldNews summary and curated block"
);

const editorialArticle = getBySlug("editorial-impacto-latinoamerica-crisis-iran-presion-geopolitica");
const editorialBlocks = getEditorialBlocks(editorialArticle as never);
assert.ok(editorialBlocks.bodyParagraphs.length >= 1, "Editorial articles should preserve a differentiated body paragraph");
assert.notEqual(editorialBlocks.summary, editorialBlocks.conclusion, "Summary and conclusion should differ");
const editorialReport = auditEditorialDuplication(editorialArticle as never, editorialBlocks);
assert.ok(
  !editorialReport.flaggedPairs.some(
    (pair) =>
      (pair.left === "summary" && pair.right === "conclusion") ||
      (pair.left === "body" && pair.right === "conclusion")
  ),
  "Editorial content should keep summary, body and conclusion distinct"
);

console.log("editorial dedup tests passed");
