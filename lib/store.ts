"use client";

import { useSyncExternalStore } from "react";
import type { PlaceId } from "./destinations";

export type Phase = "threshold" | "journey" | "explore";
export type Quality = "low" | "medium" | "high";

export type UiState = {
  phase: Phase;
  at: PlaceId;
  sound: boolean;
  reduced: boolean;
  quality: Quality;
  /** How many day beacons have ignited during the journey (0–5). */
  lit: number;
  /** Title block revealed during the journey. */
  revealed: boolean;
  hover: PlaceId | null;
  ready: boolean;
  loadPct: number;
  sceneReady: boolean;
  /** Intro is between typed lines: safe to mount heavy layers. */
  quiet: boolean;
  quietMoments: number;
  answered: boolean;
  prepareFirst: boolean;
  preparing: boolean;
  simpleShading: boolean;
  setupIdle: boolean;
  prepPct: number;
};

const initial: UiState = {
  phase: "threshold",
  at: "overview",
  sound: true,
  reduced: false,
  quality: "high",
  lit: 0,
  revealed: false,
  hover: null,
  ready: false,
  loadPct: 0,
  sceneReady: false,
  quiet: true,
  quietMoments: 1,
  answered: false,
  prepareFirst: false,
  preparing: false,
  simpleShading: false,
  setupIdle: false,
  prepPct: 0,
};

let state = initial;
const listeners = new Set<() => void>();

export const ui = {
  get: () => state,
  set(patch: Partial<UiState>) {
    const next = { ...state, ...patch };
    if (!(Object.keys(patch) as (keyof UiState)[]).some((k) => !Object.is(next[k], state[k]))) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useUi<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    ui.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

/** Length of the camera cinematic, in seconds. */
export const INTRO_END = 15.6;

type Vec3 = [number, number, number];

/** Mutable per-frame values shared by the DOM layer and the R3F loop (never React state). */
export const world = {
  introT: 0,
  introPlaying: false,
  ember: [0, 400, 0] as Vec3,
  emberAlive: 0,
  roadsR: 0,
  roadsGlow: 0,
  roadsWave: 1,
  /** 0→1 per day: that venue's beacon has ignited. */
  beacons: [0, 0, 0, 0, 0],
  /** 0→1 per day, eased: the camera is at that day. Drives event dressing (screen, lights, crowd). */
  focus: [0, 0, 0, 0, 0],
  /** Overview focus (city labels, routes). */
  overview: 0,
  /** Scene clock, minutes after midnight, eased towards the current stop's time. */
  minutes: 18 * 60 + 40,
  /** Where the camera is looking (keeps the sun's shadow box on the subject). */
  look: [0, 0, 0] as Vec3,
  /** Camera height (thins the fog for aerial views). */
  camY: 100,
  pointer: [0, 0] as [number, number],
  drag: { yaw: 0, pitch: 0, active: false },
  panelShift: 0,
  panelLift: 0,
};

/** DOM nodes the camera rig positions every frame. */
export const hotspotEls = new Map<string, HTMLElement>();
export const labelEls = new Map<string, { el: HTMLElement; at: Vec3 }>();
