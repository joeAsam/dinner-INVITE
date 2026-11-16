"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PLACES, TOUR, buildArcs, project, toVec, tourAt, type Vec, type View } from "../_lib/globe";

const DOT = "#b5b5b5";
const SPHERE = "#0a0a0a";
const HOME = "#fbf6ee";
const BRAND = "#F26F21";
const QUIET = "#8f8f8f";
const FLAT_ZOOM = 1.25;
const TILT = 14;
const ARC_PERIOD = 3.2;
const ARC_REVEAL = 0.9;
const MAX_CANVAS = 2048;

type Pin = { name: string; home?: boolean; hub?: boolean; color?: string; v: Vec };
type Frame = View & { ctx: CanvasRenderingContext2D; dpr: number; time: number; still: boolean };

function drawDots(dots: Vec[], f: Frame) {
  const { ctx, dpr, size, flat } = f;
  const r = (1.15 + (0.7 * Math.sqrt(f.flatZoom) - 1.15) * flat) * dpr;
  const visible = (p: { x: number; y: number }) => p.x > -r && p.y > -r && p.x < size + r && p.y < size + r;
  ctx.fillStyle = DOT;
  if (flat >= 1) {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (const d of dots) {
      const p = project(d, f);
      if (visible(p)) ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.fill();
  } else {
    for (const d of dots) {
      const p = project(d, f);
      if (p.z <= 0 || !visible(p)) continue;
      ctx.globalAlpha = 0.18 + p.z * 0.62 + (0.55 - (0.18 + p.z * 0.62)) * flat;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawArcs(arcs: ReturnType<typeof buildArcs>, f: Frame) {
  const { ctx, dpr, time } = f;
  ctx.lineWidth = 1.4 * dpr;
  ctx.lineCap = "round";
  for (const arc of arcs) {
    const run = (((time / ARC_PERIOD + arc.offset) % 1) * 1.6);
    const revealed = f.still ? 1 : Math.max(0, Math.min(1, (time - 0.4 - arc.offset * ARC_REVEAL) / ARC_REVEAL));
    const head = arc.steady ? revealed : Math.min(1, run);
    const tail = arc.steady ? 0 : Math.max(0, run - 0.6);
    const last = arc.path.length - 1;
    for (let i = Math.floor(tail * last); i < Math.floor(head * last); i++) {
      const a = project(arc.path[i], f);
      const b = project(arc.path[i + 1], f);
      // Skip the far side of the globe, and segments that wrap around the flat map's edge.
      if (a.z <= -0.05 || b.z <= -0.05) continue;
      if (f.flat > 0.5 && Math.abs(a.x - b.x) > f.size * 0.3) continue;
      const along = (i / last - tail) / Math.max(0.001, head - tail);
      ctx.globalAlpha = arc.steady ? 0.35 : 1;
      ctx.strokeStyle = arc.steady ? HOME : `rgba(255,138,61,${(0.15 + along * 0.75).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPins(pins: Pin[], f: Frame) {
  const { ctx, dpr, time } = f;
  for (const pin of pins) {
    const p = project(pin.v, f);
    if (p.z <= 0.05) continue;
    const major = pin.hub || pin.home;
    // Day stops wear their day's colour; every other city is a quiet grey dot.
    const color = pin.color ?? (major ? BRAND : QUIET);

    // Expanding pulse ring.
    const pulse = (time * 0.8 + pin.name.length * 0.13) % 1;
    ctx.globalAlpha = (1 - pulse) * p.z * (pin.hub ? 0.9 : 0.7);
    ctx.strokeStyle = color;
    ctx.lineWidth = (pin.hub ? 1.5 : 1) * dpr;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (pin.hub ? 8 + pulse * 18 : 3 + pulse * 11) * 0.7 * dpr, 0, Math.PI * 2);
    ctx.stroke();

    // The dot itself.
    ctx.globalAlpha = 0.35 + p.z * 0.65;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (major ? 4.2 : 2.6) * dpr, 0, Math.PI * 2);
    ctx.fill();
    if (pin.hub) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Hero map: a flat dotted world that pans between five spots, tagged Day 1 to Day 5. */
export function Globe({ dots }: { dots: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState(0);

  const scene = useMemo(() => {
    const land: Vec[] = [];
    for (let i = 0; i < dots.length; i += 2) land.push(toVec({ lat: dots[i], lng: dots[i + 1] }));
    return { land, arcs: buildArcs(PLACES) };
  }, [dots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pins: Pin[] = PLACES.map((p) => ({ name: p.name, home: p.home, hub: p.hub, color: p.color, v: toVec(p) }));

    let size = 0;
    let dpr = 1;
    let raf = 0;
    let onScreen = false;
    let shown = { index: -1, arrived: false };
    const started = performance.now();

    const draw = (now: number) => {
      const time = (now - started) / 1000;
      // With reduced motion the map stays a still globe centred on Day 1.
      const tour = still
        ? { index: 0, lng: -TOUR[0].lng, lat: TOUR[0].lat, arrived: true }
        : tourAt(time, TOUR);
      const flat = still ? 0 : 1;
      const frame: Frame = {
        ctx,
        size,
        dpr,
        spin: (tour.lng * Math.PI) / 180,
        tilt: ((TILT * Math.PI) / 180) * (1 - flat),
        flat,
        flatZoom: FLAT_ZOOM,
        focusLat: tour.lat,
        time: still ? 1.2 : time,
        still,
      };

      ctx.clearRect(0, 0, size, size);
      if (flat < 1) {
        ctx.globalAlpha = 1 - flat;
        ctx.fillStyle = SPHERE;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      drawDots(scene.land, frame);
      drawArcs(scene.arcs, frame);
      drawPins(pins, frame);

      if (tour.index !== shown.index || tour.arrived !== shown.arrived) {
        shown = { index: tour.index, arrived: tour.arrived };
        setStop(tour.index);
      }
      const marker = markerRef.current;
      if (marker) {
        const p = project(toVec(TOUR[tour.index]), frame);
        marker.style.opacity = tour.arrived && p.z > 0.2 ? "1" : "0";
        marker.style.transform = `translate(${p.x / dpr}px, ${p.y / dpr}px)`;
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = onScreen && !still ? requestAnimationFrame(loop) : 0;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2, MAX_CANVAS / Math.max(1, canvas.clientWidth));
      size = Math.round(canvas.clientWidth * dpr);
      canvas.width = size;
      canvas.height = size;
      draw(performance.now());
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen && !raf && !still) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    resize();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [scene]);

  const place = TOUR[stop];

  return (
    <div className="globe">
      <canvas ref={canvasRef} className="globe__canvas" />
      <div ref={markerRef} className="globe__marker">
        <div className="globe__tag">
          <span className="globe__flag globe__dot" style={{ background: place.color }} />
          <span className="globe__label">
            <b>Day {place.day}</b> · {place.title}
          </span>
        </div>
      </div>
    </div>
  );
}
