import { useEffect, useState } from "react";
import { loadCity } from "./city";
import { toScene, type VenueKey } from "./venues";

export type Path = { pts: Float32Array; cum: Float32Array; len: number };

export function makePath(xyz: number[]): Path {
  const n = xyz.length / 3;
  const cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(xyz[3 * i] - xyz[3 * i - 3], xyz[3 * i + 2] - xyz[3 * i - 1]);
  return { pts: new Float32Array(xyz), cum, len: cum[n - 1] };
}

export type Sample = { x: number; z: number; hx: number; hz: number };

export function sampleAt(path: Path, d: number, out: Sample) {
  const { pts, cum } = path;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const t = Math.min(1, Math.max(0, (d - cum[lo]) / seg));
  const x0 = pts[3 * lo];
  const z0 = pts[3 * lo + 2];
  const x1 = pts[3 * hi];
  const z1 = pts[3 * hi + 2];
  out.x = x0 + (x1 - x0) * t;
  out.z = z0 + (z1 - z0) * t;
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  out.hx = (x1 - x0) / l;
  out.hz = (z1 - z0) / l;
  return out;
}

/** Venue doors walkers head for. */
export const ENTRANCES: [number, number][] = (["deExchange", "royalty", "blade", "amalgamation"] as VenueKey[]).map((k) => {
  const [x, , z] = toScene(k, [0, 0, 18]);
  return [x, z];
});

/** Road polylines in scene space; `inbound` reverses each so it runs towards the nearest venue. */
export function useRoadPaths(minRank: number, inbound: boolean, maxLen = Infinity) {
  const [paths, setPaths] = useState<Path[]>([]);
  useEffect(() => {
    let alive = true;
    loadCity().then((city) => {
      const near = (x: number, z: number) => Math.min(...ENTRANCES.map(([ex, ez]) => Math.hypot(x - ex, z - ez)));
      const out: Path[] = [];
      for (const road of city.roads) {
        if (road.r < minRank || road.p.length < 6) continue;
        const xyz: number[] = [];
        for (let i = 0; i < road.p.length; i += 2) xyz.push(road.p[i], 0, road.p[i + 1]);
        const p = inbound && near(xyz[0], xyz[2]) < near(xyz[xyz.length - 3], xyz[xyz.length - 1]) ? reverse(xyz) : xyz;
        const path = makePath(p);
        if (path.len > 80 && path.len < maxLen) out.push(path);
      }
      if (alive) setPaths(out);
    });
    return () => {
      alive = false;
    };
  }, [minRank, inbound, maxLen]);
  return paths;
}

function reverse(xyz: number[]) {
  const r: number[] = [];
  for (let i = xyz.length - 3; i >= 0; i -= 3) r.push(xyz[i], 0, xyz[i + 2]);
  return r;
}
