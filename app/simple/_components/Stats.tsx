"use client";

import { useEffect, useRef, useState } from "react";
import { content } from "../content";

// The numbers are a snapshot of the live counters on pxxl.app, read on 2026-11-09.
const NUMBERS: Record<string, number> = content.stats.numbers;
// Odd entries are the {names} from the sentence, even entries the words between them.
const PARTS = content.stats.sentence.split(/\{(\w+)\}/);

const fmt = new Intl.NumberFormat("en-US");

function Num({ value, progress }: { value: number; progress: number }) {
  return <span className="chip">{fmt.format(Math.round(value * progress))}</span>;
}

export function Stats() {
  const ref = useRef<HTMLParagraphElement>(null);
  // Renders final values on the server; counts up once when scrolled into view.
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1400);
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="band">
      <div className="col gutter stats">
        <p ref={ref} className="stats__text">
          {PARTS.map((part, i) =>
            i % 2 ? <Num key={i} value={NUMBERS[part] ?? 0} progress={progress} /> : part,
          )}
        </p>
      </div>
    </section>
  );
}
