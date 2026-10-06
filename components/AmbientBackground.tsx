"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  phase: number;
  alpha: number;
  glow: number;
  light: boolean;
};

const PARTICLE_COUNT = 280;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: randomBetween(0.5, 3.5),
    vx: randomBetween(-0.25, 0.25),
    vy: randomBetween(-0.25, 0.25),
    phase: randomBetween(0, Math.PI * 2),
    alpha: Math.random() * 0.5 + 0.3,
    glow: Math.random() * 8 + 4,
    light: Math.random() > 0.45,
  }));
}

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let tick = 0;
    const particles = createParticles(window.innerWidth, window.innerHeight);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * pixelRatio);
      canvas.height = Math.floor(window.innerHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.shadowBlur = 0;
      context.clearRect(0, 0, width, height);
      tick += 1;

      for (const particle of particles) {
        if (!motionQuery.matches) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < -8) particle.x = width + 8;
          if (particle.x > width + 8) particle.x = -8;
          if (particle.y < -8) particle.y = height + 8;
          if (particle.y > height + 8) particle.y = -8;
        }

        const twinkle = (Math.sin(tick * 0.045 + particle.phase) + 1) / 2;
        const alpha = particle.alpha * (0.65 + twinkle * 0.35);
        context.shadowBlur = particle.glow * (0.55 + twinkle * 0.45);
        context.shadowColor = particle.light
          ? "rgba(255, 255, 255, 0.65)"
          : "rgba(167, 243, 208, 0.75)";
        context.beginPath();
        context.fillStyle = particle.light
          ? `rgba(255, 255, 255, ${alpha})`
          : `rgba(167, 243, 208, ${alpha})`;
        context.arc(
          particle.x,
          particle.y,
          particle.radius * (0.8 + twinkle * 0.35),
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      context.shadowBlur = 0;

      if (!motionQuery.matches) {
        frame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
