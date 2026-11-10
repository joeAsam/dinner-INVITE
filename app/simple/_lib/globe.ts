// Geometry and data for the hero map. The behaviour follows the map on pxxl.app:
// land dots sampled on a Mercator grid, thinned toward the poles, and drawn through a
// projection that blends an orthographic globe (flat = 0) into a flat map (flat = 1).

export type LatLng = { lat: number; lng: number };
export type Vec = [number, number, number];
export type Place = LatLng & { name: string; countryCode: string; home?: boolean; hub?: boolean };

const HUBS = ["Lagos", "Nuremberg", "Johannesburg", "Singapore", "New York"];

export const PLACES: Place[] = [
  { name: "Lagos", countryCode: "ng", lat: 6.52, lng: 3.38, home: true },
  { name: "Nairobi", countryCode: "ke", lat: -1.29, lng: 36.82 },
  { name: "Johannesburg", countryCode: "za", lat: -26.2, lng: 28.04 },
  { name: "Cairo", countryCode: "eg", lat: 30.04, lng: 31.24 },
  { name: "London", countryCode: "gb", lat: 51.51, lng: -0.13 },
  { name: "Dubai", countryCode: "ae", lat: 25.2, lng: 55.27 },
  { name: "New York", countryCode: "us", lat: 40.71, lng: -74 },
  { name: "São Paulo", countryCode: "br", lat: -23.55, lng: -46.63 },
  { name: "Singapore", countryCode: "sg", lat: 1.35, lng: 103.82 },
  { name: "Los Angeles", countryCode: "us", lat: 34.05, lng: -118.24 },
  { name: "Mexico City", countryCode: "mx", lat: 19.43, lng: -99.13 },
  { name: "Bogotá", countryCode: "co", lat: 4.71, lng: -74.07 },
  { name: "Buenos Aires", countryCode: "ar", lat: -34.6, lng: -58.38 },
  { name: "Casablanca", countryCode: "ma", lat: 33.57, lng: -7.59 },
  { name: "Nuremberg", countryCode: "de", lat: 49.45, lng: 11.08 },
  { name: "Helsinki", countryCode: "fi", lat: 60.17, lng: 24.94 },
  { name: "Mumbai", countryCode: "in", lat: 19.08, lng: 72.88 },
  { name: "Tokyo", countryCode: "jp", lat: 35.68, lng: 139.69 },
  { name: "Sydney", countryCode: "au", lat: -33.87, lng: 151.21 },
  { name: "Vancouver", countryCode: "ca", lat: 49.28, lng: -123.12 },
  { name: "Santiago", countryCode: "cl", lat: -33.45, lng: -70.67 },
  { name: "Almaty", countryCode: "kz", lat: 43.24, lng: 76.95 },
  { name: "Shanghai", countryCode: "cn", lat: 31.23, lng: 121.47 },
  { name: "Perth", countryCode: "au", lat: -31.95, lng: 115.86 },
  { name: "Auckland", countryCode: "nz", lat: -36.85, lng: 174.76 },
  { name: "Dakar", countryCode: "sn", lat: 14.72, lng: -17.47 },
  { name: "Addis Ababa", countryCode: "et", lat: 9.03, lng: 38.74 },
].map((p) => (HUBS.includes(p.name) ? { ...p, hub: true } : p));

/** The datacenters the map pans between, in order. */
export const TOUR: Place[] = HUBS.map((name) => PLACES.find((p) => p.name === name)!);

// ---------- Projection ----------

