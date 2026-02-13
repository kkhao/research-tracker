"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticleBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      setReady(true);
    });
  }, []);

  if (!ready) return <div className="fixed inset-0 -z-10" />;

  return (
    <div className="fixed inset-0 -z-10">
      <Particles
        id="birthday-particles"
        options={{
          fullScreen: { enable: false },
          particles: {
            number: { value: 50 },
            color: { value: ["#f8b4c4", "#e8a0a8", "#e8c547", "#fff5f5"] },
            shape: { type: "circle" },
            opacity: { value: { min: 0.2, max: 0.6 } },
            size: { value: { min: 3, max: 10 } },
            move: {
              enable: true,
              speed: 1.2,
              direction: "none",
              random: true,
              straight: false,
              outModes: { default: "bounce" },
            },
          },
          interactivity: {
            events: {
              onHover: { enable: true, mode: "grab" },
              onClick: { enable: true, mode: "repulse" },
            },
            modes: {
              grab: { distance: 100, links: { opacity: 0.3 } },
              repulse: { distance: 80, duration: 0.3 },
            },
          },
        }}
      />
    </div>
  );
}
