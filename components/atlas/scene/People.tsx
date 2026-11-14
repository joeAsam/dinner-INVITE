"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { V3 } from "@/lib/atlas/journey";
import { world } from "@/lib/atlas/world";
import { seeded, toyMat } from "./kit";

/**
 * People at the venues: small stylised characters with real proportions — head, hair or
 * headwrap, arms, legs and an outfit — dressed for the occasion. Every part of every
 * person at a venue is drawn in one call per part shape, so a crowd stays cheap.
 */

export type Figure = {
  p: V3;
  /** Which way they face, radians. 0 faces the street (+Z). */
  face?: number;
  /** Height scale; 1 is about 1.75 m. */
  h?: number;
  /** Seated: on a chair, lounger or bench of seat height about 0.45 m. */
  sit?: boolean;
  /** What they are doing. Left out, a crowd mixes chatting and looking around. */
  act?: Activity;
  /** Walk back and forth between `p` and this point. */
  walk?: V3;
};

/** idle: weight shifts and glances. talk: hands and nods. speak: addressing a crowd. watch: a seated viewer. */
export type Activity = "idle" | "talk" | "speak" | "clap" | "wave" | "cheer" | "dance" | "watch" | "walk";

/** What people wear: an everyday crowd, a party night, or a formal dinner. */
export type Wardrobe = "smart" | "party" | "formal";

const SKIN = ["#8d5a3b", "#6f4329", "#a56c46", "#5b3622", "#7c4d31", "#9a6240", "#4e2e1d"];
const HAIR = ["#17110f", "#1f1612", "#2a1d17", "#120e0c"];
const SHOES = ["#1a1716", "#2b2320", "#3b2a22", "#f1ece4"];

/** Bold prints and plains, as in a Lagos crowd: ankara oranges and teals, deep blues, wine, white lace. */
const PRINTS = ["#e0662f", "#d9a12b", "#1f8a7a", "#2f5fb0", "#b7334d", "#7a3fa0", "#2c9a5a", "#e7c46b", "#c4572e", "#1d6f8f"];
const PLAINS = ["#f2ede4", "#20242e", "#2f3c56", "#e9e2d2", "#5a2f3a", "#36513f", "#d9cfbf", "#273a5c"];
const DARK = ["#16181f", "#22252f", "#1b2433", "#2a1f24"];

type Look = {
  skin: string;
  hair: string;
  hairStyle: "short" | "afro" | "bun" | "braids" | "low";
  head?: { kind: "gele" | "fila"; color: string };
  top: string;
  lower: string;
  shoes: string;
  /** dress: skirt to below the knee. robe: a full-length agbada or kaftan over trousers. */
  cut: "trousers" | "dress" | "robe";
  sleeves: "long" | "short" | "wide";
};

const pick = <T,>(list: T[], r: number) => list[Math.floor(r * list.length) % list.length];

