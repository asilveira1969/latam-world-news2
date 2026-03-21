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

function shortenTitle(title: string, maxLen = 68): string {
  const cleaned = cleanPlainText(titleWithoutTrailingPeriod(title));
  if (cleaned.length <= maxLen) {
    return cleaned;
  }

  const segments = cleaned
    .split(/[:,-]/)
    .map((item) => item.trim())
    .filter(Boolean);
  for (const segment of segments) {
    if (segment.length >= 30 && segment.length <= maxLen) {
      return segment;
    }
  }

  const words = cleaned.split(/\s+/);
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen) {
      break;
    }
    current = candidate;
  }

  return (current || cleaned.slice(0, maxLen)).replace(/[.,;:!?]+$/g, "");
}

function toSentenceList(tags: string[]): string {
  const cleaned = tags
    .map((tag) =>
      cleanPlainText(tag)
        .toLowerCase()
        .replace(/-/g, " ")
        .replace("impacto latam", "impacto en LATAM")
        .replace("energia", "energia")
        .replace("inflacion", "inflacion")
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
  const tags = article.tags.map((tag) => cleanPlainText(tag).toLowerCase());

  if (tags.some((tag) => tag.includes("energia")) || sourceText.includes("energia") || sourceText.includes("gas") || sourceText.includes("petroleo")) {
    return "energia";
  }
  if (tags.some((tag) => tag.includes("inflacion") || tag.includes("precios")) || sourceText.includes("inflacion") || sourceText.includes("tasas")) {
    return "inflacion y economia";
  }
  if (tags.some((tag) => tag.includes("geopolit")) || sourceText.includes("iran") || sourceText.includes("ucrania") || sourceText.includes("guerra")) {
    return "geopolitica internacional";
  }
  if (tags.some((tag) => tag.includes("comercio") || tag.includes("logistica")) || sourceText.includes("comercio") || sourceText.includes("logistica")) {
    return "comercio y logistica";
  }
  if (tags.some((tag) => tag.includes("semiconductor") || tag.includes("tecnologia")) ||
    sourceText.includes("tecnologia") ||
    sourceText.includes("semiconductor") ||
    /\bia\b/.test(sourceText) ||
    sourceText.includes("inteligencia artificial")) {
    return "tecnologia";
  }
  if (sourceText.includes("corteidh") || sourceText.includes("derechos humanos")) {
    return "derechos humanos y justicia internacional";
  }
  if (sourceText.includes("econom") || sourceText.includes("inflacion") || sourceText.includes("tasas")) {
    return "economia internacional";
  }

  return cleanPlainText(article.category || "actualidad internacional").toLowerCase();
}

function articleRegion(article: Article): string {
  return article.region === "LatAm" ? "America Latina" : article.region;
}

function articleRegionForSeo(article: Article): string {
  if (article.region === "LatAm") {
    return "America Latina";
  }
  if (article.region === "EE.UU.") {
    return "Estados Unidos";
  }
  if (article.region === "UY") {
    return "Uruguay";
  }
  if (article.region === "AR") {
    return "Argentina";
  }
  if (article.region === "BR") {
    return "Brasil";
  }
  if (article.region === "MX") {
    return "Mexico";
  }
  if (article.region === "CL") {
    return "Chile";
  }
  return article.region;
}

function articleRegionForTitle(article: Article): string {
  if (article.region === "LatAm") {
    return "America Latina";
  }
  if (article.region === "Medio Oriente") {
    return "Oriente Medio";
  }
  return articleRegionForSeo(article);
}

function sourceName(article: Article): string {
  return cleanPlainText(article.source_name || "la fuente original");
}

function articleLabel(article: Article): string {
  if (article.impact_format === "editorial") {
    return "Editorial Impacto Latinoamerica";
  }
  if (article.impact_format === "opinion") {
    return "Opinion Impacto";
  }
  if (article.impact_format === "columnist") {
    return "Columnistas Impacto";
  }
  if (article.is_impact) {
    return "Analisis e impacto en LATAM";
  }
  return "Claves para LATAM";
}

function buildAutoSeoTitle(article: Article, title: string, topic: string, region: string): string {
  const compactTitle = shortenTitle(title, article.is_impact ? 52 : 56);
  if (article.impact_format === "editorial") {
    return `${title} | Editorial y contexto para LATAM`;
  }
  if (article.impact_format === "opinion") {
    return `${title} | Opinion y lectura para LATAM`;
  }
  if (article.impact_format === "columnist") {
    return `${title} | Columna y contexto para LATAM`;
  }
  if (article.is_impact) {
    return `${compactTitle} | Analisis de ${topic} para LATAM`;
  }
  if (region !== "Mundo") {
    if (region === "America Latina") {
      return `${compactTitle} | Claves regionales`;
    }
    return `${compactTitle} | ${region}: claves para LATAM`;
  }
  return `${compactTitle} | Claves del mundo para LATAM`;
}

function buildAutoSeoDescription(input: {
  article: Article;
  excerpt: string;
  latamAngle: string;
  topic: string;
  region: string;
}) {
  const { article, excerpt, latamAngle, topic, region } = input;
  const noteVariants =
    region === "Mundo"
      ? [
          `Lectura editorial para America Latina con foco en ${topic} y contexto internacional.`,
          `Claves del hecho y de sus implicancias para America Latina desde una cobertura internacional.`,
          `Cobertura internacional con contexto y angulo LATAM para seguir el tema de cerca.`
        ]
      : [
          `Seguimiento de ${region} con foco en implicancias, contexto y lectura regional.`,
          `Cobertura de ${region} con claves para lectores de America Latina y foco en consecuencias practicas.`,
          `Contexto de ${region} para entender efectos sobre comercio, politica o decisiones regionales.`
        ];
  const noteVariantIndex =
    (cleanPlainText(article.slug).length + cleanPlainText(article.category).length) % noteVariants.length;
  const noteTail = noteVariants[noteVariantIndex];

  if (article.impact_format === "editorial") {
    return cleanExcerpt(
      `${excerpt} Editorial de LATAM World News con contexto, lectura regional y escenarios para America Latina en ${topic}.`,
      170
    );
  }
  if (article.impact_format === "opinion") {
    return cleanExcerpt(
      `${excerpt} Pieza de opinion con contexto, interpretacion y angulo latinoamericano sobre ${topic}.`,
      170
    );
  }
  if (article.impact_format === "columnist") {
    return cleanExcerpt(
      `${excerpt} Columna con analisis, criterio editorial y lectura regional para America Latina.`,
      170
    );
  }
  if (article.is_impact) {
    return cleanExcerpt(
      `${excerpt} Analisis de LATAM World News sobre ${topic}. ${latamAngle}`,
      170
    );
  }

  return cleanExcerpt(
    `${excerpt} ${noteTail} ${cleanExcerpt(latamAngle, 110)}`,
    170
  );
}

export function getEditorialBlocks(article: Article): EditorialBlocks {
  const title = titleWithoutTrailingPeriod(article.title);
  const excerpt = cleanExcerpt(article.excerpt, 220) || article.title;
  const body = article.content ? cleanPlainText(article.content) : excerpt;
  const isEditorial = article.impact_format === "editorial";
  const region = articleRegion(article);
  const regionForSeo = articleRegionForSeo(article);
  const regionForTitle = articleRegionForTitle(article);
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
      `Para America Latina, esta noticia importa por su efecto potencial sobre ${themes}. El seguimiento editorial de LATAM World News prioriza consecuencias practicas para gobiernos, empresas, cadenas de suministro y hogares de la region.`,
    260
  );
  const keyPoints = [
    `El hecho principal se encuadra en ${topic} y afecta la lectura regional de ${region}.`,
    `La fuente original citada es ${sourceName(article)}, enlazada para verificacion y contexto adicional.`,
    `La senal mas relevante para LATAM esta en como este cambio puede mover ${themes}.`
  ];
  const conclusion = cleanExcerpt(
    editorialSections?.por_que_importa ||
      (article.is_impact
        ? `${body} Conclusion editorial: el valor de esta pieza esta en traducir una noticia internacional en escenarios concretos para America Latina.`
        : `${excerpt} En LATAM World News esta nota se publica como cobertura curada: explica el hecho, aporta una lectura regional corta y dirige a la fuente original para la lectura completa.`),
    article.is_impact ? 420 : 260
  );
  const faqItems = article.is_impact
    ? [
        {
          question: `Por que ${title} merece seguimiento en America Latina?`,
          answer: latamAngle
        },
        {
          question: "Que deberia vigilar un lector latinoamericano en los proximos dias?",
          answer:
            "Conviene seguir cambios en precios, regulacion, comercio exterior, energia o flujos financieros vinculados al hecho principal, porque suelen ser los canales mas rapidos de transmision regional."
        }
      ]
    : [
        {
          question: `Que paso con ${title}?`,
          answer: summary
        },
        {
          question: "Por que esta noticia importa para LATAM?",
          answer: latamAngle
        }
      ];

  return {
    summary,
    latamAngle,
    keyPoints:
      isEditorial && editorialSections
        ? [
            cleanExcerpt(editorialSections.que_esta_pasando, 180),
            cleanExcerpt(editorialSections.claves_del_dia, 180),
            cleanExcerpt(editorialSections.por_que_importa, 180)
          ]
        : keyPoints,
    conclusion,
    faqItems,
    seoTitle: article.seo_title || buildAutoSeoTitle(article, title, topic, regionForTitle),
    seoDescription:
      article.seo_description ||
      buildAutoSeoDescription({
        article,
        excerpt,
        latamAngle,
        topic,
        region: regionForSeo
      })
  };
}

export function getArticleKicker(article: Article): string {
  return articleLabel(article);
}
