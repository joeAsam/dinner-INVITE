"use client";

import { useEffect, useRef } from "react";

const MORPH_TIME = 1; // seconds spent melting one word into the next
const COOLDOWN_TIME = 2; // seconds a word stays sharp

/**
 * Gooey word morph, the same technique pxxl.app uses (Magic UI's MorphingText): two
 * stacked words cross-blur while an alpha-threshold filter on the wrapper turns the
 * overlapping blur into a single liquid shape.
 */
export function RotatingWord({ words }: { words: string[] }) {
  const fromRef = useRef<HTMLSpanElement>(null);
  const toRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = toRef.current;
    if (!from || !to || words.length === 0) return;
    // The original keeps morphing under reduced motion; here the first word stays put.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let index = 0;
    let morph = 0;
    let cooldown = 0;
    let last = performance.now();
    let raf = 0;

    const setStyles = (fraction: number) => {
      to.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      to.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
      const inverse = 1 - fraction;
      from.style.filter = `blur(${Math.min(8 / inverse - 8, 100)}px)`;
      from.style.opacity = `${Math.pow(inverse, 0.4) * 100}%`;
      from.textContent = words[index % words.length];
      to.textContent = words[(index + 1) % words.length];
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / MORPH_TIME;
      if (fraction > 1) {
        cooldown = COOLDOWN_TIME;
        fraction = 1;
      }
      setStyles(fraction);
      if (fraction === 1) index++;
    };

    const doCooldown = () => {
      morph = 0;
      to.style.filter = "none";
      to.style.opacity = "100%";
      from.style.filter = "none";
      from.style.opacity = "0%";
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      cooldown -= dt;
      if (cooldown <= 0) doMorph();
      else doCooldown();
    };
    tick();

    return () => cancelAnimationFrame(raf);
  }, [words]);

  return (
    <span className="rotator">
      {/* Server render shows the first word sharp, so there is no blank frame before JS runs. */}
      <span ref={fromRef} className="rotator__word" style={{ opacity: 0 }} />
      <span ref={toRef} className="rotator__word">
        {words[0]}
      </span>
      <svg className="rotator__filter" aria-hidden="true">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </span>
  );
}
