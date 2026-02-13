"use client";

const ROSES = [
  { left: "8%", top: "15%", delay: "0s", duration: "6s" },
  { left: "85%", top: "20%", delay: "1s", duration: "7s" },
  { left: "15%", top: "70%", delay: "2s", duration: "5.5s" },
  { left: "80%", top: "65%", delay: "0.5s", duration: "6.5s" },
  { left: "5%", top: "45%", delay: "1.5s", duration: "5s" },
  { left: "90%", top: "40%", delay: "2.5s", duration: "7.5s" },
  { left: "50%", top: "10%", delay: "0.8s", duration: "6.2s" },
  { left: "45%", top: "80%", delay: "1.2s", duration: "5.8s" },
];

export default function FloatingRoses() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[3] overflow-hidden" aria-hidden>
      {ROSES.map((rose, i) => (
        <div
          key={i}
          className="absolute text-3xl md:text-4xl opacity-80 animate-rose-float select-none"
          style={{
            left: rose.left,
            top: rose.top,
            animationDelay: rose.delay,
            animationDuration: rose.duration,
          }}
        >
          🌹
        </div>
      ))}
    </div>
  );
}
