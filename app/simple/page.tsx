import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { dayLong, event, time12, weekRange } from "@/lib/content";
import { DAY_COLORS } from "@/lib/destinations";
import { VENUES } from "@/lib/venues";
import "./simple.css";

export const metadata: Metadata = { title: "Youth Choir Week 2026 · Simple view" };

/** Lightweight fallback (no WebGL, slow connections): the whole week on one page. */
export default function SimplePage() {
  return (
    <main className="yc-simple">
      <header>
        <Logo size={40} />
        <a href="/">Open the 3D experience →</a>
      </header>
      <section className="yc-hero">
        <p className="yc-kicker">
          {event.city} · {event.state}
        </p>
        <h1>
          Youth Choir Week <em>’{String(event.year).slice(-2)}</em>
        </h1>
        <p className="yc-theme">{event.theme}</p>
        <p>{weekRange()} · five days, four venues</p>
        <a className="yc-rsvp" href={event.rsvpUrl}>
          RSVP
        </a>
      </section>
      <ol className="yc-days">
        {event.days.map((d) => {
          const v = VENUES[d.venue];
          return (
            <li key={d.day} style={{ ["--day" as string]: DAY_COLORS[d.day - 1] }}>
              <span className="yc-num">Day {d.day}</span>
              <h2>{d.title}</h2>
              <p className="yc-when">
                {dayLong(d.date)} · {time12(d.start)} – {time12(d.end)} WAT
              </p>
              <p>{d.blurb}</p>
              {d.note && <p className="yc-note">{d.note}</p>}
              <a href={v.mapUrl} target="_blank" rel="noopener noreferrer">
                {v.town} ↗
              </a>
            </li>
          );
        })}
      </ol>
      <footer>Map data © OpenStreetMap contributors · Dates and times are placeholders until confirmed.</footer>
    </main>
  );
}
