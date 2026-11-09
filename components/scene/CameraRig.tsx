"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ARRIVAL_ANGLE, byId, type PlaceId } from "@/lib/destinations";
import { hotspotEls, INTRO_END, labelEls, ui, world } from "@/lib/store";

const V = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const easeInOutCubic = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const ramp = (t: number, a: number, b: number) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
const smooth = (t: number, a: number, b: number) => {
  const x = ramp(t, a, b);
  return x * x * (3 - 2 * x);
};

function pose(id: PlaceId, mobile: boolean) {
  const d = byId[id];
  const p = mobile && d.mobile ? d.mobile : d;
  return { pos: V(p.pos), look: V(p.look) };
}

/**
 * The 15.6 s beat sheet. Everything the journey shows is a function of introT:
 *   0–0.8   ember ignites far out over the sea          0–4   fire spreads along every road (to ~9.6 km)
 *   7.35    ember lands at DE Exchange (flash)           8.4 + .75·i  day i's beacon ignites (5 beacons)
 *   8.2–11  road fire settles into a glow                11.4  title reveals
 */
function timeline(t: number) {
  world.emberAlive = Math.min(smooth(t, 0, 0.8), 1 - smooth(t, 7.35, 7.75));
  world.roadsR = 9600 * (1 - Math.pow(1 - ramp(t, 0, 4.4), 2.4));
  world.roadsWave = 1 - smooth(t, 8.2, 10.5);
  world.roadsGlow = 0.42 * smooth(t, 8.5, 11);
  for (let i = 0; i < 5; i++) world.beacons[i] = smooth(t, 8.4 + 0.75 * i, 8.8 + 0.75 * i);
  const lit = [0, 1, 2, 3, 4].filter((i) => t >= 8.45 + 0.75 * i).length;
  ui.set({ lit, revealed: t > 11.4 });
}

const proj = new THREE.Vector3();
const widths = new WeakMap<HTMLElement, number>();

