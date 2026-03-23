"use client";

import Link from "next/link";
import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import { PRIMARY_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/constants/nav";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap lg:justify-between">
        <Link href="/" className="shrink-0 leading-tight">
          <p className="text-xl font-black tracking-tight text-brand">{SITE_NAME}</p>
          <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 sm:block">
            {SITE_TAGLINE}
          </p>
        </Link>

        <SearchForm
          action="/buscar"
          method="get"
          className="hidden items-center gap-2 md:flex md:flex-1 lg:mx-6 lg:w-[34rem] lg:flex-none"
        >
          <input
            type="search"
            name="q"
            placeholder="Buscar noticias del país..."
            className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-brand"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-full border border-brand bg-brand px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-brand/90"
          >
            Buscar país
          </button>
        </SearchForm>

        <nav className="hidden shrink-0 items-center justify-center gap-2 lg:flex" aria-label="Principal">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold tracking-tight text-slate-800 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="ml-auto rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 lg:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          Menu
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="mb-4 grid grid-cols-2 gap-2">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <SearchForm action="/buscar" method="get" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              placeholder="Buscar noticias del país..."
              className="w-full rounded-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="rounded-full bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Buscar país
            </button>
          </SearchForm>
        </div>
      ) : null}
    </header>
  );
}
