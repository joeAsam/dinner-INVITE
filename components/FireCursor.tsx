"use client";

import { useEffect, useRef, useState } from "react";

type Spark = { x: number; y: number; vx: number; vy: number; life: number; duration: number; size: number };

const NATIVE = "iframe, object, embed, select, video[controls], [data-native-cursor]";

/** Canvas 2D flame cursor. Mounted only for fine, hover-capable pointers without reduced motion. */
export function FireCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const pointerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const pointer = pointerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!pointer || !canvas || !ctx) return;

    let raf = 0;
    let last = 0;
    let emitAcc = 0;
    let running = false;
    let pressed = false;
    let mx = 0;
    let my = 0;
    let w = 0;
    let h = 0;
    const sparks: Spark[] = [];

    const isNative = (el: unknown) => el instanceof Element && !!el.closest(NATIVE);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const drawFlame = (x: number, y: number, t: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.25);
      const halo = ctx.createRadialGradient(0, -5, 0, 0, -5, 23);
      halo.addColorStop(0, "#ffb33b55");
      halo.addColorStop(0.45, "#f5691628");
      halo.addColorStop(1, "#ef440000");
      ctx.fillStyle = halo;
      ctx.fillRect(-24, -30, 48, 48);
      for (let i = 0; i < 3; i++) {
        const sway = Math.sin(t * 0.008 + i * 2) * (4 - i);
        const height = 27 - i * 7 + 4 * Math.sin(t * 0.012 + i);
        const width = 7 - i * 1.8;
        const g = ctx.createLinearGradient(0, 6, 0, -height);
        g.addColorStop(0, i === 2 ? "#fff8d9" : "#ffc568ed");
        g.addColorStop(0.4, i === 2 ? "#ffdb84" : "#ff9226cc");
        g.addColorStop(1, "#ed481200");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(-width * 1.6, 2, -width + sway, -height * 0.4, sway, -height);
        ctx.bezierCurveTo(sway + 2, -height * 0.45, width * 1.5, -height * 0.3, width, 0);
        ctx.quadraticCurveTo(width * 0.4, 5, 0, 5);
        ctx.fill();
      }
      ctx.restore();
    };

    const frame = (t: number) => {
      if (isNative(document.elementFromPoint(mx, my))) return hide();
      const dt = Math.min((t - last) / 1000, 0.04);
      last = t;
      const ox = mx + 9;
      const oy = my + 12;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      emitAcc += dt * (pointer.dataset.intent === "drag" ? 6 : 24);
      while (emitAcc >= 1 && sparks.length < 60) {
        emitAcc--;
        const life = 0.35 + Math.random() * 0.5;
        sparks.push({ x: ox + (Math.random() - 0.5) * 6, y: oy, vx: (Math.random() - 0.5) * 28, vy: -25 - Math.random() * 42, life, duration: life, size: 0.6 + Math.random() * 1.1 });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const k = s.life / s.duration;
        ctx.fillStyle = `rgba(255, ${130 + Math.round(k * 90)}, 65, ${k * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.size * 0.5, s.size, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      drawFlame(ox, oy, t);
      ctx.globalCompositeOperation = "source-over";
      if (running) raf = requestAnimationFrame(frame);
    };

    const intentOf = (el: Element | null) =>
      el?.closest('input, textarea, [contenteditable="true"]')
        ? "text"
        : pressed && el?.closest(".xp-world")
          ? "drag"
          : el?.closest(".xp-hotspot")
            ? "place"
            : el?.closest('button, a, [role="button"], [role="tab"], summary, label')
              ? "action"
              : "default";

    function hide() {
      running = false;
      cancelAnimationFrame(raf);
      setVisible(false);
      pointer!.dataset.pressed = "false";
      document.documentElement.classList.remove("fire-cursor-custom");
      ctx!.clearRect(0, 0, w, h);
      sparks.length = 0;
      emitAcc = 0;
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || document.hidden) return;
      if (isNative(e.target)) return hide();
      mx = e.clientX;
      my = e.clientY;
      pointer.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      pointer.dataset.intent = intentOf(e.target instanceof Element ? e.target : null);
      if (!running) {
        running = true;
        last = performance.now();
        setVisible(true);
        document.documentElement.classList.add("fire-cursor-custom");
        raf = requestAnimationFrame(frame);
      }
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget || isNative(e.relatedTarget)) hide();
    };
    const onDown = (e: PointerEvent) => {
      if (e.button === 2 || isNative(e.target)) return hide();
      pressed = true;
      pointer.dataset.pressed = "true";
      pointer.dataset.intent = intentOf(e.target instanceof Element ? e.target : null);
    };
    const onUp = () => {
      pressed = false;
      pointer.dataset.pressed = "false";
      pointer.dataset.intent = intentOf(document.elementFromPoint(mx, my));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") hide();
    };
    const onVis = () => {
      if (document.hidden) hide();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    document.addEventListener("contextmenu", hide, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("blur", hide);
    window.addEventListener("resize", resize);
    return () => {
      hide();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("contextmenu", hide, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <canvas ref={canvasRef} className="ember-current" data-visible={visible} aria-hidden="true" />
      <div ref={pointerRef} className="ember-pointer" data-visible={visible} aria-hidden="true">
        <span className="ember-orbit" />
        <svg className="ember-shard" viewBox="0 0 28 34" width="28" height="34">
          <defs>
            <linearGradient id="ember-shard-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff2c7" />
              <stop offset=".25" stopColor="#fca861" />
              <stop offset="1" stopColor="#a53516" />
            </linearGradient>
          </defs>
          <path d="M1 1C4 11 0 21 8 27C14 32 24 27 23 20C22 12 10 8 1 1Z" fill="url(#ember-shard-fill)" stroke="#fff3cc" strokeWidth="1.15" />
          <path d="M1 1C9 12 7 20 16 25M8 14L17 15" fill="none" stroke="#db8a50" strokeWidth=".8" />
        </svg>
        <svg className="ember-caret" viewBox="0 0 18 28" width="18" height="28">
          <path d="M4 3H14M9 3V25M4 25H14" fill="none" stroke="#ffe9bc" strokeWidth="1.5" />
        </svg>
      </div>
    </>
  );
}
