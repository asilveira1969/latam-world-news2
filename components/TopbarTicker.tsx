"use client";

export interface TopbarTickerProps {
  headlines: string[];
}

export default function TopbarTicker({ headlines }: TopbarTickerProps) {
  const items = headlines.slice(0, 10);
  return (
    <div className="bg-brand text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
        <span className="rounded bg-brand-accent px-2 py-1 text-xs font-bold uppercase">
          EN VIVO
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track whitespace-nowrap text-sm">
            {items.map((headline, index) => (
              <span key={`${headline}-${index}`} className="mr-8 inline-block">
                {headline}
              </span>
            ))}
            {items.map((headline, index) => (
              <span key={`${headline}-dup-${index}`} className="mr-8 inline-block">
                {headline}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
