"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ParticleBackground from "@/components/ParticleBackground";
import BirthdayCake from "@/components/BirthdayCake";
import BlessingCarousel from "@/components/BlessingCarousel";
import MusicControl from "@/components/MusicControl";

export default function HomePage() {
  const pauseBackgroundMusicRef = useRef<(() => void) | null>(null);
  const playBackgroundMusicRef = useRef<(() => void) | null>(null);
  const [showMusicOverlay, setShowMusicOverlay] = useState(true);

  return (
    <main className="relative min-h-screen py-12 px-4">
      <ParticleBackground />
      <MusicControl
        onRegisterPause={(pause) => { pauseBackgroundMusicRef.current = pause; }}
        onRegisterPlay={(play) => { playBackgroundMusicRef.current = play; }}
        onPlayStateChange={(playing) => { if (playing) setShowMusicOverlay(false); }}
      />
      {showMusicOverlay && (
        <button
          type="button"
          onClick={() => {
            playBackgroundMusicRef.current?.();
            setShowMusicOverlay(false);
          }}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
          aria-label="点击开启背景音乐"
        >
          <span className="rounded-2xl bg-white/95 px-8 py-4 text-lg font-medium text-rose-800 shadow-xl border-2 border-rose-200">
            点击任意处开启背景音乐
          </span>
        </button>
      )}

      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-rose-800 mb-2 animate-float">
          大宝，生日快乐 🎉
        </h1>
        <p className="text-rose-600 mb-8">我和宝宝永远爱你</p>

        <BirthdayCake onBlowStart={() => pauseBackgroundMusicRef.current?.()} />
        <BlessingCarousel />

        <nav className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/timeline"
            className="px-6 py-3 rounded-2xl bg-white/90 border-2 border-rose-200 text-rose-700 font-medium hover:bg-rose-50 hover:border-rose-300 transition-colors shadow"
          >
            进入我们的时光
          </Link>
          <Link
            href="/wishes"
            className="px-6 py-3 rounded-2xl bg-white/90 border-2 border-rose-200 text-rose-700 font-medium hover:bg-rose-50 hover:border-rose-300 transition-colors shadow"
          >
            写下我们的愿望
          </Link>
        </nav>
      </div>
    </main>
  );
}
