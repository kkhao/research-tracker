"use client";

import { useState } from "react";
import events from "@/data/timeline.json";
import type { TimelineEvent } from "@/data/types";

export default function Timeline() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="relative">
      {/* 中线 */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-200 via-rose-300 to-rose-200" />

      <ul className="space-y-0">
        {(events as TimelineEvent[]).map((event) => (
          <li key={event.id} className="relative flex gap-6 pl-2">
            <div className="relative z-10 flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-rose-300 text-rose-700 font-semibold shadow">
              {event.year}
            </div>
            <div className="flex-1 pb-10">
              <button
                type="button"
                onClick={() => setOpenId(openId === event.id ? null : event.id)}
                className="w-full text-left rounded-xl bg-white/90 border border-rose-200 p-4 shadow hover:border-rose-300 transition-colors"
              >
                <div className="font-semibold text-rose-800">{event.title}</div>
                {event.shortDesc && (
                  <div className="text-sm text-rose-600 mt-0.5">
                    {event.shortDesc}
                  </div>
                )}
                <div className="text-rose-500 text-sm mt-2">
                  {openId === event.id ? "点击收起 ▲" : "点击展开 ▼"}
                </div>
              </button>

              {openId === event.id && (
                <div className="mt-3 rounded-xl bg-white/95 border border-rose-200 p-5 shadow-lg">
                  {event.narrative && (
                    <p className="text-rose-800 leading-relaxed">
                      {event.narrative}
                    </p>
                  )}
                  {event.media && event.media.length > 0 && event.media[0].url && (
                    <div className="mt-4">
                      {event.media[0].type === "image" ? (
                        <img
                          src={event.media[0].url}
                          alt={event.media[0].alt || ""}
                          className="rounded-lg max-h-64 object-cover w-full"
                        />
                      ) : (
                        <video
                          src={event.media[0].url}
                          controls
                          className="rounded-lg w-full max-h-64"
                        />
                      )}
                    </div>
                  )}
                  {event.audio?.url && (
                    <div className="mt-4">
                      <AudioPlayer
                        src={event.audio.url}
                        label={event.audio.label}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AudioPlayer({ src, label }: { src: string; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <audio controls src={src} className="max-w-full flex-1 h-9" />
      {label && (
        <span className="text-sm text-rose-600 shrink-0">{label}</span>
      )}
    </div>
  );
}
