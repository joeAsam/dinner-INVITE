"use client";

/**
 * Web Audio graph, structured like the original:
 *   master (0.9) ← soundtrack gain (0 → 0.45 after 1.4 s, raised to 0.6 when exploring) ← music
 *   master ← one-shot sting on "Yes", whoosh on every move, boom when the first light fires
 * The original streams a licensed soundtrack; the replica plays a generated ambient pad instead,
 * with the same cue sheet driving the "Now playing" chip.
 */
export type Track = { title: string; artist: string; url: string };
// Placeholder cue sheet: swap in the choir's own recordings (and a real audio file) when ready.
const T = (title: string): Track => ({ title, artist: "Youth Choir Week", url: "#" });
const CUES: [number, Track][] = [
  [0, T("Lift Every Voice")],
  [72, T("Overture for Eket")],
  [396, T("Harmony")],
  [537, T("Still Small Voice")],
  [637.5, T("Morning Comes")],
  [755, T("Lift Every Voice")],
];
const LOOP = 870;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let music: { gain: GainNode; start: number; stop: () => void } | null = null;
let current: Track | null = null;
const listeners = new Set<(t: Track) => void>();
let cueTimer = 0;

export function onTrack(fn: (t: Track) => void) {
  listeners.add(fn);
  if (current) fn(current);
  return () => {
    listeners.delete(fn);
  };
}

function trackAt(sec: number) {
  let t = CUES[0][1];
  for (const [at, tr] of CUES) if (sec >= at) t = tr;
  return t;
}

/** Generated ambient pad: slow chord changes on detuned saws through a breathing low-pass. */
function startPad(c: AudioContext, out: AudioNode) {
  const chords = [
    [146.83, 220, 293.66, 349.23],
    [130.81, 196, 261.63, 329.63],
    [116.54, 174.61, 233.08, 293.66],
    [130.81, 196, 246.94, 311.13],
  ];
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.6;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 500;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  const bus = c.createGain();
  bus.gain.value = 0.12;
  filter.connect(bus).connect(out);
  const voices = chords[0].map((f) => {
    const g = c.createGain();
    g.gain.value = 0.25;
    const oscs = [-6, 6].map((det) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(g);
      o.start();
      return o;
    });
    g.connect(filter);
    return oscs;
  });
  let i = 0;
  const step = () => {
    i = (i + 1) % chords.length;
    voices.forEach((pair, v) => pair.forEach((o) => o.frequency.setTargetAtTime(chords[i][v], c.currentTime, 1.6)));
  };
  const timer = window.setInterval(step, 8000);
  return () => {
    window.clearInterval(timer);
    lfo.stop();
    voices.flat().forEach((o) => o.stop());
  };
}

function sting(c: AudioContext, out: AudioNode) {
  const t = c.currentTime;
  for (const [f, d] of [
    [220, 0],
    [330, 0.05],
    [440, 0.1],
    [660, 0.16],
  ] as const) {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t + d);
    const g = c.createGain();
    g.gain.setValueAtTime(1e-4, t + d);
    g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.08);
    g.gain.exponentialRampToValueAtTime(1e-4, t + d + 2.4);
    o.connect(g).connect(out);
    o.start(t + d);
    o.stop(t + d + 2.5);
  }
}

/** Start (or resume) audio. `withSting` plays the answer sting and delays the music by 1.4 s. */
export function audioStart(withSting = false) {
  if (ctx) {
    void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  if (withSting) sting(ctx, master);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  const send = ctx.createGain();
  send.gain.value = 0.5;
  send.connect(gain);
  const stop = startPad(ctx, send);
  music = { gain, start: ctx.currentTime, stop };
  gain.gain.setTargetAtTime(0.45, ctx.currentTime + (withSting ? 1.4 : 0), 1.5);
  const tick = () => {
    if (!ctx || !music) return;
    const tr = trackAt((ctx.currentTime - music.start) % LOOP);
    if (tr !== current) {
      current = tr;
      listeners.forEach((l) => l(tr));
    }
  };
  tick();
  cueTimer = window.setInterval(tick, 500);
}

/** Raise the music bed (never below 0.45). */
export function musicLevel(v: number) {
  if (ctx && music) music.gain.gain.setTargetAtTime(Math.max(0.45, v), ctx.currentTime, 1.2);
}

/** Duck everything under a playing video. */
export function duck(on: boolean) {
  if (ctx && master) master.gain.setTargetAtTime(on ? 0.08 : 0.9, ctx.currentTime, 0.4);
}

export function audioMute(muted: boolean) {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(muted ? 1e-4 : 0.9, ctx.currentTime, 0.25);
  if (muted) void ctx.suspend();
  else void ctx.resume();
}

export const audioRunning = () => !!ctx;

export function whoosh(level = 1) {
  if (!ctx || !master) return;
  const len = Math.floor(2.2 * ctx.sampleRate);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(260, ctx.currentTime);
  bp.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 1.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(1e-4, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.18 * level, ctx.currentTime + 0.5);
  g.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 2.1);
  src.connect(bp).connect(g).connect(master);
  src.start();
}

export function boom() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 1.8);
  const g = ctx.createGain();
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
  g.gain.exponentialRampToValueAtTime(1e-4, t + 2.6);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 2.7);
  for (const f of [660, 990, 1320]) {
    const s = ctx.createOscillator();
    s.type = "sine";
    s.frequency.value = f;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(1e-4, t + 0.1);
    sg.gain.exponentialRampToValueAtTime(0.03, t + 0.8);
    sg.gain.exponentialRampToValueAtTime(1e-4, t + 4.5);
    s.connect(sg).connect(master);
    s.start(t + 0.1);
    s.stop(t + 4.6);
  }
  musicLevel(1);
}

export function audioDispose() {
  window.clearInterval(cueTimer);
  music?.stop();
  void ctx?.close();
  ctx = null;
  master = null;
  music = null;
}
