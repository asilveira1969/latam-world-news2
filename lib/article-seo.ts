import { cleanExcerpt, cleanPlainText } from "@/lib/text/clean";
import type { Article } from "@/lib/types/article";

const GENERIC_TAGS = new Set([
  "rss",
  "mundo rss",
  "internacional",
  "newsdata",
  "mundo",
  "latam",
  "rss rt",
  "rss france24 es",
  "rss bbc mundo",
  "rss dw es"
]);

export type FaqItem = {
  question: string;
  answer: string;
};

export type EditorialBlocks = {
  summary: string;
  latamAngle: string;
  keyPoints: string[];
  conclusion: string;
  faqItems: FaqItem[];
  seoTitle: string;
  seoDescription: string;
};

function titleWithoutTrailingPeriod(title: string): string {
  return title.trim().replace(/[.!?]+$/g, "");
}

function toSentenceList(tags: string[]): string {
  const cleaned = tags
    .map((tag) =>
      cleanPlainText(tag)
        .toLowerCase()
        .replace(/-/g, " ")
        .replace("impacto latam", "impacto en LATAM")
        .replace("energia", "energ\u00eda")
        .replace("inflacion", "inflaci\u00f3n")
    )
    .filter(Boolean)
    .filter((tag) => !GENERIC_TAGS.has(tag))
    .slice(0, 3);

  if (cleaned.length === 0) {
    return "riesgo, comercio y decisiones regionales";
  }

  return cleaned.join(", ");
}

function articleTopic(article: Article): string {
  const sourceText = cleanPlainText(`${article.title} ${article.excerpt}`).toLowerCase();
  if (sourceText.includes("corteidh") || sourceText.includes("derechos humanos")) {
    return "derechos humanos y justicia internacional";
  }
  if (sourceText.includes("iran") || sourceText.includes("ucrania") || sourceText.includes("guerra")) {
    return "geopolitica internacional";
  }
  if (sourceText.includes("energia") || sourceText.includes("gas") || sourceText.includes("petroleo")) {
    return "energia global";
  }
  if (sourceText.includes("tecnologia") || sourceText.includes("semiconductor") || sourceText.includes("ia")) {
    return "tecnologia";
  }
  if (sourceText.includes("econom") || sourceText.includes("inflacion") || sourceText.includes("tasas")) {
    return "economia internacional";
  }

  return cleanPlainText(article.category || "actualidad internacional").toLowerCase();
}

function articleRegion(article: Article): string {
  return article.region === "LatAm" ? "Am\u00e9rica Latina" : article.region;
}

function sourceName(article: Article): string {
  return cleanPlainText(article.source_name || "la fuente original");
}

export function getEditorialBlocks(article: Article): EditorialBlocks {
  const title = titleWithoutTrailingPeriod(article.title);
  const excerpt = cleanExcerpt(article.excerpt, 220) || article.title;
  const body = article.content ? cleanPlainText(article.content) : excerpt;
  const isEditorial = article.impact_format === "editorial";
  const region = articleRegion(article);
  const topic = articleTopic(article);
  const themes = toSentenceList(article.tags);
  const editorialSections = article.editorial_sections;
  const summary = cleanExcerpt(
    editorialSections?.que_esta_pasando ||
      (article.content
        ? body
        : `${excerpt} Esta cobertura curada resume el hecho principal, identifica los actores involucrados y conserva el enlace directo a ${sourceName(article)} para ampliar la lectura.`),
    article.is_impact ? 360 : 280
  );
  const latamAngle = cleanExcerpt(
    editorialSections?.que_significa_para_america_latina ||
      article.latam_angle ||
      `Para Am\u00e9rica Latina, esta noticia importa por su efecto potencial sobre ${themes}. El seguimiento editorial de LATAM World News prioriza consecuencias pr\u00e1cticas para gobiernos, empresas, cadenas de suministro y hogares de la regi\u00f3n.`,
    260
  );
  const keyPoints = [
    `El hecho principal se encuadra en ${topic} y afecta la lectura regional de ${region}.`,
    `La fuente original citada es ${sourceName(article)}, enlazada para verificaci\u00f3n y contexto adicional.`,
    `La se\u00f1al m\u00e1s relevante para LATAM est\u00e1 en c\u00f3mo este cambio puede mover ${themes}.`
  ];
  const conclusion = cleanExcerpt(
    editorialSections?.por_que_importa ||
      (article.is_impact
      ? `${body} Conclusi\u00f3n editorial: el valor de esta pieza est\u00e1 en traducir una noticia internacional en escenarios concretos para Am\u00e9rica Latina.`
      : `${excerpt} En LATAM World News esta nota se publica como cobertura curada: explica el hecho, aporta una lectura regional corta y dirige a la fuente original para la lectura completa.`),
    article.is_impact ? 420 : 260
  );
  const faqItems = article.is_impact
    ? [
        {
          question: `\u00bfPor qu\u00e9 ${title} merece seguimiento en Am\u00e9rica Latina?`,
          answer: latamAngle
        },
        {
          question: "\u00bfQu\u00e9 deber\u00eda vigilar un lector latinoamericano en los pr\u00f3ximos d\u00edas?",
          answer:
            "Conviene seguir cambios en precios, regulaci\u00f3n, comercio exterior, energ\u00eda o flujos financieros vinculados al hecho principal, porque suelen ser los canales m\u00e1s r\u00e1pidos de transmisi\u00f3n regional."
        }
      ]
    : [
        {
          question: `\u00bfQu\u00e9 pas\u00f3 con ${title}?`,
          answer: summary
        },
        {
          question: "\u00bfPor qu\u00e9 esta noticia importa para LATAM?",
          answer: latamAngle
        }
      ];

  return {
    summary,
    latamAngle,
    keyPoints: isEditorial && editorialSections
      ? [
          cleanExcerpt(editorialSections.que_esta_pasando, 180),
          cleanExcerpt(editorialSections.claves_del_dia, 180),
          cleanExcerpt(editorialSections.por_que_importa, 180)
        ]
      : keyPoints,
    conclusion,
    faqItems,
    seoTitle:
      article.seo_title ||
      `${title}${isEditorial ? " | Editorial Impacto Latinoam\u00e9rica" : article.is_impact ? " | An\u00e1lisis e impacto en LATAM" : " | Claves para LATAM"}`,
    seoDescription:
      article.seo_description ||
      cleanExcerpt(`${excerpt} ${latamAngle}`, 170) ||
      excerpt
  };
}
