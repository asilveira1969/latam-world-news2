import type { Article, RegionValue } from "@/lib/types/article";
import { sortByPublishedDesc, truncateExcerpt } from "@/lib/ranking";

const BASE_DATE = new Date("2026-02-14T12:00:00.000Z");

const SOURCE_POOL = [
  { name: "France 24 ES", domain: "https://www.france24.com/es" },
  { name: "DW Espanol", domain: "https://www.dw.com/es" },
  { name: "RT en Espanol", domain: "https://actualidad.rt.com" },
  { name: "BBC Mundo", domain: "https://www.bbc.com/mundo" },
  { name: "El Pais", domain: "https://elpais.com" }
];

type Template = {
  region: RegionValue;
  category: string;
  topic: string;
  tags: string[];
};

const TEMPLATES: Template[] = [
  {
    region: "Mundo",
    category: "Geopolitica",
    topic: "Negociaciones multilaterales",
    tags: ["diplomacia", "onu", "acuerdos"]
  },
  {
    region: "LatAm",
    category: "Geopolitica",
    topic: "Agenda regional latinoamericana",
    tags: ["latam", "integracion", "fronteras"]
  },
  {
    region: "EE.UU.",
    category: "Economia",
    topic: "Indicadores de la economia estadounidense",
    tags: ["inflacion", "empleo", "tasas"]
  },
  {
    region: "Europa",
    category: "Energia",
    topic: "Mercado energetico europeo",
    tags: ["gas", "renovables", "costos"]
  },
  {
    region: "Asia",
    category: "Tecnologia",
    topic: "Cadena de suministro tecnologica",
    tags: ["semiconductores", "ia", "industria"]
  },
  {
    region: "Medio Oriente",
    category: "Energia",
    topic: "Produccion estrategica de crudo",
    tags: ["petroleo", "opec", "logistica"]
  },
  {
    region: "Mundo",
    category: "Economia",
    topic: "Comercio internacional y puertos",
    tags: ["comercio", "exportaciones", "logistica"]
  },
  {
    region: "Europa",
    category: "Tecnologia",
    topic: "Regulacion digital comunitaria",
    tags: ["datos", "plataformas", "regulacion"]
  }
];

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function impactBody(regionFocus: string): string {
  return [
    `El impacto en LATAM de este tema se ve primero en precios, financiamiento y comercio. Cuando un bloque economico ajusta su estrategia, los bancos de la region recalculan riesgo, el credito cambia de costo y las importaciones claves llegan con nuevos tiempos.`,
    `Para gobiernos y empresas latinoamericanas, la lectura util no es solo lo que anuncio la fuente original, sino la velocidad de transmision: energia, alimentos, transporte y tecnologia reaccionan en cadena. Eso exige cobertura explicativa, con datos comparables y escenarios practicos para ciudadanos, pymes y tomadores de decision.`,
    `En ${regionFocus}, el efecto mas inmediato suele sentirse en presupuesto familiar y tipo de cambio. Por eso esta pieza prioriza contexto regional, muestra ganadores y perdedores de corto plazo, y separa ruido politico de tendencias verificables. El objetivo editorial es traducir un hecho internacional en decisiones concretas para America Latina.`
  ].join(" ");
}

const generated: Article[] = [];
let count = 0;

for (const template of TEMPLATES) {
  for (let i = 1; i <= 5; i += 1) {
    const source = SOURCE_POOL[count % SOURCE_POOL.length];
    const publishedAt = new Date(BASE_DATE.getTime() - count * 52 * 60 * 1000).toISOString();
    const title = `${template.topic}: actualizacion clave ${i}`;
    const slugBase = slugify(title);
    const sourcePath = `${source.domain}/noticia/${slugBase}-${count + 1}`;
    generated.push({
      id: `mock-${count + 1}`,
      title,
      slug: `${slugBase}-${count + 1}`,
      excerpt: truncateExcerpt(
        `Resumen internacional: ${template.topic.toLowerCase()} marca una señal relevante para mercados y politica. Esta nota agrega contexto confirmado, cita fuente original y evita republicar contenido completo protegido.`
      ),
      content: null,
      image_url: `https://picsum.photos/seed/latam-${count + 1}/1200/675`,
      source_name: source.name,
      source_url: sourcePath,
      region: template.region,
      category: template.category,
      tags: template.tags,
      published_at: publishedAt,
      created_at: publishedAt,
      is_featured: count === 2,
      is_impact: false,
      views: 1300 - count * 17
    });
    count += 1;
  }
}

const impactArticles: Article[] = Array.from({ length: 5 }).map((_, idx) => {
  const source = SOURCE_POOL[idx % SOURCE_POOL.length];
  const publishedAt = new Date(BASE_DATE.getTime() - (idx + 1) * 35 * 60 * 1000).toISOString();
  const title = `Impacto en LATAM: lectura estrategica ${idx + 1}`;
  const slugBase = slugify(title);
  return {
    id: `impact-${idx + 1}`,
    title,
    slug: `${slugBase}-${idx + 1}`,
    excerpt: truncateExcerpt(
      "Analisis original sobre efectos economicos, regulatorios y sociales en America Latina a partir de un hecho internacional reciente."
    ),
    content: impactBody("America Latina"),
    image_url: `https://picsum.photos/seed/impacto-${idx + 1}/1200/675`,
    source_name: source.name,
    source_url: `${source.domain}/impacto/origen-${idx + 1}`,
    region: "LatAm",
    category: "Impacto",
    tags: ["impacto-latam", "analisis", "contexto"],
    published_at: publishedAt,
    created_at: publishedAt,
    is_featured: false,
    is_impact: true,
    views: 2200 - idx * 130
  };
});

export const mockArticles: Article[] = sortByPublishedDesc([...impactArticles, ...generated]);
