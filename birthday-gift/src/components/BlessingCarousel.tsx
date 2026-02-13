"use client";

import { useState, useEffect } from "react";
import blessings from "@/data/blessings.json";

export default function BlessingCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % blessings.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-8 max-w-xl mx-auto px-4">
      <div className="bg-white/80 rounded-2xl shadow-lg py-4 px-6 border border-rose-200/60 min-h-[80px] flex items-center justify-center">
        <p className="text-rose-900 text-lg text-center">
          「 {blessings[index].text} 」
          {blessings[index].by && (
            <span className="block text-sm text-rose-600 mt-1">
              — {blessings[index].by}
            </span>
          )}
        </p>
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {blessings.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`祝福 ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === index ? "bg-rose-500" : "bg-rose-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
