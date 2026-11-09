"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seeded } from "@/lib/rand";
import { lightState } from "./light";

/** Shared building blocks for the venue models. */

export const night = () => lightState.light?.windows ?? 0;

export function useMat(params: THREE.MeshStandardMaterialParameters) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85, ...params }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/** Canvas text sign → texture. */
export function useSign(text: string, opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string; glow?: string } = {}) {
  const tex = useMemo(() => {
    const { w = 1024, h = 192, bg = "#0b0e18", fg = "#ffd9a8", font = "800 112px", glow } = opts;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    if (bg !== "transparent") {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    }
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-archivo").trim() || "Archivo, sans-serif";
    g.font = `${font} ${family}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (glow) {
      g.shadowColor = glow;
      g.shadowBlur = 28;
    }
    g.fillStyle = fg;
    g.fillText(text, w / 2, h / 2 + 6, w - 40);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** A block with a lit window grid on its four sides (emissive texture, brighter at night). */
export function WindowBlock({ size, position, wall = "#d9d2c4", glass = "#ffcf8a", floors, bays, lit = 0.6, seed = 1 }: { size: [number, number, number]; position: [number, number, number]; wall?: string; glass?: string; floors: number; bays: number; lit?: number; seed?: number }) {
  const { mat, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, 256, 256);
    const r = seeded(seed);
    const cw = 256 / bays;
    const ch = 256 / floors;
    for (let f = 0; f < floors; f++)
      for (let b = 0; b < bays; b++) {
        const on = r() < lit;
        g.fillStyle = on ? glass : "#1a2030";
        g.fillRect(b * cw + cw * 0.2, f * ch + ch * 0.25, cw * 0.6, ch * 0.5);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.8, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0.1 });
    m.userData.graded = true;
    return { mat: m, tex: t };
  }, [wall, glass, floors, bays, lit, seed]);
  useEffect(
    () => () => {
      mat.dispose();
      tex.dispose();
    },
    [mat, tex],
  );
  useFrame(() => {
    mat.emissiveIntensity = 0.05 + 1.6 * night();
  });
  return (
    <mesh position={position} material={mat} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Hip roof (4-sided pyramid squashed to the footprint). */
export function HipRoof({ w, d, h, position, color = "#8b3a2b" }: { w: number; d: number; h: number; position: [number, number, number]; color?: string }) {
  const mat = useMat({ color, roughness: 0.7, metalness: 0.2 });
  // Rotate the 4-sided cone so its edges are axis-aligned, THEN stretch it to the footprint.
  // (On one object three.js scales before rotating, which would give a huge diamond instead.)
  return (
    <group position={position} scale={[w / Math.SQRT2, 1, d / Math.SQRT2]}>
      <mesh rotation-y={Math.PI / 4} material={mat} castShadow>
        <coneGeometry args={[1, h, 4, 1]} />
      </mesh>
    </group>
  );
}

/** Strings of fairy lights between posts (additive points, twinkle, follow `on`). */
export function FairyLights({ runs, color = "#ffd28a", on }: { runs: [number, number, number, number, number, number, number][]; color?: string; on: () => number }) {
  const { geo, mat } = useMemo(() => {
    const pts: number[] = [];
    const seeds: number[] = [];
    for (const [x0, y0, z0, x1, y1, z1, sag] of runs) {
      const n = Math.max(6, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.2));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * sag, z0 + (z1 - z0) * t);
        seeds.push(Math.random());
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uOn: { value: 0 }, uTime: { value: 0 }, uC: { value: new THREE.Color(color) }, uPx: { value: 1 } },
      vertexShader: "attribute float aSeed; uniform float uTime; uniform float uOn; uniform float uPx; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; vA=uOn*(0.7+0.3*sin(uTime*3.0+aSeed*40.0)); gl_PointSize=clamp(260.0/-mv.z,1.5,10.0)*uPx; }",
      fragmentShader: "uniform vec3 uC; varying float vA; void main(){ float a=1.0-smoothstep(0.0,0.5,length(gl_PointCoord-.5)); a*=a; gl_FragColor=vec4(uC*a*vA*2.2, a*vA); }",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo: g, mat: m };
  }, [JSON.stringify(runs), color]); // eslint-disable-line react-hooks/exhaustive-deps -- inline arrays: key by value
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame((s) => {
    mat.uniforms.uOn.value = on();
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    mat.uniforms.uPx.value = s.viewport.dpr;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

const beamVert = "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }";
const beamFrag = "uniform float uA; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e=pow(clamp(abs(dot(vN,vV)),0.0,1.0),1.6); float along=pow(clamp(vUv.y,0.0,1.0),1.4); gl_FragColor=vec4(uC*e*along*uA,1.0); }";

/** Fresnel light cone (apex at the fixture), optionally sweeping. */
export function Beam({ position, color, length, radius, tilt = 0, sweep = 0, speed = 0.5, phase = 0, on }: { position: [number, number, number]; color: string; length: number; radius: number; tilt?: number; sweep?: number; speed?: number; phase?: number; on: () => number }) {
  const group = useRef<THREE.Group>(null);
  const { geo, mat } = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 24, 1, true);
    g.translate(0, -0.5, 0);
    const m = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(color) } }, vertexShader: beamVert, fragmentShader: beamFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    return { geo: g, mat: m };
  }, [color]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame((s) => {
    mat.uniforms.uA.value = on();
    if (group.current) {
      const t = s.clock.elapsedTime * speed + phase;
      group.current.rotation.set(tilt + sweep * 0.5 * Math.sin(t), 0, sweep * Math.cos(t * 1.3));
    }
  });
  return (
    <group position={position} ref={group}>
      <mesh geometry={geo} material={mat} scale={[radius, length, radius]} frustumCulled={false} />
    </group>
  );
}

/** Instanced copies of one geometry at local transforms. */
export function Instances({ geometry, material, items }: { geometry: THREE.BufferGeometry; material: THREE.Material; items: { p: [number, number, number]; r?: number; s?: [number, number, number] }[] }) {
  const mesh = useMemo(() => {
    const im = new THREE.InstancedMesh(geometry, material, items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    items.forEach((it, i) => im.setMatrixAt(i, m.compose(new THREE.Vector3(...it.p), q.setFromAxisAngle(up, it.r ?? 0), new THREE.Vector3(...(it.s ?? [1, 1, 1])))));
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }, [geometry, material, items]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  return <primitive object={mesh} />;
}
