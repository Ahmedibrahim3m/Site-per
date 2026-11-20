"use client";

import { useEffect, useRef } from "react";

type Speck = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
  drift: number;
  sway: number;
  twinkle: number;
  glow: boolean;
  sparkle: boolean;
};

/**
 * Subtle gold-dust ambience, on every page of NOIRÉ.
 * Canvas is pointer-transparent, capped at 30 fps and reduced to a still image
 * when the visitor requests reduced motion. No external particle dependencies.
 */
export default function GoldDust() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointer = { x: -500, y: -500, active: false };
    let width = 0;
    let height = 0;
    let specks: Speck[] = [];
    let frame = 0;
    let lastFrame = 0;
    let elapsed = 0;

    const makeSpecks = () => {
      // Fewer particles on small screens, to keep mobile scrolling responsive.
      const count = Math.min(finePointer.matches ? 105 : 46,
        Math.max(finePointer.matches ? 48 : 22, Math.round((width * height) / (finePointer.matches ? 13500 : 22000))));
      specks = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.45 + Math.random() * 1.15,
        alpha: 0.25 + Math.random() * 0.58,
        phase: Math.random() * Math.PI * 2,
        speed: 3 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 5,
        sway: 1.5 + Math.random() * 5,
        twinkle: 0.3 + Math.random() * 0.9,
        glow: Math.random() < 0.22,
        sparkle: Math.random() < 0.07,
      }));
    };

    const draw = (delta: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const speck of specks) {
        if (delta > 0) {
          speck.y -= speck.speed * delta;
          speck.x += speck.drift * delta;
          if (speck.y < -14) speck.y = height + 14;
          if (speck.x < -14) speck.x = width + 14;
          if (speck.x > width + 14) speck.x = -14;
        }

        let x = speck.x + Math.sin(elapsed * 0.00037 + speck.phase) * speck.sway;
        let y = speck.y;

        // Gentle parallax near a mouse, never a cursor-following bright trail.
        if (pointer.active && finePointer.matches && !reducedMotion.matches) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 1 && d2 < 190 * 190) {
            const distance = Math.sqrt(d2);
            const shift = Math.pow(1 - distance / 190, 2) * 10;
            x += (dx / distance) * shift;
            y += (dy / distance) * shift;
          }
        }

        const shimmer = 0.74 + Math.sin(elapsed * 0.001 * speck.twinkle + speck.phase) * 0.26;
        const isLight = document.documentElement.dataset.theme !== "dark";
        ctx.globalAlpha = speck.alpha * shimmer * (isLight ? 0.85 : 1);
        ctx.fillStyle = isLight ? (speck.glow ? "#9d6b31" : "#a6783e") : (speck.glow ? "#f5d9a1" : "#d2a55e");
        ctx.shadowColor = isLight ? "transparent" : (speck.glow ? "rgba(247, 205, 127, 0.82)" : "transparent");
        ctx.shadowBlur = isLight ? 0 : (speck.glow ? 7 : 0);
        ctx.beginPath();
        ctx.arc(x, y, speck.radius, 0, Math.PI * 2);
        ctx.fill();

        if (speck.sparkle) {
          ctx.strokeStyle = document.documentElement.dataset.theme === "dark" ? "#f1d49a" : "#92662e";
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x - 2.8, y);
          ctx.lineTo(x + 2.8, y);
          ctx.moveTo(x, y - 2.8);
          ctx.lineTo(x, y + 2.8);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (document.hidden || reducedMotion.matches || now - lastFrame < 1000 / 30) return;
      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      elapsed += delta * 1000; // keep shimmer and drift in sync
      draw(delta);
    };

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    };

    const start = () => {
      stop();
      if (document.hidden || reducedMotion.matches) {
        elapsed = 0;
        draw(0); // preserve a still, accessible gold-dust texture
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      makeSpecks();
      if (reducedMotion.matches) draw(0);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (!reducedMotion.matches) {
        document.documentElement.style.setProperty("--sunlight-x", `${(event.clientX / Math.max(width,1)-0.5)*32}px`);
        document.documentElement.style.setProperty("--sunlight-y", `${(event.clientY / Math.max(height,1)-0.5)*22}px`);
      }
    };
    const leave = () => { pointer.active = false; };
    const visibility = () => { if (document.hidden) stop(); else start(); };
    const motionChange = () => start();
    const pointerChange = () => { pointer.active = false; resize(); };
    const themeChange = new MutationObserver(() => { if (reducedMotion.matches) draw(0); });
    themeChange.observe(document.documentElement, {attributes: true,attributeFilter:["data-theme"]});

    resize();
    start();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    reducedMotion.addEventListener("change", motionChange);
    finePointer.addEventListener("change", pointerChange);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      reducedMotion.removeEventListener("change", motionChange);
      finePointer.removeEventListener("change", pointerChange);
      themeChange.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="noire-gold-dust" aria-hidden="true" />;
}
