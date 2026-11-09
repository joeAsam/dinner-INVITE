"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { seeded } from "@/lib/rand";
import { world } from "@/lib/store";
import { VENUES, type VenueKey } from "@/lib/venues";
import { getKit, placeKit } from "./kit";
import { Beam, FairyLights, HipRoof, Instances, night, useMat, useSign, WindowBlock } from "./parts";

/** Day focus 0..1 (eased in the Driver); lights idle at a glow on the overview after dark. */
const on = (day: number, idle = 0.18) => () => Math.max(world.focus[day], idle * night() * world.beacons[day]);

/** Places a venue's local frame (x right, z towards its street) on its real plot. */
function Plot({ venue, children }: { venue: VenueKey; children: ReactNode }) {
  const v = VENUES[venue];
  return (
    <group position={[v.x, 0, v.z]} rotation-y={v.yaw}>
      {children}
    </group>
  );
}

/** Warm event lighting for an evening set: a soft overhead wash + a key light, both following the day's focus. */
function EventLight({ day, position, color = "#ffc58a", power = 1 }: { day: number; position: [number, number, number]; color?: string; power?: number }) {
  const a = useRef<THREE.PointLight>(null);
  const b = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const f = Math.max(world.focus[day], 0.25 * night() * world.beacons[day]);
    if (a.current) a.current.intensity = 5200 * power * f;
    if (b.current) b.current.intensity = 1800 * power * f;
  });
  return (
    <group position={position}>
      <pointLight ref={a} position={[0, 14, 0]} color={color} distance={70} decay={1.6} intensity={0} />
      <pointLight ref={b} position={[8, 5, 12]} color="#fff0dc" distance={40} decay={1.8} intensity={0} />
    </group>
  );
}

