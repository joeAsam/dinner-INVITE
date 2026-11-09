"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { sampleAt, useRoadPaths, type Sample } from "@/lib/paths";
import { seeded } from "@/lib/rand";
import { getKit } from "./kit";
import { U } from "./light";

/** Vehicle mix (weights and cruising speeds in m/s), as in the original. */
const TYPES = [
  { name: "CAR_SALOON", weight: 0.22, speed: 12, paint: true },
  { name: "HATCH", weight: 0.14, speed: 12, paint: true },
  { name: "CAR_SUV", weight: 0.14, speed: 12, paint: true },
  { name: "CAR_TAXI", weight: 0.1, speed: 12, paint: false },
  { name: "DANFO", weight: 0.26, speed: 10, paint: false },
  { name: "BRT", weight: 0.04, speed: 9, paint: false },
  { name: "OKADA", weight: 0.1, speed: 13, paint: false },
];
const PAINT = ["#d9d9d6", "#2b2d33", "#7d8187", "#8a1f1f", "#1f3a6b", "#e8e6df", "#3b4a3c", "#b9a27a"];

/** Traffic driving both ways along the roads, with head and tail lights after dark. */
export function Traffic({ count }: { count: number }) {
  const roads = useRoadPaths(1, false);
  const built = useMemo(() => {
    const r = seeded(51);
    const usable = roads.filter((p) => p.len > 150);
    if (!usable.length) return null;
    const slots = TYPES.map(() => 0);
    const cars = Array.from({ length: count }, () => {
      let x = r();
      let t = 0;
      while (t < TYPES.length - 1 && (x -= TYPES[t].weight) > 0) t++;
      const slot = slots[t]++;
      return { t, slot, road: usable[Math.floor(r() * usable.length)], dir: r() < 0.5 ? 1 : -1, offset: r(), speed: TYPES[t].speed + 5 * r(), order: r() };
    });
    const kit = getKit();
    const color = new THREE.Color();
    const meshes = TYPES.map((type, ti) =>
      (kit.get(type.name) ?? []).map((part) => {
        const mat = part.material.clone() as THREE.MeshStandardMaterial;
        if (mat.name.startsWith("EMIT_")) {
          mat.toneMapped = false;
          mat.emissiveIntensity = 2.5;
        }
        const im = new THREE.InstancedMesh(part.geometry, mat, Math.max(1, slots[ti]));
        im.userData.local = part.local;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.frustumCulled = false;
        if (mat.name === "PAINT" || !mat.name.startsWith("EMIT_")) {
          const pr = seeded(61 + ti);
          for (let i = 0; i < slots[ti]; i++) im.setColorAt(i, type.paint && mat.name === "PAINT" ? color.set(PAINT[Math.floor(pr() * PAINT.length)]) : color.set("#ffffff"));
        }
        return im;
      }),
    );
    // Four light points per vehicle: two warm heads, two red tails.
    const lpos = new Float32Array(count * 4 * 3).fill(-9999);
    const lcol = new Float32Array(count * 4 * 3);
    for (let i = 0; i < count; i++) lcol.set([1, 0.92, 0.75, 1, 0.92, 0.75, 1, 0.12, 0.08, 1, 0.12, 0.08], i * 12);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(lpos, 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute("color", new THREE.BufferAttribute(lcol, 3));
    const lights = new THREE.Points(
      lg,
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        vertexShader: "uniform float uPx; varying vec3 vC; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(700.0/-mv.z,0.0,9.0)*uPx; }",
        fragmentShader: "uniform float uStreet; varying vec3 vC; void main(){ float a=1.0-smoothstep(0.0,0.5,length(gl_PointCoord-.5)); a*=a; gl_FragColor=vec4(vC*a*uStreet*1.8, a*uStreet); }",
      }),
    );
    lights.frustumCulled = false;
    return { cars, meshes, lights, lpos };
  }, [roads, count]);

  useEffect(
    () => () => {
      if (!built) return;
      built.meshes.flat().forEach((m) => (m.material as THREE.Material).dispose());
      built.lights.geometry.dispose();
      (built.lights.material as THREE.Material).dispose();
    },
    [built],
  );

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), w: new THREE.Matrix4(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), p: new THREE.Vector3(), s: new THREE.Vector3(), smp: { x: 0, z: 0, hx: 0, hz: 0 } as Sample }), []);
  useFrame((st) => {
    if (!built) return;
    const traffic = 0.7;
    const t = st.clock.elapsedTime;
    const { m, w, q, up, p, s, smp } = tmp;
    for (let i = 0; i < built.cars.length; i++) {
      const c = built.cars[i];
      const len = c.road.len;
      const on = c.order < traffic;
      let d = (t * c.speed + c.offset * len) % len;
      if (c.dir < 0) d = len - d;
      sampleAt(c.road, d, smp);
      const fx = smp.hx * c.dir;
      const fz = smp.hz * c.dir;
      const lane = c.t === 6 ? 4.2 : 2.6; // keep right; motorbikes hug the kerb
      p.set(smp.x - fz * lane, 0.12, smp.z + fx * lane);
      q.setFromAxisAngle(up, Math.atan2(fx, fz));
      s.setScalar(on ? 1 : 0);
      w.compose(p, q, s);
      for (const im of built.meshes[c.t]) im.setMatrixAt(c.slot, m.multiplyMatrices(w, im.userData.local));
      const half = c.t === 5 ? 6 : c.t === 6 ? 0.9 : 2.3;
      const o = i * 12;
      const sx = -fz * 0.65;
      const sz = fx * 0.65;
      const y = on ? 0.8 : -9999;
      const L = built.lpos;
      L[o] = p.x + fx * half + sx;
      L[o + 1] = y;
      L[o + 2] = p.z + fz * half + sz;
      L[o + 3] = p.x + fx * half - sx;
      L[o + 4] = y;
      L[o + 5] = p.z + fz * half - sz;
      L[o + 6] = p.x - fx * half + sx;
      L[o + 7] = y;
      L[o + 8] = p.z - fz * half + sz;
      L[o + 9] = p.x - fx * half - sx;
      L[o + 10] = y;
      L[o + 11] = p.z - fz * half - sz;
    }
    for (const list of built.meshes) for (const im of list) im.instanceMatrix.needsUpdate = true;
    built.lights.geometry.attributes.position.needsUpdate = true;
  });

  if (!built) return null;
  return (
    <group>
      {built.meshes.flat().map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <primitive object={built.lights} />
    </group>
  );
}
