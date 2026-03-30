"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function CountryLinks({
  activeCountry,
  onSelectCountry,
  onSelectLatam
}: {
  activeCountry?: CountryTabCode;
  onSelectCountry?: () => void;
  onSelectLatam?: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          Acceso rápido a coberturas por país dentro de Latinoamérica.
        </p>
        <Link
          href="/latinoamerica"
          className={[
            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-150",
            activeCountry
              ? "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-900 hover:bg-slate-200 hover:text-slate-900"
              : "border-brand bg-brand text-white"
          ].join(" ")}
          onClick={onSelectLatam}
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
                "flex min-w-[220px] items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-150",
                isActive
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-200 hover:text-slate-950"
              ].join(" ")}
              onClick={onSelectCountry}
            >
              <CountryFlag code={country.code} />
              <p className="min-w-0 text-sm font-bold text-slate-900">{country.label}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function CountryExplorerV2({ activeCountry }: CountryExplorerV2Props) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(!activeCountry);
  const activeCountryData = useMemo(
    () => COUNTRY_LINKS.find((country) => country.code === activeCountry),
    [activeCountry]
  );

  useEffect(() => {
    setIsMobileExpanded(!activeCountry);
  }, [activeCountry]);

  return (
    <section
      aria-label="Acceso rápido por país"
      className="space-y-4 rounded border border-slate-200 bg-white p-4"
    >
      <div className="lg:hidden">
        {activeCountryData && !isMobileExpanded ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <CountryFlag code={activeCountryData.code} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  País activo
                </p>
                <p className="truncate text-sm font-bold text-slate-900">{activeCountryData.label}</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
              onClick={() => setIsMobileExpanded(true)}
              aria-expanded={isMobileExpanded}
              aria-controls="latam-country-links"
            >
              Cambiar país
            </button>
          </div>
        ) : (
          <div id="latam-country-links" className="space-y-4">
            <CountryLinks
              activeCountry={activeCountry}
              onSelectCountry={() => setIsMobileExpanded(false)}
              onSelectLatam={() => setIsMobileExpanded(true)}
            />
          </div>
        )}
      </div>

      <div className="hidden space-y-4 lg:block">
        <CountryLinks activeCountry={activeCountry} />
      </div>
    </section>
  );
}
