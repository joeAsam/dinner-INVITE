"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ENTRANCES, makePath, sampleAt, useRoadPaths, type Path, type Sample } from "@/lib/paths";
import { seeded } from "@/lib/rand";
import { world } from "@/lib/store";
import { toScene, type VenueKey } from "@/lib/venues";
import { ATLAS, crowdAtlas } from "./atlas";
import { LIT_GLSL, U } from "./light";

const vert = /* glsl */ `
  attribute vec3 aOffset; attribute vec3 aColor; attribute vec3 aColor2; attribute float aSkin; attribute float aSeed;
  attribute float aOrder; attribute float aHeading; attribute float aOutfit;
  uniform float uShow; uniform float uWorship; uniform float uTime; uniform float uKind;
  uniform float uCols; uniform vec2 uSize; uniform vec2 uFrame; uniform vec2 uWorld; uniform float uFeet;
  varying vec2 vUv; varying vec3 vCloth; varying vec3 vCloth2; varying vec3 vSkin; varying vec3 vW; varying float vVis;
  void main(){
    vec3 toCam = cameraPosition - aOffset; float dist = length(toCam); toCam.y = 0.0;
    vec3 tc = normalize(toCam + 1e-5);
    vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + 1e-5);
    float vis = step(aOrder, uShow);
    // Distant figures grow a little so a full stand reads as full rather than shimmering.
    float s = vis * (1.0 + max(0.0, dist - 140.0) / 300.0);
    vec3 w = aOffset + right * position.x * uWorld.x * s + vec3(0.0, 1.0, 0.0) * (position.y * uWorld.y - uFeet) * s;
    // Which way is this person facing relative to the camera? 0 = towards it.
    vec3 F = vec3(sin(aHeading), 0.0, cos(aHeading));
    float a = atan(dot(F, right), dot(F, tc)); float aa = abs(a);
    float frame, view; bool flip;
    if (uKind < 0.5) {
      view = aa < 0.39 ? 0.0 : aa < 1.96 ? 1.0 : 2.0;
      flip = a < 0.0 && view == 1.0;
      float beat = floor(uTime * 0.5 + aSeed * 9.0);
      float r = fract(aSeed * 7.31 + beat * 0.379);
      float pose = 0.0;
      if (r < uWorship * 0.6) pose = 1.0;                                                                   // hands raised
      else if (r > 0.55 && r < 0.8) { float ph = mod(floor(uTime * 1.6 + aSeed * 4.0), 4.0); pose = ph == 1.0 ? 4.0 : ph == 3.0 ? 5.0 : 0.0; } // sway
      else if (r >= 0.8) pose = 2.0 + mod(floor(uTime * 3.0 + aSeed * 5.0), 2.0);                            // clap
      frame = aOutfit * 45.0 + view * 7.0 + pose;
    } else {
      view = aa < 0.39 ? 0.0 : aa < 1.18 ? 1.0 : aa < 2.18 ? 2.0 : 3.0;
      flip = a < 0.0 && (view == 1.0 || view == 2.0);
      frame = aOutfit * 45.0 + 21.0 + view * 6.0 + mod(floor(uTime * 8.0 + aSeed * 6.0), 6.0);
    }
    float col = mod(frame, uCols), row = floor(frame / uCols);
    float fx = flip ? 0.5 - position.x : position.x + 0.5;
    vUv = vec2((col + fx) * uFrame.x / uSize.x, 1.0 - (row + 1.0) * uFrame.y / uSize.y + position.y * uFrame.y / uSize.y);
    vCloth = aColor; vCloth2 = aColor2;
    vSkin = mix(vec3(0.20,0.11,0.07), vec3(0.42,0.26,0.17), aSkin);
    vW = w; vVis = vis;
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;

const frag =
  LIT_GLSL +
  /* glsl */ `
  uniform sampler2D uAtlas; uniform float uNight;
  varying vec2 vUv; varying vec3 vCloth; varying vec3 vCloth2; varying vec3 vSkin; varying vec3 vW; varying float vVis;
  void main(){
    if (vVis < 0.5) discard;
    vec4 t = texture2D(uAtlas, vUv);
    if (t.a < 0.45) discard;
    vec3 albedo = vCloth * t.r + vSkin * t.g + vCloth2 * t.b + vec3(0.02);
    vec3 toCam = normalize(cameraPosition - vW);
    vec3 n = normalize(vec3(toCam.x, 0.55, toCam.z));
    float d = max(dot(n, uSunDir), 0.0);
    vec3 hemi = mix(uHemiGround, uHemiSky, n.y * 0.5 + 0.5) * uHemiI;
    vec3 c = albedo * (hemi + uSunColor * uSunI * d);
    // Floodlights and stage spill keep the gathered visible after dark.
    // Event lighting keeps guests visible after dark.
    c += albedo * vec3(1.0, 0.78, 0.55) * uNight * 0.22;
    gl_FragColor = vec4(fogged(c, length(vW - cameraPosition)), 1.0);
  }`;

const CLOTHES = ["#f2efe8", "#ffffff", "#e8e2d4", "#d9612b", "#2f7d4f", "#1f3f8a", "#c8962e", "#7a2b3b", "#e0b33c", "#3d3d48", "#b8452f", "#5d8fbf"].map((c) => new THREE.Color(c));

function crowdMaterial(kind: 0 | 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uAtlas: { value: crowdAtlas() },
      uShow: { value: 0 },
      uWorship: { value: 0 },
      uKind: { value: kind },
      uCols: { value: ATLAS.cols },
      uSize: { value: new THREE.Vector2(...ATLAS.size) },
      uFrame: { value: new THREE.Vector2(...ATLAS.frame) },
      uWorld: { value: new THREE.Vector2(...ATLAS.world) },
      uFeet: { value: ATLAS.feet },
    },
    vertexShader: vert,
    fragmentShader: frag,
  });
}

function billboards(count: number) {
  const g = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  g.index = plane.index;
  g.setAttribute("position", plane.getAttribute("position"));
  g.instanceCount = count;
  return g;
}

/** A gathering at one venue: positions are venue-local, everyone faces the event's focal point. */
export type Gathering = { venue: VenueKey; day: number; focal: [number, number]; spots: { x: number; z: number; r: number; n: number }[]; seated?: boolean };

export const GATHERINGS: Gathering[] = [
  { venue: "deExchange", day: 0, focal: [14, -2], spots: [{ x: 14, z: 11, r: 8, n: 46 }, { x: 4, z: 14, r: 5, n: 14 }] },
  { venue: "royalty", day: 1, focal: [0, -66], spots: [{ x: 0, z: -35, r: 9, n: 84 }], seated: true },
  { venue: "amalgamation", day: 2, focal: [0, 0], spots: [{ x: 0, z: 9, r: 6, n: 34 }, { x: -16, z: 15, r: 3, n: 8 }] },
  { venue: "blade", day: 3, focal: [0, 7], spots: [{ x: 0, z: 7, r: 11, n: 64 }] },
  { venue: "deExchange", day: 4, focal: [0, -78], spots: [{ x: 0, z: -60, r: 12, n: 96 }, { x: 0, z: -38, r: 2, n: 14 }] },
];

/** Guests at every venue. Each day's crowd fills in (by aOrder) as the camera arrives at that day. */
export function Crowd() {
  const groups = useMemo(
    () =>
      GATHERINGS.map((g, gi) => {
        const r = seeded(21 + gi);
        const count = g.spots.reduce((a, s) => a + s.n, 0);
        const off = new Float32Array(count * 3);
        const c1 = new Float32Array(count * 3);
        const c2 = new Float32Array(count * 3);
        const skin = new Float32Array(count);
        const seed = new Float32Array(count);
        const order = new Float32Array(count);
        const head = new Float32Array(count);
        const outfit = new Float32Array(count);
        const [fx, , fz] = toScene(g.venue, [g.focal[0], 0, g.focal[1]]);
        let i = 0;
        for (const sp of g.spots)
          for (let k = 0; k < sp.n; k++, i++) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * sp.r;
            const [x, , z] = toScene(g.venue, [sp.x + Math.cos(a) * d, 0, sp.z + Math.sin(a) * d]);
            off.set([x, g.seated ? -0.55 : 0.05, z], i * 3);
            const ca = CLOTHES[Math.floor(Math.pow(r(), 1.6) * CLOTHES.length)];
            const cb = CLOTHES[Math.floor(r() * CLOTHES.length)];
            c1.set([ca.r, ca.g, ca.b], i * 3);
            c2.set([cb.r, cb.g, cb.b], i * 3);
            skin[i] = r() * 0.8;
            seed[i] = r();
            order[i] = 0.15 + 0.8 * (d / (sp.r || 1)) * r();
            head[i] = Math.atan2(fx - x, fz - z) + (r() - 0.5) * 0.5;
            outfit[i] = gi === 4 && r() < 0.5 ? 7 : Math.floor(r() * 7);
          }
        const geo = billboards(count);
        geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(off, 3));
        geo.setAttribute("aColor", new THREE.InstancedBufferAttribute(c1, 3));
        geo.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 1));
        geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
        geo.setAttribute("aOrder", new THREE.InstancedBufferAttribute(order, 1));
        geo.setAttribute("aColor2", new THREE.InstancedBufferAttribute(c2, 3));
        geo.setAttribute("aHeading", new THREE.InstancedBufferAttribute(head, 1));
        geo.setAttribute("aOutfit", new THREE.InstancedBufferAttribute(outfit, 1));
        return { geo, mat: crowdMaterial(0), day: g.day };
      }),
    [],
  );
  useEffect(
    () => () =>
      groups.forEach((g) => {
        g.geo.dispose();
        g.mat.dispose();
      }),
    [groups],
  );
  useFrame(() => {
    for (const g of groups) {
      const f = world.focus[g.day];
      g.mat.uniforms.uShow.value = 0.35 + 0.65 * Math.max(f, world.beacons[g.day] * 0.3);
      g.mat.uniforms.uWorship.value = g.day === 4 || g.day === 0 ? 0.25 + 0.5 * f : 0.1;
    }
  });
  return (
    <group>
      {groups.map((g, i) => (
        <mesh key={i} geometry={g.geo} material={g.mat} frustumCulled={false} />
      ))}
    </group>
  );
}

type Walker = { path: Path; offset: number; speed: number; lateral: number };

/** People walking in along the roads on the pavement, ending at the nearest gate or ramp. */
export function Walkers({ count }: { count: number }) {
  const roads = useRoadPaths(0, true, 1600);
  const walkers = useMemo<Walker[]>(() => {
    if (!roads.length) return [];
    const r = seeded(31);
    const s: Sample = { x: 0, z: 0, hx: 0, hz: 0 };
    return Array.from({ length: count }, () => {
      const road = roads[Math.floor(r() * roads.length)];
      const pts: number[] = [];
      for (let d = road.len * (0.15 + 0.5 * r()); d < road.len; d += 18) {
        sampleAt(road, d, s);
        pts.push(s.x, 0, s.z);
      }
      sampleAt(road, road.len, s);
      pts.push(s.x, 0, s.z);
      let best = ENTRANCES[0];
      let bd = Infinity;
      for (const e of ENTRANCES) {
        const d = Math.hypot(e[0] - s.x, e[1] - s.z);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      pts.push(best[0] + (r() - 0.5) * 6, 0, best[1] + (r() - 0.5) * 6);
      return { path: makePath(pts), offset: r(), speed: 6 + 4 * r(), lateral: (r() < 0.5 ? -1 : 1) * (3.5 + 2.5 * r()) };
    });
  }, [roads, count]);
  const { geo, mat, off, heading } = useMemo(() => {
    const r = seeded(41);
    const off = new Float32Array(count * 3).fill(-9999);
    const c1 = new Float32Array(count * 3);
    const c2 = new Float32Array(count * 3);
    const skin = new Float32Array(count);
    const seed = new Float32Array(count);
    const order = new Float32Array(count);
    const outfit = new Float32Array(count);
    const heading = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = CLOTHES[Math.floor(r() * CLOTHES.length)];
      const b = CLOTHES[Math.floor(r() * CLOTHES.length)];
      c1.set([a.r, a.g, a.b], i * 3);
      c2.set([b.r, b.g, b.b], i * 3);
      skin[i] = r();
      seed[i] = r();
      order[i] = r();
      outfit[i] = r() < 0.08 ? 7 : Math.floor(r() * 7);
    }
    const g = billboards(count);
    const offAttr = new THREE.InstancedBufferAttribute(off, 3);
    offAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aOffset", offAttr);
    g.setAttribute("aColor", new THREE.InstancedBufferAttribute(c1, 3));
    g.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 1));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    g.setAttribute("aOrder", new THREE.InstancedBufferAttribute(order, 1));
    g.setAttribute("aColor2", new THREE.InstancedBufferAttribute(c2, 3));
    g.setAttribute("aOutfit", new THREE.InstancedBufferAttribute(outfit, 1));
    const hAttr = new THREE.InstancedBufferAttribute(heading, 1);
    hAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aHeading", hAttr);
    return { geo: g, mat: crowdMaterial(1), off, heading };
  }, [count]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const s = useMemo<Sample>(() => ({ x: 0, z: 0, hx: 0, hz: 0 }), []);
  useFrame((st) => {
    if (!walkers.length) return;
    mat.uniforms.uShow.value = 0.75;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      const d = (t * w.speed + w.offset * w.path.len) % w.path.len;
      sampleAt(w.path, d, s);
      const merge = Math.min(1, (w.path.len - d) / 30); // step off the pavement into the gate
      off[i * 3] = s.x - s.hz * w.lateral * merge;
      off[i * 3 + 1] = 0.05;
      off[i * 3 + 2] = s.z + s.hx * w.lateral * merge;
      heading[i] = Math.atan2(s.hx, s.hz);
    }
    geo.getAttribute("aOffset").needsUpdate = true;
    geo.getAttribute("aHeading").needsUpdate = true;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}
