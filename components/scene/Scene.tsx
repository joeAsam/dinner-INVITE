"use client";

import { PerformanceMonitor, useProgress } from "@react-three/drei";
import { addAfterEffect, Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { prepareFirst, simpleShading } from "@/lib/device";
import { ui, useUi } from "@/lib/store";
import { DAY_COLORS, destinations } from "@/lib/destinations";
import { Driver, Grade, LightRig, PauseWhenHidden, SkyDome } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { City } from "./City";
import { Embers } from "./Embers";
import { Crowd, Walkers } from "./People";
import { Props } from "./Props";
import { Traffic } from "./Traffic";
import { Beacon, Venues } from "./Venues";

/** Build order: each layer mounts on an idle callback after the previous one. */
const STEPS = ["city", "venues", "beacons", "people", "embers", "walkers", "cars", "props"] as const;
type Step = (typeof STEPS)[number];

/**
 * Staged mounting. During the intro, layers are only added in "quiet" moments (between typed lines),
 * so mounting never drops a frame of the typing animation.
 */
function useStagedMount() {
  const [count, setCount] = useState(0);
  const allowed = useUi((s) => s.phase !== "threshold" || s.preparing || (s.quiet && (count === 0 || s.quietMoments >= 2)));
  useEffect(() => {
    if (count >= STEPS.length || !allowed) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 60));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    let h = 0;
    const raf = requestAnimationFrame(() => {
      h = idle(
        () => {
          const s = ui.get();
          if (s.phase !== "threshold" || s.preparing || (s.quiet && (count === 0 || s.quietMoments >= 2))) setCount((c) => c + 1);
        },
        { timeout: 300 },
      ) as number;
    });
    return () => {
      cancelAnimationFrame(raf);
      cancel(h);
    };
  }, [count, allowed]);
  return count;
}

// Reveal pipeline: new objects hide on layer 7 until compiled, then queue for reveal.
const queue: THREE.Object3D[][] = [];
let compiling = 0;
const lambert = new WeakMap<THREE.Material, THREE.Material>();
function toLambert(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  if (!s.isMeshStandardMaterial) return m;
  let l = lambert.get(m);
  if (!l) {
    l = new THREE.MeshLambertMaterial({ name: s.name, color: s.color, map: s.map, emissive: s.emissive, emissiveMap: s.emissiveMap, emissiveIntensity: s.emissiveIntensity, transparent: s.transparent, opacity: s.opacity, side: s.side, vertexColors: s.vertexColors, toneMapped: s.toneMapped, fog: s.fog, depthWrite: s.depthWrite, depthTest: s.depthTest });
    lambert.set(m, l);
  }
  return l;
}
const show = (list: THREE.Object3D[]) => {
  for (const o of list) {
    o.layers.set(0);
    o.userData.shown = true;
  }
};

/** Wraps a layer: hides new objects, compiles their programs off the main path, then queues them for reveal. */
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { gl, camera, scene } = useThree();
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const fresh: THREE.Object3D[] = [];
    g.traverse((o) => {
      const r = o as THREE.Mesh;
      if ((r.isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) && o.userData.shown === undefined) {
        o.userData.shown = false;
        o.layers.set(7);
        fresh.push(o);
      }
    });
    if (!fresh.length) return;
    if (ui.get().simpleShading) for (const o of fresh) if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = Array.isArray((o as THREE.Mesh).material) ? ((o as THREE.Mesh).material as THREE.Material[]).map(toLambert) : toLambert((o as THREE.Mesh).material as THREE.Material);
    compiling++;
    const done = () => {
      compiling--;
      queue.push(fresh);
    };
    gl.compileAsync(g, camera, scene).then(done, done);
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Reveal controller. Outside the intro, compiled layers show at once. During the intro, the first
 * reveal snapshots the current frame to an overlay canvas, then gathers more layers for up to 12
 * frames and fades the snapshot out over 1.8s, so new geometry dissolves in instead of popping.
 */
function RevealController() {
  const gl = useThree((s) => s.gl);
  const st = useRef<{ state: "idle" | "copy" | "gather" | "shown" | "fading"; first: THREE.Object3D[] | null; frames: number; until: number }>({ state: "idle", first: null, frames: 0, until: 0 });
  useFrame(() => {
    const s = ui.get();
    const r = st.current;
    if (!queue.length) {
      if (r.state === "gather") r.state = "shown";
      return;
    }
    const immediate = s.reduced || s.answered || s.preparing || s.phase !== "threshold";
    const quiet = s.phase !== "threshold" || s.quiet || s.preparing;
    if (immediate) {
      if (quiet) show(queue.shift()!);
      return;
    }
    if (r.state === "idle" && quiet) {
      r.first = queue.shift()!;
      r.state = "copy";
    } else if (r.state === "gather") {
      if (quiet && r.frames < 12) {
        show(queue.shift()!);
        r.frames++;
      } else r.state = "shown";
    }
  });
  useEffect(() => {
    const r = st.current;
    const src = gl.domElement;
    const overlay = document.createElement("canvas");
    overlay.className = "xp-fade";
    overlay.setAttribute("aria-hidden", "true");
    src.parentElement?.appendChild(overlay);
    const off = addAfterEffect(() => {
      if (r.state === "copy" && r.first) {
        if (overlay.width !== src.width || overlay.height !== src.height) {
          overlay.width = src.width;
          overlay.height = src.height;
        }
        overlay.getContext("2d")?.drawImage(src, 0, 0);
        overlay.style.transition = "none";
        overlay.style.opacity = "1";
        show(r.first);
        r.first = null;
        r.frames = 0;
        r.state = "gather";
      } else if (r.state === "shown") {
        overlay.style.transition = "opacity 1800ms cubic-bezier(0.4, 0, 0.2, 1), filter 1.4s cubic-bezier(0.22, 1, 0.36, 1), transform 1.4s cubic-bezier(0.22, 1, 0.36, 1)";
        overlay.style.opacity = "0";
        r.state = "fading";
        r.until = performance.now() + 1800;
      } else if (r.state === "fading" && performance.now() >= r.until) r.state = "idle";
    });
    return () => {
      off();
      overlay.remove();
    };
  }, [gl]);
  return null;
}