function dress(wardrobe: Wardrobe, rand: () => number): Look {
  const woman = rand() < 0.52;
  const skin = pick(SKIN, rand());
  const hair = pick(HAIR, rand());
  const shoes = pick(SHOES, rand() * 0.75);
  if (wardrobe === "formal") {
    if (woman) {
      const c = pick(PRINTS, rand());
      return { skin, hair, hairStyle: pick(["bun", "low", "braids"] as const, rand()), head: rand() < 0.55 ? { kind: "gele", color: rand() < 0.5 ? c : "#e7c46b" } : undefined, top: c, lower: c, shoes, cut: "dress", sleeves: rand() < 0.5 ? "short" : "long" };
    }
    const robe = rand() < 0.5;
    const c = robe ? pick(["#f2ede4", "#e9e2d2", "#2f3c56", "#5a2f3a", "#1d6f8f"], rand()) : pick(DARK, rand());
    return { skin, hair, hairStyle: pick(["short", "low"] as const, rand()), head: robe && rand() < 0.7 ? { kind: "fila", color: pick(["#5a2f3a", "#2f3c56", "#e7c46b", "#20242e"], rand()) } : undefined, top: c, lower: robe ? c : pick(DARK, rand()), shoes: pick(SHOES, rand() * 0.75), cut: robe ? "robe" : "trousers", sleeves: robe ? "wide" : "long" };
  }
  if (wardrobe === "party") {
    if (woman) {
      const dressUp = rand() < 0.5;
      return { skin, hair, hairStyle: pick(["afro", "braids", "bun", "low"] as const, rand()), top: pick(PRINTS, rand()), lower: dressUp ? pick(PRINTS, rand()) : pick(PLAINS, rand()), shoes, cut: dressUp ? "dress" : "trousers", sleeves: "short" };
    }
    return { skin, hair, hairStyle: pick(["short", "afro", "low"] as const, rand()), top: rand() < 0.6 ? pick(PRINTS, rand()) : pick(PLAINS, rand()), lower: pick(DARK.concat(["#2f3c56", "#e9e2d2"]), rand()), shoes, cut: "trousers", sleeves: "short" };
  }
  // Smart: the leadership session, the cinema, the excursion.
  if (woman) {
    const inPrint = rand() < 0.55;
    const cut = rand() < 0.5 ? "dress" : "trousers";
    return { skin, hair, hairStyle: pick(["bun", "braids", "afro", "low"] as const, rand()), head: inPrint && rand() < 0.25 ? { kind: "gele", color: pick(PRINTS, rand()) } : undefined, top: inPrint ? pick(PRINTS, rand()) : pick(PLAINS, rand()), lower: cut === "dress" ? pick(PRINTS, rand()) : pick(DARK.concat(PLAINS), rand()), shoes, cut, sleeves: rand() < 0.5 ? "short" : "long" };
  }
  const robe = rand() < 0.22;
  const c = pick(robe ? PRINTS.concat(PLAINS) : PLAINS.concat(PRINTS), rand());
  return { skin, hair, hairStyle: pick(["short", "low", "afro"] as const, rand()), head: robe && rand() < 0.5 ? { kind: "fila", color: pick(PRINTS, rand()) } : undefined, top: c, lower: robe ? c : pick(DARK.concat(["#2f3c56", "#d9cfbf"]), rand()), shoes, cut: robe ? "robe" : "trousers", sleeves: robe ? "wide" : rand() < 0.5 ? "short" : "long" };
}

/* ------------------------------------------------------------------ */
/* Part shapes, built once                                             */
/* ------------------------------------------------------------------ */

const lathe = (pts: [number, number][], seg = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

let shapes: Record<string, THREE.BufferGeometry> | null = null;
function partShapes() {
  if (shapes) return shapes;
  shapes = {
    // A rounded limb 1 unit long, hanging down from its top (y = 0 → -1).
    limb: new THREE.CapsuleGeometry(0.5, 1, 4, 10).translate(0, -1, 0).scale(1, 1 / 2, 1),
    torso: lathe([[0, 0], [0.155, 0], [0.165, 0.08], [0.175, 0.3], [0.2, 0.44], [0.17, 0.5], [0.07, 0.54], [0, 0.54]], 16),
    skirt: lathe([[0, 0], [0.255, 0], [0.2, 0.3], [0.15, 0.5], [0, 0.5]], 18),
    robe: lathe([[0, 0], [0.33, 0], [0.3, 0.5], [0.26, 0.9], [0.19, 1.02], [0, 1.02]], 18),
    sleeve: lathe([[0, -0.44], [0.15, -0.44], [0.13, -0.38], [0.045, 0], [0, 0]], 12),
    head: new THREE.SphereGeometry(0.105, 16, 12).scale(1, 1.12, 1.04),
    neck: new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10),
    hand: new THREE.SphereGeometry(0.042, 10, 8),
    shoe: new THREE.SphereGeometry(0.06, 10, 6).scale(0.85, 0.55, 1.6),
    hairShort: new THREE.SphereGeometry(0.112, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 1.1, 1.06),
    hairAfro: new THREE.SphereGeometry(0.15, 16, 12).scale(1, 0.95, 1),
    bun: new THREE.SphereGeometry(0.065, 12, 10),
    braids: new THREE.CylinderGeometry(0.085, 0.06, 0.22, 12),
    gele: new THREE.SphereGeometry(0.13, 14, 10).scale(1.45, 0.85, 1.2),
    geleFan: new THREE.ConeGeometry(0.16, 0.16, 12, 1, true),
    fila: new THREE.CylinderGeometry(0.11, 0.115, 0.1, 14),
  };
  return shapes;
}

