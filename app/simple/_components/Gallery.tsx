"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { DAY_COLORS } from "@/lib/atlas/journey";
import { content } from "../content";

const PHOTOS = content.gallery.photos;

/** Photo strips. On desktop the band is pinned and scrolling opens one photo at a time. */
export function Gallery() {
  const section = useRef<HTMLElement>(null);
  const strips = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const last = PHOTOS.length - 1;
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
    <section className="dc" id="gallery" ref={section}>
      <div className="dc__pin">
        <header className="col gutter dc__head">
          <h2 className="h2">{content.gallery.heading}</h2>
        </header>

        <div className="col dc__body">
          <ul className="dc__strips">
            {PHOTOS.map((photo, i) => (
              <li
                key={photo.src}
                className="dc__strip"
                ref={(node) => {
                  strips.current[i] = node;
                }}
                style={{ "--w": i === 0 ? 2.3 : 0.7, "--meta": i === 0 ? 1 : 0 } as CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="dc__scene dc__photo" src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                <div className="dc__cap">
                  <span className="dc__pill mono">
                    <span className="dc__flag" style={{ background: DAY_COLORS[i % DAY_COLORS.length] }} />
                    {photo.tag}
                  </span>
                  <div>
                    <h3 className="dc__city">{photo.title}</h3>
                    <p className="dc__desc">{photo.desc}</p>
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
