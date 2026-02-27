import Link from "next/link";
import { COUNTRY_TABS, type CountryTabCode } from "@/components/v2/v2-placeholders";

export interface CountryExplorerV2Props {
  activeCountry?: CountryTabCode;
}

export default function CountryExplorerV2({ activeCountry }: CountryExplorerV2Props) {
  return (
    <section aria-label="Explorar por pais" className="space-y-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Paises">
        <Link
          href="/latinoamerica"
          className={[
            "rounded border px-3 py-1.5 text-sm font-semibold transition",
            activeCountry
              ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              : "border-brand bg-brand text-white"
          ].join(" ")}
        >
          Todo LatAm
        </Link>
        {COUNTRY_TABS.map((tab) => {
          const isActive = tab === activeCountry;
          return (
            <Link
              key={tab}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              href={`/latinoamerica?region=${tab}`}
              className={[
                "rounded border px-3 py-1.5 text-sm font-semibold transition",
                isActive
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              ].join(" ")}
            >
              {tab}
            </Link>
          );
        })}
      </div>
      <p className="text-sm text-slate-600">
        Usa los tabs para filtrar noticias reales por pais dentro de Latinoamerica.
      </p>
    </section>
  );
}
