import type { CityData } from "../city";
import { VENUES } from "../venues";
import { SITES, siteCenter } from "./journey";

/** A leg of the week's route: a line along real roads from one day's venue to the next, as [x, z, x, z, …]. */
export type Leg = number[];

type Edge = { to: number; cost: number };

/** Main roads are cheaper to travel, so routes prefer them the way a driver would. */
const RANK_DISCOUNT = [1, 0.85, 0.7, 0.6];

class Heap {
  private items: [number, number][] = [];
  get size() {
    return this.items.length;
  }
  push(cost: number, node: number) {
    const a = this.items;
    a.push([cost, node]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Finds the road route between each pair of consecutive venues.
 * Roads that share a point (to the nearest metre) are treated as joined there.
 */
export function buildLegs(city: CityData): Leg[] {
  const index = new Map<string, number>();
  const xs: number[] = [];
  const zs: number[] = [];
  const edges: Edge[][] = [];
  /** Every stretch of road between two points, so a place can be attached to the nearest stretch. */
  const segments: { a: number; b: number; discount: number; road: number }[] = [];
  const nodeAt = (x: number, z: number) => {
    const key = `${Math.round(x)},${Math.round(z)}`;
    let n = index.get(key);
    if (n === undefined) {
      n = xs.length;
      index.set(key, n);
      xs.push(x);
      zs.push(z);
      edges.push([]);
    }
    return n;
  };
  const link = (a: number, b: number, discount: number) => {
    if (a === b) return;
    const cost = Math.hypot(xs[a] - xs[b], zs[a] - zs[b]) * discount;
    edges[a].push({ to: b, cost });
    edges[b].push({ to: a, cost });
  };
  const unlink = (a: number, b: number) => {
    edges[a] = edges[a].filter((e) => e.to !== b);
    edges[b] = edges[b].filter((e) => e.to !== a);
  };

  city.roads.forEach((road, id) => {
    const p = road.p;
    let prev = -1;
    for (let i = 0; i < p.length; i += 2) {
      const n = nodeAt(p[i], p[i + 1]);
      if (prev >= 0 && prev !== n) {
        const discount = RANK_DISCOUNT[road.r] ?? 1;
        link(prev, n, discount);
        segments.push({ a: prev, b: n, discount, road: id });
      }
      prev = n;
    }
  });

  /**
   * Joins a point to the network at the closest point on the closest stretch of road,
   * splitting that stretch there. (Joining to the closest corner instead makes the line
   * overshoot along the road and double back.) Returns the node on the road.
   */
  const attach = (x: number, z: number, skipRoad = -1) => {
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    segments.forEach((s, i) => {
      if (s.road === skipRoad) return;
      const ax = xs[s.a];
      const az = zs[s.a];
      const dx = xs[s.b] - ax;
      const dz = zs[s.b] - az;
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2));
      const d = (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = t;
      }
    });
    if (best < 0) return -1;
    const s = segments[best];
    if (bestT < 0.02) return s.a;
    if (bestT > 0.98) return s.b;
    // Split the stretch at the closest point.
    const n = nodeAt(xs[s.a] + (xs[s.b] - xs[s.a]) * bestT, zs[s.a] + (zs[s.b] - zs[s.a]) * bestT);
    unlink(s.a, s.b);
    link(s.a, n, s.discount);
    link(n, s.b, s.discount);
    segments.splice(best, 1, { a: s.a, b: n, discount: s.discount, road: s.road }, { a: n, b: s.b, discount: s.discount, road: s.road });
    return n;
  };

  // A road that ends without meeting another (the inter-town road is drawn in by hand) is joined
  // to the nearest stretch of a different road, so the route can carry on along it.
  city.roads.forEach((road, id) => {
    if (road.r < 3 || road.p.length < 80) return;
    for (const k of [0, road.p.length - 2]) {
      const end = nodeAt(road.p[k], road.p[k + 1]);
      if (edges[end].length > 1) continue;
      const on = attach(xs[end], zs[end], id);
      if (on >= 0) link(end, on, 0.6);
    }
  });

  const route = (from: number, to: number): number[] | null => {
    const dist = new Float64Array(xs.length).fill(Infinity);
    const prev = new Int32Array(xs.length).fill(-1);
    const heap = new Heap();
    dist[from] = 0;
    heap.push(0, from);
    while (heap.size) {
      const [d, n] = heap.pop();
      if (n === to) break;
      if (d > dist[n]) continue;
      for (const e of edges[n]) {
        const nd = d + e.cost;
        if (nd < dist[e.to]) {
          dist[e.to] = nd;
          prev[e.to] = n;
          heap.push(nd, e.to);
        }
      }
    }
    if (dist[to] === Infinity) return null;
    const out: number[] = [];
    for (let n = to; n >= 0; n = prev[n]) out.push(zs[n], xs[n]);
    return out.reverse();
  };

  // Each venue meets the road once, at its own front (two days at DE Exchange share one entrance), before routing,
  // so every leg into and out of a venue joins the road at the same spot. The line then runs on to the day's own spot.
  const entrances = new Map<string, number>();
  const stops = SITES.map((s) => {
    const c = siteCenter(s);
    const v = VENUES[s.venue];
    if (!entrances.has(s.venue)) entrances.set(s.venue, attach(v.x, v.z));
    return { x: c[0], z: c[2], node: entrances.get(s.venue)! };
  });

  const legs: Leg[] = [];
  for (let i = 0; i < SITES.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    const path = a.node >= 0 && b.node >= 0 ? route(a.node, b.node) : null;
    // Each leg starts and ends at the venue itself; with no road link, it falls back to a straight line.
    legs.push(tidy([a.x, a.z, ...(path ?? []), b.x, b.z]));
  }
  return legs;
}

/**
 * Drops repeated points, then removes short hooks: a point the line reaches and turns sharply
 * back from within a few dozen metres. Real roads never do that; joins between roads can.
 */
function tidy(line: number[]): Leg {
  const pts: [number, number][] = [];
  for (let i = 0; i < line.length; i += 2) {
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(last[0] - line[i], last[1] - line[i + 1]) > 0.5) pts.push([line[i], line[i + 1]]);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const [cx, cz] = pts[i + 1];
      const ab = Math.hypot(bx - ax, bz - az);
      const bc = Math.hypot(cx - bx, cz - bz);
      const turn = ((bx - ax) * (cx - bx) + (bz - az) * (cz - bz)) / (ab * bc || 1);
      if (turn < -0.6 && Math.min(ab, bc) < 45) {
        pts.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return pts.flat();
}

/**
 * A camera track along one or more consecutive legs: points every few metres along the
 * route, softened so the camera glides past corners instead of snapping round them.
 */
export type Track = {
  /** Smoothed x, z every STEP metres of route. */
  xs: Float32Array;
  zs: Float32Array;
  /** Route length in metres. */
  total: number;
  /** Where each leg starts along the track, and how long it is, in metres. */
  starts: number[];
  lengths: number[];
};

const STEP = 15;
/** Points either side averaged together; 10 × 15 m softens anything tighter than about 300 m. */
const SOFTEN = 10;

export function buildTrack(legs: Leg[]): Track {
  const raw: number[] = [];
  const starts: number[] = [];
  const lengths: number[] = [];
  let total = 0;
  for (const leg of legs) {
    starts.push(total);
    let len = 0;
    for (let i = 2; i < leg.length; i += 2) len += Math.hypot(leg[i] - leg[i - 2], leg[i + 1] - leg[i - 1]);
    lengths.push(len);
    total += len;
    for (let i = 0; i < leg.length; i++) raw.push(leg[i]);
  }
  // Resample the joined polyline every STEP metres.
  const n = Math.max(2, Math.ceil(total / STEP) + 1);
  const px = new Float32Array(n);
  const pz = new Float32Array(n);
  let seg = 0;
  let segStart = 0;
  let segLen = Math.hypot(raw[2] - raw[0], raw[3] - raw[1]);
  for (let k = 0; k < n; k++) {
    const s = Math.min(total, k * STEP);
    while (segStart + segLen < s && seg + 2 < raw.length / 2 - 1) {
      segStart += segLen;
      seg++;
      segLen = Math.hypot(raw[2 * seg + 2] - raw[2 * seg], raw[2 * seg + 3] - raw[2 * seg + 1]);
    }
    const f = segLen > 0 ? Math.min(1, (s - segStart) / segLen) : 0;
    px[k] = raw[2 * seg] + (raw[2 * seg + 2] - raw[2 * seg]) * f;
    pz[k] = raw[2 * seg + 1] + (raw[2 * seg + 3] - raw[2 * seg + 1]) * f;
  }
  const xs = new Float32Array(n);
  const zs = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let sx = 0;
    let sz = 0;
    let c = 0;
    for (let j = Math.max(0, k - SOFTEN); j <= Math.min(n - 1, k + SOFTEN); j++) {
      sx += px[j];
      sz += pz[j];
      c++;
    }
    xs[k] = sx / c;
    zs[k] = sz / c;
  }
  // The ends stay exactly on the venues.
  xs[0] = px[0];
  zs[0] = pz[0];
  xs[n - 1] = px[n - 1];
  zs[n - 1] = pz[n - 1];
  return { xs, zs, total, starts, lengths };
}

/** The point `s` metres along a track. */
export function trackAt(track: Track, s: number, out: { x: number; z: number }) {
  const f = Math.min(track.xs.length - 1, Math.max(0, s / STEP));
  const i = Math.min(track.xs.length - 2, Math.floor(f));
  const t = f - i;
  out.x = track.xs[i] + (track.xs[i + 1] - track.xs[i]) * t;
  out.z = track.zs[i] + (track.zs[i + 1] - track.zs[i]) * t;
  return out;
}
