"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { content } from "../content";

type Visual = {
  flag: [string, string, string];
  flagDir: "v" | "h";
  sky: [string, string];
  ground: string;
  seed: number;
};

// Flag stripes and skyline colours, one per location in the content file, in the same order.
const VISUALS: Visual[] = [
  { flag: ["#1b8a4b", "#ffffff", "#1b8a4b"], flagDir: "v", sky: ["#3d6f8f", "#a9c3c9"], ground: "#2f4a3c", seed: 3 },
  { flag: ["#111111", "#d21f26", "#f4c20d"], flagDir: "h", sky: ["#5d7f8c", "#b9c4b4"], ground: "#3b3a2c", seed: 11 },
  { flag: ["#1f3f9a", "#ffffff", "#d21f26"], flagDir: "v", sky: ["#1f4f9c", "#6f9bd6"], ground: "#2c3d2a", seed: 19 },
  { flag: ["#ffffff", "#1f4fa3", "#ffffff"], flagDir: "h", sky: ["#7c93a8", "#c9d2d6"], ground: "#34404a", seed: 27 },
  { flag: ["#b22234", "#ffffff", "#3c3b6e"], flagDir: "h", sky: ["#8fa6b8", "#e2c79a"], ground: "#2e2a26", seed: 35 },
];

type Location = Visual & { region: string; city: string; desc: string; key: number };

// Extra locations beyond the five scenes reuse them from the start.
const LOCATIONS: Location[] = content.datacenters.locations.map((text, i) => ({
  ...VISUALS[i % VISUALS.length],
  ...text,
  key: i,
}));

/** Generated placeholder skyline. The original uses a photograph of each city. */
function Scene({ loc }: { loc: Location }) {
  let s = loc.seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const blocks = Array.from({ length: 22 }, (_, i) => {
    const w = 26 + rand() * 46;
    const h = 60 + rand() * 250;
    return { x: i * 38 - 20 + rand() * 14, w, h, shade: 0.25 + rand() * 0.35 };
  });

  return (
    <svg className="dc__scene" viewBox="0 0 800 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${loc.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={loc.sky[0]} />
          <stop offset="1" stopColor={loc.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="800" height="700" fill={`url(#sky-${loc.key})`} />
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={560 - b.h} width={b.w} height={b.h} fill={`rgba(20,24,30,${b.shade})`} />
      ))}
      <rect y="540" width="800" height="160" fill={loc.ground} />
    </svg>
  );
}

function Flag({ loc }: { loc: Location }) {
  const dir = loc.flagDir === "v" ? "to right" : "to bottom";
  const [a, b, c] = loc.flag;
  return (
    <span
      className="dc__flag"
      style={{ background: `linear-gradient(${dir}, ${a} 33%, ${b} 33% 66%, ${c} 66%)` }}
    />
  );
}

export function Datacenters() {
  const section = useRef<HTMLElement>(null);
  const strips = useRef<(HTMLLIElement | null)[]>([]);

  // On desktop the band is pinned and scroll position decides which strip is open.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const last = LOCATIONS.length - 1;
      let focus = 0;
      if (desktop.matches) {
        const rect = el.getBoundingClientRect();
        const travel = rect.height - window.innerHeight;
        const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
        focus = p * last;
      }
      strips.current.forEach((li, i) => {
        if (!li) return;
        const near = desktop.matches ? Math.max(0, 1 - Math.abs(focus - i)) : 1;
        li.style.setProperty("--w", (0.7 + 1.6 * near).toFixed(3));
        li.style.setProperty("--meta", Math.max(0, near * 2 - 1).toFixed(3));
      });
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="dc" id="datacenters" ref={section}>
      <div className="dc__pin">
        <header className="col gutter dc__head">
          <h2 className="h2">{content.datacenters.heading}</h2>
        </header>

        <div className="col dc__body">
          <ul className="dc__strips">
            {LOCATIONS.map((loc, i) => (
              <li
                key={loc.city}
                className="dc__strip"
                ref={(node) => {
                  strips.current[i] = node;
                }}
                style={{ "--w": i === 0 ? 2.3 : 0.7, "--meta": i === 0 ? 1 : 0 } as CSSProperties}
              >
                <Scene loc={loc} />
                <div className="dc__cap">
                  <span className="dc__pill mono">
                    <Flag loc={loc} />
                    {loc.region}
                  </span>
                  <div>
                    <h3 className="dc__city">{loc.city}</h3>
                    <p className="dc__desc">{loc.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
