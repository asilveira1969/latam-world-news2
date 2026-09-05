import { XMLParser } from "fast-xml-parser";

interface D1Result<T> { results: T[]; }
interface D1RunResult { success: boolean; meta: { changes?: number }; }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<D1RunResult>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1RunResult[]>;
}
interface Env { DB: D1Database; INTERNAL_API_SECRET?: string; }

type Row = Record<string, unknown>;
const JSON_COLUMNS = ["tags", "countries", "raw", "faq_items", "editorial_sections", "editorial_validation"] as const;
const ARTICLE_COLUMNS = ["id","title","slug","excerpt","content","image_url","source_name","source_url","region","category","tags","published_at","created_at","is_featured","is_impact","views","url","summary","source","source_type","country","language","raw","latamworldnews_summary","curated_news","editorial_status","editorial_generated_at","editorial_model","topic_slug","section_slug","countries","impact_format","editorial_sections","latam_angle","faq_items","seo_title","seo_description","possible_topic_duplicate","topic_duplicate_group","topic_duplicate_confidence","topic_duplicate_of_slug","editorial_origin","editorial_input_hash","editorial_prompt_version","editorial_validation","editorial_review_status","editorial_reviewed_at","editorial_review_notes","editorial_format","editorial_key_takeaway","editorial_what_to_watch","editorial_latam_impact","editorial_author","editorial_updated_at"] as const;
const DRAFT_COLUMNS = ["id","slug","title","excerpt","seo_title","seo_description","editorial_context","editorial_sections","tags","countries","source_articles","source_count","status","review_email","email_sent_at","email_provider","email_message_id","model","generated_at","approved_at","published_article_slug","created_at","updated_at"] as const;
const EDITORIAL_PATCH_COLUMNS = ["region", "country", "countries", "category", "tags", "topic_slug", "section_slug", "latamworldnews_summary", "editorial_status", "editorial_generated_at", "editorial_model", "editorial_origin", "editorial_input_hash", "editorial_prompt_version", "editorial_validation", "editorial_review_status", "editorial_format", "editorial_key_takeaway", "editorial_what_to_watch", "editorial_latam_impact", "editorial_author", "editorial_updated_at"] as const;
const EDITORIAL_DECISION_COLUMNS = ["region", "country", "countries", "category", "tags", "topic_slug", "section_slug", "editorial_status", "editorial_review_status", "editorial_reviewed_at", "editorial_review_notes"] as const;
const MAX_FUTURE_RSS_PUBLICATION_MS = 15 * 60 * 1_000;
const PUBLIC_READY_CLAUSE = "editorial_status = 'ready' AND editorial_review_status = 'approved' AND published_at <= ?";

