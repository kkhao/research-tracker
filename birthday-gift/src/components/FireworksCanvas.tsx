"use client";

import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  trail: number;
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  particles: Particle[];
  exploded: boolean;
  hue: number;
}

const COLORS = ["#f8b4c4", "#e8a0a8", "#e8c547", "#ff9eb5", "#ffb6c1", "#fff0f5"];

function getColor(i: number) {
  return COLORS[i % COLORS.length];
}

export default function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      setSize({ w, h });
      return { w, h };
    };

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    setSize({ w: width, h: height });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rockets: Rocket[] = [];
    let animationId: number;
    let cancelled = false;

    const onResize = () => {
      const s = updateSize();
      width = s.w;
      height = s.h;
    };
    window.addEventListener("resize", onResize);

    function createRocket() {
      const x = Math.random() * width * 0.6 + width * 0.2;
      const hue = Math.floor(Math.random() * 360);
      rockets.push({
        x,
        y: height + 20,
        vy: -8 - Math.random() * 4,
        particles: [],
        exploded: false,
        hue,
      });
    }

    for (let i = 0; i < 3; i++) createRocket();

    function explode(rocket: Rocket) {
      const count = 50 + Math.floor(Math.random() * 30);
      const color = getColor(Math.floor(Math.random() * COLORS.length));
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random();
        const speed = 2 + Math.random() * 4;
        rocket.particles.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1,
          color,
          trail: 2 + Math.random() * 2,
        });
      }
      rocket.exploded = true;
    }

    function loop() {
      if (!ctx || cancelled) return;
      ctx.fillStyle = "rgba(255, 240, 245, 0.05)";
      ctx.fillRect(0, 0, width, height);

      if (Math.random() < 0.06) createRocket();

      rockets = rockets.filter((rocket) => {
        if (!rocket.exploded) {
          rocket.y += rocket.vy;
          rocket.vy += 0.15;
          if (rocket.vy >= 0) explode(rocket);
          return true;
        }

        let allDead = true;
        rocket.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06;
          p.vx *= 0.98;
          p.vy *= 0.98;
          p.life -= 0.015;
          if (p.life > 0) allDead = false;
        });
        rocket.particles = rocket.particles.filter((p) => p.life > 0);

        rocket.particles.forEach((p) => {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.trail, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        return !allDead;
      });

      animationId = requestAnimationFrame(loop);
    }

    loop();
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size.w || undefined}
      height={size.h || undefined}
      className="pointer-events-none fixed inset-0 z-[2]"
      style={{ background: "transparent", width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}
