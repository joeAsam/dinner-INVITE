"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { loadCity, type CityData, type Road } from "@/lib/city";
import { seeded } from "@/lib/rand";
import type { Quality } from "@/lib/store";
import { IKOT_OFFSET } from "@/lib/venues";
import { LIT_GLSL, U } from "./light";

/** Laterite ground with scrub patches, lit by the shared light model. */
function Ground() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: U,
        vertexShader: "varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
        fragmentShader:
          LIT_GLSL +
          /* glsl */ `uniform float uNight; varying vec3 vW;
          float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
            return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
          void main(){
            float d = length(vW.xz - cameraPosition.xz);
            float g = n2(vW.xz * 0.012) * 0.6 + n2(vW.xz * 0.06) * 0.4;
            vec3 dust = mix(vec3(0.33,0.24,0.16), vec3(0.42,0.33,0.22), g);
            vec3 scrub = vec3(0.17,0.21,0.11);
            vec3 a = mix(dust, scrub, smoothstep(0.55, 0.75, n2(vW.xz * 0.02 + 7.0)) * 0.7);
            gl_FragColor = vec4(fogged(lit(a, vec3(0.0, 1.0, 0.0)), d), 1.0);
          }`,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.08} material={mat} receiveShadow>
      <circleGeometry args={[24000, 96]} />
    </mesh>
  );
}

