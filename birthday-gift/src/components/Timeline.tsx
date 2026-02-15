"use client";

import { useState } from "react";
import events from "@/data/timeline.json";
import type { TimelineEvent } from "@/data/types";

export default function Timeline() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="relative">
      {/* 中线 */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-200 via-rose-300 to-rose-200" />

      <ul className="space-y-0">
        {(events as TimelineEvent[]).map((event) => (
          <li key={event.id} className="relative flex gap-6 pl-2">
            <div className={`relative z-10 flex shrink-0 items-center justify-center rounded-full bg-white border-2 border-rose-300 text-rose-700 font-semibold shadow ${event.yearEnd ? "w-14 h-10 min-w-[3.5rem] text-xs px-1" : "w-10 h-10"}`}>
              {event.yearEnd ? `${event.year}-${event.yearEnd}` : event.year}
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
                  {event.media && event.media.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {event.media.map((item, idx) => {
                        if (!item.url) return null;
                        if (item.type === "video") {
                          return (
                            <div key={idx} className="rounded-lg overflow-hidden bg-rose-100/50 aspect-video">
                              <video
                                src={item.url}
                                controls
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                            </div>
                          );
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxUrl(item.url)}
                            className="rounded-lg overflow-hidden aspect-video bg-rose-100/50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                          >
                            <img
                              src={item.url}
                              alt={item.alt || ""}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        );
                      })}
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

      {/* 图片点击放大 */}
      {lightboxUrl && (
        <button
          type="button"
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          aria-label="关闭"
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
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
