import { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import NewsImage from "@/components/NewsImage";
import RelatedCoverage from "@/components/RelatedCoverage";
import StructuredData from "@/components/StructuredData";
import { formatEditorialDate } from "@/lib/dates";
import {
  getColumnistArticles,
  getEditorialArticles,
  getImpactArticles,
  getLatestEditorial,
  getOpinionArticles
} from "@/lib/data/articles-repo";
import { getCountryLabel, normalizeCountry } from "@/lib/hubs";
import { buildCollectionPageJsonLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Impacto",
  description:
    "Vertical editorial de LATAM World News con editorial del día, opinión, columnas y análisis originales sobre el impacto regional de la agenda internacional.",
  pathname: "/impacto",
  keywords: [
    "impacto en LATAM",
    "editorial latinoamerica",
    "opinion internacional",
    "columnistas latam",
    "analisis regional"
  ]
});

export default async function ImpactoPage() {
  const [latestEditorial, editorialArchive, impactArticles, opinionArticles, columnistArticles] = await Promise.all([
    getLatestEditorial(),
    getEditorialArticles(6),
    getImpactArticles(9),
    getOpinionArticles(3),
    getColumnistArticles(3)
  ]);

  const olderEditorials = latestEditorial
    ? editorialArchive.filter((article) => article.slug !== latestEditorial.slug)
    : editorialArchive;

  const collectionItems = [
    ...(latestEditorial ? [latestEditorial] : []),
    ...olderEditorials,
    ...impactArticles.slice(0, 6)
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <StructuredData
        data={buildCollectionPageJsonLd({
          title: "Impacto",
          description:
            "Hub editorial con el editorial del día, archivo reciente y análisis de impacto para América Latina.",
          pathname: "/impacto",
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
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-accent">
                Editorial del día
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

              {latestEditorial.editorial_sections ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-base font-black text-brand">¿Qué está pasando?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {latestEditorial.editorial_sections.que_esta_pasando}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-base font-black text-brand">Claves del día</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {latestEditorial.editorial_sections.claves_del_dia}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-base font-black text-brand">¿Qué significa para América Latina?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {latestEditorial.editorial_sections.que_significa_para_america_latina}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-base font-black text-brand">¿Por qué importa?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {latestEditorial.editorial_sections.por_que_importa}
                    </p>
                  </section>
                </div>
              ) : null}

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
                  <li>Editorial del día con lectura propia para América Latina.</li>
                  <li>Archivo reciente de editoriales y análisis.</li>
                  <li>Opinión y columnas para desarrollar una voz editorial del sitio.</li>
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-brand/15 bg-brand-soft/40 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">
                  Estructura editorial
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <p>1. ¿Qué está pasando?</p>
                  <p>2. Claves del día</p>
                  <p>3. ¿Qué significa para América Latina?</p>
                  <p>4. ¿Por qué importa?</p>
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
            La pieza editorial principal del día y el archivo reciente de lecturas estratégicas para
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

      {olderEditorials.length > 0 ? (
        <section id="editoriales" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">
                Archivo editorial
              </p>
              <h2 className="mt-2 text-2xl font-black text-brand">Editoriales recientes</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {olderEditorials.map((article) => (
              <article key={article.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {formatEditorialDate(article.published_at)}
                </p>
                <h3 className="mt-2 text-lg font-bold text-brand">
                  <Link href={`/impacto/editorial/${article.slug}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
                <Link
                  href={`/impacto/editorial/${article.slug}`}
                  className="mt-4 inline-block text-sm font-semibold text-brand-accent underline"
                >
                  Leer editorial
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {opinionArticles.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">Opinión</p>
              <h2 className="mt-2 text-2xl font-black text-brand">Lecturas de opinión</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {opinionArticles.map((article) => (
              <article key={article.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {formatEditorialDate(article.published_at)}
                </p>
                <h3 className="mt-2 text-lg font-bold text-brand">
                  <Link href={`/impacto/opinion/${article.slug}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {columnistArticles.length > 0 ? (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">
                Columnistas
              </p>
              <h2 className="mt-2 text-2xl font-black text-brand">Firmas y columnas</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {columnistArticles.map((article) => (
              <article key={article.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {formatEditorialDate(article.published_at)}
                </p>
                <h3 className="mt-2 text-lg font-bold text-brand">
                  <Link href={`/impacto/columnistas/${article.slug}`} className="hover:underline">
                    {article.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-accent">
              Análisis complementario
            </p>
            <h2 className="mt-2 text-2xl font-black text-brand">Archivo de análisis Impacto</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {impactArticles.map((article) => (
            <article key={article.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Link href={`/impacto/${article.slug}`} className="block">
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
                  <Link href={`/impacto/${article.slug}`} className="hover:underline">
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
      </section>

      {latestEditorial ? <RelatedCoverage items={impactArticles.slice(0, 4)} title="Lecturas complementarias" /> : null}
    </main>
  );
}