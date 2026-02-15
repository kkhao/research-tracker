"use client";

import { ROSE_POSITIONS } from "@/data/rosePositions";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function FamilySceneFallback() {
  const config = useSiteConfig();
  return (
    <section
      className="relative mx-auto w-full max-w-2xl aspect-[4/3] min-h-[280px] md:min-h-[360px]"
      aria-label={config.ariaLabel}
    >
      {ROSE_POSITIONS.map((pos, i) => (
        <div
          key={i}
          className="absolute w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-2xl -translate-x-1/2 -translate-y-1/2 animate-rose-float select-none opacity-100"
          style={{
            left: pos.left,
            top: pos.top,
            animationDelay: `${(i * 0.1) % 2}s`,
            animationDuration: `${4 + (i % 3)}s`,
          }}
        >
          🌹
        </div>
      ))}
      <div className="absolute left-[10%] top-[44%] -translate-y-1/2 w-16 h-16 md:w-24 md:h-24 z-10 flex items-center justify-center text-3xl md:text-4xl animate-float rounded-full overflow-hidden bg-gradient-to-br from-rose-100/70 to-pink-100/60 shadow-lg shadow-rose-200/40">
        🐑
      </div>
      <div className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-28 md:h-28 z-10 flex items-center justify-center text-4xl md:text-5xl animate-float rounded-full overflow-hidden bg-gradient-to-br from-rose-100/70 to-pink-100/60 shadow-lg shadow-rose-200/40">
        🐕
      </div>
      <div className="absolute right-[10%] top-[44%] -translate-y-1/2 w-20 h-20 md:w-28 md:h-28 z-10 flex items-center justify-center text-4xl md:text-5xl animate-float rounded-full overflow-hidden bg-gradient-to-br from-rose-100/70 to-pink-100/60 shadow-lg shadow-rose-200/40">
        🐕
      </div>
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-0 z-[5] pointer-events-none text-center">
        <h2 className={`font-bold ${config.titleClassName ?? "text-xl md:text-2xl text-rose-800 whitespace-nowrap animate-float"}`}>
          {config.title}
        </h2>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] pointer-events-none text-center">
        <span className="text-rose-700/90 text-sm md:text-base font-medium whitespace-nowrap">
          {config.centerText}
        </span>
      </div>
    </section>
  );
}