function Ground({ w, d, color, position = [0, 0.03, 0] }: { w: number; d: number; color: string; position?: [number, number, number] }) {
  const mat = useMat({ color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  return (
    <mesh rotation-x={-Math.PI / 2} position={position} material={mat} receiveShadow>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

/** Round banquet tables with cloths and chairs, instanced. */
function Banquet({ center, rows, cols, gap }: { center: [number, number]; rows: number; cols: number; gap: number }) {
  const table = useMemo(() => new THREE.CylinderGeometry(1.1, 1.1, 0.78, 20), []);
  const cloth = useMat({ color: "#f4efe6" });
  const chair = useMemo(() => new THREE.BoxGeometry(0.45, 0.9, 0.45), []);
  const chairMat = useMat({ color: "#c9a24a", metalness: 0.4, roughness: 0.4 });
  const candle = useMemo(() => new THREE.SphereGeometry(0.09, 8, 6), []);
  const candleMat = useMat({ color: "#000", emissive: "#ffb35a", emissiveIntensity: 3, toneMapped: false });
  const { tables, chairs, candles } = useMemo(() => {
    const t: { p: [number, number, number] }[] = [];
    const c: { p: [number, number, number]; r: number }[] = [];
    const k: { p: [number, number, number] }[] = [];
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const x = center[0] + (j - (cols - 1) / 2) * gap + (i % 2) * gap * 0.25;
        const z = center[1] + (i - (rows - 1) / 2) * gap;
        t.push({ p: [x, 0.39, z] });
        k.push({ p: [x, 0.9, z] });
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          c.push({ p: [x + Math.cos(ang) * 1.6, 0.45, z + Math.sin(ang) * 1.6], r: -ang });
        }
      }
    return { tables: t, chairs: c, candles: k };
  }, [center[0], center[1], rows, cols, gap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      table.dispose();
      chair.dispose();
      candle.dispose();
    },
    [table, chair, candle],
  );
  useFrame(() => {
    candleMat.emissiveIntensity = 0.3 + 3 * Math.max(world.focus[4], 0.4 * night());
  });
  return (
    <group>
      <Instances geometry={table} material={cloth} items={tables} />
      <Instances geometry={chair} material={chairMat} items={chairs} />
      <Instances geometry={candle} material={candleMat} items={candles} />
    </group>
  );
}

/* ───────────────────────── DE Exchange: Day 1 (hall) + Day 5 (garden gala) ───────────────────────── */

function DeExchange() {
  const glass = useMat({ color: "#1d2738", emissive: "#ffd9a8", emissiveIntensity: 0.2, metalness: 0.3, roughness: 0.2 });
  const white = useMat({ color: "#cfc8bc" });
  const steel = useMat({ color: "#2d3038", metalness: 0.6, roughness: 0.35 });
  const red = useMat({ color: "#9e1b22", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const gold = useMat({ color: "#d4a63a", metalness: 0.9, roughness: 0.25, emissive: "#6b4a10", emissiveIntensity: 0.3 });
  const tent = useMat({ color: "#fffaf0", transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.6 });
  const sign = useSign("DE EXCHANGE", { fg: "#ffe2b0", glow: "#ffb050" });
  const banner = useSign("LEADERSHIP SESSION · YOUTH CHOIR WEEK", { w: 1536, h: 192, bg: "#14306b", fg: "#ffffff", font: "800 96px" });
  const backdrop = useSign("AWARDS NIGHT", { w: 1024, h: 384, bg: "#160c06", fg: "#f6c96a", font: "800 150px", glow: "#ffb347" });
  const signMat = useMat({ map: sign, emissive: "#ffffff", emissiveMap: sign, emissiveIntensity: 0.6, toneMapped: false });
  const bannerMat = useMat({ map: banner, side: THREE.DoubleSide });
  const backMat = useMat({ map: backdrop, emissive: "#ffffff", emissiveMap: backdrop, emissiveIntensity: 0.4, toneMapped: false });
  useFrame(() => {
    const d1 = world.focus[0];
    const d5 = world.focus[4];
    const n = night();
    glass.emissiveIntensity = 0.15 + 1.2 * Math.max(d1, n * 0.6);
    signMat.emissiveIntensity = 0.2 + 1.6 * n;
    backMat.emissiveIntensity = 0.15 + 1.4 * d5;
    gold.emissiveIntensity = 0.2 + 1.2 * d5;
  });
  const flagPoles = useMemo(() => [-8, -4, 4, 8].map((x) => ({ p: [x + 14, 4, 6] as [number, number, number] })), []);
  const pole = useMemo(() => new THREE.CylinderGeometry(0.08, 0.1, 8, 6), []);
  useEffect(() => () => pole.dispose(), [pole]);
  return (
    <Plot venue="deExchange">
      <Ground w={74} d={100} color="#3a3b40" position={[0, 0.03, -50]} />
      <Ground w={50} d={34} color="#33502e" position={[0, 0.05, -60]} />
      {/* Hotel tower + Exchange Hall */}
      <WindowBlock size={[30, 24, 15]} position={[-14, 12, -12]} floors={7} bays={9} seed={3} wall="#b9b2a6" />
      <mesh position={[-14, 24.6, -12]} material={steel}>
        <boxGeometry args={[30.6, 1.2, 15.6]} />
      </mesh>
      <mesh position={[-14, 21, -4.4]} material={signMat}>
        <planeGeometry args={[18, 3.4]} />
      </mesh>
      <WindowBlock size={[26, 9, 26]} position={[14, 4.5, -12]} floors={2} bays={6} wall="#c4b9a7" seed={9} lit={0.8} />
      {/* Glass entrance of the hall + canopy + banner */}
      <mesh position={[14, 3.4, 1.1]} material={glass}>
        <boxGeometry args={[16, 6.8, 0.4]} />
      </mesh>
      <mesh position={[14, 7.2, 4]} material={white} castShadow>
        <boxGeometry args={[18, 0.5, 7]} />
      </mesh>
      {[-8, 8].map((x) => (
        <mesh key={x} position={[14 + x, 3.6, 7]} material={steel}>
          <boxGeometry args={[0.3, 7.2, 0.3]} />
        </mesh>
      ))}
      <mesh position={[14, 8.6, 1.4]} material={bannerMat}>
        <planeGeometry args={[18, 2.25]} />
      </mesh>
      <Instances geometry={pole} material={steel} items={flagPoles} />
      {/* Garden gala (Day 5): marquee, tables, carpet, stage, beams */}
      <mesh position={[0, 0.06, -40]} rotation-x={-Math.PI / 2} material={red}>
        <planeGeometry args={[3, 26]} />
      </mesh>
      <group position={[0, 0, -60]}>
        {[
          [-14, -10],
          [14, -10],
          [-14, 10],
          [14, 10],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 3, z]} material={white}>
            <cylinderGeometry args={[0.15, 0.15, 6, 8]} />
          </mesh>
        ))}
        <group position={[0, 7.4, 0]} scale={[20, 1, 14]}>
          <mesh rotation-y={Math.PI / 4} material={tent}>
            <coneGeometry args={[1, 3, 4, 1, true]} />
          </mesh>
        </group>
        <Banquet center={[0, 0]} rows={3} cols={4} gap={6} />
        <EventLight day={4} position={[0, 0, 0]} power={1.1} />
        <FairyLights
          on={on(4, 0.35)}
          runs={[
            [-14, 6, -10, 14, 6, -10, 0.8],
            [-14, 6, 10, 14, 6, 10, 0.8],
            [-14, 6, -10, -14, 6, 10, 0.8],
            [14, 6, -10, 14, 6, 10, 0.8],
            [-14, 6, -10, 14, 6, 10, 1.4],
            [14, 6, -10, -14, 6, 10, 1.4],
          ]}
        />
      </group>
      <group position={[0, 0, -78]}>
        <mesh position={[0, 0.6, 0]} material={steel} receiveShadow>
          <boxGeometry args={[16, 1.2, 6]} />
        </mesh>
        <mesh position={[0, 5, -2.8]} material={backMat}>
          <planeGeometry args={[16, 6]} />
        </mesh>
        <mesh position={[0, 1.9, 0.5]} material={gold} castShadow>
          <cylinderGeometry args={[0.35, 0.6, 1.4, 12]} />
        </mesh>
        <mesh position={[0, 3, 0.5]} material={gold}>
          <sphereGeometry args={[0.45, 16, 12]} />
        </mesh>
        {[-6, -2, 2, 6].map((x, i) => (
          <Beam key={x} position={[x, 10, 2]} color={i % 2 ? "#ffd9a8" : "#ffb347"} length={22} radius={3.2} tilt={-0.35} sweep={0.5} speed={0.6} phase={i * 1.3} on={() => 0.22 * world.focus[4]} />
        ))}
      </group>
    </Plot>
  );
}

/* ───────────────────────── Royalty Hotels: Day 2 (open-air movie night) ───────────────────────── */

const filmFrag = /* glsl */ `
  uniform float uTime; uniform float uOn; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 uv = vUv;
    float bars = step(0.12, uv.y) * step(uv.y, 0.88);                         // letterbox
    float scene = floor(uTime / 4.0);                                          // cut every 4 s
    vec3 a = vec3(h(vec2(scene, 1.0)), h(vec2(scene, 2.0)), h(vec2(scene, 3.0)));
    vec3 b = vec3(h(vec2(scene, 4.0)), h(vec2(scene, 5.0)), h(vec2(scene, 6.0)));
    float pan = fract(uTime / 4.0);
    vec3 c = mix(a * vec3(1.0, 0.75, 0.6), b * vec3(0.6, 0.75, 1.0), smoothstep(0.0, 1.0, uv.x + 0.3 * sin(pan * 3.0)));
    // A slow-moving horizon and two silhouettes, so it reads as a film still rather than a test card.
    float horizon = smoothstep(0.36, 0.34, uv.y + 0.03 * sin(uv.x * 9.0 + pan * 2.0));
    c = mix(c, c * 0.25, horizon);
    for (int i = 0; i < 2; i++) {
      vec2 f = vec2(0.42 + 0.16 * float(i) + 0.05 * pan, 0.36);
      float body = step(abs(uv.x - f.x), 0.022) * step(f.y, uv.y) * step(uv.y, f.y + 0.17);
      float head = step(length((uv - f - vec2(0.0, 0.21)) * vec2(1.0, 0.55)), 0.022);
      c = mix(c, vec3(0.02), max(body, head));
    }
    c *= 0.85 + 0.15 * h(vec2(floor(uTime * 24.0), 7.0));                      // projector flicker
    gl_FragColor = vec4(c * bars * (0.05 + 1.6 * uOn), 1.0);
  }`;

function Royalty() {
  const wall = useMat({ color: "#e8d8bd" });
  const deck = useMat({ color: "#bfae92", roughness: 0.9 });
  const pool = useMat({ color: "#2fa8c9", roughness: 0.1, metalness: 0.2, emissive: "#0e5a74", emissiveIntensity: 0.2 });
  const frame = useMat({ color: "#16171c", metalness: 0.4 });
  const seatMat = useMat({ color: "#b8322c", roughness: 0.95 });
  const sign = useSign("ROYALTY HOTELS", { fg: "#ffe5a8", bg: "#1b1205", glow: "#ffc15a" });
  const signMat = useMat({ map: sign, emissive: "#ffffff", emissiveMap: sign, emissiveIntensity: 0.5, toneMapped: false });
  const film = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOn: { value: 0 } }, vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: filmFrag, toneMapped: false }), []);
  const bean = useMemo(() => new THREE.SphereGeometry(0.55, 10, 6).scale(1, 0.55, 1), []);
  useEffect(
    () => () => {
      film.dispose();
      bean.dispose();
    },
    [film, bean],
  );
  const seats = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = [];
    for (let row = 0; row < 7; row++)
      for (let i = 0; i < 12; i++) {
        const x = (i - 5.5) * 1.6 + (row % 2) * 0.4;
        out.push({ p: [x, 0.3, -48 + 6 + row * 2.2], r: 0 });
      }
    return out;
  }, []);
  useFrame((s) => {
    film.uniforms.uTime.value = s.clock.elapsedTime;
    film.uniforms.uOn.value = Math.max(world.focus[1], 0.25 * night() * world.beacons[1]);
    pool.emissiveIntensity = 0.1 + 1.1 * night();
    signMat.emissiveIntensity = 0.2 + 1.6 * night();
  });
  return (
    <Plot venue="royalty">
      <Ground w={80} d={110} color="#3b3a37" position={[0, 0.03, -30]} />
      <Ground w={46} d={34} color="#2f4d2a" position={[0, 0.05, -46]} />
      <WindowBlock size={[42, 11, 14]} position={[0, 5.5, -2]} floors={3} bays={12} wall="#cdbd9f" seed={21} />
      <HipRoof w={44} d={16} h={4} position={[0, 13, -2]} color="#8c2f22" />
      <mesh position={[0, 9.2, 5.2]} material={signMat}>
        <planeGeometry args={[16, 3]} />
      </mesh>
      <WindowBlock size={[14, 8, 18]} position={[-24, 4, -16]} floors={2} bays={4} wall="#c9b99c" seed={22} />
      <HipRoof w={16} d={20} h={3} position={[-24, 9.5, -16]} color="#8c2f22" />
      {/* Pool + deck */}
      <mesh position={[22, 0.08, -24]} rotation-x={-Math.PI / 2} material={deck} receiveShadow>
        <planeGeometry args={[18, 14]} />
      </mesh>
      <mesh position={[22, 0.1, -24]} rotation-x={-Math.PI / 2} material={pool}>
        <planeGeometry args={[12, 7]} />
      </mesh>
      {/* Open-air cinema */}
      <group position={[0, 0, -66]}>
        {[-11, 11].map((x) => (
          <mesh key={x} position={[x, 5, 0]} material={frame}>
            <boxGeometry args={[0.6, 10, 0.6]} />
          </mesh>
        ))}
        <mesh position={[0, 6.4, -0.3]} material={frame}>
          <boxGeometry args={[21, 9.4, 0.4]} />
        </mesh>
        <mesh position={[0, 6.4, 0]} material={film}>
          <planeGeometry args={[20, 8.6]} />
        </mesh>
      </group>
      <Instances geometry={bean} material={seatMat} items={seats} />
      <EventLight day={1} position={[0, 0, -40]} color="#9fb8ff" power={0.7} />
      <mesh position={[0, 1.6, -22]} material={frame} castShadow>
        <boxGeometry args={[2.4, 3.2, 2.4]} />
      </mesh>
      <group position={[0, 2.8, -23.3]} rotation-x={-Math.PI / 2 - 0.08}>
        <Beam position={[0, 0, 0]} color="#cfe0ff" length={43} radius={6} on={() => 0.07 * Math.max(world.focus[1], 0.3 * night() * world.beacons[1])} />
      </group>
      <FairyLights
        on={on(1, 0.4)}
        color="#ffe1a0"
        runs={[
          [-16, 4.5, -70, -16, 4.5, -28, 0.9],
          [16, 4.5, -70, 16, 4.5, -28, 0.9],
          [-16, 4.5, -28, 16, 4.5, -28, 1.2],
        ]}
      />
    </Plot>
  );
}

