import { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import NewsImage from "@/components/NewsImage";
import { notFound, redirect } from "next/navigation";
import { impactOriginalPath } from "@/lib/manual-editorial";
import { impactArchivePath, parseImpactArchivePage } from "@/lib/impacto-originals";
import StructuredData from "@/components/StructuredData";
import { formatEditorialDate } from "@/lib/dates";
import { getImpactOriginalArchive, getLatamImpactEditoriales } from "@/lib/data/articles-repo";
import { getCountryLabel, normalizeCountry } from "@/lib/hubs";
import { buildCollectionPageJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type ImpactoPageProps = { searchParams?: Promise<{ pagina?: string | string[] }> };

export async function generateMetadata({ searchParams }: ImpactoPageProps): Promise<Metadata> {
  const page = parseImpactArchivePage((await searchParams)?.pagina);
  return buildMetadata({
    title: page === 1 ? "Impacto" : `Archivo Impacto — página ${page}`,
    description:
      "Vertical editorial de LATAM World News con editoriales, opinión, columnas y análisis originales sobre el impacto regional de la agenda internacional.",
    pathname: impactArchivePath(page),
    keywords: [
      "impacto en LATAM", "editorial latinoamerica", "opinion internacional",
      "columnistas latam", "analisis regional"
    ]
  });
}

export default async function ImpactoPage({ searchParams }: ImpactoPageProps) {
  const rawPage = (await searchParams)?.pagina;
  const page = parseImpactArchivePage(rawPage);
  if (rawPage !== undefined && (page === 1 || rawPage !== String(page))) redirect(impactArchivePath(page));
  const { featured, archive, hasNext } = await getImpactOriginalArchive(page);
  if (page > 1 && archive.length === 0) notFound();
  const latamEditoriales = page === 1 ? await getLatamImpactEditoriales() : [];
  const latestEditorial = featured.editorial;
  const opinionArticles = featured.opinion ? [featured.opinion] : [];
  const columnistArticles = featured.columnist ? [featured.columnist] : [];
  const collectionItems = [...Object.values(featured).filter((article) => article !== null), ...archive];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <StructuredData
        data={buildCollectionPageJsonLd({
          title: "Impacto",
          description:
            "Hub editorial con el editorial del día, archivo reciente y análisis de impacto para América Latina.",
          pathname: impactArchivePath(page),
          items: collectionItems
        })}
      />

      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-accent">Impacto</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-brand">Editorial Impacto Latinoam&eacute;rica</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Opinión, editoriales y análisis originales para explicar por qué la agenda internacional importa
          hoy para América Latina.
        </p>
      </header>

      {latestEditorial ? (
        <section aria-label="Editorial destacado" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-accent">
                Editorial destacado
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-brand lg:text-5xl">
                <Link href={`/impacto/editorial/${latestEditorial.slug}`} className="hover:underline">
                  {latestEditorial.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                {formatEditorialDate(latestEditorial.published_at)}
              </p>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">{latestEditorial.excerpt}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {(latestEditorial.tags ?? []).slice(0, 4).map((tag) => (
                  <Link
                    key={tag}
                    href={`/tema/${encodeURIComponent(tag)}`}
                    className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
                  >
                    #{tag}
                  </Link>
                ))}
                {(latestEditorial.countries ?? [])
                  .map((country) => normalizeCountry(country))
                  .filter((country): country is string => Boolean(country))
                  .slice(0, 3)
                  .map((country) => (
                    <Link
                      key={country}
                      href={`/pais/${country}`}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {getCountryLabel(country)}
                    </Link>
                  ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/impacto/editorial/${latestEditorial.slug}`}
                  className="inline-flex rounded-full border border-brand bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-brand/90"
                >
                  Leer editorial completo
                </Link>
                <Link
                  href="#editoriales"
                  className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand"
                >
                  Ver archivo editorial
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
                <NewsImage
                  src={latestEditorial.image_url}
                  alt={latestEditorial.title}
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                  fallbackTone="subtle"
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-stone-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Lo que encontrarás en Impacto
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <li>Editoriales originales con lectura propia para América Latina.</li>
                  <li>Archivo permanente de editoriales, opiniones y columnas.</li>
                  <li>Opinión y columnas para desarrollar una voz editorial del sitio.</li>
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-brand/15 bg-brand-soft/40 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">
                  Contenido original
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <p>Investigación y análisis propios.</p>
                  <p>Revisión y aprobación humana.</p>
                  <p>Autoría y fuentes documentales.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black text-brand">Editoriales</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El editorial original más reciente y el archivo de lecturas estratégicas para
            América Latina.
          </p>
          {latestEditorial ? (
            <Link
              href={`/impacto/editorial/${latestEditorial.slug}`}
              className="mt-4 block text-sm font-semibold text-brand-accent underline"
            >
              {latestEditorial.title}
            </Link>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black text-brand">Opinión</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Lecturas con ángulo regional y criterio editorial para separar señal de ruido en la agenda
            internacional.
          </p>
          <ul className="mt-4 space-y-2">
            {opinionArticles.slice(0, 2).map((article) => (
              <li key={article.id}>
                <Link
                  href={`/impacto/opinion/${article.slug}`}
                  className="text-sm font-semibold text-brand-accent underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black text-brand">Columnistas</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Firmas propias e invitadas para desarrollar miradas más estratégicas sobre la región.
          </p>
          <ul className="mt-4 space-y-2">
            {columnistArticles.slice(0, 2).map((article) => (
              <li key={article.id}>
                <Link
                  href={`/impacto/columnistas/${article.slug}`}
                  className="text-sm font-semibold text-brand-accent underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <AdSlot slotId="impacto-top" className="my-8" />

      <section id="editoriales" aria-label="Archivo de análisis Impacto" className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">
              Archivo histórico
            </p>
            <h2 className="mt-2 text-2xl font-black text-brand">Archivo de análisis Impacto</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {archive.map((article) => (
            <article key={article.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Link href={impactOriginalPath(article)} className="block">
                <div className="relative aspect-video">
                  <NewsImage
                    src={article.image_url}
                    alt={article.title}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                    fallbackTone="subtle"
                  />
                </div>
              </Link>
              <div className="p-4">
                <h3 className="text-lg font-bold text-brand">
                  <Link href={impactOriginalPath(article)} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                  {formatEditorialDate(article.published_at)}
                </p>
                <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
        {latamEditoriales.length > 0 ? (
          <div className="mt-8" data-latam-editoriales>
            <h3 className="text-xl font-bold text-brand">Impacto LATAM</h3>
            <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {latamEditoriales.map((article) => (
                <li key={article.slug} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <article>
                    <h4 className="text-lg font-bold text-brand">
                      <Link href={`/nota/${article.slug}`} className="hover:underline">{article.title}</Link>
                    </h4>
                    <p className="mt-2 text-xs text-slate-400">{formatEditorialDate(article.published_at)}</p>
                    <p className="mt-2 text-sm text-slate-600">{article.editorial_latam_impact}</p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {archive.length === 0 ? <p className="mt-4 text-sm text-slate-600">Las publicaciones anteriores aparecerán aquí al incorporar nuevos originales.</p> : null}
      {page > 1 || hasNext ? (
        <nav aria-label="Paginación del archivo Impacto" className="mt-8 flex flex-wrap items-center gap-4">
          {page > 1 ? <Link href={impactArchivePath(page - 1)} rel="prev" className="font-semibold text-brand-accent underline">Página anterior</Link> : null}
          <span aria-current="page">Página {page}</span>
          {hasNext ? <Link href={impactArchivePath(page + 1)} rel="next" className="font-semibold text-brand-accent underline">Página siguiente</Link> : null}
        </nav>
      ) : null}
    </main>
  );
}
