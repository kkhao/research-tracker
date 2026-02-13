"use client";

import { useState, useCallback, useRef } from "react";
import confetti from "canvas-confetti";

const CANDLE_COUNT = 4;

type Props = {
  onBlowStart?: () => void;
};

export default function BirthdayCake({ onBlowStart }: Props) {
  const [blownOut, setBlownOut] = useState(false);
  const [birthdaySongPlaying, setBirthdaySongPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const birthdayAudioRef = useRef<HTMLAudioElement | null>(null);

  const triggerConfetti = useCallback(() => {
    const colors = ["#f8b4c4", "#e8a0a8", "#e8c547", "#fff"];
    const origin = { x: 0.5, y: 0.35 };

    const burst = (count: number, spread: number, scalar = 1) => {
      confetti({
        particleCount: count,
        angle: 90,
        spread,
        origin,
        colors,
        scalar,
        gravity: 0.8 + Math.random() * 0.4,
        drift: 0.5 + Math.random() * 0.5,
      });
    };

    burst(14, 100, 1);
    setTimeout(() => burst(12, 95, 1.05), 120);
    setTimeout(() => burst(10, 110, 0.95), 240);

    const duration = 2800;
    const end = Date.now() + duration;
    (function frame() {
      if (Date.now() >= end) return;
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0.4, y: 0.35 },
        colors,
        scalar: 0.9,
        gravity: 1,
        drift: 0.3,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 0.6, y: 0.35 },
        colors,
        scalar: 0.9,
        gravity: 1,
        drift: -0.3,
      });
      requestAnimationFrame(frame);
    })();
  }, []);

  const handleBlowCandles = useCallback(() => {
    if (blownOut) return;
    onBlowStart?.(); // 先暂停背景音乐
    setBlownOut(true);
    setAudioError(null);
    triggerConfetti();
    setBirthdaySongPlaying(true);
    const audio = new Audio("/birthday-song.mp3");
    birthdayAudioRef.current = audio;
    audio.volume = 0.6;
    audio.loop = true;
    audio.play().catch((e) => {
      setBirthdaySongPlaying(false);
      setAudioError("无法播放生日歌，请确认 public/birthday-song.mp3 存在且可访问");
      console.warn("Birthday audio failed:", e);
    });
    audio.onended = () => setBirthdaySongPlaying(false);
  }, [blownOut, triggerConfetti, onBlowStart]);

  const toggleBirthdaySong = useCallback(() => {
    const audio = birthdayAudioRef.current;
    if (!audio) return;
    if (birthdaySongPlaying) {
      audio.pause();
      setBirthdaySongPlaying(false);
    } else {
      audio.play().then(() => setBirthdaySongPlaying(true)).catch(() => {});
      audio.onended = () => setBirthdaySongPlaying(false);
    }
  }, [birthdaySongPlaying]);

  return (
    <div className="flex flex-col items-center">
      {/* 贺卡式容器 */}
      <div className="relative bg-white/95 rounded-3xl shadow-2xl px-10 py-8 max-w-md border-2 border-rose-200/60 cake-shadow">
        <p className="text-center text-rose-800 text-lg font-medium mb-4">
          送给最爱的你 · 2026.02.18
        </p>

        {/* 蛋糕 */}
        <div className="relative flex justify-center">
          {/* 蜡烛 */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-4 z-10">
            {Array.from({ length: CANDLE_COUNT }).map((_, i) => (
              <div key={i} className="flex flex-col items-center relative">
                <div
                  className={`w-1 h-8 rounded-full ${
                    blownOut ? "bg-gray-400" : "bg-amber-100"
                  }`}
                />
                <div
                  className={`w-3 h-4 -mt-1 rounded-b-full ${
                    blownOut
                      ? "flame-out bg-gray-500"
                      : "flame bg-amber-400 shadow-lg shadow-amber-400/50"
                  }`}
                  style={
                    blownOut
                      ? { animationDelay: `${i * 90}ms` }
                      : undefined
                  }
                />
                {blownOut && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-400/60 flame-smoke"
                    style={{ animationDelay: `${i * 90 + 200}ms` }}
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>

          {/* 蛋糕体 */}
          <div className="mt-6 w-44">
            <div className="relative h-4 rounded-t-lg bg-gradient-to-b from-cake-cream to-amber-100 shadow-inner overflow-hidden">
              <div className="absolute inset-0 rounded-t-lg cake-shine" aria-hidden />
            </div>
            <div className="h-10 rounded-b-lg bg-gradient-to-b from-cake-pink to-rose-300 shadow-md" />
            <div className="h-3 rounded-b-xl bg-gradient-to-b from-rose-400 to-rose-500" />
          </div>
        </div>

        {/* 吹蜡烛按钮 */}
        {!blownOut ? (
          <button
            type="button"
            onClick={handleBlowCandles}
            className="mt-6 w-full py-3 px-4 rounded-2xl bg-rose-400 hover:bg-rose-500 text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            🎂 帮我吹灭蜡烛
          </button>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-rose-700 font-medium">
              {birthdaySongPlaying ? "🎵 生日快乐～" : "谢谢宝贝，妈妈爱你～"}
            </p>
            {!audioError && (
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={toggleBirthdaySong}
                  className="rounded-xl bg-rose-100 px-4 py-2 text-rose-700 font-medium hover:bg-rose-200 transition-colors"
                  aria-label={birthdaySongPlaying ? "暂停生日歌" : "播放生日歌"}
                >
                  {birthdaySongPlaying ? "⏸ 暂停" : "▶ 播放"}
                </button>
              </div>
            )}
            {audioError && (
              <p className="mt-2 text-sm text-amber-600">{audioError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
