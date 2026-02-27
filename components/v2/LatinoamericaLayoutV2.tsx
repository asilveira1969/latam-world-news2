import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import CountryExplorerV2 from "@/components/v2/CountryExplorerV2";
import PlaceholderSectionV2 from "@/components/v2/PlaceholderSectionV2";
import {
  AGENDA_PLACEHOLDER_CARDS,
  POP_PLACEHOLDER_CARDS,
  SPORTS_PLACEHOLDER_CARDS,
  type CountryTabCode
} from "@/components/v2/v2-placeholders";
import type { Article } from "@/lib/types/article";

export interface LatinoamericaLayoutV2Props {
  heroLead: Article;
  heroSecondary: Article[];
  latest: Article[];
  activeCountry?: CountryTabCode;
  emptyStateMessage?: string;
}

const COUNTRY_LABELS: Record<CountryTabCode, string> = {
  UY: "Uruguay",
  AR: "Argentina",
  BR: "Brasil",
  MX: "Mexico",
  CL: "Chile"
};

export default function LatinoamericaLayoutV2({
  heroLead,
  heroSecondary,
  latest,
  activeCountry,
  emptyStateMessage
}: LatinoamericaLayoutV2Props) {
  const sectionTitle = activeCountry ? COUNTRY_LABELS[activeCountry] : "Latinoamerica";
  const sectionCopy = activeCountry
    ? `Cobertura reciente de ${COUNTRY_LABELS[activeCountry]} con filtro por pais.`
    : "Cobertura regional con foco en integracion, frontera y gobernanza.";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <section aria-label="Top Stories Latinoamerica" className="space-y-3">
          <div>
            <p className="inline-flex rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Seleccion regional (beta)
            </p>
            <h1 className="mt-2 text-3xl font-black text-brand">{sectionTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">{sectionCopy}</p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <section aria-label="Paises principales de Latinoamerica" className="space-y-3">
          <div>
            <h2 className="text-2xl font-black text-brand">Paises principales</h2>
            <p className="mt-1 text-sm text-slate-600">
              Acceso rapido a coberturas por pais dentro de Latinoamerica.
            </p>
          </div>
          <CountryExplorerV2 activeCountry={activeCountry} />
        </section>

        <section aria-label="Ultimas Noticias de Latinoamerica" className="space-y-3">
          {emptyStateMessage ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {emptyStateMessage}
            </p>
          ) : null}
          <LatestFeed items={latest} />
        </section>

        <PlaceholderSectionV2
          title="Agenda"
          subtitle="Proximamente agenda por pais"
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
