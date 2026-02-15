"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import MusicControl from "@/components/MusicControl";

type MusicContextValue = {
  pause: () => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within LayoutWithMusic");
  return ctx;
}

type LayoutWithMusicProps = { children: ReactNode };

export function LayoutWithMusic({ children }: LayoutWithMusicProps) {
  const pauseRef = useRef<(() => void) | null>(null);
  const playRef = useRef<(() => void) | null>(null);
  const [showMusicOverlay, setShowMusicOverlay] = useState(true);

  return (
    <MusicContext.Provider value={{ pause: () => pauseRef.current?.() }}>
      <MusicControl
        onRegisterPause={(pause) => { pauseRef.current = pause; }}
        onRegisterPlay={(play) => { playRef.current = play; }}
        onPlayStateChange={(playing) => { if (playing) setShowMusicOverlay(false); }}
      />
      {showMusicOverlay && (
        <button
          type="button"
          onClick={() => {
            playRef.current?.();
            setShowMusicOverlay(false);
          }}
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
          aria-label="点击开启背景音乐"
        >
          <span className="rounded-2xl bg-white/95 px-8 py-4 text-lg font-medium text-rose-800 shadow-xl border-2 border-rose-200">
            点击任意处开启背景音乐
          </span>
        </button>
      )}
      {children}
    </MusicContext.Provider>
  );
}
