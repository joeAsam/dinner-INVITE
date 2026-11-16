"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { DAY_COLORS } from "@/lib/atlas/journey";
import { dayLabel, dayLong, event, time12, type DayInfo } from "@/lib/content";
import { VENUES } from "@/lib/venues";
import { content } from "../content";

const DAYS = event.days;
const L = content.features;
const idOf = (d: DayInfo) => `day${d.day}`;
const colorOf = (d: DayInfo) => ({ "--day": DAY_COLORS[d.day - 1] }) as CSSProperties;

/** The week: Day 1–5 tabs on the left (sticky on desktop), one info card per day on the right. */
export function Features() {
  const [active, setActive] = useState(idOf(DAYS[0]));

  // Highlight the tab whose card crosses the middle of the viewport.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const d of DAYS) {
      const el = document.getElementById(idOf(d));
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <section className="band" id="features">
      <div className="col">
        <header className="head gutter">
          <h2 className="h2">{L.heading}</h2>
        </header>

        <div className="feat">
          <ol className="feat__tabs">
            {DAYS.map((d) => (
              <li key={d.day} style={colorOf(d)}>
                <a href={`#${idOf(d)}`} className="tab gutter" aria-current={active === idOf(d) ? "true" : undefined}>
                  <span className="tab__num mono">{String(d.day).padStart(2, "0")}</span>
                  <span>
                    <span className="tab__title">{d.title}</span>
                    <span className="tab__desc">
                      <span>
                        {dayLabel(d.date)} · {time12(d.start)}
                      </span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>

          <ul className="feat__panels">
            {DAYS.map((d) => (
              <li key={d.day} id={idOf(d)} className="panel" style={colorOf(d)}>
                <div className="dayslot">
                  <DayCard d={d} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function DayCard({ d }: { d: DayInfo }) {
  const v = VENUES[d.venue];
  return (
    <article className="daycard" aria-labelledby={`${idOf(d)}-title`}>
      <p className="daycard__kicker mono">
        Day {d.day} · {dayLong(d.date)}
      </p>
      <h3 className="daycard__title" id={`${idOf(d)}-title`}>
        {d.title}
      </h3>
      <p className="daycard__blurb">{d.blurb}</p>

      <dl className="daycard__facts">
        <div>
          <dt>{L.whenLabel}</dt>
          <dd>
            {time12(d.start)} – {time12(d.end)} WAT
          </dd>
        </div>
        <div>
          <dt>{L.whereLabel}</dt>
          <dd>
            <a href={v.mapUrl} target="_blank" rel="noopener noreferrer">
              {v.town}
            </a>
          </dd>
        </div>
        <div>
          <dt>{L.dressLabel}</dt>
          <dd>{d.dress}</dd>
        </div>
      </dl>

      {d.note && <p className="daycard__note">{d.note}</p>}

      <div className="daycard__expect">
        <p className="daycard__label">{L.expectLabel}</p>
        <ul>
          {d.expect.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>

      <div className="daycard__actions">
        <a href={L.button.href} className="btn btn--primary">
          {L.button.label}
        </a>
        <a href={v.mapUrl} className="btn btn--secondary" target="_blank" rel="noopener noreferrer">
          {L.mapLabel}
        </a>
      </div>
    </article>
  );
}
