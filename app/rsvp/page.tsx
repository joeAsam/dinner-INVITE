import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RsvpForm } from "@/components/rsvp/RsvpForm";
import { dayLabel, event, time12, weekRange } from "@/lib/content";
import { DAY_COLORS } from "@/lib/atlas/journey";

export const metadata: Metadata = { title: `RSVP · ${event.name} ${event.year}` };

export default function RsvpPage() {
  return (
    <main className="tk">
      <div className="tk-wrap tk-split">
        <section className="tk-intro">
          <Link href="/" className="tk-brand">
            <Logo size={26} />
            <span>
              YOUTH CHOIR WEEK <em>’{String(event.year).slice(-2)}</em>
            </span>
          </Link>
          <p className="tk-kicker">
            {weekRange()} · {event.city}, {event.state}
          </p>
          <h1 className="tk-h1">Save your seat for the whole week.</h1>
          <p className="tk-lead">RSVP once and you get a personal ticket with your name and a QR code. Show it at the door each day.</p>
          <ol className="tk-days">
            {event.days.map((d) => (
              <li key={d.day} style={{ ["--day" as string]: DAY_COLORS[d.day - 1] }}>
                <b>Day {d.day}</b>
                <span>{d.title}</span>
                <small>
                  {dayLabel(d.date)} · {time12(d.start)}
                </small>
              </li>
            ))}
          </ol>
        </section>
        <section className="tk-panel">
          <h2 className="tk-h2">Get your ticket</h2>
          <RsvpForm />
        </section>
      </div>
    </main>
  );
}
