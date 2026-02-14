"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";

const VIDEO_LOAD_TIMEOUT_MS = 5000;

type Props = {
  /** Lottie JSON 路径，如 /sheep.json */
  src?: string;
  /** MP4 视频路径，如 /sheep.mp4；优先于 Lottie 使用 */
  videoSrc?: string;
  fallback: string;
  className?: string;
};

export default function LottieCharacter({
  src,
  videoSrc,
  fallback,
  className = "",
}: Props) {
  const [lottieData, setLottieData] = useState<object | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    if (!src) return;
    fetch(src)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setLottieData)
      .catch(() => setLottieData(null));
  }, [src]);

  useEffect(() => {
    if (!videoSrc) return;
    setVideoReady(false);
    setVideoError(false);
    if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = window.setTimeout(() => {
      setVideoError((prev) => (prev ? prev : true));
      loadTimeoutRef.current = null;
    }, VIDEO_LOAD_TIMEOUT_MS);
    return () => {
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    };
  }, [videoSrc]);

  const useVideo = videoSrc && !videoError;
  const showVideo = useVideo && videoReady;
  const showLottie = !showVideo && lottieData;
  const showFallback = !showVideo && !showLottie;

  return (
    <div className={className}>
      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-rose-100/70 to-pink-100/60 shadow-lg shadow-rose-200/40 relative">
        {useVideo && (
          <>
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              className={`w-full h-full object-contain ${videoReady ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
              onCanPlay={() => {
                if (loadTimeoutRef.current) {
                  window.clearTimeout(loadTimeoutRef.current);
                  loadTimeoutRef.current = null;
                }
                setVideoReady(true);
              }}
              onError={() => setVideoError(true)}
              aria-hidden
            />
            <div className="absolute inset-0 rounded-full pointer-events-none bg-rose-200/15" aria-hidden />
          </>
        )}
        {!showVideo && (
          <>
            {showLottie ? (
              <Lottie key={src ?? videoSrc} animationData={lottieData} loop />
            ) : (
              <div
                className="flex items-center justify-center w-full h-full text-5xl md:text-6xl animate-float"
                aria-hidden
              >
                {fallback}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
