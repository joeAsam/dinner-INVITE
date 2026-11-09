"use client";

import { dayLong, event, time12, watEpoch, type DayInfo } from "@/lib/content";
import { DAY_COLORS } from "@/lib/destinations";
import { IKOT_TRUE_KM, VENUES } from "@/lib/venues";

function Status({ d, now }: { d: DayInfo; now: number }) {
  const start = watEpoch(d.date, d.start);
  const end = watEpoch(d.date, d.end);
  if (now >= end) return <span className="yc-status yc-status-past">Done · thank you for coming</span>;
  if (now >= start)
    return (
      <span className="yc-status yc-status-live">
        <i aria-hidden="true" /> Happening now
      </span>
    );
  const days = Math.floor((start - now) / 864e5);
  const hrs = Math.floor((start - now) / 36e5) % 24;
  return <span className="yc-status">{days > 0 ? `In ${days} day${days === 1 ? "" : "s"}${hrs ? `, ${hrs} h` : ""}` : `In ${Math.max(1, Math.floor((start - now) / 36e5))} h`}</span>;
}

/** One day of the week: when, where (with the real map link), what happens, what to wear. */
export function DayPanel({ d, now }: { d: DayInfo; now: number }) {
  const v = VENUES[d.venue];
  return (
    <div className="yc-day" style={{ ["--day" as string]: DAY_COLORS[d.day - 1] }}>
      <div className="yc-when">
        <div>
          <b>{dayLong(d.date)}</b>
          <span>
            {time12(d.start)} – {time12(d.end)} WAT
          </span>
        </div>
        <Status d={d} now={now} />
      </div>
      <a className="yc-venue" href={v.mapUrl} target="_blank" rel="noopener noreferrer">
        <span className="yc-venue-pin" aria-hidden="true" />
        <span>
          <b>{v.name}</b>
          <small>{v.town}</small>
        </span>
        <span className="yc-venue-go">
          Open in Google Maps <span aria-hidden="true">↗</span>
        </span>
      </a>
      <p className="xp-body">{d.blurb}</p>
      {d.note && <p className="xp-note">{d.note.replace("45 km", `${Math.round(IKOT_TRUE_KM)} km`)}</p>}
      <h4 className="xp-sub">What to expect</h4>
      <ul className="yc-expect">
        {d.expect.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <h4 className="xp-sub">Dress code</h4>
      <p className="xp-body">{d.dress}</p>
      {/* RSVP is a link out: point event.rsvpUrl at your form (Google Form, Typeform, …). */}
      <a className="xp-cta" href={event.rsvpUrl}>
        RSVP for Day {d.day}
      </a>
    </div>
  );
}