/* ───────────────────────── Blade Lounge: Day 4 (games night) ───────────────────────── */

function Blade() {
  const dark = useMat({ color: "#24242c", roughness: 0.6 });
  const glass = useMat({ color: "#141a26", emissive: "#ff7ad1", emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.4 });
  const deck = useMat({ color: "#6b4a33", roughness: 0.9 });
  const felt = useMat({ color: "#1f7a4a", roughness: 0.95 });
  const tt = useMat({ color: "#1d4fa3", roughness: 0.6 });
  const wood = useMat({ color: "#7a5434" });
  const neon = useSign("BLADE LOUNGE", { bg: "transparent", fg: "#ff74c8", glow: "#ff2aa8", font: "800 128px" });
  const neonMat = useMat({ map: neon, transparent: true, emissive: "#ffffff", emissiveMap: neon, emissiveIntensity: 1, toneMapped: false, depthWrite: false });
  const games = useSign("GAMES NIGHT", { w: 1024, h: 256, bg: "transparent", fg: "#7ff3ff", glow: "#18d0ff", font: "800 150px" });
  const gamesMat = useMat({ map: games, transparent: true, emissive: "#ffffff", emissiveMap: games, emissiveIntensity: 1, toneMapped: false, depthWrite: false });
  const stool = useMemo(() => new THREE.CylinderGeometry(0.25, 0.25, 0.75, 10), []);
  useEffect(() => () => stool.dispose(), [stool]);
  const stools = useMemo(() => {
    const r = seeded(4);
    return Array.from({ length: 18 }, () => ({ p: [(r() - 0.5) * 22, 0.52, 3 + r() * 8] as [number, number, number] }));
  }, []);
  useFrame((s) => {
    const f = world.focus[3];
    const n = night();
    const flick = 0.85 + 0.15 * Math.sin(s.clock.elapsedTime * 13) * Math.sin(s.clock.elapsedTime * 3.7);
    neonMat.emissiveIntensity = (0.4 + 2.2 * n) * flick;
    gamesMat.emissiveIntensity = (0.2 + 2.4 * f) * flick;
    gamesMat.opacity = 0.3 + 0.7 * f;
    glass.emissiveIntensity = 0.2 + 1.4 * Math.max(f, 0.5 * n);
  });
  return (
    <Plot venue="blade">
      <Ground w={52} d={34} color="#34343a" position={[0, 0.03, -5]} />
      <mesh position={[0, 3, -9]} material={dark} castShadow receiveShadow>
        <boxGeometry args={[26, 6, 14]} />
      </mesh>
      <mesh position={[0, 2.4, -1.9]} material={glass}>
        <boxGeometry args={[20, 4, 0.3]} />
      </mesh>
      <mesh position={[0, 6.9, -9]} material={dark}>
        <boxGeometry args={[27, 0.6, 15]} />
      </mesh>
      <mesh position={[0, 8.6, -2.2]} material={neonMat}>
        <planeGeometry args={[14, 2.6]} />
      </mesh>
      <mesh position={[0, 11.4, -2.4]} material={gamesMat}>
        <planeGeometry args={[12, 3]} />
      </mesh>
      {/* Terrace towards the street */}
      <mesh position={[0, 0.15, 7]} material={deck} receiveShadow>
        <boxGeometry args={[28, 0.3, 14]} />
      </mesh>
      <mesh position={[-7, 0.95, 5]} material={felt} castShadow>
        <boxGeometry args={[2.6, 0.3, 1.5]} />
      </mesh>
      <mesh position={[-7, 0.5, 5]} material={wood}>
        <boxGeometry args={[2.3, 0.7, 1.2]} />
      </mesh>
      {[0, 6].map((x) => (
        <group key={x} position={[x, 0, 9]}>
          <mesh position={[0, 0.9, 0]} material={tt} castShadow>
            <boxGeometry args={[2.7, 0.08, 1.5]} />
          </mesh>
          <mesh position={[0, 1.05, 0]} material={wood}>
            <boxGeometry args={[0.03, 0.25, 1.5]} />
          </mesh>
          <mesh position={[0, 0.45, 0]} material={dark}>
            <boxGeometry args={[2.2, 0.85, 0.2]} />
          </mesh>
        </group>
      ))}
      <Instances geometry={stool} material={wood} items={stools} />
      <EventLight day={3} position={[0, 0, 7]} color="#ffb0dc" power={0.9} />
      <mesh position={[11, 1.2, 3]} material={dark} castShadow>
        <boxGeometry args={[3, 1.2, 1.4]} />
      </mesh>
      {[9, 13].map((x) => (
        <mesh key={x} position={[x, 1.6, 2.4]} material={dark}>
          <boxGeometry args={[0.9, 3.2, 0.9]} />
        </mesh>
      ))}
      <FairyLights
        on={on(3, 0.5)}
        color="#ffd7a0"
        runs={[
          [-14, 5, 0, 14, 5, 0, 0.6],
          [-14, 5, 14, 14, 5, 14, 0.6],
          [-14, 5, 0, -14, 5, 14, 0.5],
          [14, 5, 0, 14, 5, 14, 0.5],
          [-14, 5, 0, 14, 5, 14, 1.0],
        ]}
      />
      {(["#ff4fb8", "#38d6ff", "#a26bff", "#38d6ff"] as const).map((c, i) => (
        <Beam key={i} position={[-9 + i * 6, 7.2, -1.6]} color={c} length={16} radius={2.6} tilt={-0.6} sweep={0.7} speed={0.9} phase={i * 1.7} on={() => 0.2 * world.focus[3]} />
      ))}
    </Plot>
  );
}