/** sceneReady once every step is mounted, compiled and revealed and nothing has loaded for 0.25s. */
function ReadyWatch({ done, step, total }: { done: boolean; step: number; total: number }) {
  const { active } = useProgress();
  const quietFor = useRef(0);
  useEffect(() => {
    const s = ui.get();
    ui.set({ loadPct: s.sceneReady ? 100 : Math.min(99, Math.round((100 * step) / total)) });
    if (s.preparing) ui.set({ prepPct: s.sceneReady ? 100 : Math.min(99, Math.round(30 * (s.loadPct / 100) + (70 * step) / total)) });
  });
  useFrame((_, dt) => {
    if (ui.get().sceneReady) return;
    ui.set({ setupIdle: done && !queue.length && !compiling });
    if (!done || active || queue.length || compiling) {
      quietFor.current = 0;
      return;
    }
    quietFor.current += dt;
    if (quietFor.current > 0.25) ui.set({ sceneReady: true, loadPct: 100 });
  });
  return null;
}

function FogSetup() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#0a0b14", 30e-5);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

export default function Scene() {
  const quality = useUi((s) => s.quality);
  const simple = useUi((s) => s.simpleShading);
  const reduced = useUi((s) => s.reduced);
  const phase = useUi((s) => s.phase);
  const [off] = useState(() => new Set((new URLSearchParams(location.search).get("off") ?? "").split(",")));
  const [mobile, setMobile] = useState(false);
  const step = useStagedMount();
  const has = (s: Step) => step > STEPS.indexOf(s) && !off.has(s);

  useEffect(() => {
    const sync = () => setMobile(window.innerWidth < 760 || window.innerWidth / window.innerHeight < 0.85);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  useEffect(
    () => () => {
      queue.length = 0;
      ui.set({ ready: false, sceneReady: false });
    },
    [],
  );

  const dpr: [number, number] = phase === "threshold" ? [0.5, 0.6] : quality === "high" ? [1, 1.75] : quality === "medium" ? [1, 1.35] : [0.85, 1];
  const n = quality === "high" ? { walkers: 600, cars: 220 } : quality === "medium" ? { walkers: 360, cars: 130 } : { walkers: 140, cars: 60 };

  return (
    <Canvas
      dpr={dpr}
      flat
      shadows={!simple && (quality === "high" ? "soft" : quality === "medium")}
      gl={{ antialias: quality !== "low", powerPreference: "high-performance", alpha: false, stencil: false }}
      camera={{ position: [3000, 800, 4000], fov: 38, near: 0.5, far: 40000 }}
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production"; // surface GLSL errors while developing
        ui.set({ ready: true, prepareFirst: prepareFirst(), simpleShading: simpleShading() });
      }}
    >
      <FogSetup />
      <ReadyWatch done={step >= STEPS.length} step={step} total={STEPS.length} />
      <RevealController />
      {phase !== "threshold" && (
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => {
            const q = ui.get().quality;
            ui.set({ quality: q === "high" ? "medium" : "low" });
          }}
        />
      )}
      <SkyDome />
      <LightRig shadows={!simple && quality !== "low" && !off.has("shadows")} mapSize={quality === "high" ? 2048 : 1024} />
      {has("city") && (
        <Reveal>
          <City quality={quality} />
        </Reveal>
      )}
      {has("venues") && (
        <Reveal>
          <Venues />
        </Reveal>
      )}
      <Grade enabled={!simple && quality !== "low"} grade={0.7} />
      {has("beacons") && (
        <Reveal>
          {destinations
            .filter((d) => d.day >= 0)
            .map((d) => (
              <Beacon key={d.id} day={d.day} position={[d.anchor[0], 0, d.anchor[2]]} color={DAY_COLORS[d.day]} />
            ))}
        </Reveal>
      )}
      {has("people") && (
        <Reveal>
          <Crowd />
        </Reveal>
      )}
      {has("walkers") && (
        <Reveal>
          <Walkers count={n.walkers} />
        </Reveal>
      )}
      {has("cars") && (
        <Reveal>
          <Traffic count={n.cars} />
        </Reveal>
      )}
      {has("props") && (
        <Reveal>
          <Props quality={quality} />
        </Reveal>
      )}
      {has("embers") && (
        <Reveal>
          <Embers quality={quality} />
        </Reveal>
      )}
      <CameraRig mobile={mobile} reduced={reduced} />
      <Driver />
      {quality !== "low" && !off.has("post") && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.78} />
          <Vignette offset={0.28} darkness={0.72} />
          <Noise opacity={0.03} premultiply />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
      <PauseWhenHidden />
    </Canvas>
  );
}
