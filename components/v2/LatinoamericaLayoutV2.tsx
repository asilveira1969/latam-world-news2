import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import CountryExplorerV2 from "@/components/v2/CountryExplorerV2";
import PlaceholderSectionV2 from "@/components/v2/PlaceholderSectionV2";
import {
  AGENDA_PLACEHOLDER_CARDS,
  POP_PLACEHOLDER_CARDS,
  SPORTS_PLACEHOLDER_CARDS
} from "@/components/v2/v2-placeholders";
import type { Article } from "@/lib/types/article";

export interface LatinoamericaLayoutV2Props {
  heroLead: Article;
  heroSecondary: Article[];
  latest: Article[];
}

export default function LatinoamericaLayoutV2({
  heroLead,
  heroSecondary,
  latest
}: LatinoamericaLayoutV2Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <section aria-label="Top Stories Latinoamerica" className="space-y-3">
          <div>
            <p className="inline-flex rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Selección regional (beta)
            </p>
            <h1 className="mt-2 text-3xl font-black text-brand">Latinoamerica</h1>
            <p className="mt-1 text-sm text-slate-600">
              Cobertura regional con foco en integración, frontera y gobernanza.
            </p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <section aria-label="Países principales de Latinoamerica" className="space-y-3">
          <div>
            <h2 className="text-2xl font-black text-brand">Países principales</h2>
            <p className="mt-1 text-sm text-slate-600">
              Acceso rápido a coberturas por país dentro de Latinoamerica.
            </p>
          </div>
          <CountryExplorerV2 />
        </section>

        <PlaceholderSectionV2
          title="Agenda"
          subtitle="Próximamente agenda por país"
          cards={AGENDA_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2
          title="Deportes"
          subtitle="Próximamente deportes"
          cards={SPORTS_PLACEHOLDER_CARDS}
        />

        <PlaceholderSectionV2 title="Pop / Entretenimiento" cards={POP_PLACEHOLDER_CARDS} />

        <section aria-label="Últimas Noticias de Latinoamerica">
          <LatestFeed items={latest} />
        </section>
      </div>
    </main>
  );
}
