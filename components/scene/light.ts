import * as THREE from "three";
import { IKOT_OFFSET } from "@/lib/venues";
import { localTime, sunPosition } from "@/lib/sun";
import { world } from "@/lib/store";

/** Uniforms shared by every custom shader: one write updates the whole city. */
export const U = {
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunColor: { value: new THREE.Color(1, 1, 1) },
  uSunI: { value: 1 },
  uHemiSky: { value: new THREE.Color(0.6, 0.6, 0.6) },
  uHemiGround: { value: new THREE.Color(0.2, 0.2, 0.2) },
  uHemiI: { value: 1 },
  uFogColor: { value: new THREE.Color(0.7, 0.7, 0.7) },
  uFogDensity: { value: 4e-4 },
  uNight: { value: 0 },
  uWindows: { value: 0 },
  uStreet: { value: 0 },
  uTime: { value: 0 },
  uRoutes: { value: 0 },
  uPx: { value: 1 },
  uFireR: { value: 0 },
  uFireWave: { value: 0 },
  /** Data islands: Eket around the origin (r 3900) and Ikot Abasi (r 1900). */
  uIkot: { value: new THREE.Vector2(IKOT_OFFSET[0], IKOT_OFFSET[1]) },
};

/** Lighting + fog + "inside the mapped area" mask, shared by the custom shaders. */
export const LIT_GLSL = /* glsl */ `
  uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunI;
  uniform vec3 uHemiSky; uniform vec3 uHemiGround; uniform float uHemiI;
  uniform vec3 uFogColor; uniform float uFogDensity; uniform vec2 uIkot;
  vec3 lit(vec3 albedo, vec3 n) {
    float d = max(dot(n, uSunDir), 0.0);
    vec3 hemi = mix(uHemiGround, uHemiSky, n.y * 0.5 + 0.5) * uHemiI;
    return albedo * (hemi + uSunColor * uSunI * d);
  }
  vec3 fogged(vec3 c, float dist) {
    float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    return mix(c, uFogColor, clamp(f, 0.0, 1.0));
  }
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // 0 inside the mapped data, 1 at its edge (Eket r=3900 m, Ikot Abasi r=1900 m).
  float edge(vec2 p) { return min(length(p) / 3900.0, length(p - uIkot) / 1900.0); }
`;

export const SOFT_DOT = "float softDot(vec2 c){ return 1.0 - smoothstep(0.0, 0.5, length(c - 0.5)); }";

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function ramp(x: number, stops: [number, string][]): RGB {
  if (x <= stops[0][0]) return hex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [x0, c0] = stops[i - 1];
      const [x1, c1] = stops[i];
      return mix3(hex(c0), hex(c1), sstep(0, 1, (x - x0) / (x1 - x0)));
    }
  }
  return hex(stops[stops.length - 1][1]);
}

/** Week date the sun is computed for (mid-December in Eket). */
const SUN_DATE = "2026-12-16";

/** Sun, sky, fog and city-light model for a time of day (minutes after midnight, WAT). */
export function computeLight(minutes: number) {
  const { azimuth, elevation: n } = sunPosition(localTime(SUN_DATE, minutes));
  const az = azimuth * (Math.PI / 180);
  const el = n * (Math.PI / 180);
  const sunDir: RGB = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
  return {
    sunDir,
    elevation: n,
    sunColor: ramp(n, [[-2, "#ff5a1f"], [2, "#ff8c42"], [8, "#ffc27d"], [20, "#ffe7c6"], [45, "#fff4e2"]]),
    sunIntensity: sstep(-1.5, 4, n) * (0.9 + 2.2 * sstep(4, 40, n)) * 0.9,
    hemiSky: ramp(n, [[-16, "#070c1c"], [-8, "#1d2652"], [-3, "#5a4f80"], [1, "#b98a78"], [6, "#d29a6c"], [16, "#c4b8a4"], [35, "#b6c0cc"]]),
    hemiGround: ramp(n, [[-12, "#060504"], [0, "#2a1d14"], [15, "#5d4c3a"]]),
    hemiIntensity: mix(0.16, 1, sstep(-10, 14, n)),
    fogColor: ramp(n, [[-16, "#080a13"], [-8, "#1e2038"], [-3, "#6a4f66"], [1, "#c98a68"], [5, "#d0946a"], [12, "#cfc2aa"], [35, "#c9cfd2"]]),
    fogDensity: mix(30e-5, 55e-5, sstep(-8, 10, n)),
    exposure: mix(1.6, 0.62, sstep(-10, 25, n)),
    night: 1 - sstep(-14, -4.5, n),
    golden: sstep(-2, 3, n) * (1 - sstep(9, 20, n)),
    envIntensity: mix(0.08, 0.9, sstep(-6, 20, n)),
    windows: 0.85 * sstep(1, -4, n) + 0.06,
    street: sstep(2, -3, n),
  };
}

export type Light = ReturnType<typeof computeLight>;
export const lightState: { light: Light | null; exposure: number } = { light: null, exposure: 1 };

/** Per frame: compute the light model and push it into shared uniforms, fog and `world`. */
export function applyLight(scene: THREE.Scene, elapsed: number, dpr: number) {
  const c = computeLight(world.minutes);
  lightState.light = c;
  const ex = (lightState.exposure = c.exposure);
  U.uSunDir.value.set(...c.sunDir);
  U.uSunColor.value.setRGB(...c.sunColor, THREE.SRGBColorSpace);
  U.uSunI.value = 0.7 * c.sunIntensity * ex;
  U.uHemiSky.value.setRGB(...c.hemiSky, THREE.SRGBColorSpace);
  U.uHemiGround.value.setRGB(...c.hemiGround, THREE.SRGBColorSpace);
  U.uHemiI.value = 0.38 * c.hemiIntensity * ex * 0.7;
  U.uFogColor.value.setRGB(...c.fogColor, THREE.SRGBColorSpace);
  // Aerial views see kilometres of town: thin the fog with altitude (×1 at 150 m → ×0.35 at 1.5 km+).
  c.fogDensity *= 1 - 0.65 * Math.min(1, Math.max(0, (world.camY - 150) / 1350));
  U.uFogDensity.value = c.fogDensity;
  U.uNight.value = c.night;
  U.uWindows.value = c.windows;
  U.uStreet.value = c.street;
  U.uTime.value = elapsed;
  U.uPx.value = dpr;
  const fog = scene.fog as THREE.FogExp2 | null;
  if (fog) {
    fog.color.copy(U.uFogColor.value);
    fog.density = c.fogDensity;
  }
  U.uFireR.value = world.roadsR;
  U.uFireWave.value = world.roadsWave * (0.85 + 0.15 * c.night);
  U.uRoutes.value = Math.max(world.overview * 0.55, world.roadsGlow) * (0.35 + 0.65 * c.night);
}
