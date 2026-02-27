import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import PlaceholderSectionV2 from "@/components/v2/PlaceholderSectionV2";
import type { MundoSourceSummary } from "@/lib/data/articles-repo";
import {
  AGENDA_PLACEHOLDER_CARDS,
  POP_PLACEHOLDER_CARDS,
  SPORTS_PLACEHOLDER_CARDS
} from "@/components/v2/v2-placeholders";
import type { Article } from "@/lib/types/article";

export interface MundoLayoutV2Props {
  heroLead: Article;
  heroSecondary: Article[];
  latest: Article[];
  sourceSummaries: MundoSourceSummary[];
}

export default function MundoLayoutV2({
  heroLead,
  heroSecondary,
  latest,
  sourceSummaries
}: MundoLayoutV2Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <section aria-label="Top Stories Mundo" className="space-y-3">
          <div>
            <p className="inline-flex rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Seleccion global (beta)
            </p>
            <h1 className="mt-2 text-3xl font-black text-brand">Mundo</h1>
            <p className="mt-1 text-sm text-slate-600">
              Hub operativo de noticias internacionales por RSS en espanol.
            </p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <section aria-label="Fuentes activas" className="space-y-3">
          <div>
            <h2 className="text-2xl font-black text-brand">Fuentes activas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Monitoreo visual de feeds RSS internacionales en espanol.
            </p>
          </div>
          {sourceSummaries.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {sourceSummaries.map((source) => (
                <section
                  key={source.sourceName}
                  className="rounded border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">{source.sourceName}</h3>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {source.articleCount} recientes
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {source.latest.map((article) => (
                      <li key={article.id} className="text-sm text-slate-700">
                        {article.title}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Aun no hay suficientes articulos RSS curados para mostrar monitoreo por fuente.
            </p>
          )}
        </section>

        <section aria-label="Ultimas Noticias">
          <LatestFeed items={latest} />
        </section>

        <PlaceholderSectionV2
          title="Agenda"
          subtitle="Proximamente agenda global"
          cards={AGENDA_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2
          title="Deportes"
          subtitle="Proximamente deportes"
          cards={SPORTS_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2 title="Pop / Entretenimiento" cards={POP_PLACEHOLDER_CARDS} />
      </div>
    </main>
  );
}
