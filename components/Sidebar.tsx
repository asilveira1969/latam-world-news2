import Link from "next/link";
import type { Article } from "@/lib/types/article";
import AdSlot from "@/components/AdSlot";

export interface SidebarProps {
  trendingTags: string[];
  mostRead: Article[];
}

export default function Sidebar({ trendingTags, mostRead }: SidebarProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-4 space-y-4">
        <AdSlot slotId="sidebar-sticky" format="rectangle" />

        <section className="rounded border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black text-brand">Tendencias</h3>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                href={`/buscar?q=${encodeURIComponent(tag)}`}
                className="rounded bg-brand-soft px-2 py-1 text-xs font-semibold text-brand"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black text-brand">Mas leidas</h3>
          <ul className="space-y-2">
            {mostRead.slice(0, 8).map((article) => (
              <li key={article.id}>
                <Link
                  href={article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-lg font-black text-brand">Newsletter</h3>
          <p className="mb-3 text-sm text-slate-600">
            Recibe un resumen diario de noticias internacionales.
          </p>
          <form action="/api/newsletter" method="post" className="space-y-2">
            <input
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Suscribirme
            </button>
          </form>
        </section>
      </div>
    </aside>
  );
}
