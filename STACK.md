# Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| 3D | three.js 0.186, @react-three/fiber 9, drei (`PerformanceMonitor`, `useProgress`) |
| Post-processing | @react-three/postprocessing: Bloom, Vignette, Noise, ACES tone mapping (medium/high quality only) |
| Styling | Tailwind v4, plus hand-written CSS in `app/globals.css` and `app/choir.css` |
| Map data | OpenStreetMap via Overpass, baked offline by `scripts/build-map.py` (Python 3, standard library only) |

## Layout

```
app/
  page.tsx            the experience (Intro → Experience)
  simple/             no-WebGL fallback: a list of the five days
  choir.css           per-day accents, hotspots, edge pins, day panel
components/
  Intro.tsx           landing question, loader, fire-from-text hand-off
  Experience.tsx      overlay: title, countdown, hotspots, rail, scroll/swipe/keys, panel host
  panels/Panels.tsx   DayPanel (status chip, venue card → Google Maps, copy, RSVP)
  scene/
    Scene.tsx         Canvas, staged build (city → venues → beacons → people → embers → walkers → cars → props), reveal-after-compile
    CameraRig.tsx     intro timeline, arrival curve, Bézier flights between days, drag/parallax, hotspot projection
    Atmosphere.tsx    eases focus / overview / time of day; sun, shadows, fog
    light.ts          NOAA sun for Eket in mid-December → shared shader uniforms
    City.tsx          ground, OSM roads (min on-screen width), buildings, rivers, skyline ring
    Venues.tsx        the four venue models (DE Exchange serves Day 1 and Day 5)
    People.tsx        per-day gatherings + walkers on real roads
    Embers.tsx, Traffic.tsx, Props.tsx
lib/
  content.ts          ← edit dates, copy, RSVP here
  venues.ts           venue coordinates, yaw, Google Maps links
  destinations.ts     camera poses, times of day, day colours, tour order
  store.ts            UI store (useSyncExternalStore) + per-frame `world` object
scripts/build-map.py  Overpass JSON → public/data/map.json
```

## State

There are two stores. `ui` holds discrete state (phase, current stop, sound, quality) and drives React re-renders. `world` is a plain mutable object that the render loop reads and writes every frame (intro time, focus per day, time of day, camera height). It never triggers React.

## Performance

- Quality tiers come from `PerformanceMonitor`. The low tier drops post-processing and shadows and uses Lambert materials.
- Shaders compile off-screen (layer 7, `compileAsync`) before objects fade in, so the first frame of each stage doesn't hitch.
- Roads, buildings and people are one draw call per kind (merged geometry and instancing).
- `prefers-reduced-motion` skips the intro flight and cuts between days instead of flying.

A dev-only debug hook, `window.__ycw`, exposes the camera, the world object and the scene. It is not present in production builds.
