# Design

## Idea

The whole week lives on one living map of Eket. The landing question lights a flame, the flame spreads along the real streets, and five coloured beacons rise over the five venues. After that, every scroll is a day: the camera flies to that venue, and the sky turns to the hour the event actually happens.

## Day colours

Each day owns one accent. It colours the beacon, the hotspot dot, the rail pill, the panel kicker, the status chip, the venue pin, the bullets and the RSVP button (`DAY_COLORS` in `lib/destinations.ts`, applied through the CSS variable `--day`).

| Day | Colour | Mood |
|---|---|---|
| 1 Leadership | `#ffb347` amber | morning, daylight hall |
| 2 Movie Night | `#7aa7ff` blue | cinema glow |
| 3 Excursion | `#5fd3a5` green | river, palms, outdoors |
| 4 Games Night | `#ff6fb1` pink | neon lounge |
| 5 Awards | `#ffd36b` gold | candles, trophy |

The base UI is a dark ink palette (`--c-ink`, `--c-ink-dim`, `--c-line`) on glass panels, with Archivo for display type.

## Venue sets

Each venue is a small diorama, built to read at a glance from the camera pose:

- **DE Exchange Hall (Day 1):** a seven-floor hotel tower, the glass Exchange Hall entrance, a "LEADERSHIP SESSION" banner, flags, and attendees gathered at the door.
- **Royalty Hotels (Day 2):** the hotel block, a pool, and a garden cinema screen playing an animated shader film to an audience on beanbags, with a projector beam and fairy lights.
- **Amalgamation House (Day 3):** a two-storey colonial house with columns and shutters, a memorial obelisk, a waving Nigerian flag, palms, a tour bus and the tour group.
- **Blade Lounge (Day 4):** a dark lounge with "BLADE LOUNGE" and "GAMES NIGHT" neon, a terrace with pool and table-tennis tables, a DJ booth and party beams.
- **DE Exchange garden (Day 5):** a red carpet, a marquee strung with fairy lights over candle-lit round tables, guests, and an "AWARDS NIGHT" stage with a trophy and sweeping beams.

## Layout

| Size | Layout |
|---|---|
| Desktop | Title and countdown top-left on the overview; the day panel docks to the right, and the 3D view shifts left (`setViewOffset`) so the venue stays centred in the free space. |
| Tablet / phone | The day panel becomes a bottom sheet and the camera uses taller "mobile" poses. On phones, hotspot labels shorten to "Day N", road names hide, and the rail tightens to fit all six stops. |
| Off-screen days | Ikot Abasi, seen from the Eket overview, is pinned to the screen edge with an arrow pointing toward it. |

## Accessibility

- The rail, arrow keys, wheel and swipe all reach every day.
- The panels are real HTML with headings and links.
- `/simple` gives the full programme without WebGL.
- Reduced motion is respected.
