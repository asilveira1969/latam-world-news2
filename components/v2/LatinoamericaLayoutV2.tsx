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
  MX: "México",
  CL: "Chile"
};

function latamMetaLabel(article: Article): string {
  if (article.region in COUNTRY_LABELS) {
    return COUNTRY_LABELS[article.region as CountryTabCode];
  }
  if (article.region === "LatAm") {
    return "Latinoamérica";
  }
  return article.region;
}

export default function LatinoamericaLayoutV2({
  heroLead,
  heroSecondary,
  latest,
  activeCountry,
  emptyStateMessage
}: LatinoamericaLayoutV2Props) {
  const sectionTitle = activeCountry ? COUNTRY_LABELS[activeCountry] : "Latinoamérica";
  const sectionCopy = activeCountry
    ? `Cobertura reciente de ${COUNTRY_LABELS[activeCountry]} con filtro por país.`
    : "Cobertura regional con foco en integración, frontera y gobernanza.";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <div className="sticky top-[72px] z-20 -mx-1 bg-brand-soft/95 px-1 py-2 backdrop-blur">
          <CountryExplorerV2 activeCountry={activeCountry} />
        </div>

        <section aria-label="Top Stories Latinoamérica" className="space-y-3">
          <div>
            <h1 className="text-3xl font-black text-brand">{sectionTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">{sectionCopy}</p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} formatMeta={latamMetaLabel} />
        </section>

        <section aria-label="Últimas Noticias de Latinoamérica" className="space-y-3">
          {emptyStateMessage ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {emptyStateMessage}
            </p>
          ) : null}
          <LatestFeed items={latest} formatMeta={latamMetaLabel} />
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
      </div>
    </main>
  );
}
