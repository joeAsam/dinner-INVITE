# Motion

## 1. Landing → intro (`Intro.tsx`, `CameraRig.tsx`)

The visitor answers the question. The words "Youth Choir Week" break into embers that drift into the 3D scene. A single `introT` clock (0 → 15.6 s) then drives every beat, each fading in and out over its own smoothed window (`smooth(a, b, t)`):

| t (s) | Beat |
|---|---|
| 0 – 3 | The camera rides a Catmull-Rom curve down from high above toward DE Exchange; embers trail ahead. |
| 3 – 8 | Fire spreads outward along Eket's real roads (`roadsR` grows to 9.6 km, with a bright wave front). |
| 8.4 + 0.75·i | The five day beacons ignite one by one in their day colours, and captions count them. |
| 12 – 15.6 | The camera settles into the overview; title, countdown and hotspots fade up. |

The sky moves from 18:40 to about 18:52 over the intro, so the town goes from dusk to first streetlights.

## 2. Scrolling between days (`Experience.tsx` → `CameraRig.tsx`)

- **Input:** wheel deltas accumulate to ±90, then lock for 1.1 s, so one gesture moves one day. A swipe needs at least 70 px vertical travel in under 600 ms. Arrow and Page keys and the rail also work.
- **Flight:** a quadratic Bézier from the current pose to the next. The control point is lifted above both ends by `min(1400, 0.22 × distance)`, so short hops arc gently and the trip to Ikot Abasi becomes a high glide across the country.
- **Duration:** `clamp(1.7 + d/900, 1.9, 4.6)` seconds, eased in and out. The look target flies its own matching curve, so the camera never snaps its gaze.
- **Time of day:** the sky eases toward each stop's own time (Day 1 at 10:15, Day 2 at 20:40, Day 3 at 11:00, Day 4 at 21:00, Day 5 at 20:00). Flights between day and night stops pass through sunset. The sun position comes from a NOAA solar model for Eket on 16 Dec 2026.
- **Focus:** `world.focus[i]` eases 0 → 1 for the day in view. It brings up that venue's crowd, event lights, fairy lights, beams and screen film, while the other days' details rest.

## 3. Living details

- **Royalty (Day 2):** the cinema screen plays a looping shader "film" (horizon and silhouettes); the projector beam flickers.
- **Amalgamation House (Day 3):** the Nigerian flag waves with a vertex sine.
- **Blade Lounge (Day 4):** party beams sweep and the neon signs breathe.
- **Day 5 gala:** beams sweep across the stage, candles flicker, and sparks rise from the awards stage.
- **Everywhere:** walkers follow real roads toward the venues, cars drive the main roads, and fairy lights twinkle per bulb.
- **Pointer:** dragging orbits the camera slightly around the venue, and the pointer adds a gentle parallax. Both spring back.

## 4. Reveal and frame rate

- **Staged build:** the scene builds in stages. Each new object compiles its shader hidden (on layer 7) and then dissolves in, so nothing pops or stutters.
- **Steady work per frame:** all per-frame values live in the mutable `world` object, and nothing re-renders React during motion. This keeps frames at a steady 60 fps on mid-range laptops. The low quality tier drops bloom and shadows.
- **Reduced motion:** with `prefers-reduced-motion`, the intro jumps to the overview and day changes cut straight to the next venue instead of flying.
