import Link from "next/link";
import type { CountryTabCode } from "@/components/v2/v2-placeholders";

export interface CountryExplorerV2Props {
  activeCountry?: CountryTabCode;
}

const COUNTRY_LINKS: Array<{
  code: CountryTabCode;
  label: string;
}> = [
  { code: "UY", label: "Uruguay" },
  { code: "AR", label: "Argentina" },
  { code: "BR", label: "Brasil" },
  { code: "CL", label: "Chile" },
  { code: "MX", label: "Mexico" }
];

function FlagStripes({ colors }: { colors: string[] }) {
  return (
    <span className="inline-flex h-5 w-8 overflow-hidden rounded-sm border border-slate-300 shadow-sm">
      {colors.map((color, index) => (
        <span key={`${color}-${index}`} className={`h-full flex-1 ${color}`} />
      ))}
    </span>
  );
}

function CountryFlag({ code }: { code: CountryTabCode }) {
  if (code === "UY") {
    return <FlagStripes colors={["bg-white", "bg-sky-500", "bg-white", "bg-sky-500"]} />;
  }
  if (code === "AR") {
    return <FlagStripes colors={["bg-sky-400", "bg-white", "bg-sky-400"]} />;
  }
  if (code === "BR") {
    return <FlagStripes colors={["bg-emerald-600", "bg-yellow-400", "bg-emerald-600"]} />;
  }
  if (code === "CL") {
    return <FlagStripes colors={["bg-blue-700", "bg-white", "bg-red-600"]} />;
  }
  return <FlagStripes colors={["bg-emerald-600", "bg-white", "bg-red-600"]} />;
}

export default function CountryExplorerV2({ activeCountry }: CountryExplorerV2Props) {
  return (
    <section aria-label="Acceso rapido por pais" className="space-y-4 rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          Acceso rapido a coberturas por pais dentro de Latinoamerica.
        </p>
        <Link
          href="/latinoamerica"
          className={[
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
            activeCountry
              ? "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400"
              : "border-brand bg-brand text-white"
          ].join(" ")}
        >
          Todo LatAm
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {COUNTRY_LINKS.map((country) => {
          const isActive = activeCountry === country.code;
          return (
            <Link
              key={country.code}
              href={`/latinoamerica?region=${country.code}`}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex items-center gap-3 rounded-lg border p-3 transition",
                isActive
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              ].join(" ")}
            >
              <CountryFlag code={country.code} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{country.label}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {country.code}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
