# Youth Choir Week 2026: invite site

An invite for Youth Choir Week in Eket, Akwa Ibom State, with two ways in:

- **`/` — the 3D night map.** The real street map of Eket (and Ikot Abasi) at night. The visitor answers "Are you ready for Youth Choir Week 2026?", light spreads through the streets, five beacons ignite, and then each scroll flies to the next day's venue: the camera rises, follows a line of light along the real roads, and comes down into an architectural model of the venue with people dressed for the occasion.
- **`/simple` — the simple view.** One scrolling page, no WebGL.

The navbar on `/` links Day 1 to Day 5, the simple view and RSVP.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. Useful flags on `/`: `?skip` skips the intro, `?at=day3` jumps to a stop (`top`, `day1` to `day5`, `rsvp`), `?q=low|medium|high` pins the graphics quality.

## Moving around on `/`

- **Scroll, swipe, arrow keys:** one gesture moves one stop.
- **Drag:** turns the camera around the town or the building. **Ctrl + scroll / pinch / + and −:** zoom.
- **Idle:** after half a second without input the camera drifts slowly on its own.

## Edit the event

- `lib/content.ts` — dates, times, copy and the RSVP link (shared by both pages). `rsvpUrl` is `/rsvp`, the built-in ticket flow (below); set it to something starting with `#` to show "RSVP opens soon" instead.
- `lib/venues.ts` — venue names, map positions, Google Maps links.
- `app/simple/content.ts` — the wording of the simple view.

## RSVP, tickets and reminders

Every RSVP button opens **`/rsvp`**. A guest enters their name and email (phone is optional) and gets:

1. A personal **ticket page** at `/ticket/<CODE>` with their name, a QR code (it encodes that page's URL), the five days, download, add-to-calendar and un-RSVP.
2. A **ticket email**, laid out like a GDG event ticket email: greeting and ticket number, "Show this at check-in" QR, download button, order summary, all five days with Google / Outlook / iCal / Yahoo links, and un-RSVP. The ticket PNG and a 5-day `.ics` are attached.
3. A **reminder email 2 hours before each day**, with the venue, map, dress code, what to expect and their QR.

RSVPing again with the same email re-sends the same ticket. Un-RSVP cancels the ticket and any reminders not yet sent.

### Set it up (once)

1. **Supabase:** create a project, open SQL Editor and run `supabase/schema.sql`.
2. **Resend:** add and verify your domain, then create an API key.
3. Copy `.env.example` to `.env.local` and fill it in. Add the same variables in your host's settings.
4. **Daily job:** Resend only schedules up to 30 days ahead, so `/api/cron/reminders` must run once a day to queue later reminders. On Vercel, `vercel.json` already does this (set `CRON_SECRET`). On any other host, call it daily with the header `Authorization: Bearer <CRON_SECRET>` (Render Cron Job, cron-job.org, …).

| Where | What |
|---|---|
| `app/rsvp`, `components/rsvp` | RSVP form, un-RSVP button |
| `app/ticket/[code]` | Ticket page |
| `app/api/rsvp` | Creates the ticket, sends the email, queues reminders |
| `app/api/cron/reminders` | Daily job that queues reminders within Resend's 30-day window |
| `app/api/{qr,ticket,calendar,cancel}` | QR PNG, ticket PNG, `.ics`, un-RSVP |
| `lib/rsvp/emails.ts` | Both email templates |
| `lib/rsvp/calendar.ts` | Calendar links and `.ics` |

When you change the dates in `lib/content.ts`, reminders that are already queued keep their old time. Set the final dates before you share the RSVP link.

## Where the code lives

- `app/page.tsx` + `app/atlas.css` — the 3D page and its styles.
- `components/atlas/` — the page (`Experience.tsx`) and the 3D scene (`scene/`): the map, route line, beacons, camera, characters (`People.tsx`) and one file per venue in `scene/sites/`.
- `lib/atlas/` — the camera's stops (`journey.ts`), road routing (`route.ts`) and shared per-frame state (`world.ts`).
- `public/data/map.json` — OpenStreetMap roads, buildings and rivers, built by `scripts/build-map.py`.

Map data © OpenStreetMap contributors (ODbL). The credit is shown on the page.

The previous 3D experience (the fire-and-ember intro with box venues) was replaced on 2026-11-13; it is in the git history at commit `8acff07`.
