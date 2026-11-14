/**
 * Email templates. Laid out like the DevFest ticket email (greeting → QR "show this at check-in" → download →
 * order summary → event details with add-to-calendar links → un-RSVP), restyled in the Youth Choir Week palette.
 * Plain tables and inline styles only, because that is what Gmail, Outlook and phone mail apps reliably render.
 */
import { dayLabel, event, time12, weekRange, type DayInfo } from "@/lib/content";
import { dayColor, dayTitle, dayWhen, googleCalendarUrl, outlookCalendarUrl, venueOf, yahooCalendarUrl } from "./calendar";
import { firstName, maskEmail } from "./code";
import { calendarUrl, qrUrl, SITE_URL, ticketImageUrl, ticketUrl } from "./config";

type T = { code: string; name: string; email: string; created_at?: string };

const NIGHT = "#04060d";
const INK = "#0b0d18";
const EMBER = "#f26f21";
const CREAM = "#fff4e6";
const PAGE = "#f5efe8";
const TEXT = "#1d1a17";
const MUTED = "#6f665d";
const FONT = "'Manrope','Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "'Archivo','Arial Black','Segoe UI',Helvetica,Arial,sans-serif";

const h = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const yy = `’${String(event.year).slice(-2)}`;

function shell(preheader: string, body: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${h(event.name)}</title></head>
<body style="margin:0;padding:0;background:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${h(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};"><tr><td align="center" style="padding:16px 12px 40px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;font-family:${FONT};color:${TEXT};">
<tr><td style="padding:4px 4px 12px;font-size:12px;color:${MUTED};">${h(event.name)} ${event.year} · ${h(event.city)}</td>
<td align="right" style="padding:4px 4px 12px;font-size:12px;"><a href="${SITE_URL}" style="color:${MUTED};">Open the invite</a></td></tr>
${body}
<tr><td colspan="2" align="center" style="padding:28px 16px 0;font-size:12px;line-height:18px;color:${MUTED};">
<span style="font-family:${DISPLAY};font-weight:800;letter-spacing:2px;color:${TEXT};">YOUTH CHOIR WEEK <span style="color:${EMBER};">${yy}</span></span><br>
${h(event.theme)} · ${weekRange()} · ${h(event.city)}, ${h(event.state)}<br>
You are receiving this because you RSVP’d on the Youth Choir Week invite.
</td></tr>
</table></td></tr></table></body></html>`;
}

const card = (inner: string, opts: { bg?: string; pad?: string; top?: number } = {}) =>
  `<tr><td colspan="2" style="padding-top:${opts.top ?? 16}px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${opts.bg ?? "#ffffff"};border-radius:16px;"><tr><td style="padding:${opts.pad ?? "28px 30px"};">${inner}</td></tr></table></td></tr>`;

const button = (href: string, label: string, color = EMBER, text = "#ffffff") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td style="border-radius:999px;background:${color};"><a href="${href}" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:15px;font-weight:700;color:${text};text-decoration:none;border-radius:999px;">${label}</a></td></tr></table>`;

const wordmark = `<div style="font-family:${DISPLAY};font-size:13px;font-weight:800;letter-spacing:3px;color:${CREAM};">YOUTH CHOIR WEEK <span style="color:${EMBER};">${yy}</span></div>`;

function qrBlock(t: T, heading = "Show this at check-in") {
  return card(
    `<div style="text-align:center;">
<div style="font-family:${DISPLAY};font-size:22px;font-weight:800;color:${TEXT};">${heading}</div>
<div style="padding:18px 0 12px;"><img src="${qrUrl(t.code)}" width="220" height="220" alt="Ticket QR code ${h(t.code)}" style="display:block;margin:0 auto;width:220px;height:220px;border:0;"></div>
<div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:3px;color:${TEXT};">${h(t.code)}</div>
<div style="padding-top:6px;font-size:13px;color:${MUTED};">One ticket · all five days · scan it at every venue</div>
</div>`,
  );
}

function calLinks(d: DayInfo, link: string) {
  const a = (href: string, label: string) => `<a href="${href}" style="color:${MUTED};text-decoration:underline;">${label}</a>`;
  return `Add to ${a(googleCalendarUrl(d, link), "Google")} · ${a(outlookCalendarUrl(d, link), "Outlook")} · ${a(calendarUrl(d.day), "iCal")} · ${a(yahooCalendarUrl(d, link), "Yahoo")}`;
}

function dayRow(d: DayInfo, link: string) {
  const v = venueOf(d);
  return `<tr><td style="padding:0 0 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="6" style="background:${dayColor(d)};border-radius:6px;font-size:0;">&nbsp;</td>
<td style="padding:4px 0 4px 16px;">
<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Day ${d.day} · ${dayLabel(d.date)}</div>
<div style="font-family:${DISPLAY};font-size:18px;font-weight:800;color:${TEXT};padding:2px 0;">${h(d.title)}</div>
<div style="font-size:14px;color:${TEXT};">${time12(d.start)} – ${time12(d.end)} WAT · <a href="${v.mapUrl}" style="color:${TEXT};">${h(v.name)}</a></div>
<div style="font-size:12px;color:${MUTED};padding-top:4px;">${calLinks(d, link)}</div>
</td></tr></table></td></tr>`;
}

/* ------------------------------------------------------------------ */

export function ticketEmail(t: T) {
  const link = ticketUrl(t.code);
  const issued = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: event.timezone }).format(t.created_at ? new Date(t.created_at) : new Date());
  const days = event.days;

  const hero = card(
    `${wordmark}
<div style="padding-top:22px;font-size:16px;color:${CREAM};">Hi ${h(firstName(t.name))},</div>
<div style="padding-top:10px;font-size:16px;line-height:24px;color:${CREAM};">You’re in! You have <b>successfully registered</b> for ${h(event.name)} ${event.year}: five days across ${h(event.city)} and Ikot Abasi, ${weekRange()}.</div>
<div style="padding-top:16px;font-size:15px;color:${CREAM};"><b>Ticket number:</b> <span style="font-family:'Courier New',monospace;letter-spacing:1px;">${h(t.code)}</span></div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>${days.map((d) => `<td style="padding-right:6px;"><div style="width:44px;height:6px;border-radius:6px;background:${dayColor(d)};font-size:0;">&nbsp;</div></td>`).join("")}</tr></table>`,
    { bg: INK, pad: "30px 30px 28px", top: 0 },
  );

  const download = card(
    `<div style="text-align:center;"><div style="font-family:${DISPLAY};font-size:22px;font-weight:800;padding:6px 0 18px;">Here is your ticket</div>
${button(ticketImageUrl(t.code) + "?download=1", "DOWNLOAD")}
<div style="padding-top:14px;font-size:13px;"><a href="${link}" style="color:${MUTED};">or open it in your browser</a></div></div>`,
  );

  const summary = card(
    `<div style="font-family:${DISPLAY};font-size:20px;font-weight:800;padding-bottom:14px;">Order summary</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
<tr><td style="padding-bottom:12px;">Confirmation <b>${h(t.code)}</b></td><td align="right" style="padding-bottom:12px;color:${MUTED};">${issued}</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
<tr style="background:${NIGHT};color:${CREAM};"><td style="padding:10px 12px;border-radius:8px 0 0 8px;">Name</td><td style="padding:10px 8px;">Ticket</td><td style="padding:10px 8px;">Days</td><td align="right" style="padding:10px 12px;border-radius:0 8px 8px 0;">Qty</td></tr>
<tr><td style="padding:12px;"><b>${h(t.name)}</b><br><span style="font-size:11px;color:${MUTED};">${h(maskEmail(t.email))}</span></td><td style="padding:12px 8px;">Week pass</td><td style="padding:12px 8px;">All 5</td><td align="right" style="padding:12px;">1</td></tr></table>`,
  );

  const week = card(
    `<div style="font-family:${DISPLAY};font-size:20px;font-weight:800;padding-bottom:4px;">Your week</div>
<div style="font-size:13px;color:${MUTED};padding-bottom:18px;">We’ll email you a reminder 2 hours before each day starts.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${days.map((d) => dayRow(d, link)).join("")}</table>
<div style="padding-top:6px;">${button(calendarUrl("all"), "Add all 5 days to my calendar", NIGHT, CREAM)}</div>`,
  );

  const unrsvp = `<tr><td colspan="2" align="center" style="padding:22px 16px 0;font-size:14px;color:${TEXT};">No longer attending? Please <a href="${link}#cancel" style="color:${EMBER};">un-RSVP</a> so we can plan seats and food.</td></tr>`;

  const html = shell(`Your Youth Choir Week ticket ${t.code}: show the QR code at every venue.`, hero + qrBlock(t) + download + summary + week + unrsvp);
  const text = [
    `Hi ${firstName(t.name)},`,
    "",
    `You're in! You have successfully registered for ${event.name} ${event.year} (${weekRange()}).`,
    `Ticket number: ${t.code}`,
    `Your ticket (show the QR at check-in): ${link}`,
    "",
    ...days.flatMap((d) => [`${dayTitle(d)}: ${dayWhen(d)}, ${venueOf(d).town}`, `  Google Calendar: ${googleCalendarUrl(d, link)}`]),
    "",
    `Add all 5 days to your calendar: ${calendarUrl("all")}`,
    `No longer attending? Un-RSVP: ${link}#cancel`,
  ].join("\n");

  return { subject: `[YOUR TICKET] You’re ready for ${event.name} ${event.year}!`, html, text };
}

