import "server-only";
import { event } from "@/lib/content";
import { dayStart } from "./calendar";
import { EMAIL_FROM, EMAIL_REPLY_TO, REMINDER_LEAD_MIN, SCHEDULE_WINDOW_MS, SEND_GAP_MS } from "./config";
import { reminderEmail } from "./emails";
import { db, resend, sleep, type Ticket } from "./server";

/**
 * Queue the "starts in 2 hours" email for every day that is close enough for Resend to schedule (≤ 30 days out).
 * Safe to call repeatedly: the reminders table has one row per (ticket, day), so nothing is ever sent twice.
 * Called right after an RSVP, and once a day by /api/cron/reminders to pick up days that have come into range.
 */
export async function scheduleReminders(t: Ticket, now = Date.now()) {
  if (t.status !== "active") return 0;
  const { data: rows, error } = await db().from("reminders").select("day").eq("ticket_id", t.id);
  if (error) throw error;
  const done = new Set((rows ?? []).map((r: { day: number }) => r.day));
  let queued = 0;

  for (const d of event.days) {
    if (done.has(d.day)) continue;
    const start = dayStart(d);
    const at = start - REMINDER_LEAD_MIN * 60_000;
    if (now >= start) continue; // day already started: no point
    if (at - now > SCHEDULE_WINDOW_MS) continue; // too far out for Resend; the daily cron will get it

    // Claim the slot first so two overlapping runs can't both send.
    const claim = await db().from("reminders").insert({ ticket_id: t.id, day: d.day, send_at: new Date(Math.max(at, now)).toISOString() });
    if (claim.error) {
      if (claim.error.code === "23505") continue; // someone else claimed it
      throw claim.error;
    }

    const mail = reminderEmail(t, d);
    const scheduledAt = at > now + 60_000 ? new Date(at).toISOString() : undefined; // inside the 2-hour window: send now
    if (queued > 0) await sleep(SEND_GAP_MS);
    const { data, error: sendErr } = await resend().emails.send({ from: EMAIL_FROM, replyTo: EMAIL_REPLY_TO, to: t.email, subject: mail.subject, html: mail.html, text: mail.text, scheduledAt });
    if (sendErr || !data) {
      await db().from("reminders").delete().eq("ticket_id", t.id).eq("day", d.day); // release so the cron retries
      console.error(`[reminders] ${t.code} day ${d.day}:`, sendErr);
      continue;
    }
    await db().from("reminders").update({ resend_id: data.id }).eq("ticket_id", t.id).eq("day", d.day);
    queued++;
  }
  return queued;
}

/** Un-RSVP: cancel any reminder that hasn't gone out yet. */
export async function cancelReminders(t: Ticket, now = Date.now()) {
  const { data, error } = await db().from("reminders").select("day, resend_id, send_at").eq("ticket_id", t.id);
  if (error) throw error;
  for (const r of (data ?? []) as { day: number; resend_id: string | null; send_at: string }[]) {
    if (!r.resend_id || Date.parse(r.send_at) <= now) continue;
    const { error: e } = await resend().emails.cancel(r.resend_id);
    if (e) console.error(`[reminders] cancel ${t.code} day ${r.day}:`, e);
    await sleep(SEND_GAP_MS);
  }
}