/* ------------------------------------------------------------------ */
/* Assembling a person                                                  */
/* ------------------------------------------------------------------ */

/**
 * Every part hangs from one joint, so the body can move:
 * the hips carry the torso, the head turns on the neck, arms swing at the shoulders, legs at the hips.
 */
type Bone = "body" | "head" | "armL" | "armR" | "legL" | "legR" | "feet";
type Part = { shape: string; m: THREE.Matrix4; color: string; bone: Bone };
type Joints = { hip: number; neck: number; shoulderY: number; shoulderX: number; legX: number };

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

const local = (pos: V3, rot: V3 = [0, 0, 0], scale: V3 | number = 1) => {
  _p.set(pos[0], pos[1], pos[2]);
  _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
  if (typeof scale === "number") _s.setScalar(scale);
  else _s.set(scale[0], scale[1], scale[2]);
  return new THREE.Matrix4().compose(_p, _q, _s);
};

function personParts(f: Figure, look: Look, rand: () => number): { parts: Part[]; joints: Joints } {
  const parts: Part[] = [];
  const add = (shape: string, color: string, m: THREE.Matrix4, bone: Bone) => parts.push({ shape, color, m, bone });
  const sit = !!f.sit;
  // Standing, the hips are 0.88 m up; seated, they rest on the seat.
  const hip = sit ? 0.47 : 0.88;
  const legColor = look.cut === "dress" && !sit ? look.skin : look.lower;
  const legW = 0.135;

  if (sit) {
    for (const x of [-0.09, 0.09]) {
      const bone: Bone = x < 0 ? "legL" : "legR";
      add("limb", look.lower, local([x, hip, 0.02], [-Math.PI / 2, 0, 0], [legW + 0.01, 0.44, legW + 0.01]), "feet");
      add("limb", legColor === look.lower ? look.lower : look.skin, local([x, hip, 0.44], [0, 0, 0], [legW, 0.43, legW]), bone);
      add("shoe", look.shoes, local([x, 0.035, 0.49]), bone);
    }
  } else if (look.cut !== "robe") {
    for (const x of [-0.09, 0.09]) {
      const bone: Bone = x < 0 ? "legL" : "legR";
      add("limb", legColor, local([x, hip, 0], [0, 0, x * 0.2], [legW, hip - 0.05, legW]), bone);
      add("shoe", look.shoes, local([x * 1.1, 0.035, 0.04]), bone);
    }
  } else {
    for (const x of [-0.085, 0.085]) add("shoe", look.shoes, local([x, 0.035, 0.08]), x < 0 ? "legL" : "legR");
  }

  // Skirt or full-length robe.
  if (look.cut === "dress" && !sit) add("skirt", look.lower, local([0, hip - 0.42, 0]), "body");
  if (look.cut === "dress" && sit) add("skirt", look.lower, local([0, hip - 0.06, 0.16], [-1.15, 0, 0], [1, 0.75, 1]), "feet");
  if (look.cut === "robe" && !sit) add("robe", look.top, local([0, 0.04, 0]), "body");

  // Torso, neck, head.
  const chest = hip - 0.02;
  add("torso", look.top, local([0, chest, 0], [0, 0, 0], [1.12, 1, 0.86]), "body");
  add("neck", look.skin, local([0, chest + 0.58, 0]), "body");
  const headY = chest + 0.72;
  add("head", look.skin, local([0, headY, 0.01]), "head");

  // Hair and headwear.
  if (look.head?.kind === "gele") {
    add("gele", look.head.color, local([0, headY + 0.1, -0.02], [-0.25, 0, 0]), "head");
    add("geleFan", look.head.color, local([0, headY + 0.16, -0.08], [-0.9, 0, 0], [1.2, 0.8, 1]), "head");
  } else {
    if (look.hairStyle === "afro") add("hairAfro", look.hair, local([0, headY + 0.05, -0.02]), "head");
    else if (look.hairStyle !== "low") add("hairShort", look.hair, local([0, headY + 0.005, -0.004]), "head");
    else add("hairShort", look.hair, local([0, headY + 0.012, -0.002], [0, 0, 0], [0.98, 0.9, 0.98]), "head");
    if (look.hairStyle === "bun") add("bun", look.hair, local([0, headY + 0.13, -0.08]), "head");
    if (look.hairStyle === "braids") add("braids", look.hair, local([0, headY - 0.06, -0.09], [0.2, 0, 0]), "head");
    if (look.head?.kind === "fila") add("fila", look.head.color, local([0, headY + 0.1, -0.005], [-0.12, 0, 0.08]), "head");
  }

  // Arms, relaxed at the sides; seated, the hands rest in the lap.
  for (const side of [-1, 1]) {
    const bone: Bone = side < 0 ? "armL" : "armR";
    const shoulder: V3 = [side * 0.225, chest + 0.47, 0];
    const swing = sit ? -0.55 : (rand() - 0.5) * 0.12;
    const out = side * (look.sleeves === "wide" ? 0.16 : 0.09);
    const armLen = 0.58;
    const sleeveColor = look.sleeves === "short" ? look.skin : look.top;
    if (look.sleeves === "wide") add("sleeve", look.top, local(shoulder, [swing, 0, out], [1.2, 1, 1]), bone);
    add("limb", sleeveColor, local(shoulder, [swing, 0, out], [0.1, armLen, 0.1]), bone);
    if (look.sleeves === "short") add("limb", look.top, local(shoulder, [swing, 0, out], [0.125, 0.2, 0.125]), bone);
    // The hand sits at the end of the arm.
    _m.copy(local(shoulder, [swing, 0, out]));
    const hand = new THREE.Vector3(0, -armLen - 0.03, 0).applyMatrix4(_m);
    add("hand", look.skin, local([hand.x, hand.y, hand.z]), bone);
  }
  return { parts, joints: { hip, neck: chest + 0.6, shoulderY: chest + 0.47, shoulderX: 0.225, legX: 0.09 } };
}

