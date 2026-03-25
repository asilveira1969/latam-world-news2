import { cleanExcerpt, cleanPlainText } from "@/lib/text/clean";
import type {
  EditorialSections,
  ImpactoDraftSourceArticle,
  ImpactoEditorialDraft
} from "@/lib/types/article";

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

export type ImpactoEditorialAgentResult = Pick<
  ImpactoEditorialDraft,
  | "title"
  | "excerpt"
  | "seo_title"
  | "seo_description"
  | "editorial_context"
  | "editorial_sections"
  | "tags"
  | "countries"
> & {
  model: string;
};

const DEFAULT_MODEL = process.env.OPENAI_IMPACTO_MODEL || process.env.OPENAI_EDITORIAL_MODEL || "gpt-5-mini";

function wordCount(input: string): number {
  return cleanPlainText(input)
    .split(/\s+/)
    .filter(Boolean).length;
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

function slugify(input: string): string {
  return cleanPlainText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
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

function truncateArray(values: string[], limit: number): string[] {
  return values.map((value) => cleanPlainText(value)).filter(Boolean).slice(0, limit);
}

function buildPrompt(sourceArticles: ImpactoDraftSourceArticle[]): string {
  const articleLines = sourceArticles.map((article, index) =>
    [
      `${index + 1}. ${article.title}`,
      `Fuente: ${article.source_name}`,
      `Region: ${article.region}`,
      `Categoria: ${article.category}`,
      `Excerpt: ${article.excerpt}`,
      `Tags: ${article.tags.join(", ") || "sin tags"}`,
      `Publicado: ${article.published_at}`,
      `URL: ${article.source_url}`
    ].join("\n")
  );

  return [
    "Escribe un editorial diario para la vertical Impacto de LatamWorldNews.",
    "La tarea no consiste en resumir una sola nota: debes leer el conjunto de hechos y detectar el hilo comun del dia.",
    "El enfoque obligatorio es explicar como la agenda internacional impacta o puede impactar a America Latina.",
    "No copies titulares de forma literal salvo menciones puntuales muy breves. No inventes datos. No menciones IA ni proceso interno.",
    "No escribas como si estuvieras compilando noticias ni como si entregaras un informe tecnico.",
    "Debes elegir una tesis editorial principal y sostenerla con jerarquia, no con acumulacion.",
    "Devuelve JSON valido con estas claves:",
    "- title",
    "- excerpt",
    "- seo_title",
    "- seo_description",
    "- editorial_context",
    "- editorial_sections: { que_esta_pasando, claves_del_dia, que_significa_para_america_latina, por_que_importa }",
    "- tags",
    "- countries",
    "",
    "Reglas editoriales:",
    "- title: entre 9 y 18 palabras, con idea nueva del dia, especifico, no abstracto y no reciclable.",
    "- excerpt: 28 a 50 palabras.",
    "- editorial_context: 70 a 130 palabras.",
    "- Cada bloque de editorial_sections: 45 a 110 palabras.",
    "- El editorial debe construir una tesis regional, no listar titulares.",
    "- Si los hechos del dia son diversos, debes priorizar el eje mas consistente y dejar afuera lo secundario.",
    "- Evita frases comodin como 'la agenda del dia muestra', 'hoy convergen senales' o 'esta mezcla no es solo geopolitica distante'.",
    "- Evita marcos demasiado generales como 'fragilidad', 'capacidad estatal' o 'costos' si no estan anclados a un efecto concreto.",
    "- No uses listas numeradas, vietas ni formatos 1) 2) 3) dentro de los bloques.",
    "- Cada bloque debe leerse como texto publicado, no como nota interna de redaccion.",
    "- que_esta_pasando: sintetiza el eje comun de la agenda del dia.",
    "- claves_del_dia: redacta un parrafo corrido con 2 o 3 senales concretas que sostienen la tesis.",
    "- que_significa_para_america_latina: explica la traduccion regional.",
    "- por_que_importa: cierra con utilidad editorial y relevancia publica.",
    "- tags: entre 3 y 6 tags breves en minusculas.",
    "- countries: lista corta de paises latinoamericanos relevantes si realmente aplica.",
    "",
    "Criterio de calidad:",
    "- Es mejor un editorial mas corto y enfocado que uno amplio pero difuso.",
    "- Si no encuentras una tesis comun solida, prioriza el hecho dominante del dia y su traduccion para America Latina.",
    "- El tono debe sonar a una pieza que un editor publicaria, no a una salida automatica.",
    "",
    "Articulos base del dia:",
    articleLines.join("\n\n")
  ].join("\n");
}

function validateSections(sections: EditorialSections) {
  const entries = Object.entries(sections) as Array<[keyof EditorialSections, string]>;
  for (const [key, value] of entries) {
    const cleaned = cleanPlainText(value);
    const count = wordCount(cleaned);
    if (count < 45 || count > 110) {
      throw new Error(`Section ${key} out of range: ${count} words.`);
    }
  }

  const overlapPairs: Array<[string, string, string, string]> = [
    ["que_esta_pasando", sections.que_esta_pasando, "claves_del_dia", sections.claves_del_dia],
    [
      "que_significa_para_america_latina",
      sections.que_significa_para_america_latina,
      "por_que_importa",
      sections.por_que_importa
    ]
  ];

  for (const [leftKey, left, rightKey, right] of overlapPairs) {
    if (directionalOverlap(left, right) > 0.6) {
      throw new Error(`Sections ${leftKey} and ${rightKey} overlap too much.`);
    }
  }
}

export function validateImpactoEditorialResult(
  sourceArticles: ImpactoDraftSourceArticle[],
  result: Omit<ImpactoEditorialAgentResult, "model">
) {
  const title = cleanPlainText(result.title);
  const excerpt = cleanExcerpt(result.excerpt, 320);
  const seoTitle = cleanPlainText(result.seo_title ?? title);
  const seoDescription = cleanExcerpt(result.seo_description ?? excerpt, 180);
  const editorialContext = cleanExcerpt(result.editorial_context ?? "", 900);
  const sections: EditorialSections = {
    que_esta_pasando: cleanPlainText(result.editorial_sections.que_esta_pasando),
    claves_del_dia: cleanPlainText(result.editorial_sections.claves_del_dia),
    que_significa_para_america_latina: cleanPlainText(
      result.editorial_sections.que_significa_para_america_latina
    ),
    por_que_importa: cleanPlainText(result.editorial_sections.por_que_importa)
  };
  const baseText = sourceArticles.map((article) => `${article.title} ${article.excerpt}`).join(" ");

  if (wordCount(title) < 9 || wordCount(title) > 18) {
    throw new Error(`Impacto title out of range: ${wordCount(title)} words.`);
  }
  if (wordCount(excerpt) < 28 || wordCount(excerpt) > 50) {
    throw new Error(`Impacto excerpt out of range: ${wordCount(excerpt)} words.`);
  }
  if (wordCount(editorialContext) < 70 || wordCount(editorialContext) > 130) {
    throw new Error(`Impacto editorial_context out of range: ${wordCount(editorialContext)} words.`);
  }
  if (directionalOverlap(baseText, title) > 0.95) {
    throw new Error("Impacto title copies too much from source headlines.");
  }
  if (directionalOverlap(baseText, excerpt) > 0.85) {
    throw new Error("Impacto excerpt copies too much from source excerpts.");
  }

  validateSections(sections);

  return {
    title,
    excerpt,
    seo_title: seoTitle,
    seo_description: seoDescription,
    editorial_context: editorialContext,
    editorial_sections: sections,
    tags: truncateArray(result.tags, 6),
    countries: truncateArray(result.countries ?? [], 5),
    slug: slugify(title)
  };
}

export async function generateImpactoEditorialDraft(
  sourceArticles: ImpactoDraftSourceArticle[]
): Promise<ImpactoEditorialAgentResult & { slug: string }> {
  if (sourceArticles.length < 4) {
    throw new Error("Impacto draft needs at least 4 source articles.");
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
          name: "impacto_editorial_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              excerpt: { type: "string" },
              seo_title: { type: "string" },
              seo_description: { type: "string" },
              editorial_context: { type: "string" },
              editorial_sections: {
                type: "object",
                additionalProperties: false,
                properties: {
                  que_esta_pasando: { type: "string" },
                  claves_del_dia: { type: "string" },
                  que_significa_para_america_latina: { type: "string" },
                  por_que_importa: { type: "string" }
                },
                required: [
                  "que_esta_pasando",
                  "claves_del_dia",
                  "que_significa_para_america_latina",
                  "por_que_importa"
                ]
              },
              tags: {
                type: "array",
                items: { type: "string" }
              },
              countries: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: [
              "title",
              "excerpt",
              "seo_title",
              "seo_description",
              "editorial_context",
              "editorial_sections",
              "tags",
              "countries"
            ]
          }
        }
      },
      input: [
        {
          role: "system",
          content:
            "Eres editor senior de Impacto en LatamWorldNews. Respondes solo con JSON valido segun el schema."
        },
        {
          role: "user",
          content: buildPrompt(sourceArticles)
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

  let parsed: Omit<ImpactoEditorialAgentResult, "model">;
  try {
    parsed = JSON.parse(outputText) as Omit<ImpactoEditorialAgentResult, "model">;
  } catch {
    throw new Error("OpenAI returned non-JSON structured output.");
  }

  const validated = validateImpactoEditorialResult(sourceArticles, parsed);

  return {
    title: validated.title,
    excerpt: validated.excerpt,
    seo_title: validated.seo_title,
    seo_description: validated.seo_description,
    editorial_context: validated.editorial_context,
    editorial_sections: validated.editorial_sections,
    tags: validated.tags,
    countries: validated.countries,
    slug: validated.slug,
    model: payload.model || DEFAULT_MODEL
  };
}
