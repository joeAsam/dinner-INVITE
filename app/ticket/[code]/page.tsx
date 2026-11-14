import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CancelRsvp } from "@/components/rsvp/CancelRsvp";
import { dayLabel, event, time12, weekRange } from "@/lib/content";
import { dayColor, dayEnd, googleCalendarUrl, outlookCalendarUrl, venueOf, yahooCalendarUrl } from "@/lib/rsvp/calendar";
import { firstName, isCode, maskEmail } from "@/lib/rsvp/code";
import { ticketUrl } from "@/lib/rsvp/config";
import { getTicket } from "@/lib/rsvp/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Your ticket · ${event.name} ${event.year}`, robots: { index: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ welcome?: string; mail?: string }> };

export default async function TicketPage({ params, searchParams }: Props) {
  const { code } = await params;
  const { welcome, mail } = await searchParams;
  if (!isCode(code)) notFound();
  const t = await getTicket(code);
  if (!t) notFound();

  const yy = `’${String(event.year).slice(-2)}`;
  const link = ticketUrl(t.code);
  const cancelled = t.status === "cancelled";
  const now = Date.now();

  return (
    <main className="tk">
      <div className="tk-wrap">
        <header className="tk-top">
          <Link href="/" className="tk-brand">
            <Logo size={26} />
            <span>
              YOUTH CHOIR WEEK <em>{yy}</em>
            </span>
          </Link>
          <Link href="/" className="tk-link">
            Back to the invite
          </Link>
        </header>

        {!cancelled && welcome && (
          <div className="tk-banner" role="status">
            <b>{welcome === "again" ? `Welcome back, ${firstName(t.name)}.` : `You’re in, ${firstName(t.name)}!`}</b>{" "}
            {mail === "failed"
              ? "We couldn’t send the email just now, so save this page or download your ticket below."
              : welcome === "again"
                ? `You already had a ticket, so we’ve sent it to ${maskEmail(t.email)} again.`
                : `We’ve emailed your ticket to ${maskEmail(t.email)}. You’ll get a reminder 2 hours before each day.`}
          </div>
        )}

        {cancelled ? (
          <section className="tk-card tk-void">
            <p className="tk-kicker">Ticket {t.code}</p>
            <h1 className="tk-h1">This ticket was cancelled.</h1>
            <p className="tk-lead">Changed your mind? You can RSVP again any time and we’ll send you a fresh ticket.</p>
            <Link className="tk-btn tk-btn-ember" href="/rsvp">
              RSVP again
            </Link>
          </section>
        ) : (
          <>
            {/* The ticket itself */}
            <section className="tk-ticket" aria-label="Your ticket">
              <div className="tk-ticket-head">
                <div className="tk-ticket-row">
                  <span className="tk-mark">
                    YOUTH CHOIR WEEK <em>{yy}</em>
                  </span>
                  <span className="tk-admit">ADMIT ONE</span>
                </div>
                <p className="tk-kicker">Week pass · all five days</p>
                <h1 className="tk-name">{t.name}</h1>
                <p className="tk-sub">
                  {weekRange()} · {event.city}, {event.state}
                </p>
              </div>
              <div className="tk-perf" aria-hidden="true" />
              <div className="tk-ticket-qr">
                <h2 className="tk-h3">Show this at check-in</h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/qr/${t.code}`} width={240} height={240} alt={`QR code for ticket ${t.code}`} />
                <p className="tk-code">{t.code}</p>
              </div>
              <ol className="tk-pips">
                {event.days.map((d) => (
                  <li key={d.day} style={{ ["--day" as string]: dayColor(d) }} data-past={now >= dayEnd(d) || undefined}>
                    <b>Day {d.day}</b>
                    <span>{d.verb}</span>
                    <small>{dayLabel(d.date)}</small>
                  </li>
                ))}
              </ol>
            </section>

            <div className="tk-actions">
              <a className="tk-btn tk-btn-ember" href={`/api/ticket/${t.code}/image?download=1`}>
                Download ticket
              </a>
              <a className="tk-btn tk-btn-ghost" href="/api/calendar?day=all">
                Add all 5 days to my calendar
              </a>
            </div>

            {/* Order summary, like the reference email */}
            <section className="tk-card">
              <div className="tk-sum-head">
                <h2 className="tk-h2">Order summary</h2>
                <span>
                  Confirmation <b>{t.code}</b>
                </span>
              </div>
              <div className="tk-table" role="table">
                <div role="row" className="tk-tr tk-th">
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Ticket</span>
                  <span role="columnheader">Days</span>
                  <span role="columnheader">Qty</span>
                </div>
                <div role="row" className="tk-tr">
                  <span role="cell">
                    <b>{t.name}</b>
                    <small>{maskEmail(t.email)}</small>
                  </span>
                  <span role="cell">Week pass</span>
                  <span role="cell">All 5</span>
                  <span role="cell">1</span>
                </div>
              </div>
            </section>

            {/* When / where, one row per day */}
            <section className="tk-card">
              <h2 className="tk-h2">Your week</h2>
              <p className="tk-muted">A reminder lands in your inbox 2 hours before each day starts.</p>
              <ul className="tk-week">
                {event.days.map((d) => {
                  const v = venueOf(d);
                  return (
                    <li key={d.day} style={{ ["--day" as string]: dayColor(d) }}>
                      <p className="tk-week-k">
                        Day {d.day} · {dayLabel(d.date)}
                      </p>
                      <h3>{d.title}</h3>
                      <p>
                        {time12(d.start)} – {time12(d.end)} WAT ·{" "}
                        <a href={v.mapUrl} target="_blank" rel="noopener noreferrer">
                          {v.name}
                        </a>
                      </p>
                      <p className="tk-cal">
                        Add to{" "}
                        <a href={googleCalendarUrl(d, link)} target="_blank" rel="noopener noreferrer">
                          Google
                        </a>{" "}
                        ·{" "}
                        <a href={outlookCalendarUrl(d, link)} target="_blank" rel="noopener noreferrer">
                          Outlook
                        </a>{" "}
                        · <a href={`/api/calendar?day=${d.day}`}>Apple / iCal</a> ·{" "}
                        <a href={yahooCalendarUrl(d, link)} target="_blank" rel="noopener noreferrer">
                          Yahoo
                        </a>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <CancelRsvp code={t.code} />
          </>
        )}
      </div>
    </main>
  );
}
