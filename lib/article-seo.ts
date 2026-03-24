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
  bodyParagraphs: string[];
  keyPoints: string[];
  conclusion: string;
  latamWorldNewsSummary: string;
  curatedNews: string;
  faqItems: FaqItem[];
  seoTitle: string;
  seoDescription: string;
};

export type EditorialDuplicationPair = {
  left: string;
  right: string;
  similarity: number;
};

export type EditorialDuplicationReport = {
  hasIssues: boolean;
  repeatedSentences: string[];
  flaggedPairs: EditorialDuplicationPair[];
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

function sentenceCase(input: string): string {
  const trimmed = cleanPlainText(input).replace(/[.!?]+$/g, "").trim();
  if (!trimmed) {
    return "";
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function normalizeForComparison(input: string): string {
  return cleanPlainText(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normalizeForComparison(input)
    .split(" ")
    .filter((token) => token.length > 2);
}

function sentenceFragments(input: string): string[] {
  return cleanPlainText(input)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 30);
}

function wordCount(input: string): number {
  return cleanPlainText(input)
    .split(/\s+/)
    .filter(Boolean).length;
}

function trimToWordRange(input: string, minWords: number, maxWords: number): string {
  const cleaned = cleanPlainText(input);
  if (!cleaned) {
    return "";
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return cleaned;
  }

  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/g, "")}.`;
}

function padToMinWords(base: string, additions: string[], minWords: number, maxWords: number): string {
  let current = trimToWordRange(base, minWords, maxWords);
  if (wordCount(current) >= minWords) {
    return current;
  }

  for (const addition of additions) {
    if (!addition) {
      continue;
    }
    const candidate = trimToWordRange(`${current} ${addition}`.trim(), minWords, maxWords);
    current = candidate;
    if (wordCount(current) >= minWords) {
      break;
    }
  }

  return current;
}

function distinctAdditions(base: string, additions: string[]): string[] {
  const selected: string[] = [];
  const currentBase = cleanPlainText(base);

  for (const addition of additions) {
    const cleaned = cleanPlainText(addition);
    if (!cleaned) {
      continue;
    }
    if (isNearDuplicate(currentBase, cleaned)) {
      continue;
    }
    if (selected.some((item) => isNearDuplicate(item, cleaned))) {
      continue;
    }
    selected.push(cleaned);
  }

  return selected;
}

function overlapSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  return intersection / Math.min(leftTokens.size, rightTokens.size);
}

function directionalOverlap(source: string, target: string): number {
  const sourceTokens = new Set(tokenize(source));
  const targetTokens = new Set(tokenize(target));
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

function isNearDuplicate(left: string, right: string): boolean {
  const leftNormalized = normalizeForComparison(left);
  const rightNormalized = normalizeForComparison(right);
  if (!leftNormalized || !rightNormalized) {
    return false;
  }
  if (leftNormalized === rightNormalized) {
    return true;
  }
  if (
    Math.min(leftNormalized.length, rightNormalized.length) >= 80 &&
    (leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized))
  ) {
    return true;
  }

  return overlapSimilarity(left, right) >= 0.72;
}

function uniqueParagraphs(paragraphs: string[]): string[] {
  const unique: string[] = [];

  for (const paragraph of paragraphs) {
    const cleaned = cleanPlainText(paragraph);
    if (!cleaned) {
      continue;
    }
    if (unique.some((item) => isNearDuplicate(item, cleaned))) {
      continue;
    }
    unique.push(cleaned);
  }

  return unique;
}

function buildSummary(article: Article, excerpt: string, body: string, source: string): string {
  if (article.editorial_sections?.que_esta_pasando) {
    return cleanExcerpt(article.editorial_sections.que_esta_pasando, article.is_impact ? 360 : 240);
  }
  if (article.editorial_context) {
    return cleanExcerpt(article.editorial_context, article.is_impact ? 360 : 240);
  }
  if (article.content) {
    return cleanExcerpt(body, article.is_impact ? 360 : 240);
  }

  return cleanExcerpt(
    `Cobertura curada sobre ${titleWithoutTrailingPeriod(article.title)} con foco en el hecho central, los actores involucrados y el seguimiento abierto desde ${source}.`,
    article.is_impact ? 360 : 240
  );
}

function buildLatamAngle(article: Article, themes: string, region: string, topic: string): string {
  if (article.editorial_sections?.que_significa_para_america_latina) {
    return cleanExcerpt(article.editorial_sections.que_significa_para_america_latina, 260);
  }
  if (article.latam_angle) {
    return cleanExcerpt(article.latam_angle, 260);
  }

  const variants = [
    `Desde una mirada latinoamericana, conviene seguir el impacto potencial sobre ${themes}, porque suele trasladarse a decisiones publicas y privadas en la region.`,
    `Para lectores de America Latina, el foco esta en como este episodio puede mover ${themes} y alterar expectativas de corto plazo.`,
    `La lectura regional pasa por medir si este movimiento en ${topic} cambia precios, comercio o riesgo politico para America Latina.`,
    `Aunque el hecho ocurra en ${region}, la pregunta relevante para LATAM es si abre presion sobre ${themes}.`
  ];
  const index = (article.slug.length + region.length + topic.length) % variants.length;
  return cleanExcerpt(variants[index], 260);
}

function buildKeyPoints(article: Article, topic: string, region: string, themes: string, source: string): string[] {
  if (article.impact_format === "editorial" && article.editorial_sections) {
    return [
      cleanExcerpt(article.editorial_sections.que_esta_pasando, 180),
      cleanExcerpt(article.editorial_sections.claves_del_dia, 180),
      cleanExcerpt(article.editorial_sections.por_que_importa, 180)
    ];
  }

  const options = [
    [
      `Tema a vigilar: ${sentenceCase(topic)} con efecto potencial sobre ${themes}.`,
      `Contexto base: ${region} concentra el hecho y ${source} aporta la referencia original.`,
      "Siguiente senal: cambios en decisiones oficiales, precios o ritmo del conflicto."
    ],
    [
      `Lo central: el desarrollo encaja en ${topic} y puede reordenar expectativas regionales.`,
      `Fuente para ampliar: ${source}, enlazada para contraste y detalle adicional.`,
      `Clave LATAM: observar si se mueve ${themes} en los proximos dias.`
    ],
    [
      `Frente abierto: ${sentenceCase(region)} ofrece una senal util para seguir ${topic}.`,
      `Punto de verificacion: la nota remite a ${source} como referencia principal.`,
      `Impacto probable: cambios sobre ${themes} antes que efectos abstractos.`
    ]
  ];
  const index = (article.slug.length + source.length) % options.length;
  return options[index];
}

function buildBodyParagraphs(article: Article, summary: string, latamAngle: string, conclusionSeed?: string | null): string[] {
  const summaryFallback = cleanPlainText(summary);
  const conclusionFallback = cleanPlainText(conclusionSeed || "");

  if (article.content) {
    const rawParagraphs = cleanPlainText(article.content)
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return uniqueParagraphs(
      rawParagraphs.filter(
        (paragraph) =>
          !isNearDuplicate(paragraph, summaryFallback) && !isNearDuplicate(paragraph, conclusionFallback)
      )
    );
  }

  const editorialSections = article.editorial_sections;
  const fallbackParagraphs = [
    editorialSections?.claves_del_dia ?? "",
    article.editorial_context ?? "",
    article.latam_angle ?? "",
    latamAngle
  ];

  return uniqueParagraphs(
    fallbackParagraphs.filter(
      (paragraph) =>
        paragraph &&
        !isNearDuplicate(paragraph, summaryFallback) &&
        !isNearDuplicate(paragraph, conclusionFallback)
    )
  ).slice(0, 1);
}

function buildConclusion(article: Article, topic: string, themes: string, region: string, source: string): string {
  if (article.editorial_sections?.por_que_importa) {
    return cleanExcerpt(article.editorial_sections.por_que_importa, article.is_impact ? 420 : 240);
  }

  const variants = article.is_impact
    ? [
        `La conclusion editorial apunta a una idea concreta: ${sentenceCase(topic)} deja de ser un asunto externo cuando empieza a mover ${themes} en America Latina.`,
        `El valor de esta pieza esta en traducir ${topic} a decisiones concretas para la region, con foco en ${themes}.`,
        `La lectura final para LATAM no pasa por repetir el titular, sino por seguir como ${topic} puede alterar ${themes}.`
      ]
    : [
        `Para LATAM, el seguimiento util pasa por medir si esta noticia escala, se estabiliza o empieza a modificar ${themes}.`,
        `La utilidad editorial de esta cobertura esta en conectar el hecho de ${region} con efectos posibles sobre ${themes}.`,
        `Como cierre, la referencia a ${source} permite seguir el hecho original mientras la lectura regional se concentra en ${themes}.`
      ];
  const index = (article.slug.length + topic.length + themes.length) % variants.length;
  return cleanExcerpt(variants[index], article.is_impact ? 420 : 240);
}

function buildLatamWorldNewsSummary(article: Article, topic: string, source: string): string {
  const sections = article.editorial_sections;
  const constructedCandidates = [
    `LatamWorldNews resume ${titleWithoutTrailingPeriod(article.title)} como un hecho de ${topic} con actores identificables y una consecuencia inmediata que merece seguimiento.`,
    `Resumen editorial de ${titleWithoutTrailingPeriod(article.title)}: el eje esta en ${topic}, en los protagonistas del caso y en su relevancia informativa inmediata.`,
    `LatamWorldNews sintetiza este caso de ${topic} destacando el hecho central, los actores involucrados y la razon por la que sigue abierto.`
  ];
  const firstConstructed = constructedCandidates[(article.slug.length + topic.length) % constructedCandidates.length];
  const additions = distinctAdditions(firstConstructed, [
    sections?.por_que_importa ?? "",
    sections?.que_esta_pasando ?? "",
    article.editorial_context ?? "",
    `La referencia principal proviene de ${source}.`,
    `El eje del caso se ubica en ${topic}.`
  ]);

  return padToMinWords(trimToWordRange(firstConstructed, 20, 40), additions, 20, 40);
}

function buildCuratedNews(article: Article, summary: string, topic: string, region: string, themes: string, source: string): string {
  const sections = article.editorial_sections;
  const candidates = [
    [sections?.claves_del_dia ?? "", sections?.que_significa_para_america_latina ?? "", sections?.por_que_importa ?? ""],
    [
      article.editorial_context ?? "",
      article.latam_angle ?? "",
      `La fuente original es ${source}, y el seguimiento editorial se centra en como el desarrollo de ${topic} puede mover ${themes} desde ${region}.`
    ],
    [
      `La cobertura curada ordena el hecho desde tres frentes: contexto, actores y seguimiento abierto.`,
      `El desarrollo principal se conecta con ${topic} y deja una senal util para lectores que siguen ${region}.`,
      `La lectura editorial apunta a vigilar si esto altera ${themes} y obliga a nuevas decisiones en los proximos dias.`
    ]
  ];

  for (const option of candidates) {
    const draft = trimToWordRange(option.filter(Boolean).join(" "), 60, 100);
    const padded = padToMinWords(draft, [
      `La referencia original en ${source} permite ampliar el contexto.`,
      `El foco regional esta en como puede cambiar ${themes}.`
    ], 60, 100);
    if (wordCount(padded) >= 60 && directionalOverlap(summary, padded) <= 0.3 && !isNearDuplicate(summary, padded)) {
      return padded;
    }
  }

  const fallbackBase = `La noticia curada organiza el caso desde un angulo breve: identifica a los actores principales, ordena el contexto mas util y deja planteado el seguimiento inmediato. La referencia original en ${source} ayuda a ampliar detalles, mientras la lectura editorial concentra la atencion en ${topic}, en su evolucion dentro de ${region} y en cualquier efecto sobre ${themes}.`;
  const fallback = trimToWordRange(fallbackBase, 60, 100);

  return padToMinWords(
    fallback,
    distinctAdditions(fallback, [
      `El seguimiento posterior conviene hacerlo sobre decisiones oficiales, cambios de contexto y nuevas reacciones de los actores involucrados.`,
      `Para LatamWorldNews, la utilidad de esta pieza esta en separar el dato principal del ruido y dejar una lectura clara para el lector.`,
      `El foco editorial tambien queda puesto en si el desarrollo altera ${themes}.`
    ]),
    60,
    100
  );
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
  const region = articleRegion(article);
  const regionForSeo = articleRegionForSeo(article);
  const regionForTitle = articleRegionForTitle(article);
  const topic = articleTopic(article);
  const themes = toSentenceList(article.tags);
  const source = sourceName(article);
  const summary = buildSummary(article, excerpt, body, source);
  const latamAngle = buildLatamAngle(article, themes, region, topic);
  const conclusion = buildConclusion(article, topic, themes, region, source);
  const bodyParagraphs = buildBodyParagraphs(article, summary, latamAngle, conclusion);
  const latamWorldNewsSummary = buildLatamWorldNewsSummary(article, topic, source);
  const curatedNews = buildCuratedNews(article, latamWorldNewsSummary, topic, region, themes, source);
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
    bodyParagraphs,
    keyPoints: buildKeyPoints(article, topic, region, themes, source),
    conclusion,
    latamWorldNewsSummary,
    curatedNews,
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

export function auditEditorialDuplication(
  article: Article,
  editorialInput?: EditorialBlocks
): EditorialDuplicationReport {
  const editorial = editorialInput ?? getEditorialBlocks(article);
  const primarySummary = article.is_impact ? editorial.summary : editorial.latamWorldNewsSummary;
  const primaryCurated = article.is_impact ? editorial.conclusion : editorial.curatedNews;
  const bodyFirstParagraph = article.is_impact ? editorial.bodyParagraphs[0] ?? "" : "";
  const repeatedSentences = Array.from(
    new Set(
      [article.excerpt, primarySummary, bodyFirstParagraph, primaryCurated]
        .flatMap((section) => sentenceFragments(section))
        .filter((sentence, index, all) =>
          all.some((candidate, candidateIndex) => candidateIndex !== index && isNearDuplicate(sentence, candidate))
        )
    )
  );

  const pairs: EditorialDuplicationPair[] = [];
  const sections = [
    { key: "excerpt", value: article.excerpt },
    { key: "summary", value: primarySummary },
    { key: "body", value: bodyFirstParagraph },
    { key: "conclusion", value: primaryCurated }
  ].filter((section) => cleanPlainText(section.value).length > 0);

  for (let index = 0; index < sections.length; index += 1) {
    for (let inner = index + 1; inner < sections.length; inner += 1) {
      const similarity = overlapSimilarity(sections[index].value, sections[inner].value);
      if (similarity >= 0.72 || isNearDuplicate(sections[index].value, sections[inner].value)) {
        pairs.push({
          left: sections[index].key,
          right: sections[inner].key,
          similarity: Number(similarity.toFixed(2))
        });
      }
    }
  }

  if (!article.is_impact) {
    const summaryOverlap = directionalOverlap(editorial.latamWorldNewsSummary, editorial.curatedNews);
    if (summaryOverlap > 0.3) {
      pairs.push({
        left: "summary",
        right: "conclusion",
        similarity: Number(summaryOverlap.toFixed(2))
      });
    }
  }

  return {
    hasIssues: repeatedSentences.length > 0 || pairs.length > 0,
    repeatedSentences,
    flaggedPairs: pairs
  };
}

export function getArticleKicker(article: Article): string {
  return articleLabel(article);
}
