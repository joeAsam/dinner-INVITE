import * as THREE from "three";

/**
 * Procedural stand-in for the original's prop / vehicle / people GLB kits.
 * Each named model is a list of parts (geometry + material + local matrix), so it can be
 * instanced part by part exactly the way the original instances meshes pulled from a GLB.
 * Materials whose name starts with EMIT_ glow (toneMapped off), like the original's emitters.
 */
export type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 };

const mats = new Map<string, THREE.Material>();
function std(name: string, color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = `${name}|${color}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
    m.name = name;
    mats.set(key, m);
  }
  return m;
}
const emit = (name: string, color: string) => std(`EMIT_${name}`, "#000000", { emissive: new THREE.Color(color), emissiveIntensity: 1, toneMapped: false });

const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);

function vehicle(len: number, width: number, bodyH: number, cabin: [number, number, number] | null, body: THREE.Material, extras: Part[] = []): Part[] {
  const glass = std("GLASS", "#151b26", { roughness: 0.2, metalness: 0.4 });
  const tyre = std("TYRE", "#111111");
  const parts: Part[] = [{ geometry: box(width, bodyH, len), material: body, local: at(0, 0.35 + bodyH / 2, 0) }];
  if (cabin) parts.push({ geometry: box(width * 0.92, cabin[1], cabin[0]), material: glass, local: at(0, 0.35 + bodyH + cabin[1] / 2, cabin[2]) });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ geometry: cyl(0.34, 0.34, 0.25, 10), material: tyre, local: at((sx * width) / 2, 0.34, sz * len * 0.32, 0, 0, Math.PI / 2) });
  parts.push({ geometry: box(width * 0.8, 0.12, 0.05), material: emit("HEAD", "#fff1d0"), local: at(0, 0.35 + bodyH * 0.6, len / 2 + 0.02) });
  parts.push({ geometry: box(width * 0.8, 0.12, 0.05), material: emit("TAIL", "#ff2a1a"), local: at(0, 0.35 + bodyH * 0.6, -len / 2 - 0.02) });
  return [...parts, ...extras];
}

function person(variant: number, mode: "" | "_WALK" | "_RAISED"): Part[] {
  const clothes = ["#f2efe8", "#d9612b", "#2f7d4f", "#1f3f8a", "#c8962e", "#7a2b3b", "#e0b33c", "#3d3d48", "#b8452f", "#5d8fbf"];
  const top = std("CLOTH", clothes[variant % clothes.length]);
  const bottom = std("CLOTH", clothes[(variant * 3 + 2) % clothes.length]);
  const skin = std("SKIN", variant % 3 === 0 ? "#3b2216" : variant % 3 === 1 ? "#5a3522" : "#6b432c");
  const stride = mode === "_WALK" ? 0.35 : 0;
  const parts: Part[] = [
    { geometry: cyl(0.09, 0.08, 0.85), material: bottom, local: at(-0.1, 0.43, 0, stride, 0, 0) },
    { geometry: cyl(0.09, 0.08, 0.85), material: bottom, local: at(0.1, 0.43, 0, -stride, 0, 0) },
    { geometry: cyl(0.2, 0.17, 0.65), material: top, local: at(0, 1.18, 0) },
    { geometry: new THREE.SphereGeometry(0.12, 10, 8), material: skin, local: at(0, 1.66, 0) },
  ];
  const armRot = mode === "_RAISED" ? Math.PI * 0.9 : mode === "_WALK" ? 0.3 : 0.08;
  parts.push({ geometry: cyl(0.05, 0.045, 0.62), material: top, local: at(-0.26, mode === "_RAISED" ? 1.72 : 1.2, 0, 0, 0, -armRot) });
  parts.push({ geometry: cyl(0.05, 0.045, 0.62), material: top, local: at(0.26, mode === "_RAISED" ? 1.72 : 1.2, 0, 0, 0, armRot) });
  return parts;
}

function palm(h: number, lean: number): Part[] {
  const trunk = std("TRUNK", "#6b5338", { roughness: 0.95 });
  const frond = std("FROND", "#2f5a2a", { side: THREE.DoubleSide });
  const parts: Part[] = [{ geometry: cyl(0.18, 0.28, h, 7), material: trunk, local: at(0, h / 2, 0, 0, 0, lean) }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push({ geometry: box(0.5, 0.05, 3.2), material: frond, local: new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * 1.4 - lean * h * 0.5, h - 0.2, Math.cos(a) * 1.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, a, 0, "YXZ")), new THREE.Vector3(1, 1, 1)) });
  }
  return parts;
}

let kit: Map<string, Part[]> | null = null;

export function getKit() {
  if (kit) return kit;
  kit = new Map<string, Part[]>();
  const paint = std("PAINT", "#ffffff", { roughness: 0.45, metalness: 0.3 });
  kit.set("CAR_SALOON", vehicle(4.5, 1.8, 0.75, [2.3, 0.6, -0.2], paint));
  kit.set("HATCH", vehicle(3.8, 1.7, 0.8, [2.1, 0.62, -0.3], paint));
  kit.set("CAR_SUV", vehicle(4.8, 1.95, 1.0, [2.9, 0.7, -0.3], paint));
  kit.set("CAR_TAXI", vehicle(4.5, 1.8, 0.75, [2.3, 0.6, -0.2], std("TAXI", "#e8b923", { roughness: 0.5 }), [{ geometry: box(0.6, 0.18, 0.3), material: emit("SIGN", "#ffe9a8"), local: at(0, 1.92, -0.2) }]));
  kit.set("DANFO", vehicle(5.2, 2.0, 1.85, null, std("DANFO", "#e3b51b", { roughness: 0.55 }), [{ geometry: box(2.04, 0.18, 5.24), material: std("STRIPE", "#151515"), local: at(0, 1.25, 0) }, { geometry: box(2.04, 0.5, 4.2), material: std("GLASS", "#151b26", { roughness: 0.2, metalness: 0.4 }), local: at(0, 1.85, -0.2) }]));
  kit.set("BRT", vehicle(12, 2.5, 2.6, null, std("BRT", "#2a56a8", { roughness: 0.5 }), [{ geometry: box(2.54, 0.8, 10.5), material: std("GLASS", "#151b26", { roughness: 0.2, metalness: 0.4 }), local: at(0, 2.2, 0) }]));
  kit.set("OKADA", [
    { geometry: box(0.3, 0.45, 1.8), material: std("BIKE", "#1d1f24"), local: at(0, 0.6, 0) },
    { geometry: cyl(0.3, 0.3, 0.12, 10), material: std("TYRE", "#111111"), local: at(0, 0.3, 0.7, 0, 0, Math.PI / 2) },
    { geometry: cyl(0.3, 0.3, 0.12, 10), material: std("TYRE", "#111111"), local: at(0, 0.3, -0.7, 0, 0, Math.PI / 2) },
    ...person(4, "").map((p) => ({ ...p, local: new THREE.Matrix4().multiplyMatrices(at(0, 0.35, -0.1), p.local) })),
    { geometry: box(0.2, 0.12, 0.05), material: emit("HEAD", "#fff1d0"), local: at(0, 0.95, 0.92) },
  ]);
  for (let v = 1; v <= 10; v++) {
    const id = `PERSON_${String(v).padStart(2, "0")}`;
    kit.set(id, person(v, ""));
    kit.set(`${id}_WALK`, person(v, "_WALK"));
    kit.set(`${id}_RAISED`, person(v, "_RAISED"));
  }
  const steel = std("STEEL", "#3a3d44", { metalness: 0.6, roughness: 0.4 });
  kit.set("LAMP_DOUBLE", [
    { geometry: cyl(0.1, 0.16, 9, 6), material: steel, local: at(0, 4.5, 0) },
    { geometry: box(3.2, 0.12, 0.12), material: steel, local: at(0, 8.9, 0) },
    { geometry: box(0.6, 0.15, 0.3), material: emit("LAMP", "#ffb15a"), local: at(-1.5, 8.8, 0) },
    { geometry: box(0.6, 0.15, 0.3), material: emit("LAMP", "#ffb15a"), local: at(1.5, 8.8, 0) },
  ]);
  kit.set("PALM_A", palm(9, 0.06));
  kit.set("PALM_B", palm(11, -0.1));
  kit.set("PALM_C", palm(7.5, 0.14));
  kit.set("TREE_BROADLEAF", [
    { geometry: cyl(0.25, 0.35, 3.5, 7), material: std("TRUNK", "#6b5338", { roughness: 0.95 }), local: at(0, 1.75, 0) },
    { geometry: new THREE.IcosahedronGeometry(3, 0), material: std("LEAF", "#2e4d26"), local: at(0, 5, 0) },
  ]);
  kit.set("UMBRELLA_STALL", [
    { geometry: cyl(0.05, 0.05, 2.6, 6), material: steel, local: at(0, 1.3, 0) },
    { geometry: new THREE.ConeGeometry(1.6, 0.7, 8, 1, true), material: std("CANOPY", "#d9612b", { side: THREE.DoubleSide }), local: at(0, 2.6, 0) },
    { geometry: box(1.4, 0.8, 0.8), material: std("TABLE", "#8a6a48"), local: at(0, 0.4, 0) },
    { geometry: box(0.3, 0.1, 0.3), material: emit("BULB", "#ffd28a"), local: at(0, 2.25, 0) },
  ]);
  kit.set("BUS_STOP", [
    { geometry: box(4, 0.1, 1.6), material: steel, local: at(0, 2.5, 0) },
    { geometry: box(4, 2.4, 0.06), material: std("GLASS", "#9fb3c8", { transparent: false, roughness: 0.2 }), local: at(0, 1.25, -0.75) },
    { geometry: box(1.2, 1.8, 0.08), material: emit("AD", "#cfe6ff"), local: at(1.4, 1.2, -0.7) },
  ]);
  kit.set("BARRIER", [
    { geometry: box(2.4, 0.08, 0.06), material: steel, local: at(0, 1, 0) },
    { geometry: box(0.06, 1, 0.5), material: steel, local: at(-1.15, 0.5, 0) },
  ]);
  kit.set("FLAG_BANNER", [
    { geometry: cyl(0.06, 0.08, 6, 6), material: steel, local: at(0, 3, 0) },
    { geometry: box(0.04, 3, 1.1), material: std("BANNER", "#f26f21"), local: at(0, 4.2, 0.6) },
  ]);
  kit.set("STAGE_LIGHT", [
    { geometry: box(0.7, 0.5, 0.5), material: std("FIXTURE", "#1a1b20"), local: at(0, -0.3, 0) },
    { geometry: cyl(0.22, 0.22, 0.1, 10), material: emit("BEAM", "#ffe0b0"), local: at(0, -0.3, 0.27, Math.PI / 2, 0, 0) },
  ]);
  return kit;
}

/** Instance a list of [model, position, yaw, scale] placements, one InstancedMesh per model part. */
export function placeKit(placements: [string, THREE.Vector3, number, number][]) {
  const k = getKit();
  const byName = new Map<string, typeof placements>();
  for (const p of placements) {
    const list = byName.get(p[0]) ?? [];
    list.push(p);
    byName.set(p[0], list);
  }
  const meshes: THREE.InstancedMesh[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const [name, list] of byName) {
    for (const part of k.get(name) ?? []) {
      const im = new THREE.InstancedMesh(part.geometry, part.material, list.length);
      list.forEach(([, pos, yaw, scale], i) => im.setMatrixAt(i, m.compose(pos, q.setFromAxisAngle(up, yaw), s.setScalar(scale)).multiply(part.local)));
      im.frustumCulled = false;
      meshes.push(im);
    }
  }
  return meshes;
}

/** Emissive kit materials (their intensity follows the street lights). */
export function emitterMaterials(meshes: THREE.Mesh[]) {
  const set = new Set<THREE.MeshStandardMaterial>();
  for (const m of meshes) {
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.name.startsWith("EMIT_")) set.add(mat);
  }
  return [...set];
}