export function toVec({ lat, lng }: LatLng): Vec {
  const a = (lat * Math.PI) / 180;
  const b = (lng * Math.PI) / 180;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

function rotate([x, y, z]: Vec, spin: number, tilt: number): Vec {
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const rx = x * cs + z * sn;
  const rz = -x * sn + z * cs;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  return [rx, y * ct - rz * st, y * st + rz * ct];
}

export type View = {
  size: number;
  spin: number;
  tilt: number;
  flat: number;
  flatZoom: number;
  focusLat: number;
};

const FLAT_SCALE = 0.96;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function project(v: Vec, view: View): { x: number; y: number; z: number } {
  const [x, y, z] = rotate(v, view.spin, view.tilt);
  const half = view.size / 2;
  const radius = view.size * 0.42;
  if (view.flat <= 0) return { x: half + x * radius, y: half - y * radius, z };

  const [fx, , fz] = rotate(v, view.spin, 0);
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  const lng = Math.atan2(fx, fz);
  const lat = Math.asin(Math.max(-1, Math.min(1, v[1] / len)));
  const width = view.size * FLAT_SCALE * mix(1, view.flatZoom, view.flat);
  const mapX = half + (lng / Math.PI) * (width / 2);
  const focus = (view.focusLat * Math.PI) / 180;
  const mapY = half - ((lat - focus) / (Math.PI / 2)) * (width / 4);
  return {
    x: mix(half + x * radius, mapX, view.flat),
    y: mix(half - y * radius, mapY, view.flat),
    z: mix(z, 1, view.flat),
  };
}

// ---------- Arcs ----------

export type Arc = { path: Vec[]; offset: number; steady?: boolean };

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Great-circle path from a to b, lifted off the surface in the middle. */
function greatCircle(a: Vec, b: Vec, steps = 48): Vec[] {
  const angle = Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
  const lift = 0.03 + angle * 0.05;
  const sin = Math.sin(angle) || 1;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const wa = Math.sin((1 - t) * angle) / sin;
    const wb = Math.sin(t * angle) / sin;
    const h = 1 + Math.sin(Math.PI * t) * lift;
    return [(a[0] * wa + b[0] * wb) * h, (a[1] * wa + b[1] * wb) * h, (a[2] * wa + b[2] * wb) * h];
  });
}

/** Links the hubs into a tree, each new hub joining its nearest already-linked hub. */
function hubTree(hubs: Vec[]): [Vec, Vec][] {
  const linked = [hubs[0]];
  const rest = hubs.slice(1);
  const edges: [Vec, Vec][] = [];
  while (rest.length) {
    let best = { from: linked[0], to: 0, score: -Infinity };
    for (const from of linked) {
      rest.forEach((candidate, to) => {
        const score = dot(from, candidate);
        if (score > best.score) best = { from, to, score };
      });
    }
    const [next] = rest.splice(best.to, 1);
    edges.push([best.from, next]);
    linked.push(next);
  }
  return edges;
}

/** Every city gets a travelling arc from its nearest hub; hubs are joined by steady lines. */
export function buildArcs(places: Place[]): Arc[] {
  const hubs = places.filter((p) => p.hub).map(toVec);
  const cities = places.filter((p) => !p.hub).map(toVec);
  const travelling = cities.map((city, i) => {
    const nearest = hubs.reduce((a, b) => (dot(b, city) > dot(a, city) ? b : a), hubs[0]);
    return { path: greatCircle(nearest, city), offset: (i * 0.61) % 1 };
  });
  const steady = hubTree(hubs).map(([a, b], i) => ({ path: greatCircle(a, b), offset: i, steady: true }));
  return [...travelling, ...steady];
}

// ---------- Tour timing ----------

const ease = (t: number) => t * t * (3 - 2 * t);

export const TOUR_TIMING = { spin: 2.4, hold: 2.6 };

/** Where the map is looking `time` seconds in: it eases to each stop, then holds. */
export function tourAt(time: number, stops: LatLng[]) {
  const cycle = TOUR_TIMING.spin + TOUR_TIMING.hold;
  const t = time % cycle;
  const index = Math.floor(time / cycle) % stops.length;
  const from = stops[(index + stops.length - 1) % stops.length];
  const to = stops[index];
  const startLng = -from.lng;
  const delta = ((-to.lng - startLng + 540) % 360) - 180;
  const k = ease(Math.min(1, t / TOUR_TIMING.spin));
  return {
    index,
    lng: startLng + delta * k,
    lat: from.lat + (to.lat - from.lat) * k,
    arrived: t > TOUR_TIMING.spin,
  };
}