/* ------------------------------------------------------------------ */
/* Movement                                                             */
/* ------------------------------------------------------------------ */

/** The pose of a body at one moment: radians for turns, metres for the bob. */
type Pose = {
  bob: number;
  lean: number;
  sway: number;
  twist: number;
  headYaw: number;
  headPitch: number;
  armL: [number, number];
  armR: [number, number];
  legL: number;
  legR: number;
};

const still = (): Pose => ({ bob: 0, lean: 0, sway: 0, twist: 0, headYaw: 0, headPitch: 0, armL: [0, 0], armR: [0, 0], legL: 0, legR: 0 });

/** A slow, uneven wave: sums of sines so a gesture never repeats exactly. */
const drift = (t: number, ph: number) => Math.sin(t * 0.31 + ph) * 0.6 + Math.sin(t * 0.73 + ph * 2.3) * 0.4;
/** 0 most of the time, 1 for a stretch now and then: gestures come and go. */
const bursts = (t: number, ph: number, every = 7) => THREE.MathUtils.smoothstep(Math.sin((t + ph * 3) * ((Math.PI * 2) / every)), 0.15, 0.6);

function posePerson(act: Activity, t: number, ph: number, sit: boolean, pose: Pose) {
  Object.assign(pose, still());
  // Everyone breathes, shifts their weight and looks about.
  pose.bob = Math.sin(t * 1.6 + ph) * 0.006;
  pose.sway = sit ? 0 : Math.sin(t * 0.45 + ph) * 0.025;
  pose.headYaw = drift(t * 0.8, ph) * 0.45;
  pose.headPitch = Math.sin(t * 0.37 + ph) * 0.05;
  pose.armL = [Math.sin(t * 0.5 + ph) * 0.05, 0];
  pose.armR = [Math.sin(t * 0.5 + ph + 1) * 0.05, 0];

  switch (act) {
    case "talk": {
      // Talking with the hands: one arm comes up and moves with the words, the head nods.
      const g = bursts(t, ph, 5.5);
      const hand = Math.sin(t * 3.1 + ph) * 0.25 + Math.sin(t * 1.7 + ph) * 0.15;
      pose.armR = [-(0.75 + hand) * g + pose.armR[0] * (1 - g), 0.25 * g];
      pose.armL = [-(0.35 + Math.sin(t * 2.3 + ph) * 0.15) * bursts(t, ph + 2, 8), -0.1];
      pose.headPitch += Math.sin(t * 4.2 + ph) * 0.07 * g;
      pose.headYaw *= 0.6;
      pose.lean = (sit ? 0.06 : 0.03) * g;
      break;
    }
    case "speak": {
      // The speaker: both hands working, turning to take in the whole audience.
      pose.armR = [-0.9 - Math.sin(t * 2.4 + ph) * 0.35, 0.3 + Math.sin(t * 1.3) * 0.15];
      pose.armL = [-0.5 - Math.sin(t * 1.9 + ph + 1) * 0.3, -0.2];
      pose.headYaw = Math.sin(t * 0.5 + ph) * 0.7;
      pose.twist = Math.sin(t * 0.5 + ph) * 0.25;
      pose.headPitch = Math.sin(t * 3.7) * 0.05;
      break;
    }
    case "clap": {
      // Clapping in bursts, arms forward, hands meeting.
      const g = bursts(t, ph, 6);
      const beat = Math.abs(Math.sin(t * 9 + ph));
      pose.armL = [-1.15 * g, (0.42 - beat * 0.16) * g];
      pose.armR = [-1.15 * g, -(0.42 - beat * 0.16) * g];
      pose.headPitch += 0.05 * g;
      pose.bob += beat * 0.008 * g;
      break;
    }
    case "wave": {
      // Waving to the crowd with the right hand raised.
      pose.armR = [-0.35, 2.55 + Math.sin(t * 6 + ph) * 0.32];
      pose.headYaw = Math.sin(t * 0.6 + ph) * 0.5;
      break;
    }
    case "cheer": {
      // Both arms up, bouncing.
      const b = Math.abs(Math.sin(t * 5 + ph));
      pose.armL = [-0.3, -2.5 - b * 0.2];
      pose.armR = [-0.3, 2.5 + b * 0.2];
      pose.bob = b * 0.06;
      break;
    }
    case "dance": {
      // Bouncing on the beat, hips swinging, arms loose and high, feet stepping.
      const beat = t * 4.6 + ph;
      const b = Math.abs(Math.sin(beat));
      pose.bob = b * 0.07;
      pose.sway = Math.sin(beat) * 0.13;
      pose.twist = Math.sin(t * 1.1 + ph) * 0.55;
      pose.headPitch = Math.sin(beat * 2) * 0.08;
      pose.headYaw = Math.sin(t * 0.9 + ph) * 0.3;
      const up = bursts(t, ph, 9);
      // Elbows-in groove most of the time; now and then the hands go up, forward and over the head.
      pose.armL = [-0.75 - Math.sin(beat) * 0.45 - up * 1.6, -0.22 - up * 0.35 - Math.cos(beat) * 0.12];
      pose.armR = [-0.75 + Math.sin(beat) * 0.45 - up * 1.6, 0.22 + up * 0.35 + Math.cos(beat) * 0.12];
      if (!sit) {
        pose.legL = Math.max(0, Math.sin(beat)) * -0.35;
        pose.legR = Math.max(0, -Math.sin(beat)) * -0.35;
      }
      break;
    }
    case "watch": {
      // Watching the screen: still, an occasional turn to a neighbour, a reach for popcorn.
      pose.headYaw = (bursts(t, ph, 11) * 0.7 * Math.sign(Math.sin(ph))) + Math.sin(t * 0.2 + ph) * 0.06;
      pose.armR = [-0.35 * bursts(t, ph + 1.3, 9), 0.2];
      pose.lean = Math.sin(t * 0.3 + ph) * 0.03;
      break;
    }
    default:
      break;
  }
}

