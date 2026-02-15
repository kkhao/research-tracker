"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const CANDLE_COUNT = 4;
/** 生日当天 0 点（本地时间）之后才能吹蜡烛 */
const CANDLE_TARGET_DATE = new Date(2026, 1, 18, 0, 0, 0); // 2026-02-18

function getCountdown(target: Date) {
  const now = new Date();
  if (now >= target) return { canBlow: true, days: 0, hours: 0, minutes: 0 };
  const diff = target.getTime() - now.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return { canBlow: false, days, hours, minutes };
}

const MONEY_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  icon: i % 3 === 0 ? "💸" : "🪙",
  left: 8 + ((i * 7) % 84),
  delay: (i % 6) * 0.12,
  duration: 2.2 + (i % 5) * 0.25,
  drift: (i % 2 === 0 ? 1 : -1) * (6 + (i % 4) * 3),
}));

type Props = {
  onBlowStart?: () => void;
};

export default function BirthdayCake({ onBlowStart }: Props) {
  const [blownOut, setBlownOut] = useState(false);
  const [wishGranted, setWishGranted] = useState(false);
  const [finalePulse, setFinalePulse] = useState(false);
  const [birthdaySongPlaying, setBirthdaySongPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(() => getCountdown(CANDLE_TARGET_DATE));
  const birthdayAudioRef = useRef<HTMLAudioElement | null>(null);
  const finalePulseTimerRef = useRef<number | null>(null);
  const finalePulseResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(getCountdown(CANDLE_TARGET_DATE));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (finalePulseTimerRef.current !== null) {
        window.clearTimeout(finalePulseTimerRef.current);
      }
      if (finalePulseResetTimerRef.current !== null) {
        window.clearTimeout(finalePulseResetTimerRef.current);
      }
      birthdayAudioRef.current?.pause();
    };
  }, []);

  const triggerConfetti = useCallback(() => {
    void import("canvas-confetti").then(({ default: confetti }) => {
      const colors = ["#f8b4c4", "#e8a0a8", "#e8c547", "#fff"];
      const origin = { x: 0.5, y: 0.35 };

      // 近景主爆发
      const burst = (count: number, spread: number, scalar = 1) => {
        confetti({
          particleCount: count,
          angle: 90,
          spread,
          origin,
          colors,
          scalar,
          gravity: 0.85 + Math.random() * 0.25,
          drift: (Math.random() - 0.5) * 0.8,
        });
      };

      burst(28, 80, 1.2);
      setTimeout(() => burst(22, 95, 1.05), 120);
      setTimeout(() => burst(18, 112, 0.95), 260);
      setTimeout(() => burst(14, 126, 0.85), 420);

      // 远景余韵飘落
      const duration = 3200;
      const end = Date.now() + duration;
      (function frame() {
        if (Date.now() >= end) return;
        confetti({
          particleCount: 3,
          angle: 65,
          spread: 45,
          origin: { x: 0.42, y: 0.36 },
          colors,
          scalar: 0.75,
          gravity: 1.05,
          drift: 0.35,
        });
        confetti({
          particleCount: 3,
          angle: 115,
          spread: 45,
          origin: { x: 0.58, y: 0.36 },
          colors,
          scalar: 0.75,
          gravity: 1.05,
          drift: -0.35,
        });
        requestAnimationFrame(frame);
      })();

      // 终场双点位金色烟花（左右对称 + 错峰）
      setTimeout(() => {
        confetti({
          particleCount: 30,
          angle: 80,
          spread: 58,
          origin: { x: 0.42, y: 0.42 },
          colors: ["#facc15", "#fde68a", "#fff7c2", "#f59e0b"],
          scalar: 1.05,
          gravity: 0.86,
          ticks: 190,
          drift: 0.08,
        });
      }, 1180);

      setTimeout(() => {
        confetti({
          particleCount: 30,
          angle: 100,
          spread: 58,
          origin: { x: 0.58, y: 0.42 },
          colors: ["#facc15", "#fde68a", "#fff7c2", "#f59e0b"],
          scalar: 1.05,
          gravity: 0.86,
          ticks: 190,
          drift: -0.08,
        });
      }, 1300);
    });
  }, []);

  const handleBlowCandles = useCallback(() => {
    if (blownOut) return;
    onBlowStart?.(); // 先暂停背景音乐
    setBlownOut(true);
    setWishGranted(false);
    setFinalePulse(false);
    setAudioError(null);
    if (finalePulseTimerRef.current !== null) {
      window.clearTimeout(finalePulseTimerRef.current);
    }
    if (finalePulseResetTimerRef.current !== null) {
      window.clearTimeout(finalePulseResetTimerRef.current);
    }
    triggerConfetti();
    window.setTimeout(() => setWishGranted(true), 850);
    finalePulseTimerRef.current = window.setTimeout(() => {
      setFinalePulse(true);
      finalePulseResetTimerRef.current = window.setTimeout(() => setFinalePulse(false), 980);
    }, 1130);
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

  const handleResetCandles = useCallback(() => {
    birthdayAudioRef.current?.pause();
    setBirthdaySongPlaying(false);
    if (finalePulseTimerRef.current !== null) {
      window.clearTimeout(finalePulseTimerRef.current);
      finalePulseTimerRef.current = null;
    }
    if (finalePulseResetTimerRef.current !== null) {
      window.clearTimeout(finalePulseResetTimerRef.current);
      finalePulseResetTimerRef.current = null;
    }
    setBlownOut(false);
    setWishGranted(false);
    setFinalePulse(false);
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* 贺卡式容器 */}
      <div className="relative bg-white/95 rounded-3xl shadow-2xl px-10 py-8 max-w-md border-2 border-rose-200/60 cake-shadow">
        <p className="text-center text-rose-800 text-lg font-medium mb-14">
          送给最爱的老婆 · 2026.02.18
        </p>

        {/* 蛋糕 */}
        <div className="relative flex justify-center">
          {/* 蛋糕体（华丽三层玫瑰蛋糕） */}
          <div className="mt-2 w-56 md:w-64 relative">
            <div
              className={`absolute inset-0 rounded-2xl pointer-events-none cake-warm-glow transition-opacity duration-500 ${
                blownOut ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden
            />
            {wishGranted && (
              <>
                <div className="absolute inset-0 z-25 pointer-events-none wish-star-ring" aria-hidden>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span
                      key={`ring-star-${i}`}
                      className="wish-star"
                      style={{
                        left: `${50 + 34 * Math.cos((Math.PI * 2 * i) / 12)}%`,
                        top: `${48 + 26 * Math.sin((Math.PI * 2 * i) / 12)}%`,
                        animationDelay: `${(i % 6) * 0.06}s`,
                      }}
                    >
                      ✨
                    </span>
                  ))}
                </div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none wish-chest" aria-hidden>
                  <span className="wish-chest-icon">🎁</span>
                  <span className="wish-chest-glow">✨</span>
                </div>
                <div className="absolute inset-0 z-30 pointer-events-none">
                  {MONEY_PARTICLES.map((p) => (
                    <span
                      key={p.id}
                      className={`money-particle ${p.icon === "🪙" ? "money-coin" : "money-bill"}`}
                      style={{
                        left: `${p.left}%`,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        ["--money-drift" as string]: `${p.drift}px`,
                      }}
                      aria-hidden
                    >
                      {p.icon}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="relative flex flex-col items-center">
              <div className="absolute -inset-6 md:-inset-8 cake-luxury-aura pointer-events-none" aria-hidden />
              <div className="absolute left-[-18px] md:left-[-26px] top-[36%] text-xl md:text-2xl drop-shadow-md pointer-events-none" aria-hidden>🌹✨</div>
              <div className="absolute right-[-18px] md:right-[-26px] top-[40%] text-xl md:text-2xl drop-shadow-md pointer-events-none" aria-hidden>✨🌹</div>
              <div className="relative">
                <div
                  className={`absolute -top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none cake-crown ${
                    blownOut ? "cake-crown-afterblow" : ""
                  } ${
                    finalePulse ? "cake-crown-finale" : ""
                  }`}
                  aria-hidden
                >
                  👑
                </div>
                <div
                  className={`absolute -top-10 left-1/2 -translate-x-1/2 z-[12] pointer-events-none cake-birthday-plaque ${
                    blownOut ? "cake-birthday-plaque-afterblow" : ""
                  } ${
                    finalePulse ? "cake-birthday-plaque-finale" : ""
                  }`}
                  aria-hidden
                >
                  <span>永远十八岁</span>
                  <i
                    className={`cake-plaque-shine ${blownOut ? "cake-plaque-shine-afterblow" : ""} ${
                      finalePulse ? "cake-plaque-shine-finale" : ""
                    }`}
                  />
                </div>
                {/* 蜡烛：绑定到顶层蛋糕，避免随中下层变化而错位 */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-4 z-[35]">
                  {Array.from({ length: CANDLE_COUNT }).map((_, i) => (
                    <div key={i} className="relative w-4 h-11">
                      <div
                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-6 rounded-full ${
                          blownOut ? "bg-gray-400" : "bg-amber-100"
                        }`}
                      />
                      <div
                        className={`absolute left-[calc(50%-5px)] -translate-x-1/2 bottom-[22px] w-3 h-5 z-[2] ${
                          blownOut ? "flame-out" : "flame"
                        }`}
                        style={
                          blownOut
                            ? { animationDelay: `${i * 90}ms` }
                            : undefined
                        }
                      >
                        <span className="flame-outer" />
                        <span className="flame-inner" />
                        {!blownOut && (
                          <>
                            <span className="candle-spark candle-spark-a" aria-hidden />
                            <span className="candle-spark candle-spark-b" aria-hidden />
                          </>
                        )}
                      </div>
                      {blownOut && (
                        <>
                          <div
                            className="absolute bottom-[20px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-gray-500/55 flame-smoke"
                            style={{ animationDelay: `${i * 90 + 160}ms`, animationDuration: "0.9s" }}
                            aria-hidden
                          />
                          <div
                            className="absolute bottom-[22px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gray-400/45 flame-smoke"
                            style={{ animationDelay: `${i * 90 + 250}ms`, animationDuration: "1.05s" }}
                            aria-hidden
                          />
                          <div
                            className="absolute bottom-[24px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gray-300/35 flame-smoke"
                            style={{ animationDelay: `${i * 90 + 340}ms`, animationDuration: "1.2s" }}
                            aria-hidden
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="relative w-28 md:w-32 h-8 rounded-t-2xl rounded-b-xl bg-gradient-to-b from-rose-50 via-rose-100 to-pink-200 border border-rose-200/70 shadow-md overflow-hidden">
                  <div className="absolute inset-0 cake-shine" aria-hidden />
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <span key={i} className="text-sm leading-none drop-shadow-sm">🌹</span>
                    ))}
                  </div>
                  <div className="absolute left-0 right-0 bottom-0 h-2 cake-piping-top" aria-hidden />
                  <div className="absolute left-0 right-0 top-0 h-1.5 cake-gold-trim" aria-hidden />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={`top-pearl-${i}`}
                      className="cake-pearl cake-pearl-rich"
                      style={{ left: `${10 + i * 16}%`, top: "22%" }}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>

              <div className="relative -mt-1.5 w-40 md:w-44 h-10 rounded-2xl bg-gradient-to-b from-cake-cream via-pink-200 to-rose-300 border border-rose-200/70 shadow-md overflow-hidden">
                <div className="absolute inset-0 cake-shine" aria-hidden />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={`mid-heart-${i}`} className="text-[11px] leading-none drop-shadow-sm text-pink-600/90">💗</span>
                  ))}
                </div>
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={`mid-star-${i}`} className="cake-star" aria-hidden>✦</span>
                  ))}
                </div>
                <div className="absolute left-0 right-0 bottom-0 h-2.5 cake-piping-mid" aria-hidden />
                {Array.from({ length: 7 }).map((_, i) => (
                  <span
                    key={`mid-pearl-${i}`}
                    className="cake-pearl cake-pearl-rich"
                    style={{ left: `${8 + i * 14}%`, top: "66%" }}
                    aria-hidden
                  />
                ))}
              </div>

              <div className="relative -mt-1.5 w-52 md:w-56 h-12 rounded-2xl bg-gradient-to-b from-cake-pink via-rose-300 to-rose-500 border border-rose-300/70 shadow-lg overflow-hidden">
                <div className="absolute inset-0 cake-shine" aria-hidden />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className="text-sm leading-none drop-shadow-sm">🌹</span>
                  ))}
                </div>
                <div className="absolute left-0 right-0 top-0 h-2 cake-gold-trim" aria-hidden />
                <div className="absolute left-0 right-0 bottom-0 h-3 cake-pearl-chain" aria-hidden />
                <div className="absolute inset-0 cake-gold-dust pointer-events-none" aria-hidden />
              </div>

              <div className="mt-1 w-60 md:w-64 h-2 rounded-full bg-rose-400/50 blur-[1px]" aria-hidden />
            </div>
          </div>
        </div>

        {/* 吹蜡烛：未到生日显示倒计时，到了显示按钮 */}
        {!blownOut && !countdown.canBlow ? (
          <div className="mt-4 text-center">
            <p className="text-rose-700 font-medium">
              小仙女要等到 2月18日 才能吹蜡烛哦～
            </p>
            <p className="mt-2 text-rose-600 font-semibold tabular-nums">
              还剩 {countdown.days} 天 {countdown.hours} 小时 {countdown.minutes} 分
            </p>
          </div>
        ) : !blownOut ? (
          <button
            type="button"
            onClick={handleBlowCandles}
            className="mt-4 w-full py-3 px-4 rounded-2xl bg-rose-400 hover:bg-rose-500 text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            🎂 请小仙女吹蜡烛
          </button>
        ) : (
          <div className="mt-4 text-center">
            <p className="text-rose-700 font-medium">
              {wishGranted
                ? "✨ 小仙女许的愿望都成真啦，好运和惊喜都奔你而来～"
                : birthdaySongPlaying
                  ? "🎵 小仙女生日快乐呀～"
                  : "谢谢小仙女，永远爱你哟～"}
            </p>
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              {!audioError && (
                <button
                  type="button"
                  onClick={toggleBirthdaySong}
                  className="rounded-xl bg-rose-100 px-4 py-2 text-rose-700 font-medium hover:bg-rose-200 transition-colors"
                  aria-label={birthdaySongPlaying ? "暂停生日歌" : "播放生日歌"}
                >
                  {birthdaySongPlaying ? "⏸ 暂停" : "▶ 播放"}
                </button>
              )}
              <button
                type="button"
                onClick={handleResetCandles}
                className="rounded-xl bg-rose-100 px-4 py-2 text-rose-700 font-medium hover:bg-rose-200 transition-colors"
                aria-label="再吹一次蜡烛"
              >
                🕯️ 再吹一次
              </button>
            </div>
            {audioError && (
              <p className="mt-2 text-sm text-amber-600">{audioError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
