import Hero from "@/components/Hero";
import LatestFeed from "@/components/LatestFeed";
import CountryExplorerV2 from "@/components/v2/CountryExplorerV2";
import type { CountryTabCode } from "@/components/v2/v2-placeholders";
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

export default function LatinoamericaLayoutV2({
  heroLead,
  heroSecondary,
  latest,
  activeCountry,
  emptyStateMessage
}: LatinoamericaLayoutV2Props) {
  const sectionTitle = activeCountry ? COUNTRY_LABELS[activeCountry] : "Latinoamérica";
  const sectionCopy = activeCountry
    ? `Cobertura reciente de ${COUNTRY_LABELS[activeCountry]} con filtro por país y lectura regional.`
    : "Cobertura regional con foco en integración, frontera, economía política y movimientos que afectan a LATAM.";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-10">
        <section aria-label="Cobertura destacada de Latinoamérica" className="space-y-3">
          <div>
            <h1 className="text-3xl font-black text-brand">{sectionTitle}</h1>
            <p className="mt-1 text-sm text-slate-600">{sectionCopy}</p>
          </div>
          <Hero lead={heroLead} secondary={heroSecondary.slice(0, 2)} />
        </section>

        <section aria-label="Explorador de países de Latinoamérica" className="space-y-3">
          <div>
            <h2 className="text-2xl font-black text-brand">Países</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cambia entre cobertura regional y países sin bloquear la lectura de los artículos.
            </p>
          </div>
          <CountryExplorerV2 activeCountry={activeCountry} />
        </section>

        <section aria-label="Últimas noticias de Latinoamérica" className="space-y-3">
          {emptyStateMessage ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {emptyStateMessage}
            </p>
          ) : null}
          <LatestFeed items={latest} />
        </section>
      </div>
    </main>
  );
}
