import Link from "next/link";
import type { HomeData } from "@/lib/types/article";

export interface RegionBlocksProps {
  regions: HomeData["regionBlocks"];
}

export default function RegionBlocks({ regions }: RegionBlocksProps) {
  return (
    <section aria-label="Regiones">
      <h2 className="mb-3 text-2xl font-black text-brand">Regiones</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {regions.map((region) => (
          <div key={region.key} className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{region.title}</h3>
              <Link href={region.href} className="text-sm font-semibold text-brand-accent underline">
                Ver mas
              </Link>
            </div>
            <ul className="space-y-2">
              {region.items.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link href={`/nota/${item.slug}`} className="text-sm font-medium hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
