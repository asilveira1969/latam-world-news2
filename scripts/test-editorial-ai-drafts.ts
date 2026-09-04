import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildMetadata } from "../lib/seo";
import { buildNewsArticleJsonLd } from "../lib/jsonld";
import {
  EDITORIAL_AUTOMATION_DISABLED_MESSAGE,
  isEditorialAutomationEnabled
} from "../lib/editorial-dashboard/automation";
import type { Article } from "../lib/types/article";

const drafts = readFileSync(resolve(process.cwd(), "lib/editorial-dashboard/ai-drafts.ts"), "utf8");
const actions = readFileSync(resolve(process.cwd(), "app/editorial/actions.ts"), "utf8");
const editorialCron = readFileSync(resolve(process.cwd(), "app/api/cron/editorial/route.ts"), "utf8");
const impactoCron = readFileSync(resolve(process.cwd(), "app/api/cron/impacto/route.ts"), "utf8");
const vercelConfig = readFileSync(resolve(process.cwd(), "vercel.json"), "utf8");
const worker = readFileSync(resolve(process.cwd(), "cloudflare/worker/src/index.ts"), "utf8");
assert.match(drafts, /url\.protocol !== "https:"/);
assert.match(drafts, /\\d\{1,3\}/);
assert.match(drafts, /redirect: "manual"/);
assert.match(drafts, /No se pudo recuperar texto periodístico suficiente/);
assert.match(drafts, /D1_EDITORIAL_ENABLED/);
assert.match(drafts, /store: false/);
assert.match(drafts, /source_text_stored: false/);
assert.match(drafts, /brief.*context.*latam_impact/s);
assert.match(actions, /La noticia breve debe tener entre 60 y 100 palabras/);
assert.match(actions, /editorial_status: "pending_review"/);
assert.match(worker, /require a saved draft before approval/);

const savedAutomationFlag = process.env.EDITORIAL_AUTOMATION_ENABLED;
try {
  delete process.env.EDITORIAL_AUTOMATION_ENABLED;
  assert.equal(isEditorialAutomationEnabled(), false);
  assert.equal(isEditorialAutomationEnabled("false"), false);
  assert.equal(isEditorialAutomationEnabled("true"), true);
} finally {
  if (savedAutomationFlag === undefined) delete process.env.EDITORIAL_AUTOMATION_ENABLED;
  else process.env.EDITORIAL_AUTOMATION_ENABLED = savedAutomationFlag;
}
assert.equal(EDITORIAL_AUTOMATION_DISABLED_MESSAGE, "Automatización editorial desactivada.");

for (const [name, route, generator, mutation] of [
  ["editorial", editorialCron, "generateEditorialWithAgent", ".update("],
  ["impacto", impactoCron, "generateImpactoEditorialDraft", "insertImpactoEditorialDraft"]
] as const) {
  const guard = route.indexOf("if (!isEditorialAutomationEnabled())");
  assert.ok(guard >= 0, `${name} cron must have an automation guard`);
  assert.ok(route.indexOf(generator, guard) > guard, `${name} cron guard must run before OpenAI generation`);
  assert.ok(route.indexOf(mutation, guard) > guard, `${name} cron guard must run before article mutation`);
  assert.match(route, /EDITORIAL_AUTOMATION_DISABLED_MESSAGE/);
}
assert.doesNotMatch(vercelConfig, /\/api\/cron\/(editorial|impacto)/);
assert.match(actions, /export async function generateDraft/);
assert.match(actions, /await requireEditorialSession\(\)/);
assert.match(drafts, /D1_EDITORIAL_ENABLED !== "true"/);
assert.doesNotMatch(drafts, /EDITORIAL_AUTOMATION_ENABLED/);

const longTitle = "Un titular editorial largo que debe mantenerse completo en title, Open Graph y Twitter sin truncamiento";
const metadata = buildMetadata({ title: longTitle, description: "Descripción", pathname: "/nota/prueba", type: "article" });
const expectedTitle = `${longTitle} | LATAM World News`;
assert.equal(metadata.title, expectedTitle);
assert.equal(metadata.openGraph?.title, expectedTitle);
assert.equal(metadata.twitter?.title, expectedTitle);
assert.doesNotMatch(expectedTitle, /…/);

const article = { id: "1", title: "Titular", slug: "titular", excerpt: "Extracto", content: null, image_url: "https://www.bbc.com/image.jpg", source_type: "rss", latamworldnews_summary: "Resumen editorial.", editorial_key_takeaway: "La clave.", editorial_what_to_watch: "Seguimiento.", editorial_latam_impact: "Impacto LATAM.", editorial_updated_at: "2026-09-04T10:00:00.000Z", source_name: "BBC Mundo", source_url: "https://www.bbc.com/mundo/noticias", region: "Mundo", category: "Internacional", tags: [], countries: [], published_at: "2026-09-04T09:00:00.000Z", created_at: "2026-09-04T09:00:00.000Z", is_featured: false, is_impact: false, views: 0 } satisfies Article;
const jsonLd = buildNewsArticleJsonLd(article, "/nota/titular");
assert.equal(jsonLd.dateModified, article.editorial_updated_at);
assert.match(String(jsonLd.articleBody), /Impacto LATAM/);
console.log("editorial-ai-drafts: PASS");