/** Walking: stride from the speed, opposite arm and leg, a small bob at each step. */
function poseWalk(phase: number, amount: number, pose: Pose) {
  const s = Math.sin(phase);
  pose.legL = -s * 0.45 * amount;
  pose.legR = s * 0.45 * amount;
  pose.armL = [s * 0.4 * amount, -0.05];
  pose.armR = [-s * 0.4 * amount, 0.05];
  pose.bob = Math.abs(Math.cos(phase)) * 0.035 * amount;
  pose.sway = Math.sin(phase) * 0.03 * amount;
  pose.headYaw = 0;
  pose.headPitch = -0.03;
}

/* ------------------------------------------------------------------ */

const _c = new THREE.Color();
const _a = new THREE.Matrix4();
const _b = new THREE.Matrix4();
const _bones = {
  body: new THREE.Matrix4(),
  head: new THREE.Matrix4(),
  armL: new THREE.Matrix4(),
  armR: new THREE.Matrix4(),
  legL: new THREE.Matrix4(),
  legR: new THREE.Matrix4(),
  feet: new THREE.Matrix4(),
};

/** A joint's turn about its pivot: T(pivot) · R · T(−pivot). */
function jointAt(out: THREE.Matrix4, px: number, py: number, pz: number, rx: number, ry: number, rz: number) {
  _q.setFromEuler(_e.set(rx, ry, rz, "YXZ"));
  out.makeTranslation(px, py, pz);
  out.multiply(_a.makeRotationFromQuaternion(_q));
  out.multiply(_a.makeTranslation(-px, -py, -pz));
  return out;
}

