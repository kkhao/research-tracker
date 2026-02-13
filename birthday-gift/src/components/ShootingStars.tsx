"use client";

const STARS = [
  { left: "5%", delay: "0s", duration: "2.5s" },
  { left: "25%", delay: "0.8s", duration: "2.2s" },
  { left: "45%", delay: "0.3s", duration: "2.8s" },
  { left: "65%", delay: "1.2s", duration: "2.4s" },
  { left: "85%", delay: "0.5s", duration: "2.6s" },
  { left: "15%", delay: "1.5s", duration: "2.3s" },
  { left: "75%", delay: "1.8s", duration: "2.7s" },
];

export default function ShootingStars() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2] overflow-hidden"
      aria-hidden
    >
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute h-px w-24 origin-right bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
          style={{
            left: star.left,
            top: "-20px",
            transform: "rotate(-25deg)",
            animation: `shooting-star ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
