import { NextResponse } from "next/server";
import { scheduleReminders } from "@/lib/rsvp/reminders";
import { db, sleep, type Ticket } from "@/lib/rsvp/server";
import { SEND_GAP_MS } from "@/lib/rsvp/config";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Run once a day. Resend can only schedule 30 days ahead, so guests who RSVP early get their later
 * reminders queued here as each day comes into range. Safe to run as often as you like.
 *
 * Vercel: vercel.json already schedules it, and Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Anywhere else (Render cron, cron-job.org…): call  GET /api/cron/reminders  with that same header.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let queued = 0;
  let checked = 0;
  for (let from = 0; ; from += 500) {
    const { data, error } = await db().from("tickets").select("*").eq("status", "active").order("created_at").range(from, from + 499);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const t of (data ?? []) as Ticket[]) {
      const n = await scheduleReminders(t);
      queued += n;
      checked++;
      if (n) await sleep(SEND_GAP_MS);
    }
    if (!data || data.length < 500) break;
  }
  return NextResponse.json({ checked, queued });
}
