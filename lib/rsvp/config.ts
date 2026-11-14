/** RSVP / ticket settings. Secrets come from environment variables (see .env.example). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Who the emails come from. Must be on a domain verified in Resend (onboarding@resend.dev only reaches your own inbox). */
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Youth Choir Week <onboarding@resend.dev>";
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

/** Reminders go out this many minutes before each day starts. */
export const REMINDER_LEAD_MIN = 120;

/** Resend schedules at most 30 days ahead; we stay a little inside that. The daily cron picks up the rest. */
export const SCHEDULE_WINDOW_MS = 29 * 24 * 60 * 60 * 1000;

/** Resend's default rate limit is a few requests per second, so sends are spaced out. */
export const SEND_GAP_MS = 550;

export const ticketUrl = (code: string) => `${SITE_URL}/ticket/${code}`;
export const qrUrl = (code: string) => `${SITE_URL}/api/qr/${code}`;
export const ticketImageUrl = (code: string) => `${SITE_URL}/api/ticket/${code}/image`;
export const calendarUrl = (day: number | "all") => `${SITE_URL}/api/calendar?day=${day}`;
