"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/config/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export interface AdSlotProps {
  slotId: string;
  className?: string;
  format?: "auto" | "horizontal" | "rectangle";
}

export default function AdSlot({ slotId, className, format = "auto" }: AdSlotProps) {
  useEffect(() => {
    if (!ADSENSE_ENABLED || !ADSENSE_CLIENT_ID) {
      return;
    }
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore ad push errors in placeholder/local mode.
    }
  }, []);

  return (
    <aside
      className={["rounded border border-slate-300 bg-slate-50 p-3 text-center", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="Advertisements"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        Advertisements
      </p>
      {ADSENSE_ENABLED && ADSENSE_CLIENT_ID ? (
        <ins
          className="adsbygoogle block min-h-[90px] w-full"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex min-h-[90px] items-center justify-center rounded border border-dashed border-slate-300 bg-white text-sm text-slate-600">
          Ad placeholder ({slotId})
        </div>
      )}
    </aside>
  );
}