/* ------------------------------------------------------------------ */

export function reminderEmail(t: T, d: DayInfo) {
  const link = ticketUrl(t.code);
  const v = venueOf(d);
  const c = dayColor(d);
  const next = event.days.find((x) => x.day === d.day + 1);

  const hero = card(
    `${wordmark}
<div style="padding-top:22px;"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${c};color:${NIGHT};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Today · Day ${d.day}</span></div>
<div style="padding-top:14px;font-family:${DISPLAY};font-size:30px;line-height:34px;font-weight:800;color:${CREAM};">${h(d.title)}</div>
<div style="padding-top:10px;font-size:16px;line-height:24px;color:${CREAM};">Hi ${h(firstName(t.name))}, we start in about 2 hours, at <b>${time12(d.start)}</b>. Here’s everything you need.</div>`,
    { bg: INK, top: 0 },
  );

  const where = card(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
<tr><td style="padding-bottom:16px;"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">When?</div>
<div style="font-family:${DISPLAY};font-size:17px;font-weight:800;padding-top:2px;">${h(dayWhen(d))}</div>
<div style="font-size:12px;color:${MUTED};padding-top:4px;">${calLinks(d, link)}</div></td></tr>
<tr><td style="padding-bottom:18px;"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Where?</div>
<div style="font-family:${DISPLAY};font-size:17px;font-weight:800;padding-top:2px;"><a href="${v.mapUrl}" style="color:${TEXT};">${h(v.town)}</a></div>
${d.note ? `<div style="font-size:13px;color:${MUTED};padding-top:4px;">${h(d.note)}</div>` : ""}</td></tr>
<tr><td style="padding-bottom:18px;"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Dress code</div>
<div style="padding-top:2px;">${h(d.dress)}</div></td></tr>
<tr><td><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};padding-bottom:6px;">What to expect</div>
${d.expect.map((x) => `<div style="padding:3px 0;"><span style="color:${c};font-size:18px;line-height:14px;">●</span>&nbsp; ${h(x)}</div>`).join("")}</td></tr>
</table>
<div style="padding-top:22px;">${button(v.mapUrl, "Get directions", c, NIGHT)}</div>`,
  );

  const nextUp = next
    ? `<tr><td colspan="2" align="center" style="padding:20px 16px 0;font-size:14px;color:${TEXT};">Next up: <b>Day ${next.day} · ${h(next.title)}</b>, ${dayLabel(next.date)} at ${time12(next.start)}.</td></tr>`
    : `<tr><td colspan="2" align="center" style="padding:20px 16px 0;font-size:14px;color:${TEXT};">This is the last night of the week. Thank you for lifting your voice with us.</td></tr>`;
  const ticket = `<tr><td colspan="2" style="padding-top:16px;">${button(link, "Open my ticket", NIGHT, CREAM)}</td></tr>`;

  const html = shell(`Day ${d.day} · ${d.title} starts at ${time12(d.start)} at ${v.name}. Bring your QR ticket.`, hero + where + qrBlock(t, "Your ticket for today") + ticket + nextUp);
  const text = [
    `Hi ${firstName(t.name)},`,
    "",
    `Today is Day ${d.day}: ${d.title}. We start at ${time12(d.start)}.`,
    `Where: ${v.town} (${v.mapUrl})`,
    `Dress code: ${d.dress}`,
    d.note ?? "",
    "",
    `Your ticket ${t.code}: ${link}`,
  ].join("\n");

  return { subject: `Today: Day ${d.day} · ${d.title} starts at ${time12(d.start)}`, html, text };
}
