import { createMap } from "svg-dotted-map";

// Server only: the land sampler ships country outlines, so it stays out of the client bundle.

const REGION = { lat: { min: -56, max: 71 }, lng: { min: -179, max: 179 } };
const GRID_W = 360;
const GRID_H = 180;
const mercator = (lat: number) => Math.log(Math.tan(((90 + lat) * Math.PI) / 360));
const MERC_TOP = mercator(REGION.lat.max);
const MERC_SPAN = MERC_TOP - mercator(REGION.lat.min);

/** Land dots as a flat [lat, lng, lat, lng, …] list, rounded to 0.01°. */
export function landDots(samples = 36000): number[] {
  const { points } = createMap({ width: GRID_W, height: GRID_H, mapSamples: samples, region: REGION });
  const out: number[] = [];
  points.forEach((pt, n) => {
    const lng = REGION.lng.min + (pt.x / GRID_W) * (REGION.lng.max - REGION.lng.min);
    const y = MERC_TOP - (pt.y / GRID_H) * MERC_SPAN;
    const lat = (Math.atan(Math.sinh(y)) * 180) / Math.PI;
    // Mercator rows bunch up near the poles; drop a share of them so density stays even.
    const cos = Math.cos((lat * Math.PI) / 180);
    if (((n * 7919) % 100) / 100 < cos * cos * 1.15) {
      out.push(Math.round(lat * 100) / 100, Math.round(lng * 100) / 100);
    }
  });
  return out;
}
