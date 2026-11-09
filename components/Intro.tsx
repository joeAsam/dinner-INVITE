"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "./Logo";
import { ui, useUi } from "@/lib/store";

import { event } from "@/lib/content";

const LEAD = event.lead;
const QUESTION = event.question;
// Characters from the event name onwards burn (e.g. "…for **Youth Choir Week 2026?**").
const FIRE_FROM = QUESTION.indexOf(event.fireFrom);

/** Per-character start times: 52 ms a character, 82 ms on spaces. */
function timing(text: string) {
  const at: number[] = [];
  let t = 0;
  for (const ch of text) {
    at.push(t);
    t += 52 + (ch === " " ? 30 : 0);
  }
  return { at, end: t };
}
const leadT = timing(LEAD);
const questionT = timing(QUESTION);

type Stage = "wait" | "prepare" | "lead" | "scatter" | "question" | "answer";

type Props = {
  ready: boolean;
  progress: number;
  reduced: boolean;
  kicker: string;
  onAnswer: () => void;
  onGo: () => void;
  onSimple: () => void;
};

export function Intro({ ready, progress, reduced, kicker, onAnswer, onGo, onSimple }: Props) {
  const [stage, setStage] = useState<Stage>("wait");
  const [leadIn, setLeadIn] = useState(900);
  const [said, setSaid] = useState(false);
  const [slow, setSlow] = useState(false);
  const [keepWaiting, setKeepWaiting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [readyToScatter, setReadyToScatter] = useState(false);
  const lit = said && ready;
  const shown: Stage = stage === "prepare" ? "prepare" : reduced ? "answer" : stage;
  const canvasReady = useUi((s) => s.ready);
  const sceneReady = useUi((s) => s.sceneReady);
  const prepPct = useUi((s) => s.prepPct);
  const setupIdle = useUi((s) => s.setupIdle);
  const prepare = useUi((s) => s.prepareFirst);
  const mounted = useRef(0);

  useEffect(() => {
    mounted.current = performance.now();
  }, []);

  // wait → (prepare →) lead, once the canvas exists or after 2.5 s.
  useEffect(() => {
    if (stage !== "wait") return;
    const go = () => {
      setLeadIn(Math.max(300, 900 - (performance.now() - mounted.current)));
      setStage(ui.get().prepareFirst ? "prepare" : "lead");
    };
    if (canvasReady) return go();
    const t = setTimeout(go, 2500);
    return () => clearTimeout(t);
  }, [stage, canvasReady]);

  // Prepare: build everything first (slow shader compilers), then fade into the lead line.
  useEffect(() => {
    if (stage !== "prepare") return;
    ui.set({ preparing: true, quiet: true, quietMoments: Math.max(2, ui.get().quietMoments) });
    const finish = () => {
      setLeaving(true);
      setTimeout(() => {
        ui.set({ preparing: false });
        setLeaving(false);
        setLeadIn(900);
        setStage("lead");
      }, 600);
    };
    if (sceneReady) return finish();
    const t = setTimeout(finish, 15000);
    return () => clearTimeout(t);
  }, [stage, sceneReady]);

  useEffect(() => {
    if (reduced) return;
    const next: Partial<Record<Stage, [Stage, number]>> = { scatter: ["question", 1300], question: ["answer", questionT.end + 450] };
    const s = next[stage];
    if (!s) return;
    const t = setTimeout(() => setStage(s[0]), s[1]);
    return () => clearTimeout(t);
  }, [stage, reduced, leadIn]);

  // Lead holds until setup has had a quiet window (or is idle), then scatters.
  useEffect(() => {
    if (stage !== "lead" || reduced) return;
    const a = setTimeout(() => setReadyToScatter(true), leadIn + leadT.end + 1200);
    const b = setTimeout(() => setStage("scatter"), leadIn + leadT.end + 1800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [stage, reduced, leadIn]);
  if (stage === "lead" && readyToScatter && (setupIdle || prepare)) setStage("scatter");

  // Quiet moments: the scene may mount heavy layers only while nothing is being typed.
  useEffect(() => {
    if (reduced || stage === "prepare" || stage === "wait") {
      ui.set({ quiet: true });
      return;
    }
    const at = (ms: number, quiet: boolean) =>
      setTimeout(() => {
        const s = ui.get();
        ui.set(quiet && !s.quiet ? { quiet, quietMoments: s.quietMoments + 1 } : { quiet });
      }, ms);
    const ts = stage === "lead" ? [at(0, true), at(leadIn, false), at(leadIn + leadT.end + 600, true)] : stage === "answer" ? [at(0, false), at(1100, true)] : [at(0, false)];
    return () => ts.forEach(clearTimeout);
  }, [stage, reduced, leadIn]);

  const goRef = useRef(onGo);
  useEffect(() => {
    goRef.current = onGo;
  });
  useEffect(() => {
    if (!lit) return;
    const t = setTimeout(() => goRef.current(), reduced ? 0 : 650);
    return () => clearTimeout(t);
  }, [lit, reduced]);

  // Still loading 8 s after "Yes": offer to keep waiting or switch to the simple site.
  useEffect(() => {
    if (!said || ready) return;
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [said, ready]);

  const isQ = shown === "question" || shown === "answer";
  const text = isQ ? QUESTION : LEAD;
  const at = isQ ? questionT.at : leadT.at.map((t) => t + leadIn);
  const last = text.length - 1;
  const sparks = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ left: `${(i * 37.3) % 100}%`, delay: `${-((i * 0.71) % 9)}s`, dur: `${7 + ((i * 1.3) % 6)}s`, size: `${2 + (i % 3)}px`, drift: `${((i * 53) % 60) - 30}px` })),
    [],
  );
  const burst = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const r = 90 + ((i * 29) % 110);
        return { x: `${Math.cos(a) * r}px`, y: `${Math.sin(a) * r * 0.7}px`, delay: `${(i % 5) * 18}ms` };
      }),
    [],
  );
  const words = [...text.matchAll(/\S+/g)].map((m) => ({ word: m[0], start: m.index ?? 0 }));
  const busy = said && !ready;

  return (
    <section className="xp-intro" data-stage={shown} data-lit={lit} aria-labelledby="xp-q">
      <div className="xp-intro-sparks" aria-hidden="true">
        {!reduced && sparks.map((s, i) => <i key={i} style={{ left: s.left, animationDelay: s.delay, animationDuration: s.dur, width: s.size, height: s.size, ["--drift" as string]: s.drift }} />)}
      </div>
      <p className="xp-intro-kicker">{kicker}</p>
      {shown === "prepare" && (
        <div className="xp-intro-prepare" data-leaving={leaving} role="status" aria-live="polite">
          <Logo size={64} />
          <p className="xp-prepare-name">
            {event.name} <em>’{String(event.year).slice(-2)}</em>
          </p>
          <p className="xp-prepare-status">{sceneReady ? "Ready when you are" : `${prepPct < 30 ? "Tuning up…" : prepPct < 60 ? "Warming our voices…" : prepPct < 90 ? "Taking our places…" : "Almost ready…"} ${prepPct}%`}</p>
        </div>
      )}
      {shown !== "prepare" && shown !== "wait" && (
        <>
          <h1 key={text} id="xp-q" className="xp-intro-line" aria-label={QUESTION} data-q={isQ}>
            {words.map(({ word, start }, wi) => (
              <Fragment key={start}>
                {wi > 0 && " "}
                <span className="w">
                  {[...word].map((ch, ci) => {
                    const n = start + ci;
                    return (
                      <span
                        key={n}
                        aria-hidden="true"
                        data-ch={ch}
                        className={isQ && n >= FIRE_FROM ? "fire" : undefined}
                        style={{ ["--t" as string]: `${at[n]}ms`, ["--i" as string]: n, ["--dx" as string]: `${((n * 47) % 70) - 35}px`, ["--dy" as string]: `${-60 - ((n * 31) % 90)}px`, ["--r" as string]: `${((n * 23) % 50) - 25}deg` }}
                      >
                        {ch}
                        <b className={n === last ? "xp-caret last" : "xp-caret"} />
                      </span>
                    );
                  })}
                </span>
              </Fragment>
            ))}
          </h1>
          <div className="xp-intro-answer" data-on={shown === "answer"} data-said={said}>
            <button
              className="xp-yes"
              aria-describedby="xp-intro-fine"
              aria-busy={busy}
              onClick={() => {
                if (said) return;
                setSaid(true);
                const s = ui.get();
                ui.set(s.quiet ? { answered: true } : { quiet: true, quietMoments: s.quietMoments + 1, answered: true });
                onAnswer();
              }}
            >
              <span className="xp-yes-ring" aria-hidden="true" />
              <span className="xp-yes-label">{busy ? `${progress < 34 ? "Tuning up…" : progress < 67 ? "Warming our voices…" : "Taking our places…"} ${Math.round(progress)}%` : "Yes, I’m ready"}</span>
              {busy && (
                <span className="xp-yes-progress" aria-hidden="true">
                  <i style={{ transform: `scaleX(${Math.max(0.04, progress / 100)})` }} />
                </span>
              )}
              <span className="xp-yes-burst" aria-hidden="true">
                {burst.map((b, i) => (
                  <i key={i} style={{ ["--x" as string]: b.x, ["--y" as string]: b.y, animationDelay: b.delay }} />
                ))}
              </span>
            </button>
            {!slow || ready || keepWaiting ? (
              <p id="xp-intro-fine" className="xp-intro-fine" aria-live="polite">
                {busy ? "Starting as soon as Eket is ready" : "Sound on · about 15 seconds · then scroll through the week"}
              </p>
            ) : (
              <div className="xp-intro-slow" role="alert">
                <p>Your connection is taking a while to bring Eket in.</p>
                <div>
                  <button onClick={() => setKeepWaiting(true)}>Keep waiting</button>
                  <button onClick={onSimple}>Go to the simple site</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
