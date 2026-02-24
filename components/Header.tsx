"use client";

import Link from "next/link";
import { useState } from "react";
import { PRIMARY_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/constants/nav";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="shrink-0">
          <p className="text-lg font-black text-brand">{SITE_NAME}</p>
          <p className="text-xs text-slate-600">{SITE_TAGLINE}</p>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-3 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-300 bg-slate-50 px-5 py-2 text-lg font-black text-slate-700 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/buscar" method="get" className="hidden items-center gap-2 md:flex">
          <input
            type="search"
            name="q"
            placeholder="Buscar noticias..."
            className="w-56 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            Buscar
          </button>
        </form>

        <button
          type="button"
          className="ml-auto rounded border border-slate-300 px-3 py-2 text-sm font-semibold lg:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          Menu
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="mb-4 grid grid-cols-2 gap-3">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form action="/buscar" method="get" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              placeholder="Buscar noticias..."
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Ir
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
