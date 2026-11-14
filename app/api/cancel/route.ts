import { NextResponse } from "next/server";
import { isCode } from "@/lib/rsvp/code";
import { cancelReminders } from "@/lib/rsvp/reminders";
import { db, getTicket } from "@/lib/rsvp/server";

export const runtime = "nodejs";

/** Un-RSVP from the ticket page: mark the ticket cancelled and stop its pending reminders. */
export async function POST(req: Request) {
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!isCode(code)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const t = await getTicket(code);
  if (!t) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (t.status === "cancelled") return NextResponse.json({ ok: true });

  const { error } = await db().from("tickets").update({ status: "cancelled" }).eq("id", t.id);
  if (error) return NextResponse.json({ error: "Could not cancel. Please try again." }, { status: 500 });
  try {
    await cancelReminders(t);
  } catch (e) {
    console.error("[cancel] reminders:", e);
  }
  return NextResponse.json({ ok: true });
}
