import { event } from "@/lib/content";
import { buildIcs } from "@/lib/rsvp/calendar";

/** /api/calendar?day=all (or 1–5): an .ics file that Apple Calendar, Outlook and others open directly. */
export function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("day") ?? "all";
  const days = p === "all" ? event.days : event.days.filter((d) => String(d.day) === p);
  if (!days.length) return new Response("Unknown day", { status: 404 });
  const name = p === "all" ? `youth-choir-week-${event.year}` : `youth-choir-week-day-${p}`;
  return new Response(buildIcs(days), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${name}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