type Person = { f: Figure; act: Activity; ph: number; joints: Joints; speed: number; length: number };

/** A crowd of people at one venue. `site` is the venue's index: they only move while it is in view. */
export function Figures({ items, wardrobe = "smart", seed = 3, site }: { items: Figure[]; wardrobe?: Wardrobe; seed?: number; site?: number }) {
  const { people, groups } = useMemo(() => {
    const rand = seeded(seed * 97 + items.length);
    const people: Person[] = [];
    const groups = new Map<string, { person: number; bone: Bone; m: THREE.Matrix4; color: string }[]>();
    items.forEach((f, idx) => {
      const look = dress(wardrobe, rand);
      const { parts, joints } = personParts(f, look, rand);
      // Unless told otherwise, about half of a crowd chats and half just stands (or sits) and looks around.
      const act: Activity = f.act ?? (f.walk ? "walk" : rand() < 0.5 ? "talk" : "idle");
      const length = f.walk ? Math.hypot(f.walk[0] - f.p[0], f.walk[2] - f.p[2]) : 0;
      people.push({ f, act, ph: rand() * Math.PI * 2, joints, speed: 0.9 + rand() * 0.4, length });
      for (const part of parts) {
        const list = groups.get(part.shape) ?? [];
        list.push({ person: idx, bone: part.bone, m: part.m, color: part.color });
        groups.set(part.shape, list);
      }
    });
    return { people, groups: [...groups.entries()] };
  }, [items, wardrobe, seed]);

  // One world matrix per bone per person, refreshed each frame; the part sets read from it.
  const bones = useMemo(() => people.map(() => ({ body: new THREE.Matrix4(), head: new THREE.Matrix4(), armL: new THREE.Matrix4(), armR: new THREE.Matrix4(), legL: new THREE.Matrix4(), legR: new THREE.Matrix4(), feet: new THREE.Matrix4() })), [people]);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const pose = useMemo(still, []);
  const drawn = useRef(false);

  useFrame(({ clock }) => {
    const live = !world.reduced && (site === undefined || world.focus[site] > 0.01);
    if (!live && drawn.current) return;
    const t = live ? clock.elapsedTime : 0;

    people.forEach((person, i) => {
      const { f, joints: j } = person;
      const scale = f.h ?? 1;
      let x = f.p[0];
      let z = f.p[2];
      let face = f.face ?? 0;

      if (person.act === "walk" && f.walk && person.length > 0.1) {
        // Back and forth between two points, slowing to turn round at each end.
        const u = (((t * person.speed) / person.length + person.ph / Math.PI) % 2 + 2) % 2;
        const s = u < 1 ? u : 2 - u;
        const k = s * s * (3 - 2 * s);
        x = f.p[0] + (f.walk[0] - f.p[0]) * k;
        z = f.p[2] + (f.walk[2] - f.p[2]) * k;
        const forward = Math.atan2(f.walk[0] - f.p[0], f.walk[2] - f.p[2]);
        const u2 = u < 0.5 ? u + 2 : u;
        const turned = u2 < 1.5 ? THREE.MathUtils.smoothstep(u2, 0.93, 1.07) : 1 - THREE.MathUtils.smoothstep(u2, 1.93, 2.07);
        face = forward + Math.PI * turned;
        // Steps follow the actual pace, so feet stop as the walker slows at the ends.
        const pace = 6 * s * (1 - s);
        posePerson("idle", t, person.ph, false, pose);
        poseWalk(t * 7.2 * person.speed + person.ph, Math.min(1, pace * 1.4), pose);
      } else {
        posePerson(person.act, t, person.ph, !!f.sit, pose);
      }

      const b = bones[i];
      // Where the person stands, which way they face, how tall they are; plus the bob of each step.
      _b.compose(_p.set(x, f.p[1] + pose.bob * scale, z), _q.setFromEuler(_e.set(0, face, 0)), _s.setScalar(scale));
      b.feet.copy(_b);
      // Body: lean, sway and twist about the hips.
      b.body.multiplyMatrices(_b, jointAt(_bones.body, 0, j.hip, 0, pose.lean, pose.twist, pose.sway));
      b.head.multiplyMatrices(b.body, jointAt(_bones.head, 0, j.neck, 0, pose.headPitch, pose.headYaw, 0));
      b.armL.multiplyMatrices(b.body, jointAt(_bones.armL, -j.shoulderX, j.shoulderY, 0, pose.armL[0], 0, pose.armL[1]));
      b.armR.multiplyMatrices(b.body, jointAt(_bones.armR, j.shoulderX, j.shoulderY, 0, pose.armR[0], 0, pose.armR[1]));
      // Seated, only the lower legs move (from the knee); standing, the whole leg swings from the hip.
      const kneeY = f.sit ? j.hip : j.hip;
      const kneeZ = f.sit ? 0.44 : 0;
      b.legL.multiplyMatrices(_b, jointAt(_bones.legL, -j.legX, kneeY, kneeZ, pose.legL, 0, 0));
      b.legR.multiplyMatrices(_b, jointAt(_bones.legR, j.legX, kneeY, kneeZ, pose.legR, 0, 0));
    });

    groups.forEach(([, list], gi) => {
      const mesh = meshes.current[gi];
      if (!mesh) return;
      list.forEach((it, k) => mesh.setMatrixAt(k, _m.multiplyMatrices(bones[it.person][it.bone], it.m)));
      mesh.instanceMatrix.needsUpdate = true;
      if (!drawn.current) mesh.computeBoundingSphere();
    });
    drawn.current = true;
  });

  return (
    <>
      {groups.map(([shape, list], gi) => (
        <PartSet
          key={shape}
          shape={shape}
          colors={list.map((it) => it.color)}
          onMesh={(m) => {
            meshes.current[gi] = m;
          }}
        />
      ))}
    </>
  );
}

function PartSet({ shape, colors, onMesh }: { shape: string; colors: string[]; onMesh: (m: THREE.InstancedMesh | null) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = partShapes()[shape];
  // Cloth and skin are matte; a single shared white material, tinted per part.
  const material = toyMat("#ffffff", 0.85);
  useLayoutEffect(() => {
    const mesh = ref.current;
    onMesh(mesh);
    if (!mesh) return;
    colors.forEach((c, i) => mesh.setColorAt(i, _c.set(c)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // The people move, so their bounds change; skip per-frame culling (they are always near the camera when moving).
    mesh.frustumCulled = false;
    return () => onMesh(null);
  }, [colors, onMesh]);
  const small = shape === "hand" || shape === "bun" || shape === "neck";
  return <instancedMesh ref={ref} args={[geometry, material, colors.length]} castShadow={!small} receiveShadow />;
}
