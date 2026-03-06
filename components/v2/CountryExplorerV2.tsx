import Link from "next/link";
import type { CountryTabCode } from "@/components/v2/v2-placeholders";

export interface CountryExplorerV2Props {
  activeCountry?: CountryTabCode;
}

const COUNTRY_LINKS: Array<{
  code: CountryTabCode;
  label: string;
}> = [
  { code: "AR", label: "Argentina" },
  { code: "BR", label: "Brasil" },
  { code: "CL", label: "Chile" },
  { code: "MX", label: "México" },
  { code: "UY", label: "Uruguay" }
];

function CountryFlag({ code }: { code: CountryTabCode }) {
  if (code === "UY") {
    return (
      <svg
        viewBox="0 0 28 20"
        aria-hidden="true"
        className="h-5 w-8 overflow-hidden rounded-sm border border-slate-300 shadow-sm"
      >
        <rect width="28" height="20" fill="#ffffff" />
        <rect y="2.5" width="28" height="2.5" fill="#38bdf8" />
        <rect y="7.5" width="28" height="2.5" fill="#38bdf8" />
        <rect y="12.5" width="28" height="2.5" fill="#38bdf8" />
        <rect y="17.5" width="28" height="2.5" fill="#38bdf8" />
        <circle cx="5" cy="5" r="2.2" fill="#f59e0b" />
      </svg>
    );
  }
  if (code === "AR") {
    return (
      <svg
        viewBox="0 0 28 20"
        aria-hidden="true"
        className="h-5 w-8 overflow-hidden rounded-sm border border-slate-300 shadow-sm"
      >
        <rect width="28" height="20" fill="#74c0fc" />
        <rect y="6.67" width="28" height="6.66" fill="#ffffff" />
        <circle cx="14" cy="10" r="1.9" fill="#f59e0b" />
      </svg>
    );
  }
  if (code === "BR") {
    return (
      <svg
        viewBox="0 0 28 20"
        aria-hidden="true"
        className="h-5 w-8 overflow-hidden rounded-sm border border-slate-300 shadow-sm"
      >
        <rect width="28" height="20" fill="#16a34a" />
        <polygon points="14,3 23,10 14,17 5,10" fill="#facc15" />
        <circle cx="14" cy="10" r="4.2" fill="#1d4ed8" />
      </svg>
    );
  }
  if (code === "CL") {
    return (
      <svg
        viewBox="0 0 28 20"
        aria-hidden="true"
        className="h-5 w-8 overflow-hidden rounded-sm border border-slate-300 shadow-sm"
      >
        <rect width="28" height="20" fill="#dc2626" />
        <rect width="28" height="10" fill="#ffffff" />
        <rect width="10" height="10" fill="#1d4ed8" />
        <polygon
          points="5,2.2 5.9,4.8 8.7,4.8 6.4,6.4 7.3,9 5,7.3 2.7,9 3.6,6.4 1.3,4.8 4.1,4.8"
          fill="#ffffff"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 28 20"
      aria-hidden="true"
      className="h-5 w-8 overflow-hidden rounded-sm border border-slate-300 shadow-sm"
    >
      <rect width="28" height="20" fill="#ffffff" />
      <rect width="7" height="20" fill="#16a34a" />
      <rect x="21" width="7" height="20" fill="#dc2626" />
      <circle cx="14" cy="10" r="4.2" fill="#ffffff" opacity="0.95" />
      <path
        d="M10.2 10c1.3-1.9 5.7-1.9 7 0"
        fill="none"
        stroke="#92400e"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CountryExplorerV2({ activeCountry }: CountryExplorerV2Props) {
  return (
    <section
      aria-label="Acceso rápido por país"
      className="space-y-4 rounded border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          Acceso rápido a coberturas por país dentro de Latinoamérica.
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

      <div className="flex flex-wrap gap-3">
        {COUNTRY_LINKS.map((country) => {
          const isActive = activeCountry === country.code;
          return (
            <Link
              key={country.code}
              href={`/latinoamerica?region=${country.code}`}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-[220px] items-center gap-3 rounded-lg border px-4 py-3 transition",
                isActive
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              ].join(" ")}
            >
              <CountryFlag code={country.code} />
              <p className="min-w-0 text-sm font-bold text-slate-900">{country.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