/** Far-field boxes (1.1–6.3 km) that give the skyline depth, plus two window lights each. */
function Skyline({ count }: { count: number }) {
  const { mesh, lights } = useMemo(() => {
    const r = seeded(17);
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const mesh = new THREE.InstancedMesh(
      box,
      new THREE.ShaderMaterial({
        uniforms: U,
        vertexShader:
          "varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }",
        fragmentShader:
          LIT_GLSL +
          "varying vec3 vW; varying vec3 vN; void main(){ float d=length(vW.xz-cameraPosition.xz); vec3 a = vN.y > 0.5 ? vec3(0.42,0.27,0.2) : vec3(0.62,0.57,0.5); gl_FragColor=vec4(fogged(lit(a, normalize(vN)), d), 1.0); }",
      }),
      count,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const lp: number[] = [];
    const ls: number[] = [];
    for (let i = 0; i < count; i++) {
      // A ring of distant town around Eket's centre, kept clear of the Ikot Abasi island and the river mouth.
      const d = 4300 + 6500 * Math.pow(r(), 1.3);
      const a = r() * Math.PI * 2;
      const x = -1450 + Math.cos(a) * d;
      const z = 220 + Math.sin(a) * d;
      const sunk = Math.hypot(x - IKOT_OFFSET[0], z - IKOT_OFFSET[1]) < 2600 || z > 5200; // Ikot island, coast to the south
      const tall = r() < 0.03 ? 2 + 3 * r() : 1;
      p.set(x, sunk ? -80 : 0, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
      s.set(14 + 30 * r(), (5 + 9 * r()) * tall, 12 + 26 * r());
      mesh.setMatrixAt(i, m.compose(p, q, s));
      if (!sunk)
        for (let k = 0; k < 2; k++) {
          lp.push(p.x + (r() - 0.5) * 20, 2 + r() * s.y, p.z + (r() - 0.5) * 20);
          ls.push(r());
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(ls, 1));
    const lights = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; uniform float uTime; uniform float uPx; varying float vA; varying float vS;
          void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; vS=aSeed;
            vA=(0.7+0.3*sin(uTime*(0.5+aSeed*2.0)+aSeed*40.0))*(0.35+0.65*aSeed); gl_PointSize=clamp(1500.0/-mv.z,1.0,3.4)*uPx; }`,
        fragmentShader: `uniform float uWindows; varying float vA; varying float vS; void main(){ float a=1.0-smoothstep(0.0,0.5,length(gl_PointCoord-.5));
          vec3 c = vS>0.8 ? vec3(0.8,0.88,1.0) : vec3(1.0,0.62,0.28); float on=smoothstep(0.15,0.6,uWindows); gl_FragColor=vec4(c*vA*a*1.3*on, a*vA*on); }`,
      }),
    );
    mesh.frustumCulled = false;
    lights.frustumCulled = false;
    return { mesh, lights };
  }, [count]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      lights.geometry.dispose();
      (lights.material as THREE.Material).dispose();
    },
    [mesh, lights],
  );
  return (
    <group>
      <primitive object={mesh} />
      <primitive object={lights} />
    </group>
  );
}

const roadFrag =
  LIT_GLSL +
  /* glsl */ `
  uniform float uStreet; uniform float uRoutes; uniform float uTime; uniform float uFireR; uniform float uFireWave;
  varying float vRank; varying float vSide; varying float vAlong; varying vec3 vW;
  void main(){
    float d = length(vW.xz - cameraPosition.xz);
    float kerb = smoothstep(0.82, 0.95, abs(vSide)); // (not "edge": that name is the shared mask function)
    vec3 asphalt = mix(vec3(0.075,0.075,0.08), vec3(0.16,0.15,0.14), kerb);
    float dash = step(2.0, vRank) * (1.0 - smoothstep(0.03, 0.06, abs(vSide))) * step(0.5, fract(vAlong / 9.0));
    asphalt = mix(asphalt, vec3(0.62,0.58,0.42), dash * 0.7);
    vec3 c = lit(asphalt, vec3(0.0,1.0,0.0));
    // Sodium pools under the streetlights after dusk.
    float pool = (0.5 + 0.5 * cos(vAlong / 32.0 * 6.2831)) * step(1.0, vRank);
    c += vec3(1.0, 0.55, 0.2) * uStreet * (0.05 + 0.22 * pow(pool, 3.0)) * (1.0 - abs(vSide) * 0.5);
    // The routes to the arena glow, flowing towards it.
    float dist = length(vW.xz);
    float flow = 0.55 + 0.45 * sin(dist * 0.045 + uTime * 2.6);
    c += vec3(1.0, 0.62, 0.22) * uRoutes * (0.25 + vRank * 0.35) * flow * (1.0 - abs(vSide)) * 1.4;
    float rankW = 0.35 + vRank * 0.32, core = 1.0 - abs(vSide);
    float behind = 1.0 - smoothstep(uFireR - 40.0, uFireR + 2.0, dist);
    // Squared by multiplying (pow of a negative is NaN, which bloom would smear over the frame).
    float fr = (dist - uFireR) / 40.0; float front = exp(-fr * fr) * step(1.0, uFireR);
    c += vec3(1.0, 0.48, 0.12) * (behind * 1.1 * flow + front * 3.2) * rankW * core * uFireWave;
    // Fade at the edge of the mapped areas (the inter-town expressway, rank 3, never fades).
    float fade = vRank > 2.5 ? 1.0 : 1.0 - smoothstep(0.86, 1.0, edge(vW.xz));
    gl_FragColor = vec4(fogged(c, d), fade);
  }`;

const WIDTHS = [5, 8, 12, 17];

/** Ribbon mesh for a set of ranked roads (rank widths 5 / 8 / 12 / 17 m). */
function roadGeometry(roads: Road[]) {
  const pos: number[] = [];
  const rank: number[] = [];
  const side: number[] = [];
  const along: number[] = [];
  const nrm: number[] = [];
  const hws: number[] = [];
  const idx: number[] = [];
  let v = 0;
  for (const road of roads) {
    const p = road.p;
    const n = p.length / 2;
    if (n < 2) continue;
    const hw = WIDTHS[road.r] / 2;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const x = p[2 * i];
      const z = p[2 * i + 1];
      if (i > 0) acc += Math.hypot(x - p[2 * i - 2], z - p[2 * i - 1]);
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      let tx = p[2 * b] - p[2 * a];
      let tz = p[2 * b + 1] - p[2 * a + 1];
      const l = Math.hypot(tx, tz) || 1;
      tx /= l;
      tz /= l;
      const y = 0.1 + 0.03 * road.r;
      // Store the centreline; the vertex shader pushes each side out by max(real width, ~1.4 px).
      pos.push(x, y, z, x, y, z);
      nrm.push(-tz, tx, -tz, tx);
      hws.push(hw, hw);
      rank.push(road.r, road.r);
      side.push(-1, 1);
      along.push(acc, acc);
      if (i < n - 1) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      v += 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aRank", new THREE.Float32BufferAttribute(rank, 1));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("aN", new THREE.Float32BufferAttribute(nrm, 2));
  g.setAttribute("aHW", new THREE.Float32BufferAttribute(hws, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(-4000, 0, 800), 12000);
  return g;
}

function Roads({ city }: { city: CityData }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        vertexShader: `attribute float aRank; attribute float aSide; attribute float aAlong; attribute vec2 aN; attribute float aHW;
          varying float vRank; varying float vSide; varying float vAlong; varying vec3 vW;
          void main(){ vRank=aRank; vSide=aSide; vAlong=aAlong;
            vec4 w = modelMatrix * vec4(position, 1.0);
            // Real width up close; never thinner than ~1.4 px from the air (more for main roads).
            float dist = length(cameraPosition - w.xyz);
            float hw = max(aHW, dist * (0.0007 + 0.00035 * aRank));
            w.xz += aN * aSide * hw;
            vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: roadFrag,
      }),
    [],
  );
  const geo = useMemo(() => roadGeometry(city.roads), [city]);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={1} />;
}

/** Sodium streetlight heads every 32 m along arterials and expressways. */
function Streetlights({ city }: { city: CityData }) {
  const { geo, mat } = useMemo(() => {
    const pts: number[] = [];
    for (const road of city.roads) {
      if (road.r < 2) continue;
      const p = road.p;
      let acc = 0;
      let next = 0;
      for (let i = 1; i < p.length / 2; i++) {
        const x0 = p[2 * i - 2];
        const z0 = p[2 * i - 1];
        const x1 = p[2 * i];
        const z1 = p[2 * i + 1];
        const l = Math.hypot(x1 - x0, z1 - z0);
        while (next <= acc + l) {
          const t = (next - acc) / (l || 1);
          pts.push(x0 + (x1 - x0) * t, 9.2, z0 + (z1 - z0) * t);
          next += 32;
        }
        acc += l;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: "uniform float uPx; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(900.0/-mv.z,1.5,14.0)*uPx; }",
      fragmentShader: "uniform float uStreet; void main(){ float a=1.0-smoothstep(0.0,0.5,length(gl_PointCoord-.5)); a*=a; gl_FragColor=vec4(vec3(1.0,0.62,0.3)*a*uStreet*2.0, a*uStreet); }",
    });
    return { geo: g, mat: m };
  }, [city]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

const buildingFrag =
  LIT_GLSL +
  /* glsl */ `
  uniform float uWindows; varying vec3 vW; varying vec3 vN; varying vec3 vColor; varying float vRoof;
  void main(){
    float d = length(vW.xz - cameraPosition.xz);
    vec3 n = normalize(vN);
    vec3 c = lit(vColor, n);
    float wall = 1.0 - vRoof;
    vec2 cell = vec2(floor((vW.x + vW.z) / 3.4), floor(vW.y / 3.1));
    vec2 f = fract(vec2((vW.x + vW.z) / 3.4, vW.y / 3.1));
    float win = step(0.28, f.x) * step(f.x, 0.72) * step(0.32, f.y) * step(f.y, 0.74) * step(1.0, vW.y);
    c = mix(c, c * 0.45, win * wall * (1.0 - uWindows));
    float on = step(0.68, hash21(cell + floor(vW.xz / 40.0)));
    vec3 warm = mix(vec3(1.0,0.66,0.34), vec3(0.78,0.88,1.0), step(0.86, hash21(cell * 1.7)));
    c += warm * win * on * wall * uWindows * 0.7;
    float fade = 1.0 - smoothstep(0.8, 0.98, edge(vW.xz));
    gl_FragColor = vec4(mix(uFogColor, fogged(c, d), fade), 1.0);
  }`;

type Built = { pos: Float32Array; nor: Float32Array; col: Float32Array; roof: Float32Array };

/** Extruded footprints with triangulated roofs, built in idle-time slices so the intro never stutters. */
function Buildings({ city }: { city: CityData }) {
  const [data, setData] = useState<Built | null>(null);
  useEffect(() => {
    const r = seeded(7);
    const roofs = ["#8b4a33", "#7c7f84", "#4a6690", "#a35c3f", "#b3b6b9", "#6f3b2c"].map((c) => new THREE.Color(c));
    const walls = ["#d8ccb5", "#c9b79e", "#b9c3c4", "#e0d1b3", "#cdb8a6", "#bfb7a3"].map((c) => new THREE.Color(c));
    const pos: number[] = [];
    const nor: number[] = [];
    const col: number[] = [];
    const roof: number[] = [];
    const ring: THREE.Vector2[] = [];
    const list = city.buildings;
    let i = 0;
    let dead = false;
    let handle = 0;
    const idle: (cb: IdleRequestCallback, o?: IdleRequestOptions) => number =
      typeof requestIdleCallback === "function" ? requestIdleCallback : (cb) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 6 }), 16);
    const cancel: (h: number) => void = typeof cancelIdleCallback === "function" ? cancelIdleCallback : clearTimeout;
    const one = (b: (typeof list)[number]) => {
      const p = b.p;
      const n = p.length / 2 - 1;
      if (n < 3) return;
      let cx = 0;
      let cz = 0;
      for (let k = 0; k < n; k++) {
        cx += p[2 * k];
        cz += p[2 * k + 1];
      }
      cx /= n;
      cz /= n;
      const h = b.h ?? 4 + 3.2 * Math.floor(r() * r() * 5) + 2 * r();
      const wc = walls[Math.floor(r() * walls.length)];
      const rc = roofs[Math.floor(r() * roofs.length)];
      for (let k = 0; k < n; k++) {
        const x0 = p[2 * k];
        const z0 = p[2 * k + 1];
        const x1 = p[2 * k + 2];
        const z1 = p[2 * k + 3];
        const nx = z1 - z0;
        const nz = -(x1 - x0);
        const l = Math.hypot(nx, nz) || 1;
        pos.push(x0, 0, z0, x1, 0, z1, x1, h, z1, x0, 0, z0, x1, h, z1, x0, h, z0);
        for (let v = 0; v < 6; v++) {
          nor.push(nx / l, 0, nz / l);
          col.push(wc.r, wc.g, wc.b);
          roof.push(0);
        }
      }
      ring.length = 0;
      for (let k = 0; k < n; k++) ring.push(new THREE.Vector2(p[2 * k], p[2 * k + 1]));
      for (const [a, b2, c] of THREE.ShapeUtils.triangulateShape(ring, []))
        for (const v of [a, c, b2]) {
          pos.push(ring[v].x, h, ring[v].y);
          nor.push(0, 1, 0);
          col.push(rc.r, rc.g, rc.b);
          roof.push(1);
        }
    };
    const work = (dl: IdleDeadline) => {
      if (dead) return;
      const until = performance.now() + Math.min(6, Math.max(2, dl.timeRemaining()));
      while (i < list.length && performance.now() < until) one(list[i++]);
      if (i < list.length) {
        handle = idle(work, { timeout: 200 });
        return;
      }
      setData({ pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), roof: new Float32Array(roof) });
    };
    handle = idle(work, { timeout: 200 });
    return () => {
      dead = true;
      cancel(handle);
    };
  }, [city]);
  const geo = useMemo(() => {
    if (!data) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(data.nor, 3));
    g.setAttribute("color", new THREE.BufferAttribute(data.col, 3));
    g.setAttribute("aRoof", new THREE.BufferAttribute(data.roof, 1));
    return g;
  }, [data]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: U,
        side: THREE.DoubleSide,
        vertexShader: `attribute vec3 color; attribute float aRoof; varying vec3 vW; varying vec3 vN; varying vec3 vColor; varying float vRoof;
          void main(){ vColor=color; vRoof=aRoof; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: buildingFrag,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => () => geo?.dispose(), [geo]);
  return geo ? <mesh geometry={geo} material={mat} /> : null;
}

const waterFrag =
  LIT_GLSL +
  /* glsl */ `
  uniform float uTime; uniform float uNight; uniform float uWindows; varying vec3 vW;
  void main(){
    float d = length(vW.xz - cameraPosition.xz);
    vec3 view = normalize(cameraPosition - vW);
    float fres = pow(1.0 - max(view.y, 0.0), 3.0);
    float rip = sin(vW.x * 0.08 + uTime * 0.7) * sin(vW.z * 0.11 - uTime * 0.5);
    vec3 deep = mix(vec3(0.05, 0.12, 0.12), vec3(0.02, 0.03, 0.05), uNight);
    vec3 c = lit(deep, normalize(vec3(rip * 0.05, 1.0, 0.0)));
    c = mix(c, uHemiSky * 0.6 + uFogColor * 0.4, fres * 0.8);
    // Town lights glinting on the water after dark.
    float glint = step(0.985, hash21(floor(vW.xz / 6.0) + floor(uTime * 1.5))) * uWindows;
    c += vec3(1.0, 0.7, 0.35) * glint * 0.6;
    gl_FragColor = vec4(fogged(c, d), 1.0);
  }`;

/** Rivers (ribbons at their mapped width) and water areas (triangulated polygons). */
function Water({ city }: { city: CityData }) {
  const geo = useMemo(() => {
    const pos: number[] = [];
    const idx: number[] = [];
    let v = 0;
    for (const r of city.rivers) {
      const p = r.p;
      const n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1);
        const b = Math.min(n - 1, i + 1);
        let tx = p[2 * b] - p[2 * a];
        let tz = p[2 * b + 1] - p[2 * a + 1];
        const l = Math.hypot(tx, tz) || 1;
        tx /= l;
        tz /= l;
        const hw = r.w / 2;
        pos.push(p[2 * i] - tz * hw, 0.05, p[2 * i + 1] + tx * hw, p[2 * i] + tz * hw, 0.05, p[2 * i + 1] - tx * hw);
        if (i < n - 1) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
        v += 2;
      }
    }
    for (const ring of city.areas) {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i < ring.length - 2; i += 2) pts.push(new THREE.Vector2(ring[i], ring[i + 1]));
      if (pts.length < 3) continue;
      const tris = THREE.ShapeUtils.triangulateShape(pts, []);
      const base = v;
      for (const q of pts) pos.push(q.x, 0.04, q.y);
      for (const [a, b, c] of tris) idx.push(base + a, base + c, base + b);
      v += pts.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }, [city]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: U,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
        fragmentShader: waterFrag,
      }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

export function City({ quality }: { quality: Quality }) {
  const [city, setCity] = useState<CityData | null>(null);
  useEffect(() => {
    let alive = true;
    loadCity().then((c) => alive && setCity(c));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <group>
      <Ground />
      <Skyline count={quality === "low" ? 1800 : 5200} />
      {city && (
        <>
          <Water city={city} />
          <Roads city={city} />
          <Streetlights city={city} />
          <Buildings city={city} />
        </>
      )}
    </group>
  );
}
