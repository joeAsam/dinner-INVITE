"use client";

import { useEffect, useState } from "react";
import { content } from "../content";
import { DotPanel, StepMockup } from "./Mockup";

const FEATURES = content.features.items;

export function Features() {
  const [active, setActive] = useState(FEATURES[0].id);

  // Highlight the tab whose panel crosses the middle of the viewport.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const f of FEATURES) {
      const el = document.getElementById(f.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <section className="band" id="features">
      <div className="col">
        <header className="head gutter">
          <h2 className="h2">{content.features.heading}</h2>
        </header>

        <div className="feat">
          <ol className="feat__tabs">
            {FEATURES.map((f, i) => (
              <li key={f.id}>
                <a
                  href={`#${f.id}`}
                  className="tab gutter"
                  aria-current={active === f.id ? "true" : undefined}
                >
                  <span className="tab__num mono">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="tab__title">{f.title}</span>
                    <span className="tab__desc">
                      <span>{f.desc}</span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>

          <ul className="feat__panels">
            {FEATURES.map((f) => (
              <li key={f.id} id={f.id} className="panel">
                <DotPanel>
                  <StepMockup step={f.step} title={f.stepTitle} hint={f.hint} options={f.options} />
                </DotPanel>
                <div className="panel__foot" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
