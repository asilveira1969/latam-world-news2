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
const ARTICLE_COLUMNS = ["id","title","slug","excerpt","content","image_url","source_name","source_url","region","category","tags","published_at","created_at","is_featured","is_impact","views","url","summary","source","source_type","country","language","raw","latamworldnews_summary","curated_news","editorial_status","editorial_generated_at","editorial_model","topic_slug","section_slug","countries","impact_format","editorial_sections","latam_angle","faq_items","seo_title","seo_description","possible_topic_duplicate","topic_duplicate_group","topic_duplicate_confidence","topic_duplicate_of_slug","editorial_origin","editorial_input_hash","editorial_prompt_version","editorial_validation","editorial_review_status","editorial_reviewed_at","editorial_review_notes"] as const;
const DRAFT_COLUMNS = ["id","slug","title","excerpt","seo_title","seo_description","editorial_context","editorial_sections","tags","countries","source_articles","source_count","status","review_email","email_sent_at","email_provider","email_message_id","model","generated_at","approved_at","published_article_slug","created_at","updated_at"] as const;
const EDITORIAL_PATCH_COLUMNS = ["region", "country", "countries", "category", "tags", "topic_slug", "section_slug", "latamworldnews_summary", "editorial_status", "editorial_generated_at", "editorial_model", "editorial_origin", "editorial_input_hash", "editorial_prompt_version", "editorial_validation", "editorial_review_status"] as const;
const EDITORIAL_DECISION_COLUMNS = ["region", "country", "countries", "category", "tags", "topic_slug", "section_slug", "editorial_status", "editorial_review_status", "editorial_reviewed_at", "editorial_review_notes"] as const;
const PUBLIC_READY_CLAUSE = "editorial_status = 'ready' AND editorial_review_status = 'approved'";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json; charset=utf-8", ...init.headers } });
}
function stringValue(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function boundedRssExcerpt(value: unknown) { return stringValue(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280); }
function parsePositiveInt(value: string | null, fallback: number, maximum: number) { const parsed = Number.parseInt(value ?? "", 10); return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback; }
function asJson(value: unknown, fallback: unknown) { if (typeof value === "string") { JSON.parse(value); return value; } return JSON.stringify(value ?? fallback); }
function parseJson(value: unknown) { if (typeof value !== "string") return value; try { return JSON.parse(value); } catch { return value; } }
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
  return { ...input, id: existingId || stringValue(input.id) || crypto.randomUUID(), title, slug, source_url: sourceUrl, url, excerpt: sourceType === "rss" ? boundedRssExcerpt(input.excerpt) : stringValue(input.excerpt) || title, content: sourceType === "rss" ? null : input.content ?? null, image_url: stringValue(input.image_url) || "https://picsum.photos/seed/d1-fallback/1200/675", source_name: stringValue(input.source_name) || stringValue(input.source) || "Fuente externa", source: stringValue(input.source) || stringValue(input.source_name) || "Fuente externa", region: stringValue(input.region) || "Mundo", category: stringValue(input.category) || "Internacional", source_type: sourceType, published_at: stringValue(input.published_at) || now, created_at: stringValue(input.created_at) || now, tags: asJson(input.tags, []), countries: asJson(input.countries, []), raw: asJson(input.raw, {}), faq_items: input.faq_items == null ? null : asJson(input.faq_items, []), editorial_sections: input.editorial_sections == null ? null : asJson(input.editorial_sections, {}), is_featured: input.is_featured ? 1 : 0, is_impact: input.is_impact ? 1 : 0, views: Number.isFinite(Number(input.views)) ? Number(input.views) : 0, possible_topic_duplicate: input.possible_topic_duplicate ? 1 : 0, topic_duplicate_group: stringValue(input.topic_duplicate_group) || null, topic_duplicate_confidence: Number.isFinite(Number(input.topic_duplicate_confidence)) ? Number(input.topic_duplicate_confidence) : null, topic_duplicate_of_slug: stringValue(input.topic_duplicate_of_slug) || null };
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
  return { ...input, country: stringValue(input.country) || null, region: stringValue(input.region) || "Mundo", category: stringValue(input.category) || "Internacional", topic_slug: stringValue(input.topic_slug) || null, section_slug: stringValue(input.section_slug) || "mundo", tags: asJson(input.tags, []), countries: asJson(input.countries, []), latamworldnews_summary: summary, editorial_generated_at: stringValue(input.editorial_generated_at) || new Date().toISOString(), editorial_model: stringValue(input.editorial_model), editorial_origin: "generated_metadata_only", editorial_input_hash: stringValue(input.editorial_input_hash), editorial_prompt_version: stringValue(input.editorial_prompt_version), editorial_validation: asJson(input.editorial_validation, {}), editorial_status: "pending_review", editorial_review_status: "pending" };
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
  const validPair = (editorialStatus === "ready" && reviewStatus === "approved") || (editorialStatus === "rejected" && reviewStatus === "rejected") || (editorialStatus === "pending_review" && reviewStatus === "pending");
  if (!slug) throw new Error("Editorial decision slug is required.");
  if (!validPair) throw new Error("Invalid editorial status/review-status pair.");
  const note = stringValue(input.audit_note);
  if (!note) throw new Error("audit_note is required.");
  const classificationFields = ["region", "country", "countries", "category", "tags", "topic_slug", "section_slug"];
  const updatesClassification = classificationFields.some((field) => field in input);
  if (editorialStatus === "ready" && (!updatesClassification || !stringValue(input.section_slug) || !stringValue(input.region) || !stringValue(input.category) || !stringValue(input.topic_slug))) throw new Error("Ready decisions require complete classification.");
  if (updatesClassification && !classificationFields.every((field) => field in input)) throw new Error("Classification must include every classification field.");
  return { slug, updates_classification: updatesClassification, region: stringValue(input.region) || "Mundo", country: stringValue(input.country) || null, countries: asJson(input.countries, []), category: stringValue(input.category) || "Internacional", tags: asJson(input.tags, []), topic_slug: stringValue(input.topic_slug) || "internacional", section_slug: stringValue(input.section_slug) || "mundo", editorial_status: editorialStatus, editorial_review_status: reviewStatus, editorial_reviewed_at: stringValue(input.editorial_reviewed_at) || new Date().toISOString(), editorial_review_notes: note.slice(0, 2_000) };
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
  await db.batch(changes.map((change) => {
    const columns = change.updates_classification
      ? EDITORIAL_DECISION_COLUMNS
      : ["editorial_status", "editorial_review_status", "editorial_reviewed_at", "editorial_review_notes"];
    return db.prepare(`UPDATE articles SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE slug = ?`).bind(...columns.map((column) => change[column] ?? null), change.slug);
  }));
  return { requested: changes.length, changed: changes.length, approved: changes.filter((change) => change.editorial_status === "ready").length, rejected: changes.filter((change) => change.editorial_status === "rejected").length, pending: changes.filter((change) => change.editorial_status === "pending_review").length, slugs: changes.map((change) => change.slug) };
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
  const values: unknown[] = [];
  for (const [query, column] of [["region", "region"], ["country", "country"], ["section_slug", "section_slug"], ["source_type", "source_type"]] as const) {
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
  const article = await db.prepare(query).bind(slug).first<Row>();
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
      if (request.method === "POST" && path === "/internal/articles/upsert") { const payload = await requestBody(request); const result = await upsertArticle(env.DB, payload.article as Row); return json({ data: result.article, created: result.created }, { status: result.created ? 201 : 200 }); }
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
  }
};