const RSS_CRON_SOURCES = [
  { id: "rss-rt", name: "RT Actualidad", feedUrl: "https://actualidad.rt.com/feeds/all.rss", tag: "rss-rt" },
  { id: "rss-elpais-ultimas", name: "El País España", feedUrl: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ultimas-noticias/portada", tag: "rss-elpais" },
  { id: "rss-france24-es", name: "France 24 Español", feedUrl: "https://www.france24.com/es/rss", tag: "rss-france24-es" },
  { id: "rss-bbc-mundo", name: "BBC Mundo", feedUrl: "https://feeds.bbci.co.uk/mundo/rss.xml", tag: "rss-bbc-mundo" }
] as const;
const RSS_ITEM_LIMIT = 25;
const TOPIC_WINDOW_MS = 48 * 60 * 60 * 1000;
const TOPIC_STOP_WORDS = new Set(["a", "al", "ante", "con", "contra", "como", "desde", "del", "el", "en", "es", "la", "las", "lo", "los", "para", "por", "que", "se", "sin", "sobre", "tras", "un", "una", "unos", "unas", "y", "ya", "su", "sus", "the", "and", "of", "to", "in", "on", "for", "with"]);

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json; charset=utf-8", ...init.headers } });
}
function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function boundedRssExcerpt(value: unknown) { return stringValue(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280); }
function parsePositiveInt(value: string | null, fallback: number, maximum: number) { const parsed = Number.parseInt(value ?? "", 10); return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback; }
function publicPublicationCutoff() { return new Date(Date.now() + MAX_FUTURE_RSS_PUBLICATION_MS).toISOString(); }
function asJson(value: unknown, fallback: unknown) { if (typeof value === "string") { JSON.parse(value); return value; } return JSON.stringify(value ?? fallback); }
function parseJson(value: unknown) { if (typeof value !== "string") return value; try { return JSON.parse(value); } catch { return value; } }
function plainText(value: unknown) { return stringValue(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim(); }
function normalizedText(value: string) { return plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function hasWholeTerm(text: string, term: string) { const normalized = normalizedText(term); return normalized ? ` ${text} `.includes(` ${normalized} `) : false; }
function slugify(value: string) { return normalizedText(value).replace(/\s+/g, "-").slice(0, 80).replace(/-+$/g, "") || "nota"; }
async function sha1(value: string) { const bytes = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function rssCategory(title: string, excerpt: string) {
  const text = normalizedText(`${title} ${excerpt}`);
  if (["petroleo", "petrolero", "petrolera", "barril", "barriles", "gas", "energia", "energetico", "energetica"].some((term) => hasWholeTerm(text, term))) return { category: "Energía", section_slug: "energia", topic_slug: "energia" };
  if (["tecnologia", "tecnologico", "tecnologica", "antidron", "antidrones", "dron", "drones", "robot", "robots", "ciborg", "ciborgs"].some((term) => hasWholeTerm(text, term))) return { category: "Tecnología", section_slug: "tecnologia", topic_slug: "tecnologia" };
  if (["economia", "mercado", "monopolio", "finanzas", "arancel", "comercio"].some((term) => hasWholeTerm(text, term))) return { category: "Economía", section_slug: "economia-global", topic_slug: "economia" };
  return { category: "Internacional", section_slug: "mundo", topic_slug: "internacional" };
}
function sourceEntryText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") { const raw = value as Row; return stringValue(raw["#text"]) || stringValue(raw["@_href"]) || stringValue(raw.href); }
  return "";
}
function firstEntry(value: unknown): unknown { return Array.isArray(value) ? value[0] : value; }
function parseRssItems(xml: string) {
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(xml) as Row;
  const channel = (parsed.rss as Row | undefined)?.channel as Row | undefined;
  const rawItems = channel?.item;
  if (!rawItems) return [] as Array<{ title: string; sourceUrl: string; publishedAt: string; excerpt: string; imageUrl: string | null }>;
  return (Array.isArray(rawItems) ? rawItems : [rawItems]).map((item) => {
    const raw = item as Row;
    const enclosure = firstEntry(raw.enclosure) as Row | undefined;
    const media = firstEntry(raw["media:content"]) as Row | undefined;
    const thumbnail = firstEntry(raw["media:thumbnail"]) as Row | undefined;
    return { title: plainText(sourceEntryText(raw.title)), sourceUrl: sourceEntryText(raw.link), publishedAt: sourceEntryText(raw.pubDate) || new Date().toISOString(), excerpt: boundedRssExcerpt(sourceEntryText(raw.description) || sourceEntryText(raw.summary)), imageUrl: stringValue(enclosure?.["@_url"]) || stringValue(media?.["@_url"]) || stringValue(thumbnail?.["@_url"]) || null };
  });
}
function topicTerms(title: string) { return [...new Set(normalizedText(title).split(" ").filter((term) => term.length >= 3 && !TOPIC_STOP_WORDS.has(term)))]; }
async function possibleTopicDuplicate(db: D1Database, candidate: { slug: string; title: string; sourceUrl: string; sourceName: string; publishedAt: string }) {
  const candidateTime = Date.parse(candidate.publishedAt); const terms = topicTerms(candidate.title);
  if (!Number.isFinite(candidateTime) || terms.length < 4) return null;
  const since = new Date(candidateTime - TOPIC_WINDOW_MS).toISOString(); const until = new Date(candidateTime + TOPIC_WINDOW_MS).toISOString();
  const result = await db.prepare("SELECT slug, title, source_name, source_url, published_at FROM articles WHERE published_at BETWEEN ? AND ?").bind(since, until).all<Row>();
  const candidateSet = new Set(terms); let best: { matchedSlug: string; group: string; confidence: number } | null = null;
  for (const item of result.results) {
    if (stringValue(item.source_url) === candidate.sourceUrl || stringValue(item.source_name) === candidate.sourceName) continue;
    const existingTerms = topicTerms(stringValue(item.title)); const shared = existingTerms.filter((term) => candidateSet.has(term)); const union = new Set([...terms, ...existingTerms]).size;
    const jaccard = shared.length / union; const coverage = shared.length / Math.min(terms.length, existingTerms.length);
    if (shared.length < 4 || jaccard < 0.65 || coverage < 0.75) continue;
    const confidence = Number(((jaccard + coverage) / 2).toFixed(3));
    if (!best || confidence > best.confidence) best = { matchedSlug: stringValue(item.slug), group: `topic-${(await sha1([candidate.slug, stringValue(item.slug)].sort().join(":"))).slice(0, 16)}`, confidence };
  }
  return best;
}
function serializeArticle(row: Row): Row {
  const article = { ...row };
  for (const column of JSON_COLUMNS) if (column in article) article[column] = parseJson(article[column]);
  article.is_featured = Number(article.is_featured ?? 0) === 1;
  article.is_impact = Number(article.is_impact ?? 0) === 1;
  article.possible_topic_duplicate = Number(article.possible_topic_duplicate ?? 0) === 1;
  return article;
}
function serializeDraft(row: Row): Row { const draft = { ...row }; for (const column of ["tags", "countries", "editorial_sections", "source_articles"] as const) draft[column] = parseJson(draft[column]); return draft; }
function isInternalRequest(request: Request, env: Env) { return Boolean(env.INTERNAL_API_SECRET) && request.headers.get("x-internal-api-secret") === env.INTERNAL_API_SECRET; }
async function requestBody(request: Request) { const value = await request.json(); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object."); return value as Row; }

function normalizeArticle(input: Row, existingId?: string): Row {
  const now = new Date().toISOString(); const title = stringValue(input.title); const slug = stringValue(input.slug); const sourceUrl = stringValue(input.source_url); const url = stringValue(input.url) || sourceUrl;
  if (!title || !slug || !sourceUrl || !url) throw new Error("title, slug, source_url and url are required.");
  const sourceType = stringValue(input.source_type) || "rss";
  return { ...input, id: existingId || stringValue(input.id) || crypto.randomUUID(), title, slug, source_url: sourceUrl, url, excerpt: sourceType === "rss" ? boundedRssExcerpt(input.excerpt) : stringValue(input.excerpt) || title, content: sourceType === "rss" ? null : input.content ?? null, image_url: stringValue(input.image_url) || "https://picsum.photos/seed/d1-fallback/1200/675", source_name: stringValue(input.source_name) || stringValue(input.source) || "Fuente externa", source: stringValue(input.source) || stringValue(input.source_name) || "Fuente externa", region: stringValue(input.region) || "Mundo", category: stringValue(input.category) || "Internacional", source_type: sourceType, published_at: stringValue(input.published_at) || now, created_at: stringValue(input.created_at) || now, tags: asJson(input.tags, []), countries: asJson(input.countries, []), raw: asJson(input.raw, {}), faq_items: input.faq_items == null ? null : asJson(input.faq_items, []), editorial_sections: input.editorial_sections == null ? null : asJson(input.editorial_sections, {}), is_featured: input.is_featured ? 1 : 0, is_impact: input.is_impact ? 1 : 0, views: Number.isFinite(Number(input.views)) ? Number(input.views) : 0, possible_topic_duplicate: input.possible_topic_duplicate ? 1 : 0, topic_duplicate_group: stringValue(input.topic_duplicate_group) || null, topic_duplicate_confidence: Number.isFinite(Number(input.topic_duplicate_confidence)) ? Number(input.topic_duplicate_confidence) : null, topic_duplicate_of_slug: stringValue(input.topic_duplicate_of_slug) || null, editorial_status: stringValue(input.editorial_status) || (sourceType === "rss" ? "pending_review" : null), editorial_review_status: stringValue(input.editorial_review_status) || (sourceType === "rss" ? "pending" : null) };
}

async function ingestRssSource(db: D1Database, source: typeof RSS_CRON_SOURCES[number]) {
  const response = await fetch(source.feedUrl, { headers: { "user-agent": "LatamWorldNewsRSS/1.0 (+https://latamworldnews.com/fuentes)", accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`RSS request failed (${response.status}).`);
  const seen = new Set<string>(); let created = 0; let skipped = 0;
  for (const item of parseRssItems(await response.text()).slice(0, RSS_ITEM_LIMIT)) {
    if (!item.title || !item.sourceUrl || seen.has(item.sourceUrl)) { skipped += 1; continue; }
    seen.add(item.sourceUrl);
    if (source.tag === "rss-elpais" && /\/(escaparate|opinion)\//i.test(new URL(item.sourceUrl).pathname)) { skipped += 1; continue; }
    const slug = `${slugify(item.title)}-${(await sha1(item.sourceUrl)).slice(0, 10)}`;
    const existing = await db.prepare("SELECT id FROM articles WHERE slug = ? OR source_url = ? OR url = ? LIMIT 1").bind(slug, item.sourceUrl, item.sourceUrl).first<{ id: string }>();
    if (existing) { skipped += 1; continue; }
    const parsedPublishedAt = Date.parse(item.publishedAt);
    const publishedAt = Number.isFinite(parsedPublishedAt) ? new Date(parsedPublishedAt).toISOString() : new Date().toISOString();
    if (Number.isFinite(parsedPublishedAt) && parsedPublishedAt > Date.now() + MAX_FUTURE_RSS_PUBLICATION_MS) {
      skipped += 1;
      await recordError(db, {
        source_id: source.id,
        provider: "rss",
        message: "Skipped RSS item with a publication date too far in the future.",
        context: { source_name: source.name, slug, source_url: item.sourceUrl, published_at: publishedAt }
      });
      continue;
    }
    const duplicate = await possibleTopicDuplicate(db, { slug, title: item.title, sourceUrl: item.sourceUrl, sourceName: source.name, publishedAt });
    const taxonomy = rssCategory(item.title, item.excerpt);
    const article = normalizeArticle({ title: item.title, slug, excerpt: item.excerpt, content: null, image_url: item.imageUrl, source_name: source.name, source_url: item.sourceUrl, url: item.sourceUrl, summary: item.excerpt, source: source.name, source_type: "rss", region: "Mundo", category: taxonomy.category, section_slug: taxonomy.section_slug, topic_slug: taxonomy.topic_slug, tags: ["rss", source.tag, taxonomy.topic_slug, "editorial-pendiente"], countries: [], language: "es", raw: { imported_via: "cloudflare-scheduled-rss", rss: true, source_id: source.id }, published_at: publishedAt, editorial_status: "pending_review", editorial_review_status: "pending", possible_topic_duplicate: Boolean(duplicate), topic_duplicate_group: duplicate?.group ?? null, topic_duplicate_confidence: duplicate?.confidence ?? null, topic_duplicate_of_slug: duplicate?.matchedSlug ?? null });
    const inserted = await db.prepare(`INSERT INTO articles (${ARTICLE_COLUMNS.join(", ")}) VALUES (${ARTICLE_COLUMNS.map(() => "?").join(", ")}) ON CONFLICT DO NOTHING`).bind(...ARTICLE_COLUMNS.map((column) => article[column] ?? null)).run();
    if ((inserted.meta.changes ?? 0) > 0) created += 1; else skipped += 1;
  }
  return { sourceId: source.id, created, skipped };
}
async function runScheduledRssIngestion(db: D1Database) {
  const results: Array<{ sourceId: string; created: number; skipped: number; error?: string }> = [];
  for (const source of RSS_CRON_SOURCES) {
    try { results.push(await ingestRssSource(db, source)); }
    catch (error) { const message = error instanceof Error ? error.message : "Unknown RSS error."; await recordError(db, { source_id: source.id, provider: "rss", message, context: { scheduled: true, source_name: source.name } }).catch(() => undefined); results.push({ sourceId: source.id, created: 0, skipped: 0, error: message }); }
  }
  return { run_at: new Date().toISOString(), sources: results, created: results.reduce((total, result) => total + result.created, 0), skipped: results.reduce((total, result) => total + result.skipped, 0), failed: results.filter((result) => result.error).length };
}
async function upsertArticle(db: D1Database, input: Row) {
  const initial = normalizeArticle(input); const matches = await db.prepare("SELECT id FROM articles WHERE slug = ? OR source_url = ? OR url = ?").bind(initial.slug, initial.source_url, initial.url).all<{ id: string }>(); const ids = [...new Set(matches.results.map((row) => row.id))];
  if (ids.length > 1 || (ids.length === 1 && stringValue(input.id) && ids[0] !== input.id)) throw new Error("Conflicting slug, source_url, or url belongs to another article.");
  const article = normalizeArticle(input, ids[0]); const values = ARTICLE_COLUMNS.map((column) => article[column] ?? null); const assignments = ARTICLE_COLUMNS.filter((column) => column !== "id" && column !== "created_at").map((column) => `${column} = excluded.${column}`).join(", ");
  await db.prepare(`INSERT INTO articles (${ARTICLE_COLUMNS.join(", ")}) VALUES (${ARTICLE_COLUMNS.map(() => "?").join(", ")}) ON CONFLICT(id) DO UPDATE SET ${assignments}`).bind(...values).run(); const saved = await db.prepare("SELECT * FROM articles WHERE id = ?").bind(article.id).first<Row>(); return { article: serializeArticle(saved ?? article), created: ids.length === 0 };
}

function rejectsSourceMutation(input: Row) {
  for (const field of ["content", "source_url", "url", "source_name", "title", "excerpt"]) if (field in input) throw new Error(`Editorial changes cannot replace ${field}.`);
}
function normalizeEditorialPatch(input: Row): Row {
  rejectsSourceMutation(input);
  const summary = stringValue(input.latamworldnews_summary);
  if (!summary) throw new Error("latamworldnews_summary is required.");
  if (stringValue(input.editorial_origin) !== "generated_metadata_only") throw new Error("Unsupported editorial origin.");
  if (stringValue(input.editorial_status) !== "pending_review") throw new Error("Editorial patches must remain pending review.");
  if (stringValue(input.editorial_review_status) !== "pending") throw new Error("Editorial patches must require review.");
  const format = stringValue(input.editorial_format);
  if (format && !["brief", "context", "latam_impact"].includes(format)) throw new Error("Unsupported editorial format.");
  return { ...input, country: stringValue(input.country) || null, region: stringValue(input.region) || "Mundo", category: stringValue(input.category) || "Internacional", topic_slug: stringValue(input.topic_slug) || null, section_slug: stringValue(input.section_slug) || "mundo", tags: asJson(input.tags, []), countries: asJson(input.countries, []), latamworldnews_summary: summary, editorial_generated_at: stringValue(input.editorial_generated_at) || new Date().toISOString(), editorial_model: stringValue(input.editorial_model), editorial_origin: "generated_metadata_only", editorial_input_hash: stringValue(input.editorial_input_hash), editorial_prompt_version: stringValue(input.editorial_prompt_version), editorial_validation: asJson(input.editorial_validation, {}), editorial_format: format || null, editorial_key_takeaway: stringValue(input.editorial_key_takeaway) || null, editorial_what_to_watch: stringValue(input.editorial_what_to_watch) || null, editorial_latam_impact: stringValue(input.editorial_latam_impact) || null, editorial_author: stringValue(input.editorial_author) || "Redacción LATAM World News", editorial_updated_at: stringValue(input.editorial_updated_at) || new Date().toISOString(), editorial_status: "pending_review", editorial_review_status: "pending" };
}
async function patchArticleEditorial(db: D1Database, slug: string, input: Row) {
  const existing = await db.prepare("SELECT id FROM articles WHERE slug = ?").bind(slug).first<{ id: string }>();
  if (!existing) throw new Error("Article not found.");
  const patch = normalizeEditorialPatch(input); const values = EDITORIAL_PATCH_COLUMNS.map((column) => patch[column] ?? null);
  await db.prepare(`UPDATE articles SET ${EDITORIAL_PATCH_COLUMNS.map((column) => `${column} = ?`).join(", ")} WHERE slug = ?`).bind(...values, slug).run(); const saved = await db.prepare("SELECT * FROM articles WHERE slug = ?").bind(slug).first<Row>(); return serializeArticle(saved ?? patch);
}

function normalizeEditorialDecision(input: Row): Row {
  rejectsSourceMutation(input);
  const slug = stringValue(input.slug);
  const editorialStatus = stringValue(input.editorial_status);
  const reviewStatus = stringValue(input.editorial_review_status);
  const validPair = (editorialStatus === "ready" && reviewStatus === "approved") || (editorialStatus === "pending_review" && reviewStatus === "pending");
  if (!slug) throw new Error("Editorial decision slug is required.");
  if (!validPair) throw new Error("Invalid editorial status/review-status pair.");
  const classificationFields = ["region", "country", "countries", "category", "tags", "topic_slug", "section_slug"];
  const updatesClassification = classificationFields.some((field) => field in input);
  if (editorialStatus === "ready" && (!updatesClassification || !stringValue(input.section_slug) || !stringValue(input.region) || !stringValue(input.category) || !stringValue(input.topic_slug))) throw new Error("Ready decisions require complete classification.");
  if (updatesClassification && !classificationFields.every((field) => field in input)) throw new Error("Classification must include every classification field.");
  return { slug, updates_classification: updatesClassification, region: stringValue(input.region) || "Mundo", country: stringValue(input.country) || null, countries: asJson(input.countries, []), category: stringValue(input.category) || "Internacional", tags: asJson(input.tags, []), topic_slug: stringValue(input.topic_slug) || "internacional", section_slug: stringValue(input.section_slug) || "mundo", editorial_status: editorialStatus, editorial_review_status: reviewStatus, editorial_reviewed_at: stringValue(input.editorial_reviewed_at) || new Date().toISOString(), editorial_review_notes: stringValue(input.editorial_review_notes).slice(0, 2_000) || null };
}
async function applyEditorialDecisionBatch(db: D1Database, input: Row) {
  const rawChanges = input.changes;
  if (!Array.isArray(rawChanges) || rawChanges.length === 0 || rawChanges.length > 100) throw new Error("changes must contain between 1 and 100 decisions.");
  const changes = rawChanges.map((change) => {
    if (!change || typeof change !== "object" || Array.isArray(change)) throw new Error("Each decision must be an object.");
    return normalizeEditorialDecision(change as Row);
  });
  const unique = new Set(changes.map((change) => stringValue(change.slug)));
  if (unique.size !== changes.length) throw new Error("Duplicate slugs are not allowed in a decision batch.");
  const existing = await Promise.all(changes.map((change) => db.prepare("SELECT id FROM articles WHERE slug = ?").bind(change.slug).first<{ id: string }>()));
  const missing = changes.filter((_, index) => !existing[index]).map((change) => change.slug);
  if (missing.length) throw new Error(`Unknown article slugs: ${missing.join(", ")}`);
  for (const change of changes.filter((item) => item.editorial_status === "ready")) {
    const draft = await db.prepare("SELECT editorial_format, latamworldnews_summary, editorial_key_takeaway FROM articles WHERE slug = ?").bind(change.slug).first<Row>();
    if (stringValue(draft?.editorial_format) && (!stringValue(draft?.latamworldnews_summary) || !stringValue(draft?.editorial_key_takeaway))) throw new Error("Articles using the AI editorial flow require a saved draft before approval.");
  }
  await db.batch(changes.map((change) => {
    const columns = change.updates_classification
      ? EDITORIAL_DECISION_COLUMNS
      : ["editorial_status", "editorial_review_status", "editorial_reviewed_at", "editorial_review_notes"];
    return db.prepare(`UPDATE articles SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE slug = ?`).bind(...columns.map((column) => change[column] ?? null), change.slug);
  }));
  return { requested: changes.length, changed: changes.length, approved: changes.filter((change) => change.editorial_status === "ready").length, rejected: 0, pending: changes.filter((change) => change.editorial_status === "pending_review").length, slugs: changes.map((change) => change.slug) };
}

async function deleteArticleBatch(db: D1Database, input: Row) {
  const rawSlugs = input.slugs;
  if (!Array.isArray(rawSlugs) || rawSlugs.length === 0 || rawSlugs.length > 100) throw new Error("slugs must contain between 1 and 100 article identifiers.");
  const slugs = rawSlugs.map(stringValue);
  if (slugs.some((slug) => !slug)) throw new Error("Every article identifier must be a non-empty slug.");
  if (new Set(slugs).size !== slugs.length) throw new Error("Duplicate slugs are not allowed in a deletion batch.");
  const existing = await Promise.all(slugs.map((slug) => db.prepare("SELECT id FROM articles WHERE slug = ?").bind(slug).first<{ id: string }>()));
  const missing = slugs.filter((_, index) => !existing[index]);
  if (missing.length) throw new Error(`Unknown article slugs: ${missing.join(", ")}`);
  await db.batch(slugs.map((slug) => db.prepare("DELETE FROM articles WHERE slug = ?").bind(slug)));
  return { requested: slugs.length, deleted: slugs.length, slugs };
}

function normalizeDraft(input: Row, existingId?: string): Row {
  const now = new Date().toISOString(); const title = stringValue(input.title); const slug = stringValue(input.slug); if (!title || !slug) throw new Error("title and slug are required.");
  return { ...input, id: existingId || stringValue(input.id) || crypto.randomUUID(), title, slug, excerpt: stringValue(input.excerpt) || title, editorial_sections: asJson(input.editorial_sections, {}), tags: asJson(input.tags, []), countries: asJson(input.countries, []), source_articles: asJson(input.source_articles, []), source_count: Number.isFinite(Number(input.source_count)) ? Number(input.source_count) : 0, status: stringValue(input.status) || "pending_review", generated_at: stringValue(input.generated_at) || now, created_at: stringValue(input.created_at) || now, updated_at: now };
}
async function upsertDraft(db: D1Database, input: Row) {
  const found = await db.prepare("SELECT id FROM impacto_editorial_drafts WHERE slug = ?").bind(stringValue(input.slug)).first<{ id: string }>(); if (input.id && found && input.id !== found.id) throw new Error("Conflicting draft slug belongs to another draft."); const draft = normalizeDraft(input, found?.id); const values = DRAFT_COLUMNS.map((column) => draft[column] ?? null); const assignments = DRAFT_COLUMNS.filter((column) => column !== "id" && column !== "created_at").map((column) => `${column} = excluded.${column}`).join(", ");
  await db.prepare(`INSERT INTO impacto_editorial_drafts (${DRAFT_COLUMNS.join(", ")}) VALUES (${DRAFT_COLUMNS.map(() => "?").join(", ")}) ON CONFLICT(id) DO UPDATE SET ${assignments}`).bind(...values).run(); const saved = await db.prepare("SELECT * FROM impacto_editorial_drafts WHERE id = ?").bind(draft.id).first<Row>(); return { draft: serializeDraft(saved ?? draft), created: !found };
}
async function recordError(db: D1Database, input: Row) { const sourceId = stringValue(input.source_id); const provider = stringValue(input.provider); const message = stringValue(input.message); if (!sourceId || !provider || !message) throw new Error("source_id, provider and message are required."); await db.prepare("INSERT INTO ingestion_errors (id, source_id, provider, message, occurred_at, context) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), sourceId, provider, message.slice(0, 2000), new Date().toISOString(), input.context == null ? null : asJson(input.context, {})).run(); }

async function listArticles(db: D1Database, url: URL, publicOnly: boolean) {
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 1_000_000);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 20, 100);
  const clauses: string[] = publicOnly ? [PUBLIC_READY_CLAUSE] : [];
  const values: unknown[] = publicOnly ? [publicPublicationCutoff()] : [];
  for (const [query, column] of [["region", "region"], ["country", "country"], ["section_slug", "section_slug"], ["source_type", "source_type"], ["editorial_status", "editorial_status"], ["editorial_review_status", "editorial_review_status"], ["is_impact", "is_impact"], ["impact_format", "impact_format"]] as const) {
    const value = url.searchParams.get(query); if (value) { clauses.push(`${column} = ?`); values.push(value); }
  }
  const search = url.searchParams.get("q");
  if (search) { clauses.push("(title LIKE ? OR excerpt LIKE ? OR summary LIKE ?)"); values.push(`%${search.slice(0, 120)}%`, `%${search.slice(0, 120)}%`, `%${search.slice(0, 120)}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db.prepare(`SELECT * FROM articles ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize).all<Row>();
  return json({ data: result.results.map(serializeArticle), pagination: { page, pageSize } });
}
async function getArticleBySlug(db: D1Database, slug: string, publicOnly: boolean) {
  const query = publicOnly ? `SELECT * FROM articles WHERE slug = ? AND ${PUBLIC_READY_CLAUSE} LIMIT 1` : "SELECT * FROM articles WHERE slug = ? LIMIT 1";
  const article = publicOnly
    ? await db.prepare(query).bind(slug, publicPublicationCutoff()).first<Row>()
    : await db.prepare(query).bind(slug).first<Row>();
  return article ? json({ data: serializeArticle(article) }) : json({ error: "Not found" }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url); const path = url.pathname;
    try {
      if (request.method === "GET" && path === "/health") { await env.DB.prepare("SELECT 1 AS ok").first(); return json({ ok: true, service: "latam-world-news-d1", writesProtected: Boolean(env.INTERNAL_API_SECRET) }); }
      if (request.method === "GET" && path === "/articles") return listArticles(env.DB, url, true);
      if (request.method === "GET" && path.startsWith("/articles/")) return getArticleBySlug(env.DB, decodeURIComponent(path.slice("/articles/".length)), true);
      if (!isInternalRequest(request, env)) return json({ error: "Unauthorized" }, { status: 401 });
      if (request.method === "GET" && path === "/internal/articles") return listArticles(env.DB, url, false);
      if (request.method === "GET" && path.startsWith("/internal/articles/")) return getArticleBySlug(env.DB, decodeURIComponent(path.slice("/internal/articles/".length)), false);
      if (request.method === "POST" && path === "/internal/editorial/apply-batch") return json({ data: await applyEditorialDecisionBatch(env.DB, await requestBody(request)) });
      if (request.method === "POST" && path === "/internal/articles/delete-batch") return json({ data: await deleteArticleBatch(env.DB, await requestBody(request)) });
      if (request.method === "POST" && path === "/internal/articles/upsert") { const payload = await requestBody(request); const result = await upsertArticle(env.DB, payload.article as Row); return json({ data: result.article, created: result.created }, { status: result.created ? 201 : 200 }); }
      if (request.method === "POST" && path === "/internal/ingestion/rss") return json({ data: await runScheduledRssIngestion(env.DB) });
      if (request.method === "POST" && /^\/internal\/articles\/[^/]+\/editorial$/.test(path)) { const slug = decodeURIComponent(path.split("/")[3]); const payload = await requestBody(request); return json({ data: await patchArticleEditorial(env.DB, slug, payload.editorial as Row) }); }
      if (request.method === "POST" && /^\/internal\/articles\/[^/]+\/views$/.test(path)) { const slug = decodeURIComponent(path.split("/")[3]); await env.DB.prepare("UPDATE articles SET views = views + 1 WHERE slug = ?").bind(slug).run(); return json({ ok: true }); }
      if (request.method === "POST" && path === "/internal/impacto-drafts/upsert") { const payload = await requestBody(request); const result = await upsertDraft(env.DB, payload.draft as Row); return json({ data: result.draft, created: result.created }, { status: result.created ? 201 : 200 }); }
      if (request.method === "POST" && path === "/internal/ingestion-errors") { await recordError(env.DB, await requestBody(request)); return json({ ok: true }, { status: 201 }); }
      return json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      console.error("D1 Worker request failed", error);
      return json({ error: message }, { status: message.includes("Conflicting") ? 409 : 400 });
    }
  },
  async scheduled(_controller: unknown, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(runScheduledRssIngestion(env.DB).then((summary) => console.log("RSS cron completed", summary)).catch((error) => console.error("RSS cron failed", error)));
  }
};
