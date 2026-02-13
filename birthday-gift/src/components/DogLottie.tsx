"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

export default function DogLottie() {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch("/dog.json")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, []);

  if (animationData) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[2] w-28 h-28 md:w-36 md:h-36 pointer-events-none"
        aria-hidden
      >
        <Lottie animationData={animationData} loop />
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[2] text-6xl md:text-7xl animate-bounce pointer-events-none"
      aria-hidden
    >
      🐕
    </div>
  );
}
