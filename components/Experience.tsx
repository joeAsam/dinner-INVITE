"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { FireCursor } from "./FireCursor";
import { Intro } from "./Intro";
import { Logo } from "./Logo";
import { DayPanel } from "./panels/Panels";
import { audioMute, audioRunning, audioStart, boom, musicLevel, onTrack, whoosh, type Track } from "@/lib/audio";
import { LABELLED, loadCity } from "@/lib/city";
import { dayLabel, event, weekRange, weekState } from "@/lib/content";
import { byId, DAY_COLORS, destinations, isPlace, tourOrder, type PlaceId } from "@/lib/destinations";
import { startingQuality } from "@/lib/device";
import { hotspotEls, INTRO_END, labelEls, ui, useUi, world } from "@/lib/store";
import { IKOT_OFFSET } from "@/lib/venues";

// The 3D scene is client-only (next/dynamic, ssr: false), as in the original.
const Scene = dynamic(() => import("./scene/Scene"), { ssr: false });

const days = destinations.filter((d) => d.day >= 0);
let titleSeen = false;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("now");
    const offset = q && !Number.isNaN(Date.parse(q)) ? Date.parse(q) - Date.now() : 0;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Countdown({ now }: { now: number }) {
  const s = weekState(now);
  if (s.kind === "ended") return <p className="yc-count">That’s a wrap. Thank you for an incredible week.</p>;
  if (s.kind === "live")
    return (
      <p className="yc-count yc-count-live">
        <i aria-hidden="true" /> Day {s.day.day} is happening now: {s.day.title}
      </p>
    );
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="yc-count" role="timer" aria-label={`${s.days} days ${s.hours} hours until Day ${s.day.day}`}>
      <span>{s.kind === "before" ? "Week starts in" : `Day ${s.day.day} starts in`}</span>
      <b>
        {s.days}d {pad(s.hours)}:{pad(s.minutes)}:{pad(s.seconds)}
      </b>
    </p>
  );
}

function Title({ id, now }: { id?: string; now: number }) {
  const [still] = useState(() => titleSeen);
  useEffect(() => {
    titleSeen = true;
  }, []);
  return (
    <div className="xp-title" data-still={still}>
      <p className="xp-kicker">
        {event.city} · {event.state}
      </p>
      <h1 id={id}>
        YOUTH CHOIR WEEK <em>’{String(event.year).slice(-2)}</em>
      </h1>
      <p className="xp-theme">{event.theme}</p>
      <p>
        {weekRange()} · 5 days, 4 venues
      </p>
      <Countdown now={now} />
    </div>
  );
}

function PrevNext({ at, go }: { at: PlaceId; go: (id: PlaceId) => void }) {
  const i = tourOrder.indexOf(at);
  const name = (id: PlaceId) => (id === "overview" ? "The week" : `${byId[id].short} · ${byId[id].place}`);
  const prev = tourOrder[i - 1];
  const next = tourOrder[i + 1];
  return (
    <div className="xp-np">
      {prev && <button onClick={() => go(prev)}>← {name(prev)}</button>}
      {next && <button onClick={() => go(next)}>{name(next)} →</button>}
    </div>
  );
}

