"use client";

import LottieCharacter from "./LottieCharacter";
import { ROSE_POSITIONS } from "@/data/rosePositions";

export default function FamilyScene() {
  return (
    <section
      className="relative mx-auto w-full max-w-2xl aspect-[4/3] min-h-[280px] md:min-h-[360px]"
      aria-label="小羊送 99 朵玫瑰给两只小狗"
    >
      {/* 玫瑰环绕 */}
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

      {/* 小羊（老公）— 左侧居中 */}
      <LottieCharacter
        videoSrc="/sheep.mp4"
        src="/sheep.json"
        fallback="🐑"
        className="absolute left-[6%] top-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 z-10"
      />

      {/* 小狗（妻子）— 心尖位置 */}
      <LottieCharacter
        key="dog1"
        videoSrc="/dog1.mp4"
        src="/dog1.json"
        fallback="🐕"
        className="absolute left-1/2 top-[82%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-28 md:h-28 z-10"
      />

      {/* 小狗（女儿）— 右侧与羊水平对称、等高同尺寸 */}
      <LottieCharacter
        key="dog2"
        videoSrc="/dog2.mp4"
        src="/dog2.json"
        fallback="🐕"
        className="absolute right-[6%] top-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 z-10"
      />

      {/* 心形上方：大宝，生日快乐 + 我和宝宝永远爱你 */}
      <div className="absolute left-1/2 top-[2%] -translate-x-1/2 -translate-y-0 z-[5] pointer-events-none text-center">
        <h2 className="text-xl md:text-2xl font-bold text-rose-800 whitespace-nowrap animate-float">
          大宝，生日快乐 🎉
        </h2>
        <p className="text-rose-600 text-sm md:text-base mt-1 whitespace-nowrap">
          我和宝宝永远爱你
        </p>
      </div>

      {/* 中央文案 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] pointer-events-none text-center">
        <span className="text-rose-700/90 text-sm md:text-base font-medium whitespace-nowrap">
          99 朵玫瑰 · 送给最爱的你
        </span>
      </div>
    </section>
  );
}