/** Hotspots and labels follow their 3D anchors via translate3d. Off-screen day pins clamp to the screen edge. */
function projectLabels(camera: THREE.Camera, size: { width: number; height: number }, explore: boolean) {
  const at = ui.get().at;
  for (const [id, el] of hotspotEls) {
    proj.copy(V(byId[id as PlaceId].anchor)).project(camera);
    const behind = proj.z > 1;
    let x = (proj.x * 0.5 + 0.5) * size.width;
    let y = (-proj.y * 0.5 + 0.5) * size.height;
    if (behind) {
      x = size.width - x;
      y = size.height - y;
    }
    const inside = !behind && x > 8 && x < size.width - 8 && y > 70 && y < size.height - 90;
    let w = widths.get(el);
    const key = el.querySelector(".xp-nudge-text") ? "n" : "p";
    if (!w || el.dataset.wkey !== key) {
      w = el.offsetWidth;
      el.dataset.wkey = key;
      if (w) widths.set(el, w);
    }
    // Edge pin: clamp into the frame and point towards the real location.
    if (!inside) {
      const cx = size.width / 2;
      const cy = size.height / 2;
      const ang = Math.atan2(y - cy, x - cx);
      el.style.setProperty("--edge-angle", `${ang}rad`);
      x = THREE.MathUtils.clamp(x, 24, size.width - 24 - (w ?? 0));
      y = THREE.MathUtils.clamp(y, 90, size.height - 120);
    }
    const flip = inside && (!!byId[id as PlaceId].labelLeft || x + (w ?? 0) > size.width - 10);
    el.dataset.flip = flip ? "true" : "false";
    el.dataset.edge = inside ? "false" : "true";
    el.style.transform = `translate3d(${(flip ? x - (w ?? 0) : x).toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.dataset.show = explore && id !== at ? "true" : "false";
    el.dataset.dim = at === "overview" ? "false" : "true";
  }
  for (const { el, at: a } of labelEls.values()) {
    proj.set(a[0], a[1], a[2]).project(camera);
    el.style.transform = `translate3d(${((proj.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-proj.y * 0.5 + 0.5) * size.height).toFixed(1)}px, 0)`;
    el.dataset.behind = proj.z > 1 ? "true" : "false";
  }
}

type Flight = { from: THREE.Vector3; fromLook: THREE.Vector3; to: THREE.Vector3; toLook: THREE.Vector3; ctrl: THREE.Vector3; start: number; dur: number };

const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
const tC = new THREE.Vector3();
const t2 = new THREE.Vector2();

export function CameraRig({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);

  // Arrival: in off the Atlantic (south-east), over Eket's streets, landing at DE Exchange (Day 1 & Day 5).
  const path = useMemo(() => {
    const dir = new THREE.Vector3(Math.cos(ARRIVAL_ANGLE), 0, Math.sin(ARRIVAL_ANGLE));
    const p = (d: number, y: number) => dir.clone().multiplyScalar(d).setY(y);
    const curve = new THREE.CatmullRomCurve3([p(4200, 700), p(2300, 380), p(1100, 150), p(520, 110), p(240, 120), p(70, 60), new THREE.Vector3(6, 14, -6)], false, "centripetal");
    return { curve, over: pose("overview", mobile), side: new THREE.Vector3(-dir.z, 0, dir.x), dir };
  }, [mobile]);

  const sm = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false, shift: 0, lift: 0, par: new THREE.Vector2() });
  const flight = useRef<Flight | null>(null);
  const target = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  const flightFor = useRef<PlaceId | null>(null);
  const prevPhase = useRef(ui.get().phase);
  const idle = useRef(0);

  // Dev-only debug handle: window.__ycw.camera / .world in the console.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ycw: object }).__ycw = { camera, world, scene, THREE };
  }, [camera, scene]);

  useEffect(() => {
    camera.fov = mobile ? 52 : 38;
    camera.near = 0.5;
    camera.far = 40000;
    camera.updateProjectionMatrix();
    return () => {
      if (camera.view?.enabled) camera.clearViewOffset();
    };
  }, [camera, mobile]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = ui.get();
    const now = state.clock.elapsedTime;
    if (s.phase === "journey") {
      world.introPlaying = true;
      world.introT = Math.min(INTRO_END, world.introT + dt);
      if (world.introT >= INTRO_END) ui.set({ phase: "explore" });
    } else if (s.phase === "explore") {
      world.introPlaying = false;
      if (world.introT < INTRO_END) world.introT = INTRO_END;
    }
    const t = world.introT;
    timeline(s.phase === "threshold" ? 0 : t);

    const p = ramp(t, 0.3, 7.45);
    const b = 0.45 * p + 0.55 * (0.5 - 0.5 * Math.cos(Math.PI * p));
    path.curve.getPointAt(Math.min(1, b), tA);
    world.ember = [tA.x, tA.y, tA.z];

    const m = sm.current;
    if (s.phase !== "explore") {
      // Chase cam behind the ember, then a Bézier crane up and over to the Eket overview.
      path.curve.getPointAt(Math.min(Math.max(0, b - 0.06), 0.85), tB);
      tB.y += 30 + 120 * (1 - b) + 90 * THREE.MathUtils.smoothstep(b, 0.55, 0.9);
      tB.addScaledVector(path.side, 20 + 60 * (1 - b));
      const pos = tB.clone();
      const look = tA.clone();
      const k = easeInOutCubic(ramp(t, 7.1, 15.3));
      if (k > 0) {
        const mid = pos.clone().lerp(path.over.pos, 0.35);
        mid.y = Math.max(pos.y, path.over.pos.y) + 260;
        const a = pos.clone().lerp(mid, k);
        const c = mid.clone().lerp(path.over.pos, k);
        pos.copy(a.lerp(c, k));
        look.lerp(tC.set(0, 6, 0), Math.min(1, 3 * k)).lerp(path.over.look, easeInOutCubic(ramp(t, 9.2, 15.3)));
      }
      if (s.phase === "threshold") {
        // Hold on the ember glowing out over the sea, behind the blurred intro.
        path.curve.getPointAt(0, tA);
        pos.copy(tA).addScaledVector(path.dir, 140).addScaledVector(path.side, mobile ? 0 : 30).setY(tA.y + 30);
        look.copy(tA).addScaledVector(path.dir, -700).setY(tA.y - (mobile ? 360 : 140));
        world.ember = [tA.x, tA.y, tA.z];
        world.emberAlive = 0.85 + 0.15 * Math.sin(2.2 * now);
      }
      if (!m.init) {
        m.pos.copy(pos);
        m.look.copy(look);
        m.init = true;
      }
      m.pos.lerp(pos, 1 - Math.exp(-6 * dt));
      m.look.lerp(look, 1 - Math.exp(-8 * dt));
      flightFor.current = null;
    } else {
      if (s.at !== flightFor.current || prevPhase.current !== "explore") {
        const dest = pose(s.at, mobile);
        const from = m.init ? m.pos.clone() : dest.pos.clone();
        const fromLook = m.init ? m.look.clone() : dest.look.clone();
        const dist = from.distanceTo(dest.pos);
        const ctrl = from.clone().lerp(dest.pos, 0.5);
        // Arc height grows with distance (capped), so the trip to Ikot Abasi climbs high over the town.
        ctrl.y = Math.max(from.y, dest.pos.y) + Math.min(1400, 0.22 * dist);
        flight.current = { from, fromLook, to: dest.pos, toLook: dest.look, ctrl, start: now, dur: reduced ? 0 : THREE.MathUtils.clamp(1.7 + dist / 900, 1.9, 4.6) };
        flightFor.current = s.at;
        if (!m.init || reduced) {
          m.pos.copy(dest.pos);
          m.look.copy(dest.look);
          m.init = true;
        }
      }
      const f = flight.current!;
      const a = f.dur === 0 ? 1 : ramp(now, f.start, f.start + f.dur);
      const e = easeInOutCubic(a);
      const q0 = tB.copy(f.from).lerp(f.ctrl, e);
      const q1 = tC.copy(f.ctrl).lerp(f.to, e);
      target.current.pos.copy(q0.lerp(q1, e));
      target.current.look.copy(f.fromLook).lerp(f.toLook, easeInOutCubic(Math.min(1, 1.15 * a)));
      const k = reduced ? 60 : 6;
      m.pos.lerp(target.current.pos, 1 - Math.exp(-dt * k));
      m.look.lerp(target.current.look, 1 - Math.exp(-dt * k));
    }
    prevPhase.current = s.phase;

    // Drag orbit: decays at a venue, slow auto-orbit on the overview after 5 s idle.
    const drag = world.drag;
    if (drag.active) idle.current = 0;
    else {
      idle.current += dt;
      if (s.phase === "explore" && s.at !== "overview") {
        drag.yaw *= Math.exp(-1.2 * dt);
        drag.pitch *= Math.exp(-1.6 * dt);
      } else if (s.phase === "explore" && !reduced && idle.current > 5) drag.yaw += 0.014 * dt;
      drag.pitch *= Math.exp(-1.2 * dt);
    }

    const off = tA.copy(m.pos).sub(m.look);
    off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, drag.yaw);
    const len = off.length();
    const elev = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(off.y / len, -1, 1)) + drag.pitch, 0.06, 1.45);
    const flat = Math.hypot(off.x, off.z) || 1;
    const horiz = Math.cos(elev) * len;
    off.set((off.x / flat) * horiz, Math.sin(elev) * len, (off.z / flat) * horiz);

    const par = reduced ? 0 : s.phase === "journey" ? 0.006 : 0.012;
    m.par.lerp(t2.set(world.pointer[0], world.pointer[1]), 1 - Math.exp(-3 * dt));
    camera.position.copy(m.look).add(off);
    camera.lookAt(m.look);
    camera.translateX(m.par.x * len * par);
    camera.translateY(m.par.y * len * par * 0.6);
    camera.lookAt(m.look);
    camera.updateMatrixWorld();
    world.look = [m.look.x, m.look.y, m.look.z];
    world.camY = camera.position.y;

    const ease = 1 - Math.exp(-dt * (reduced ? 60 : 5));
    m.shift += (world.panelShift - m.shift) * ease;
    m.lift += (world.panelLift - m.lift) * ease;
    if (Math.abs(m.shift) > 0.5 || Math.abs(m.lift) > 0.5) camera.setViewOffset(size.width, size.height, m.shift, m.lift, size.width, size.height);
    else if (camera.view?.enabled) camera.clearViewOffset();
    camera.near = THREE.MathUtils.clamp(camera.position.y * 0.04, 0.5, 40);
    camera.updateProjectionMatrix();

    projectLabels(camera, size, s.phase === "explore");
  });

  return null;
}
