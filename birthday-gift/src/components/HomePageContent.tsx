"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ErrorBoundary";
import BirthdayCake from "@/components/BirthdayCake";
import BlessingCarousel from "@/components/BlessingCarousel";
import MusicControl from "@/components/MusicControl";
import FamilySceneFallback from "@/components/FamilySceneFallback";

const ParticleBackground = dynamic(() => import("@/components/ParticleBackground"), { ssr: false });
const FireworksCanvas = dynamic(() => import("@/components/FireworksCanvas"), { ssr: false });
const ShootingStars = dynamic(() => import("@/components/ShootingStars"), { ssr: false });

const FamilyScene = dynamic(
  () =>
    import("@/components/FamilyScene").catch(() => ({
      default: FamilySceneFallback,
    })),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[280px] text-rose-400">加载中…</div> }
);

export default function HomePageContent() {
  const pauseBackgroundMusicRef = useRef<(() => void) | null>(null);
  const playBackgroundMusicRef = useRef<(() => void) | null>(null);
  const [showMusicOverlay, setShowMusicOverlay] = useState(true);

  return (
    <ErrorBoundary>
      <ParticleBackground />
      <FireworksCanvas />
      <ShootingStars />
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

      <div className="relative z-10 max-w-2xl mx-auto text-center bg-transparent">
        <div className="mb-6 md:mb-8 min-h-[280px] md:min-h-[360px]">
          <FamilyScene />
        </div>

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
    </ErrorBoundary>
  );
}