/* ───────────────────────── Amalgamation House, Ikot Abasi: Day 3 (excursion) ───────────────────────── */

function Amalgamation() {
  const white = useMat({ color: "#d8d2c6" });
  const shutter = useMat({ color: "#2f5a3c" });
  const post = useMat({ color: "#e2ddd2" });
  const stone = useMat({ color: "#c9c2b5", roughness: 0.9 });
  const path = useMat({ color: "#b8a68a", roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const flagMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 48;
    const g = c.getContext("2d")!;
    g.fillStyle = "#008751";
    g.fillRect(0, 0, 32, 48);
    g.fillStyle = "#ffffff";
    g.fillRect(32, 0, 32, 48);
    g.fillStyle = "#008751";
    g.fillRect(64, 0, 32, 48);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 });
  }, []);
  const flagGeo = useMemo(() => new THREE.PlaneGeometry(3, 1.5, 12, 1).translate(1.5, 0, 0), []);
  const base = useMemo(() => Float32Array.from(flagGeo.attributes.position.array as Float32Array), [flagGeo]);
  useEffect(
    () => () => {
      flagMat.map?.dispose();
      flagMat.dispose();
      flagGeo.dispose();
    },
    [flagMat, flagGeo],
  );
  const flag = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    // Flag ripple: a travelling sine on z, growing towards the fly end.
    const p = flagGeo.attributes.position;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3];
      p.setZ(i, Math.sin(x * 2.2 - t * 5) * 0.12 * x);
    }
    p.needsUpdate = true;
  });
  const columns = useMemo(() => {
    const out: { p: [number, number, number] }[] = [];
    for (let i = 0; i < 7; i++) for (const y of [1.6, 5.1]) out.push({ p: [-10.5 + i * 3.5, y, 3.4] });
    return out;
  }, []);
  const col = useMemo(() => new THREE.BoxGeometry(0.35, 3.2, 0.35), []);
  const shutters = useMemo(() => {
    const out: { p: [number, number, number] }[] = [];
    for (let i = 0; i < 6; i++) for (const y of [1.8, 5.3]) out.push({ p: [-8.75 + i * 3.5, y, 0.26] });
    return out;
  }, []);
  const shut = useMemo(() => new THREE.BoxGeometry(1.4, 2.0, 0.12), []);
  useEffect(
    () => () => {
      col.dispose();
      shut.dispose();
    },
    [col, shut],
  );
  const extras = useMemo(
    () =>
      placeKit([
        ["BRT", new THREE.Vector3(-20, 0, 18), Math.PI / 2, 0.85],
        ["PALM_A", new THREE.Vector3(15, 0, 8), 0.4, 1.1],
        ["PALM_B", new THREE.Vector3(-15, 0, 9), 1.4, 1.2],
        ["PALM_C", new THREE.Vector3(18, 0, -10), 2.1, 1],
        ["PALM_A", new THREE.Vector3(-17, 0, -12), 2.9, 1.15],
        ["TREE_BROADLEAF", new THREE.Vector3(24, 0, 4), 0, 1.3],
      ]),
    [],
  );
  useEffect(() => () => extras.forEach((m) => m.dispose()), [extras]);
  return (
    <Plot venue="amalgamation">
      <Ground w={70} d={50} color="#3f5f2e" position={[0, 0.04, -3]} />
      <mesh position={[0, 0.06, 12]} rotation-x={-Math.PI / 2} material={path}>
        <planeGeometry args={[4, 14]} />
      </mesh>
      {/* Two-storey colonial house with double veranda */}
      <mesh position={[0, 3.5, -3]} material={white} castShadow receiveShadow>
        <boxGeometry args={[24, 7, 6.5]} />
      </mesh>
      <mesh position={[0, 3.45, 1.8]} material={white}>
        <boxGeometry args={[24.4, 0.25, 3.4]} />
      </mesh>
      <Instances geometry={col} material={post} items={columns} />
      <Instances geometry={shut} material={shutter} items={shutters} />
      <HipRoof w={26} d={10.5} h={4} position={[0, 9, -1.2]} color="#8a4b32" />
      {/* Commemorative obelisk + plaque */}
      <group position={[10, 0, 14]}>
        <mesh position={[0, 0.4, 0]} material={stone}>
          <boxGeometry args={[2.6, 0.8, 2.6]} />
        </mesh>
        <mesh position={[0, 3.2, 0]} material={stone} castShadow>
          <cylinderGeometry args={[0.35, 0.7, 5, 4]} />
        </mesh>
      </group>
      {/* Flagpole */}
      <mesh position={[-8, 5, 14]} material={post}>
        <cylinderGeometry args={[0.08, 0.1, 10, 8]} />
      </mesh>
      <mesh ref={flag} position={[-8, 9.1, 14]} geometry={flagGeo} material={flagMat} castShadow />
      {extras.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </Plot>
  );
}