export function Experience() {
  const phase = useUi((s) => s.phase);
  const at = useUi((s) => s.at);
  const sound = useUi((s) => s.sound);
  const reduced = useUi((s) => s.reduced);
  const lit = useUi((s) => s.lit);
  const revealed = useUi((s) => s.revealed);
  const ready = useUi((s) => s.ready);
  const sceneReady = useUi((s) => s.sceneReady);
  const loadPct = useUi((s) => s.loadPct);
  const now = useNow();

  const [webgl, setWebgl] = useState(false);
  const [fading, setFading] = useState(false);
  const [visited, setVisited] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string; at: [number, number, number] }[]>([]);

  const [leaving, setLeaving] = useState(false);
  const [prevPhase, setPrevPhase] = useState(phase);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (prevPhase === "journey" && phase === "explore" && !reduced) setLeaving(true);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(false), 1400);
    return () => clearTimeout(t);
  }, [leaving]);
  if (!visited && phase === "explore" && at !== "overview") setVisited(true);

  // Boot: WebGL check, motion preference, quality, deep link (?at=day3).
  useEffect(() => {
    let ok = false;
    try {
      if (new URLSearchParams(location.search).get("webgl") !== "0") {
        const gl = document.createElement("canvas").getContext("webgl2");
        ok = !!gl;
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch {}
    if (!ok) {
      window.location.replace("/simple/");
      return;
    }
    setWebgl(true);
    const params = new URLSearchParams(location.search);
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const q = params.get("quality");
    ui.set({ reduced: mq.matches || params.get("motion") === "reduced", quality: q === "low" || q === "medium" || q === "high" ? q : startingQuality() });
    const onMq = () => ui.set({ reduced: mq.matches });
    mq.addEventListener("change", onMq);
    const deep = params.get("at");
    if (isPlace(deep)) {
      world.introT = INTRO_END;
      world.minutes = byId[deep].minutes;
      ui.set({ phase: "explore", at: deep, sound: false });
      history.replaceState({ at: deep }, "");
    }
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const q = new URLSearchParams(location.search).get("at");
      const next = isPlace(e.state?.at) ? e.state.at : isPlace(q) ? q : "overview";
      if (ui.get().phase !== "explore") {
        world.introT = INTRO_END;
        ui.set({ phase: "explore" });
      }
      ui.set({ at: next });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => onTrack(setTrack), []);

  // Street and river labels: a quarter of the way along the longest feature with each name.
  useEffect(() => {
    loadCity().then((city) => {
      const all = [...city.roads, ...city.rivers];
      setTags(
        LABELLED.flatMap(([n, label]) => {
          const matches = all.filter((r) => r.n === n);
          if (!matches.length) return [];
          // Anchor each label on the stretch nearest the venues it relates to.
          const [cx, cz] = n === "Imo River" ? IKOT_OFFSET : n === "Eket–Ikot Abasi Road" ? [-6000, 1700] : [-1450, 220];
          let best: [number, number] = [matches[0].p[0], matches[0].p[1]];
          let bd = Infinity;
          for (const f of matches)
            for (let i = 0; i < f.p.length; i += 2) {
              const d = Math.hypot(f.p[i] - cx, f.p[i + 1] - cz);
              if (d < bd) {
                bd = d;
                best = [f.p[i], f.p[i + 1]];
              }
            }
          return [{ id: n, name: label, at: [best[0], 8, best[1]] as [number, number, number] }];
        }),
      );
    });
  }, []);

  const go = useCallback((id: PlaceId) => {
    if (ui.get().phase !== "explore") {
      world.introT = INTRO_END;
      ui.set({ phase: "explore" });
    }
    if (ui.get().at === id) return;
    if (ui.get().reduced) {
      setFading(true);
      setTimeout(() => setFading(false), 260);
    }
    ui.set({ at: id });
    history.pushState({ at: id }, "", id === "overview" ? location.pathname : `${location.pathname}?at=${id}`);
    if (ui.get().sound) whoosh(0.35);
  }, []);

  const skip = useCallback(() => {
    world.introT = INTRO_END;
    ui.set({ phase: "explore" });
    if (ui.get().sound && audioRunning()) musicLevel(0.6);
  }, []);

  // First visit: after 1 s on the overview, point at Day 1 and say "scroll".
  useEffect(() => {
    if (visited || phase !== "explore" || at !== "overview" || leaving) return;
    const t = setTimeout(() => setNudge(matchMedia("(hover: none)").matches ? "Swipe up or tap" : "Scroll or click"), 1000);
    return () => clearTimeout(t);
  }, [visited, phase, at, leaving]);
  const nudging = !!nudge && !visited && phase === "explore" && at === "overview";

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase !== "explore" || at === "overview") return;
    const t = setTimeout(() => headingRef.current?.focus({ preventScroll: true }), reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [at, phase, reduced]);

  useEffect(() => {
    const sync = () => {
      const wide = innerWidth >= 900;
      const open = phase === "explore" && at !== "overview";
      world.panelShift = wide ? (open ? Math.min(240, innerWidth * 0.17) : -Math.min(150, innerWidth * 0.08)) : 0;
      world.panelLift = !wide && open ? innerHeight * 0.27 : 0;
    };
    sync();
    addEventListener("resize", sync);
    return () => removeEventListener("resize", sync);
  }, [at, phase]);

  const boomed = useRef(false);
  useEffect(() => {
    if (lit > 0 && !boomed.current) {
      boomed.current = true;
      if (ui.get().sound) boom();
    }
  }, [lit]);

  // Keys: Esc/Enter skip the journey; ←/→ and ↑/↓ step through the days; Esc returns to the overview.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input, textarea, select, iframe, details")) return;
      const s = ui.get();
      if (s.phase === "journey" && (e.key === "Escape" || e.key === "Enter")) return skip();
      if (s.phase !== "explore") return;
      if (e.key === "Escape") return go("overview");
      const fwd = e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown";
      const back = e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp";
      if (fwd || back) {
        if ((e.target as Element | null)?.closest?.(".xp-panel-body")) return;
        e.preventDefault();
        step(fwd ? 1 : -1);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [go, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useRef<{ x: number; y: number } | null>(null);
  const wheel = useRef({ acc: 0, lock: 0 });
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const endDrag = () => {
    drag.current = null;
    world.drag.active = false;
  };
  function step(dir: number) {
    const i = tourOrder.indexOf(ui.get().at);
    const n = tourOrder[Math.min(tourOrder.length - 1, Math.max(0, i + dir))];
    if (n !== ui.get().at) go(n);
  }

  const toggleSound = () => {
    const on = !sound;
    ui.set({ sound: on });
    if (on && !audioRunning()) audioStart();
    audioMute(!on);
    if (on) musicLevel(0.6);
  };

  const here = byId[at];
  const dayInfo = here.day >= 0 ? event.days[here.day] : null;

  return (
    <div className="xp" data-phase={phase} data-at={at} data-reduced={reduced} data-nudging={nudging} style={dayInfo ? { ["--day" as string]: DAY_COLORS[here.day] } : undefined}>
      {!reduced && <FireCursor />}
      <div
        className="xp-world"
        aria-hidden="true"
        onPointerMove={(e) => {
          world.pointer[0] = (e.clientX / innerWidth) * 2 - 1;
          world.pointer[1] = -((e.clientY / innerHeight) * 2 - 1);
          const d = drag.current;
          if (d && ui.get().phase === "explore") {
            world.drag.yaw -= (e.clientX - d.x) * 0.0042;
            world.drag.pitch = Math.min(0.5, Math.max(-0.35, world.drag.pitch + (e.clientY - d.y) * 0.0028));
            d.x = e.clientX;
            d.y = e.clientY;
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY };
          world.drag.active = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(e) => {
          const s = ui.get();
          if (s.phase === "journey") {
            if (e.deltaY > 30) skip();
            return;
          }
          if (s.phase !== "explore") return;
          // Scroll = next / previous day. Deltas accumulate to 90, then lock for 1.1 s (one stop per gesture).
          const w = wheel.current;
          const t = performance.now();
          if (t < w.lock) return;
          w.acc += e.deltaY;
          if (Math.abs(w.acc) > 90) {
            const dir = Math.sign(w.acc);
            w.acc = 0;
            w.lock = t + 1100;
            step(dir);
          }
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = { x: t.clientX, y: t.clientY, t: performance.now() };
        }}
        onTouchEnd={(e) => {
          const t0 = touch.current;
          touch.current = null;
          if (!t0 || ui.get().phase !== "explore") return;
          const t = e.changedTouches[0];
          const dy = t.clientY - t0.y;
          const dx = t.clientX - t0.x;
          if (Math.abs(dy) > 70 && Math.abs(dy) > 1.4 * Math.abs(dx) && performance.now() - t0.t < 600) step(dy < 0 ? 1 : -1);
        }}
      >
        {webgl && <Scene />}
        <div className="xp-hotspots">
          {days.map((d) => (
            <button
              key={d.id}
              tabIndex={-1}
              ref={(el) => {
                if (el) hotspotEls.set(d.id, el);
                else hotspotEls.delete(d.id);
              }}
              className="xp-hotspot"
              data-show="false"
              data-nudge={nudging && d.id === "day1"}
              style={{ ["--day" as string]: DAY_COLORS[d.day] }}
              onClick={() => go(d.id)}
            >
              <i aria-hidden="true" />
              <span>
                <b>
                  {d.short}
                  <span className="yc-hs-place"> · {d.place}</span>
                </b>
                <small>{event.days[d.day].venue === "amalgamation" ? "Ikot Abasi · Amalgamation House" : `${dayLabel(event.days[d.day].date)} · ${d.venue && VENUE_NAMES[d.venue]}`}</small>
                {nudging && d.id === "day1" && <em className="xp-nudge-text">{nudge} to begin ↓</em>}
              </span>
            </button>
          ))}
          {tags.map((r) => (
            <span
              key={r.id}
              className="xp-road"
              data-on={phase === "explore" && (at === "overview" || (r.id === "Imo River" && at === "day3") || (r.id === "Eket–Ikot Abasi Road" && at === "day3"))}
              ref={(el) => {
                if (el) labelEls.set(r.id, { el, at: r.at });
                else labelEls.delete(r.id);
              }}
            >
              {r.name}
            </span>
          ))}
        </div>
      </div>

      <div className="xp-fade" data-on={fading || !ready} aria-hidden="true" />

      <header className="xp-bar">
        <button className="xp-brand" onClick={() => go("overview")} aria-label="Youth Choir Week: back to the overview">
          <Logo />
          <span>
            YOUTH CHOIR WEEK <em>’{String(event.year).slice(-2)}</em>
          </span>
        </button>
        <nav className="xp-actions" aria-label="Site">
          {phase !== "threshold" && sound && track && (
            <span className="xp-chip xp-nowplaying" aria-label={`Now playing: ${track.title}`}>
              <span className="xp-np-label">Now playing</span>
              <span className="xp-np-title">{track.title}</span>
            </span>
          )}
          {phase !== "threshold" && (
            <button className="xp-chip xp-sound" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Mute sound" : "Turn sound on"}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none" />
                {sound ? (
                  <>
                    <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
                    <path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
                  </>
                ) : (
                  <>
                    <path d="M16 9.5l5 5" />
                    <path d="M21 9.5l-5 5" />
                  </>
                )}
              </svg>
            </button>
          )}
          <a className="xp-register" href={event.rsvpUrl}>
            RSVP
          </a>
        </nav>
      </header>

      {phase === "threshold" && (
        <Intro
          ready={ready && sceneReady}
          progress={loadPct}
          reduced={reduced}
          kicker={`${event.name} ’${String(event.year).slice(-2)} · ${weekRange()} · ${event.city}, ${event.state}`}
          onAnswer={() => {
            ui.set({ sound: true });
            audioStart(true);
          }}
          onGo={() => {
            whoosh(1);
            if (ui.get().reduced) {
              world.introT = INTRO_END;
              ui.set({ phase: "explore" });
              musicLevel(0.6);
              return;
            }
            world.introT = 0;
            ui.set({ phase: "journey" });
          }}
          onSimple={() => window.location.assign("/simple/")}
        />
      )}

      {(phase === "journey" || leaving) && (
        <section className="xp-journey" aria-live="polite" data-leaving={phase !== "journey"}>
          <p className="xp-origin" data-on={lit === 0}>
            <span className="xp-beat">From wherever you are,</span>
            <span className="xp-beat xp-theme-beat">your voice belongs here</span>
            <small className="xp-beat">
              in {event.city}, {event.state}.
            </small>
          </p>
          <ol className="xp-richline" aria-label={event.days.map((d) => d.verb).join(", ")}>
            {event.days.map((d, i) => (
              <li key={d.day} data-on={lit > i} style={{ ["--day" as string]: DAY_COLORS[i] }}>
                {d.verb}
              </li>
            ))}
          </ol>
          {revealed && <Title now={now} />}
          <button className="xp-skip" onClick={skip}>
            Skip <kbd>Esc</kbd>
          </button>
        </section>
      )}

      {phase === "explore" && (
        <>
          {at === "overview" && (
            <section className="xp-overview" aria-labelledby="xp-o">
              <Title id="xp-o" now={now} />
              <p className="xp-hint">Scroll to travel day by day · drag to look around · click a day to jump</p>
            </section>
          )}
          <p className="xp-foot">
            <a href="/simple/">Simple view</a>
            <span>Map data © OpenStreetMap contributors</span>
          </p>
          <nav className="xp-rail" aria-label="Days of the week">
            <button onClick={() => go("overview")} aria-current={at === "overview"}>
              Week
            </button>
            {days.map((d) => (
              <button key={d.id} onClick={() => go(d.id)} aria-current={at === d.id} data-nudge={nudging && d.id === "day1"} style={{ ["--day" as string]: DAY_COLORS[d.day] }}>
                {d.short}
              </button>
            ))}
          </nav>
          {dayInfo && (
            <aside key={at} className="xp-panel" aria-labelledby="xp-h">
              <header>
                <button className="xp-back" onClick={() => go("overview")}>
                  ← The week
                </button>
                <p className="xp-kicker yc-daykicker">
                  Day {dayInfo.day} · {dayLabel(dayInfo.date)}
                </p>
                <h2 id="xp-h" ref={headingRef} tabIndex={-1}>
                  {dayInfo.title}
                </h2>
              </header>
              <div className="xp-panel-body">
                <DayPanel d={dayInfo} now={now} />
              </div>
              <footer>
                <PrevNext at={at} go={go} />
              </footer>
            </aside>
          )}
        </>
      )}

      <p className="xp-sr" aria-live="polite">
        {phase !== "explore" ? "" : at === "overview" ? "Viewing the whole week across Eket" : `Day ${dayInfo?.day}: ${dayInfo?.title} at ${here.venue && VENUE_NAMES[here.venue]}`}
      </p>
    </div>
  );
}

const VENUE_NAMES = { deExchange: "DE Exchange Hall", royalty: "Royalty Hotels", blade: "Blade Lounge", amalgamation: "Amalgamation House" } as const;
