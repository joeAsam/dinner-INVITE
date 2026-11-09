"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { sampleAt, useRoadPaths, type Sample } from "@/lib/paths";
import { seeded } from "@/lib/rand";
import { ENTRANCES } from "@/lib/paths";
import type { Quality } from "@/lib/store";
import { emitterMaterials, placeKit } from "./kit";
import { U } from "./light";

type Placement = [string, THREE.Vector3, number, number];
/** Keep street furniture off the venue plots. */
const inApron = (x: number, z: number) => ENTRANCES.some(([ex, ez]) => Math.hypot(x - ex, z - ez) < 70);

/** Street furniture: double lamps, palms and trees, umbrella stalls, bus stops, the gate queue barriers, banners and stage fixtures. */
function Street({ quality }: { quality: Quality }) {
  const roads = useRoadPaths(2, false, 2400);
  const meshes = useMemo(() => {
    if (!roads.length) return [];
    const r = seeded(71);
    const out: Placement[] = [];
    const s: Sample = { x: 0, z: 0, hx: 0, hz: 0 };
    const palms = ["PALM_A", "PALM_B", "PALM_C"];
    const treeGap = quality === "low" ? 70 : 38;
    for (const road of roads) {
      for (let d = 10; d < road.len; d += 32) {
        sampleAt(road, d, s);
        if (inApron(s.x, s.z)) continue;
        out.push(["LAMP_DOUBLE", new THREE.Vector3(s.x, 0, s.z), Math.atan2(s.hx, s.hz), 1]);
      }
      for (let d = 18, side = 1; d < road.len; d += treeGap * (0.8 + 0.4 * r()), side = -side) {
        sampleAt(road, d, s);
        if (inApron(s.x, s.z)) continue;
        const off = 12 + 3 * r();
        const kind = r() < 0.15 ? "TREE_BROADLEAF" : palms[Math.floor(r() * palms.length)];
        out.push([kind, new THREE.Vector3(s.x - s.hz * off * side, 0, s.z + s.hx * off * side), r() * Math.PI * 2, 0.85 + 0.35 * r()]);
        if (r() < 0.08) out.push(["UMBRELLA_STALL", new THREE.Vector3(s.x - s.hz * (off - 4) * side, 0, s.z + s.hx * (off - 4) * side), 6.28 * r(), 1]);
        if (r() < 0.025) out.push(["BUS_STOP", new THREE.Vector3(s.x - s.hz * 9 * side, 0, s.z + s.hx * 9 * side), Math.atan2(s.hx, s.hz) + (side > 0 ? Math.PI / 2 : -Math.PI / 2), 1]);
      }
    }
    return placeKit(out);
  }, [roads, quality]);
  const emitters = useMemo(() => emitterMaterials(meshes), [meshes]);
  useEffect(
    () => () => {
      for (const m of meshes) m.dispose();
    },
    [meshes],
  );
  useFrame(() => {
    for (const e of emitters) e.emissiveIntensity = 0.2 + 4 * U.uStreet.value;
  });
  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

export function Props({ quality }: { quality: Quality }) {
  return (
    <>
      <Street quality={quality} />
    </>
  );
}