/* ───────────────────────── Beacons: one light pillar per day ───────────────────────── */

const pillarFrag = /* glsl */ `uniform float uA; uniform vec3 uC; uniform float uTime; uniform vec3 uBase; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ float e = pow(clamp(abs(dot(vN, vV)), 0.0, 1.0), 1.4);
    float near = smoothstep(160.0, 700.0, length(cameraPosition.xz - uBase.xz)); // fade out when you are standing at it
    float up = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
    float rings = 0.75 + 0.25 * sin(vUv.y * 60.0 - uTime * 4.0);
    gl_FragColor = vec4(uC * e * up * rings * uA * near, 1.0); }`;
const ringFrag = /* glsl */ `uniform float uA; uniform vec3 uC; uniform float uTime; varying vec2 vUv;
  void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0;
    float wave = fract(uTime * 0.45);
    float ring = exp(-pow((r - wave) * 14.0, 2.0)) * (1.0 - wave) + exp(-pow((r - 0.18) * 30.0, 2.0)) * 0.6;
    gl_FragColor = vec4(uC * ring * uA * step(r, 1.0), 1.0); }`;
const vtx = "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }";

export function Beacon({ day, position, color }: { day: number; position: [number, number, number]; color: string }) {
  const { pillar, ring } = useMemo(() => {
    const opts = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
    return {
      pillar: new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(color) }, uTime: { value: 0 }, uBase: { value: new THREE.Vector3(...position) } }, vertexShader: vtx, fragmentShader: pillarFrag, side: THREE.DoubleSide, ...opts }),
      ring: new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(color) }, uTime: { value: 0 } }, vertexShader: vtx, fragmentShader: ringFrag, ...opts }),
    };
  }, [color]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      pillar.dispose();
      ring.dispose();
    },
    [pillar, ring],
  );
  useFrame((s) => {
    const b = world.beacons[day];
    // Bright on the overview and while flying; fades to a hint once you are standing at that venue.
    const a = b * (0.35 + 0.65 * Math.max(world.overview, 1 - Math.max(...world.focus))) * (0.35 + 0.65 * night());
    pillar.uniforms.uA.value = 0.9 * a;
    ring.uniforms.uA.value = 1.2 * b * (0.4 + 0.6 * world.overview);
    pillar.uniforms.uTime.value = ring.uniforms.uTime.value = s.clock.elapsedTime + day;
  });
  return (
    <group position={position}>
      <mesh material={pillar} position={[0, 210, 0]} frustumCulled={false}>
        <cylinderGeometry args={[4, 9, 420, 24, 1, true]} />
      </mesh>
      <mesh material={ring} rotation-x={-Math.PI / 2} position={[0, 0.6, 0]} frustumCulled={false}>
        <planeGeometry args={[120, 120]} />
      </mesh>
    </group>
  );
}

export function Venues() {
  // Warm up the kit so placed props share materials.
  useMemo(() => getKit(), []);
  return (
    <group>
      <DeExchange />
      <Royalty />
      <Blade />
      <Amalgamation />
    </group>
  );
}
