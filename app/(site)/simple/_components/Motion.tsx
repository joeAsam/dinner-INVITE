"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { rememberHome } from "@/components/HomeLink";

/** What fades up into place as it scrolls into view. Selectors that match nothing are skipped. */
const REVEAL = [
  ".band .head",
  ".stats",
  ".feat__tabs > li",
  ".feat__panels",
  ".chat",
  ".logs",
  ".agent__foot",
  ".dc__pin .h2",
  ".faq__item",
  ".foot__about",
  ".foot__cols > *",
  ".foot__word",
].join(",");

/**
 * Page motion for the simple view: inertial smooth scrolling (Lenis) and reveal-on-scroll.
 * Both are skipped when the visitor asks for reduced motion.
 */
export function Motion() {
  useEffect(() => {
    // The RSVP and ticket pages send the visitor back here, not to the 3D site.
    rememberHome("/simple");
    // The page always opens at the top: arriving from the 3D site or the RSVP page, and after a refresh
    // (the browser is told not to restore its old position). A link to a section (#…) still lands on it.
    history.scrollRestoration = "manual";
    if (!location.hash) window.scrollTo(0, 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.09 });

    // Only hide what is still below the fold, so nothing on screen blinks out after load.
    const fold = window.innerHeight * 0.92;
    const items = [...document.querySelectorAll<HTMLElement>(`.pxxl ${REVEAL.split(",").join(", .pxxl ")}`)].filter(
      (el) => el.getBoundingClientRect().top > fold,
    );

    // Siblings that arrive together come in one after another.
    for (const el of items) {
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => items.includes(c as HTMLElement)) : [];
      el.style.setProperty("--reveal-delay", `${Math.min(siblings.indexOf(el), 6) * 70}ms`);
      el.dataset.reveal = "";
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.reveal = "in";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      lenis.destroy();
      items.forEach((el) => {
        delete el.dataset.reveal;
        el.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  // A thin ember bar along the top that fills as you read down the page (CSS scroll timeline).
  return <div className="progress" aria-hidden="true" />;
}
