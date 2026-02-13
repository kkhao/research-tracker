"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  onRegisterPause?: (pause: () => void) => void;
  onRegisterPlay?: (play: () => void) => void;
  onPlayStateChange?: (playing: boolean) => void;
};

export default function MusicControl({ onRegisterPause, onRegisterPlay, onPlayStateChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/birthday-bg.mp3");
    audioRef.current = audio;
    audio.volume = 0.4;
    audio.loop = true;
    onRegisterPause?.(() => {
      audio.pause();
      setPlaying(false);
    });
    const doPlay = () => {
      audio.volume = 0.4;
      audio.play().then(() => {
        setError(null); // 播放成功时清除之前的错误提示
        setPlaying(true);
        onPlayStateChange?.(true);
      }).catch((e) => {
        setError("无法播放，请确认 public/birthday-bg.mp3 存在");
        console.warn("Background audio failed:", e);
      });
    };
    onRegisterPlay?.(doPlay);
    // 尝试自动播放（多数浏览器会拦截，需用户先与页面交互）
    doPlay();
    return () => {
      audio.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    if (playing) {
      audio.pause();
      setPlaying(false);
      onPlayStateChange?.(false);
    } else {
      audio.volume = 0.4;
      audio.play().then(() => {
        setError(null);
        setPlaying(true);
        onPlayStateChange?.(true);
      }).catch((e) => {
        setError("无法播放，请确认 public/birthday-bg.mp3 存在");
        console.warn("Background audio failed:", e);
      });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-20 flex flex-col items-end gap-1">
      {error && (
        <span className="text-xs text-amber-600 bg-white/95 px-2 py-1 rounded shadow max-w-[180px]">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        className="w-12 h-12 rounded-full bg-white/90 shadow-lg border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors"
        aria-label={playing ? "暂停音乐" : "播放音乐"}
      >
        {playing ? "⏸" : "▶"}
      </button>
    </div>
  );
}
