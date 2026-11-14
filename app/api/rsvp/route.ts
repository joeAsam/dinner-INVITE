import { NextResponse } from "next/server";
import { event } from "@/lib/content";
import { buildIcs } from "@/lib/rsvp/calendar";
import { generateCode } from "@/lib/rsvp/code";
import { EMAIL_FROM, EMAIL_REPLY_TO, SEND_GAP_MS, ticketUrl } from "@/lib/rsvp/config";
import { ticketEmail } from "@/lib/rsvp/emails";
import { scheduleReminders } from "@/lib/rsvp/reminders";
import { db, getActiveTicketByEmail, resend, sleep, type Ticket } from "@/lib/rsvp/server";
import { renderTicketImage } from "@/lib/rsvp/ticketImage";

export const runtime = "nodejs";
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Email the ticket, with the ticket PNG and a 5-day .ics attached (like the reference email's PDF + .ics). */
async function sendTicket(t: Ticket) {
  const mail = ticketEmail(t);
  const png = Buffer.from(await (await renderTicketImage(t)).arrayBuffer());
  const ics = buildIcs(event.days, ticketUrl(t.code));
  const { error } = await resend().emails.send({
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    to: t.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: [
      { filename: `${t.code}.png`, content: png },
      { filename: `youth-choir-week-${event.year}.ics`, content: Buffer.from(ics), contentType: "text/calendar" },
    ],
  });
  if (error) throw new Error(error.message);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  // Honeypot: real people never fill the hidden "website" field.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ code: null }, { status: 200 });

  const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  const phone = String(body.phone ?? "").trim().slice(0, 30) || null;
  if (name.length < 2) return NextResponse.json({ error: "Please enter your full name." }, { status: 422 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 422 });

  try {
    // Already RSVP'd? Same ticket, sent again.
    let ticket = await getActiveTicketByEmail(email);
    const existing = !!ticket;

    if (!ticket) {
      for (let tries = 0; tries < 4 && !ticket; tries++) {
        const { data, error } = await db().from("tickets").insert({ code: generateCode(), name, email, phone }).select("*").single();
        if (!error) ticket = data as Ticket;
        else if (error.code === "23505" && /email/.test(error.message)) ticket = await getActiveTicketByEmail(email);
        else if (error.code !== "23505") throw error;
      }
      if (!ticket) throw new Error("Could not create a ticket code");
    }

    let emailed = true;
    try {
      await sendTicket(ticket);
    } catch (e) {
      emailed = false;
      console.error("[rsvp] ticket email failed:", e);
    }
    try {
      await sleep(SEND_GAP_MS);
      await scheduleReminders(ticket);
    } catch (e) {
      console.error("[rsvp] scheduling reminders failed (the daily cron will retry):", e);
    }

    return NextResponse.json({ code: ticket.code, existing, emailed });
  } catch (e) {
    console.error("[rsvp]", e);
    return NextResponse.json({ error: "Something went wrong on our side. Please try again in a minute." }, { status: 500 });
  }
}
