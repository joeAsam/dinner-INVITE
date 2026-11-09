"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadCity } from "@/lib/city";
import { seeded } from "@/lib/rand";
import { ENTRANCES } from "@/lib/paths";
import { toScene } from "@/lib/venues";
import type { Quality } from "@/lib/store";
import { world } from "@/lib/store";
import { SOFT_DOT } from "./light";

const TRAIL = 160;

/** Ember head: a camera-facing quad with a hot core, flickering halo and a faint cross of rays. */
const headVert = "uniform float uSize; varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.); mv.xy+=position.xy*uSize; gl_Position=projectionMatrix*mv; }";
const headFrag = /* glsl */ `uniform float uA; uniform float uTime; varying vec2 vUv;
  void main(){ vec2 p=vUv-.5; float r=length(p); float flick=.9+.1*sin(uTime*23.)*sin(uTime*7.);
    float core=exp(-r*r*240.)*3.0; float halo=exp(-r*r*18.)*.55*flick; float rays=pow(max(0.,1.-abs(p.x*p.y)*900.),8.)*exp(-r*7.)*.6;
    vec3 c=vec3(1.,.93,.78)*core+vec3(1.,.5,.15)*(halo+rays); gl_FragColor=vec4(c*uA,(core+halo)*uA); }`;

/** Road polylines (world space) that run in towards the arena, used by the sparks racing along the streets. */
function useSparkRoutes(quality: Quality) {
  const [routes, setRoutes] = useState<Float32Array[]>([]);
  useEffect(() => {
    let alive = true;
    loadCity().then((city) => {
      const near = (x: number, z: number) => Math.min(...ENTRANCES.map(([ex, ez]) => Math.hypot(x - ex, z - ez)));
      const all: Float32Array[] = [];
      for (const road of city.roads) {
        if (road.r < 1 || road.p.length < 8) continue;
        const xyz: number[] = [];
        for (let i = 0; i < road.p.length; i += 2) {
          const x = road.p[i];
          const z = road.p[i + 1];
          xyz.push(x, 0, z);
        }
        // Each spark runs inbound: towards whichever venue the road gets closest to.
        const d0 = near(xyz[0], xyz[2]);
        const d1 = near(xyz[xyz.length - 3], xyz[xyz.length - 1]);
        if (Math.max(d0, d1) < 400) continue;
        if (d0 < d1) {
          const rev: number[] = [];
          for (let i = xyz.length - 3; i >= 0; i -= 3) rev.push(xyz[i], xyz[i + 1], xyz[i + 2]);
          all.push(new Float32Array(rev));
        } else all.push(new Float32Array(xyz));
      }
      const want = quality === "low" ? 40 : 110;
      const picked: Float32Array[] = [];
      for (let i = 0; picked.length < want && i < all.length * 3; i++) picked.push(all[i % all.length]);
      if (alive) setRoutes(picked);
    });
    return () => {
      alive = false;
    };
  }, [quality]);
  return routes;
}

