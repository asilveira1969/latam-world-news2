import { cleanPlainText } from "@/lib/text/clean";
import { fetchSourceArticleContent } from "@/lib/source-content";
import type { Article } from "@/lib/types/article";

export type EditorialAgentResult = {
  latamworldnews_summary: string;
  curated_news: string;
  model: string;
  source_content?: string | null;
};

type ResponsesApiSuccess = {
  id: string;
  status: string;
  model: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  error?: {
    message?: string;
  } | null;
};

type EnrichmentInput = Pick<
  Article,
  | "title"
  | "excerpt"
  | "content"
  | "source_name"
  | "source_url"
  | "region"
  | "category"
  | "tags"
  | "published_at"
>;

const DEFAULT_MODEL = process.env.OPENAI_EDITORIAL_MODEL || "gpt-5-mini";
const MIN_EXCERPT_WORDS = 18;
const MIN_CONTENT_WORDS = 80;
const MIN_COMBINED_WORDS = 30;

function wordCount(input: string): number {
  return cleanPlainText(input)
    .split(/\s+/)
    .filter(Boolean).length;
}

export function hasEnoughEditorialSourceMaterial(article: Pick<Article, "excerpt" | "content">): boolean {
  const excerptWords = wordCount(article.excerpt ?? "");
  const contentWords = wordCount(article.content ?? "");
  const combinedWords = wordCount(`${article.excerpt ?? ""} ${article.content ?? ""}`);

  if (contentWords >= MIN_CONTENT_WORDS) {
    return true;
  }

  return excerptWords >= MIN_EXCERPT_WORDS && combinedWords >= MIN_COMBINED_WORDS;
}

function normalizeForComparison(input: string): string[] {
  return cleanPlainText(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function directionalOverlap(source: string, target: string): number {
  const sourceTokens = new Set(normalizeForComparison(source));
  const targetTokens = new Set(normalizeForComparison(target));
  if (sourceTokens.size === 0 || targetTokens.size === 0) {
    return 0;
  }

  let repeated = 0;
  for (const token of targetTokens) {
    if (sourceTokens.has(token)) {
      repeated += 1;
    }
  }
  return repeated / targetTokens.size;
}

function sharedSentence(summary: string, curated: string): boolean {
  const summarySentences = cleanPlainText(summary)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 20);
  const curatedSentences = cleanPlainText(curated)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 20);

  return summarySentences.some((sentence) =>
    curatedSentences.some((candidate) => cleanPlainText(sentence).toLowerCase() === cleanPlainText(candidate).toLowerCase())
  );
}

export function validateEditorialAgentResult(input: {
  article: EnrichmentInput;
  result: Pick<EditorialAgentResult, "latamworldnews_summary" | "curated_news">;
}) {
  const summary = cleanPlainText(input.result.latamworldnews_summary);
  const curated = cleanPlainText(input.result.curated_news);
  const excerpt = cleanPlainText(input.article.excerpt);

  if (!summary || !curated) {
    throw new Error("Editorial agent returned empty fields.");
  }
  const summaryWords = wordCount(summary);
  const curatedWords = wordCount(curated);

  if (summaryWords < 20 || summaryWords > 40) {
    throw new Error(`Summary out of range: ${summaryWords} words.`);
  }
  if (curatedWords < 60 || curatedWords > 100) {
    throw new Error(`Curated news out of range: ${curatedWords} words.`);
  }
  if (sharedSentence(summary, curated)) {
    throw new Error("Summary and curated news share a full sentence.");
  }
  if (directionalOverlap(summary, curated) > 0.3) {
    throw new Error("Curated news overlaps more than 30% with the summary.");
  }
  if (directionalOverlap(excerpt, summary) > 0.8) {
    throw new Error("Summary copies too much from the source excerpt.");
  }
  if (directionalOverlap(excerpt, curated) > 0.8) {
    throw new Error("Curated news copies too much from the source excerpt.");
  }

  return {
    latamworldnews_summary: summary,
    curated_news: curated
  };
}

function extractOutputText(response: ResponsesApiSuccess): string {
  const parts = response.output ?? [];
  const texts = parts.flatMap((item) =>
    (item.content ?? [])
      .filter((content) => content.type === "output_text" && typeof content.text === "string")
      .map((content) => content.text as string)
  );

  return texts.join("\n").trim();
}

function buildPrompt(article: EnrichmentInput): string {
  return [
    "Genera dos bloques editoriales en espanol neutro para una nota periodistica curada de LatamWorldNews.",
    "No copies literal el excerpt ni el titulo. No inventes datos. No menciones IA, modelo ni proceso interno.",
    "Devuelve JSON con dos claves: latamworldnews_summary y curated_news.",
    "Reglas:",
    "- latamworldnews_summary: 20 a 40 palabras, 1 o 2 oraciones breves.",
    "- curated_news: 60 a 100 palabras, 3 o 4 oraciones.",
    "- curated_news no puede repetir mas de 30% de ideas o tokens del resumen.",
    "- Ninguna oracion completa puede aparecer en ambos bloques.",
    "- Tono periodistico claro, sobrio y editorial.",
    "",
    `Titulo: ${article.title}`,
    `Excerpt fuente: ${article.excerpt}`,
    `Contenido fuente: ${article.content ?? "Sin contenido extendido"}`,
    `Fuente: ${article.source_name}`,
    `URL fuente: ${article.source_url}`,
    `Region: ${article.region}`,
    `Categoria: ${article.category}`,
    `Tags: ${article.tags.join(", ") || "sin tags"}`,
    `Publicado: ${article.published_at}`
  ].join("\n");
}

export async function generateEditorialWithAgent(article: EnrichmentInput): Promise<EditorialAgentResult> {
  let sourceContent = article.content ?? null;

  if (!hasEnoughEditorialSourceMaterial({ excerpt: article.excerpt, content: sourceContent })) {
    sourceContent = await fetchSourceArticleContent(article.source_url);
  }

  const enrichedArticle = {
    ...article,
    content: sourceContent
  };

  if (!hasEnoughEditorialSourceMaterial(enrichedArticle)) {
    throw new Error("Insufficient source material for editorial enrichment.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "editorial_blocks",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              latamworldnews_summary: { type: "string" },
              curated_news: { type: "string" }
            },
            required: ["latamworldnews_summary", "curated_news"]
          }
        }
      },
      input: [
        {
          role: "system",
          content: "Eres editor de LatamWorldNews. Respondes solo con JSON valido segun el schema."
        },
        {
          role: "user",
          content: buildPrompt(enrichedArticle)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ResponsesApiSuccess;
  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI returned empty output.");
  }

  let parsed: { latamworldnews_summary: string; curated_news: string };
  try {
    parsed = JSON.parse(outputText) as { latamworldnews_summary: string; curated_news: string };
  } catch {
    throw new Error("OpenAI returned non-JSON structured output.");
  }

  const validated = validateEditorialAgentResult({
    article: enrichedArticle,
    result: parsed
  });

  return {
    ...validated,
    model: payload.model || DEFAULT_MODEL,
    source_content: sourceContent
  };
}
