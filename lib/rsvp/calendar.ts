import { dayLong, event, time12, watEpoch, type DayInfo } from "@/lib/content";
import { DAY_COLORS } from "@/lib/atlas/journey";
import { VENUES } from "@/lib/venues";
import { SITE_URL } from "./config";

export const dayStart = (d: DayInfo) => watEpoch(d.date, d.start);
export const dayEnd = (d: DayInfo) => watEpoch(d.date, d.end);
export const dayColor = (d: DayInfo) => DAY_COLORS[d.day - 1] ?? "#f26f21";
export const venueOf = (d: DayInfo) => VENUES[d.venue];
export const dayTitle = (d: DayInfo) => `Day ${d.day} · ${d.title}`;
export const dayWhen = (d: DayInfo) => `${dayLong(d.date)} · ${time12(d.start)} – ${time12(d.end)} WAT`;

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const summary = (d: DayInfo) => `${event.name} ${event.year} · Day ${d.day}: ${d.title}`;
const location = (d: DayInfo) => venueOf(d).town;
const details = (d: DayInfo, ticketLink?: string) =>
  [d.blurb, "", `Dress code: ${d.dress}`, d.note ?? "", `Map: ${venueOf(d).mapUrl}`, ticketLink ? `Your ticket: ${ticketLink}` : ""].filter(Boolean).join("\n");

export function googleCalendarUrl(d: DayInfo, ticketLink?: string) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: summary(d), dates: `${stamp(dayStart(d))}/${stamp(dayEnd(d))}`, details: details(d, ticketLink), location: location(d), ctz: event.timezone });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function outlookCalendarUrl(d: DayInfo, ticketLink?: string) {
  const q = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: summary(d), startdt: new Date(dayStart(d)).toISOString(), enddt: new Date(dayEnd(d)).toISOString(), body: details(d, ticketLink), location: location(d) });
  return `https://outlook.live.com/calendar/0/action/compose?${q}`;
}

export function yahooCalendarUrl(d: DayInfo, ticketLink?: string) {
  const q = new URLSearchParams({ v: "60", title: summary(d), st: stamp(dayStart(d)), et: stamp(dayEnd(d)), desc: details(d, ticketLink), in_loc: location(d) });
  return `https://calendar.yahoo.com/?${q}`;
}

/* ---------- .ics (Apple Calendar, Outlook desktop, anything else) ---------- */

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 line folding: lines longer than 75 octets continue on the next line after a space. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > 74) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n");
}

/** One calendar file with the chosen days. Each day carries a 2-hour alarm on top of the email reminder. */
export function buildIcs(days: DayInfo[], ticketLink?: string) {
  const now = stamp(Date.now());
  const host = new URL(SITE_URL).hostname || "youthchoirweek";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${event.name}//Tickets//EN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(`${event.name} ${event.year}`)}`];
  for (const d of days) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:ycw${event.year}-day${d.day}@${host}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(dayStart(d))}`,
      `DTEND:${stamp(dayEnd(d))}`,
      `SUMMARY:${esc(summary(d))}`,
      `DESCRIPTION:${esc(details(d, ticketLink))}`,
      `LOCATION:${esc(location(d))}`,
      `URL:${venueOf(d).mapUrl}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`${d.title} starts in 2 hours`)}`,
      "TRIGGER:-PT2H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
