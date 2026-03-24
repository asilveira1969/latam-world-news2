import fs from "node:fs";
import path from "node:path";
import { auditEditorialDuplication, getEditorialBlocks } from "../lib/article-seo";

type AuditArticle = {
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

const manual = readJson<AuditArticle[]>("data/manual-articles.json");
const seed = readJson<AuditArticle[]>("data/seed/articles.json");
const all = [...manual, ...seed];

let flagged = 0;

for (const article of all) {
  const editorial = getEditorialBlocks(article as never);
  const report = auditEditorialDuplication(article as never, editorial);
  if (!report.hasIssues) {
    continue;
  }

  flagged += 1;
  console.log("---");
  console.log(article.slug);
  console.log(`pairs: ${report.flaggedPairs.map((pair) => `${pair.left}-${pair.right}:${pair.similarity}`).join(", ")}`);
  if (report.repeatedSentences.length > 0) {
    console.log(`repeated: ${report.repeatedSentences.slice(0, 3).join(" | ")}`);
  }
}

console.log(`\nFlagged articles: ${flagged}/${all.length}`);