/** The journey's ember (head, light, decaying trail), sparks racing along the roads, and sparks rising off the stage. */
export function Embers({ quality }: { quality: Quality }) {
  const routes = useSparkRoutes(quality);
  const trail = useMemo(() => {
    const pos = new Float32Array(TRAIL * 3).fill(-9999);
    const life = new Float32Array(TRAIL);
    const seed = new Float32Array(TRAIL);
    const r = seeded(5);
    for (let i = 0; i < TRAIL; i++) seed[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aLife", new THREE.BufferAttribute(life, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: 1 } },
      vertexShader: `attribute float aLife; attribute float aSeed; uniform float uPx; varying float vL;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; vL=aLife;
          gl_PointSize=clamp((700.0+aSeed*900.0)*aLife/-mv.z,0.0,48.0)*uPx; }`,
      fragmentShader: SOFT_DOT + "varying float vL; void main(){ float a=softDot(gl_PointCoord); vec3 c=mix(vec3(1.,.35,.08),vec3(1.,.85,.55),vL*vL); gl_FragColor=vec4(c*a*vL*2.2,a*vL); }",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo: g, mat: m, pos, life, head: 0, last: new THREE.Vector3(-9999, 0, 0) };
  }, []);
  const headMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uA: { value: 0 }, uTime: { value: 0 }, uSize: { value: 8 } },
        vertexShader: headVert,
        fragmentShader: headFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const runners = useMemo(() => {
    const n = routes.length;
    const pos = new Float32Array(n * 3).fill(-9999);
    const alpha = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aA", new THREE.BufferAttribute(alpha, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: 1 } },
      vertexShader: "attribute float aA; uniform float uPx; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; vA=aA; gl_PointSize=clamp(2600.0/-mv.z,2.0,22.0)*uPx; }",
      fragmentShader: SOFT_DOT + "varying float vA; void main(){ float a=softDot(gl_PointCoord); a=a*a; gl_FragColor=vec4(vec3(1.,.62,.24)*a*vA*2.4,a*vA); }",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const r = seeded(9);
    return { geo: g, mat: m, pos, alpha, meta: routes.map(() => ({ start: 0.6 + 5.2 * r(), speed: 0.75 + 0.5 * r() })) };
  }, [routes]);
  const sparkCount = quality === "low" ? 80 : 240;
  const sparks = useMemo(() => {
    const r = seeded(13);
    const pos = new Float32Array(sparkCount * 3);
    const seed = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      pos.set(toScene("deExchange", [(r() - 0.5) * 16, 1.2, -76 + (r() - 0.5) * 8]), i * 3);
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uPx: { value: 1 } },
      vertexShader: `attribute float aSeed; uniform float uTime; uniform float uOn; uniform float uPx; varying float vA;
        void main(){ float H=18.0; float y=mod(uTime*(1.2+aSeed*2.0)+aSeed*H,H);
          vec3 p=position+vec3(sin(uTime*.6+aSeed*30.)*2.0*(y/H), y, cos(uTime*.4+aSeed*20.)*1.5*(y/H));
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
          vA=uOn*(1.0-y/H)*(0.6+0.4*sin(uTime*9.0+aSeed*50.)); gl_PointSize=clamp(90.0/-mv.z,1.0,7.0)*uPx; }`,
      fragmentShader: SOFT_DOT + "varying float vA; void main(){ float a=softDot(gl_PointCoord); gl_FragColor=vec4(vec3(1.,.78,.35)*a*vA*2.,a*vA); }",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo: g, mat: m };
  }, [sparkCount]);

  useEffect(
    () => () => {
      trail.geo.dispose();
      trail.mat.dispose();
      headMat.dispose();
    },
    [trail, headMat],
  );
  useEffect(
    () => () => {
      runners.geo.dispose();
      runners.mat.dispose();
    },
    [runners],
  );
  useEffect(
    () => () => {
      sparks.geo.dispose();
      sparks.mat.dispose();
    },
    [sparks],
  );

  const head = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const cur = useMemo(() => new THREE.Vector3(), []);
  useFrame((s, delta) => {
    const dpr = s.viewport.dpr;
    const t = s.clock.elapsedTime;
    headMat.uniforms.uA.value = world.emberAlive;
    headMat.uniforms.uTime.value = t;
    if (head.current) {
      head.current.position.set(...world.ember);
      headMat.uniforms.uSize.value = Math.max(6, 0.11 * s.camera.position.distanceTo(head.current.position));
    }
    if (light.current) {
      light.current.position.set(...world.ember);
      light.current.intensity = 1600 * world.emberAlive;
    }
    cur.set(...world.ember);
    const d = cur.distanceTo(trail.last);
    if (world.emberAlive > 0.05 && d > 1.4) {
      const k = Math.min(6, Math.floor(d / 1.4));
      for (let i = 0; i < k; i++) {
        const f = (i + 1) / k;
        trail.pos.set([THREE.MathUtils.lerp(trail.last.x, cur.x, f), THREE.MathUtils.lerp(trail.last.y, cur.y, f), THREE.MathUtils.lerp(trail.last.z, cur.z, f)], trail.head * 3);
        trail.life[trail.head] = 1;
        trail.head = (trail.head + 1) % TRAIL;
      }
      trail.last.copy(cur);
    } else if (trail.last.x === -9999) trail.last.copy(cur);
    for (let i = 0; i < TRAIL; i++) {
      trail.life[i] = Math.max(0, trail.life[i] - 0.9 * delta);
      trail.pos[i * 3 + 1] += 1.5 * delta * trail.life[i];
    }
    trail.geo.attributes.position.needsUpdate = true;
    trail.geo.attributes.aLife.needsUpdate = true;
    trail.mat.uniforms.uPx.value = dpr;
    // Road runners: during the journey each fires once on its own schedule; afterwards they loop,
    // brighter while the Directions view is focused.
    const it = world.introT;
    runners.meta.forEach((m, i) => {
      const r = routes[i];
      const last = r.length / 3 - 1;
      let n: number;
      let a: number;
      if (world.introPlaying || it < 13) {
        n = (it - m.start) * 0.17 * m.speed;
        a = n > 0 && n < 1 ? Math.min(1, 6 * n, (1 - n) * 6) : 0;
      } else {
        n = (0.035 * t * m.speed + m.start) % 1;
        a = Math.min(1, 5 * n, (1 - n) * 5) * (0.35 + 0.65 * world.overview);
      }
      n = THREE.MathUtils.clamp(n, 0, 1);
      const f = n * last;
      const j = Math.min(last - 1, Math.floor(f));
      const u = f - j;
      runners.pos[i * 3] = THREE.MathUtils.lerp(r[j * 3], r[j * 3 + 3], u);
      runners.pos[i * 3 + 1] = 2.5;
      runners.pos[i * 3 + 2] = THREE.MathUtils.lerp(r[j * 3 + 2], r[j * 3 + 5], u);
      runners.alpha[i] = a;
    });
    runners.geo.attributes.position.needsUpdate = true;
    (runners.geo.attributes.aA as THREE.BufferAttribute).needsUpdate = true;
    runners.mat.uniforms.uPx.value = dpr;
    sparks.mat.uniforms.uTime.value = t;
    sparks.mat.uniforms.uOn.value = world.focus[4];
    sparks.mat.uniforms.uPx.value = dpr;
  });

  return (
    <group>
      <points geometry={trail.geo} material={trail.mat} frustumCulled={false} />
      {routes.length > 0 && <points geometry={runners.geo} material={runners.mat} frustumCulled={false} />}
      <points geometry={sparks.geo} material={sparks.mat} frustumCulled={false} />
      <mesh ref={head} material={headMat} renderOrder={10} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <pointLight ref={light} color="#ff9440" distance={160} decay={2} intensity={0} />
    </group>
  );
}
