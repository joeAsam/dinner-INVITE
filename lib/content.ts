import type { VenueKey } from "./venues";

/**
 * Event content. Everything here is meant to be edited.
 * Choir Week runs Sat 26 – Wed 30 December 2026. ⚠ Times, venues and dress codes are still placeholders until the programme is confirmed.
 */
export type DayInfo = {
  day: number;
  title: string;
  verb: string; // one word for the journey line
  date: string; // YYYY-MM-DD
  start: string; // HH:MM, local (WAT)
  end: string;
  venue: VenueKey;
  blurb: string;
  expect: string[];
  dress: string;
  note?: string;
};

export const event = {
  name: "Youth Choir Week",
  short: "YCW",
  year: 2026,
  host: "TAC Field Temple Youth Choir",
  /* Optional one-line theme under the title on the 3D overview. Leave it as "" to hide it;
     the simple view's footer and the emails then show the host name instead. */
  theme: "",
  /* A short paragraph about the week: the 3D overview and the simple view's first screen. */
  about:
    "Five days of friendship, fun and unforgettable memories. From the conference to the grand finale, we're bringing the family together for an experience beyond the music.",
  city: "Eket",
  state: "Akwa Ibom State",
  country: "Nigeria",
  timezone: "Africa/Lagos",
  question: "Are you ready for Youth Choir Week 2026?",
  fireFrom: "Youth Choir Week",
  lead: "We have just one question for you",
  /* The 3D intro captions that play while the light spreads through the streets (two short lines each). */
  intro: [
    ["Over 200 voices", "have been part of our journey"],
    ["The week, we've all been waiting for", "in Eket, Akwa Ibom State."],
  ] as [string, string][],
  /* The last stop of the 3D experience, above the RSVP button: a big headline, with the word in
     finaleHighlight shown in orange, then a short line under it. */
  finaleTitle: "Are you even ready?",
  finaleHighlight: "ready?",
  finaleLead: "Five days of friendship, fun and unforgettable memories.",
  rsvpUrl: "/rsvp", // RSVP page → personal ticket by email (see app/rsvp, app/ticket, lib/rsvp)
  days: [
    {
      day: 1,
      title: "Leadership Session",
      verb: "Lead",
      date: "2026-12-26",
      start: "10:00",
      end: "14:00",
      venue: "deExchange",
      blurb: "We open the week with the conference: a morning on leading with your voice, serving your section and growing together as one choir.",
      expect: ["Opening worship", "Talks on leadership and service", "Breakout circles by section", "Fellowship"],
      dress: "Smart casual",
    },
    {
      day: 2,
      title: "Movie Night",
      verb: "Watch",
      date: "2026-12-27",
      start: "19:00",
      end: "22:30",
      venue: "royalty",
      blurb: "An evening off together at Royalty Hotels: a film, snacks and good company with the whole choir family.",
      expect: ["Arrival & photos", "Movie screening", "Snacks & drinks", "Conversation after the film"],
      dress: "Cosy & casual: bring a light jacket",
    },
    {
      day: 3,
      title: "Excursion",
      verb: "Explore",
      date: "2026-12-28",
      start: "08:00",
      end: "17:00",
      venue: "amalgamation",
      blurb: "A day trip to Ikot Abasi and the historic Amalgamation House by the Imo River, where a defining chapter of Nigeria’s story was written.",
      expect: ["Departure together from Eket", "Visit to Amalgamation House", "Lunch together", "Group photos"],
      dress: "Comfortable walking wear & sun protection",
      note: "Ikot Abasi is about 45 km (≈ 1 hour) from Eket. Transport leaves together from DE Exchange.",
    },
    {
      day: 4,
      title: "Games Night",
      verb: "Play",
      date: "2026-12-29",
      start: "19:00",
      end: "23:00",
      venue: "blade",
      blurb: "Friendly rivalry between sections at Blade Lounge: games, music, laughter and bragging rights for the winning team.",
      expect: ["Team games between sections", "Music & sing-offs", "Snacks & drinks", "Prizes for the winning section"],
      dress: "Wear your section colours",
    },
    {
      day: 5,
      title: "Dinner & Awards Night",
      verb: "Celebrate",
      date: "2026-12-30",
      start: "18:00",
      end: "23:00",
      venue: "deExchange",
      blurb: "The grand finale: dinner together and an awards presentation honouring the people who carry the choir all year.",
      expect: ["Arrival & photos", "Dinner", "Awards presentation", "Final choir performance"],
      dress: "Formal / black tie optional",
    },
  ] as DayInfo[],
};

export type Event = typeof event;

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
export const dayLabel = (d: string) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
export const dayLong = (d: string) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
export function weekRange() {
  const a = event.days[0].date;
  const b = event.days[event.days.length - 1].date;
  return `${fmt(a, { day: "numeric" })}–${fmt(b, { day: "numeric", month: "long", year: "numeric" })}`;
}
export function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
/** Epoch ms for a WAT (UTC+1, no DST) wall-clock time. */
export const watEpoch = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00+01:00`);

/** Where "now" sits in the week. */
export function weekState(now = Date.now()) {
  const d = event.days;
  const first = watEpoch(d[0].date, d[0].start);
  const last = watEpoch(d[d.length - 1].date, d[d.length - 1].end);
  if (now >= last) return { kind: "ended" as const };
  const live = d.find((x) => now >= watEpoch(x.date, x.start) && now < watEpoch(x.date, x.end));
  if (live) return { kind: "live" as const, day: live };
  const next = d.find((x) => watEpoch(x.date, x.start) > now)!;
  const s = Math.max(0, Math.floor((watEpoch(next.date, next.start) - now) / 1000));
  return { kind: now < first ? ("before" as const) : ("between" as const), day: next, days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
}
