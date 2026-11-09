"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { byId } from "@/lib/destinations";
import { ui, world } from "@/lib/store";
import { applyLight, lightState, U } from "./light";

const tuneSky = (s: Sky) => {
  const u = s.material.uniforms;
  u.turbidity.value = 14;
  u.rayleigh.value = 1.35;
  u.mieCoefficient.value = 0.011;
  u.mieDirectionalG.value = 0.86;
};

const domeFrag = /* glsl */ `uniform float uNight; uniform float uTime; uniform vec3 uSunDir; uniform float uTwilight; varying vec3 vD;
  float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
  void main(){ float y = vD.y;
    // Afterglow: warm along the horizon towards the set sun, deepening to blue overhead.
    vec2 sd = normalize(uSunDir.xz + 1e-5), dd = normalize(vD.xz + 1e-5);
    float toward = dot(sd, dd) * 0.5 + 0.5;
    float tw = uTwilight;
    vec3 zen = mix(vec3(0.006,0.009,0.024), vec3(0.05,0.07,0.16), tw);
    vec3 hor = mix(vec3(0.03,0.025,0.04), mix(vec3(0.16,0.10,0.22), vec3(0.95,0.42,0.16), pow(toward, 3.0)), tw);
    vec3 c = mix(hor, zen, smoothstep(-0.02, 0.45 + 0.2 * tw, y));
    c += vec3(1.0,0.5,0.2) * exp(-max(y,0.0) * 14.0) * pow(toward, 6.0) * tw * 0.8;
    c += vec3(0.26,0.11,0.05) * exp(-abs(y)*20.0) * 0.6 * (1.0 - tw);
    vec3 q = floor(vD*420.0); float st = step(0.9972,h(q))*smoothstep(0.05,0.5,y);
    c += vec3(0.85,0.9,1.0)*st*(0.5+0.5*sin(uTime*2.0+h(q)*40.0))*0.6*uNight;
    gl_FragColor = vec4(c, max(uNight, tw)); }`;

/** Preetham sky with clouds, under a night dome with afterglow and twinkling stars. */
function SkyDome() {
  const sky = useMemo(() => {
    const s = new Sky();
    s.scale.setScalar(2e4);
    tuneSky(s);
    return s;
  }, []);
  const dome = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        fog: false,
        uniforms: { uNight: U.uNight, uTime: U.uTime, uSunDir: U.uSunDir, uTwilight: { value: 0 } },
        vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }",
        fragmentShader: domeFrag,
      }),
    [],
  );
  useEffect(
    () => () => {
      sky.geometry.dispose();
      sky.material.dispose();
      dome.dispose();
    },
    [sky, dome],
  );
  useFrame(() => {
    const l = lightState.light;
    if (!l) return;
    sky.material.uniforms.sunPosition.value.set(...l.sunDir);
    sky.material.uniforms.rayleigh.value = 1.1 + 0.6 * l.golden;
    const n = l.elevation;
    dome.uniforms.uTwilight.value = n > 0.5 ? 0 : Math.min(1, (0.5 - n) / 2) * (1 - Math.min(1, Math.max(0, (-n - 4) / 8)));
  });
  return (
    <group>
      <primitive object={sky} />
      <mesh material={dome} renderOrder={-5} frustumCulled={false}>
        <sphereGeometry args={[19000, 32, 16]} />
      </mesh>
    </group>
  );
}

/** Sun + sky lights: directional (with shadows by day), hemisphere, and a PMREM environment re-baked as the sun moves. */
function LightRig({ shadows, mapSize }: { shadows: boolean; mapSize: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene, gl } = useThree();
  const env = useRef<{ pmrem: THREE.PMREMGenerator | null; last: THREE.Vector3; rt: THREE.WebGLRenderTarget | null; sky: Sky | null; scene: THREE.Scene | null; t: number }>({
    pmrem: null,
    last: new THREE.Vector3(9, 9, 9),
    rt: null,
    sky: null,
    scene: null,
    t: 0,
  });
  useEffect(() => {
    const e = env.current;
    e.pmrem = new THREE.PMREMGenerator(gl);
    e.scene = new THREE.Scene();
    e.sky = new Sky();
    e.sky.scale.setScalar(1000);
    tuneSky(e.sky);
    e.scene.add(e.sky);
    return () => {
      e.rt?.dispose();
      e.pmrem?.dispose();
      e.sky?.geometry.dispose();
      e.sky?.material.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  useFrame((_, dt) => {
    const l = lightState.light;
    if (!l || !sun.current || !hemi.current) return;
    const d = sun.current;
    // The shadow box (±190 m) rides along with whatever the camera is looking at.
    const [lx, , lz] = world.look;
    d.position.set(lx + 500 * l.sunDir[0], 500 * Math.max(l.sunDir[1], 0.02), lz + 500 * l.sunDir[2]);
    d.target.position.set(lx, 0, lz);
    d.target.updateMatrixWorld();
    d.color.setRGB(...l.sunColor, THREE.SRGBColorSpace);
    d.intensity = 0.95 * l.sunIntensity * lightState.exposure;
    d.castShadow = shadows && l.elevation > 0.5;
    hemi.current.color.setRGB(...l.hemiSky, THREE.SRGBColorSpace);
    hemi.current.groundColor.setRGB(...l.hemiGround, THREE.SRGBColorSpace);
    hemi.current.intensity = 0.28 * l.hemiIntensity * lightState.exposure;
    const e = env.current;
    e.t += dt;
    const dir = new THREE.Vector3(...l.sunDir);
    if (e.pmrem && e.sky && e.scene && e.t > 0.4 && dir.distanceTo(e.last) > 0.025) {
      e.t = 0;
      e.last.copy(dir);
      e.sky.material.uniforms.sunPosition.value.copy(dir);
      const rt = e.pmrem.fromScene(e.scene, 0, 0.1, 2000);
      scene.environment = rt.texture;
      e.rt?.dispose();
      e.rt = rt;
    }
    scene.environmentIntensity = 0.3 * l.envIntensity * lightState.exposure;
  });
  return (
    <group>
      <hemisphereLight ref={hemi} args={["#b6c0cc", "#5d4c3a", 1]} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        intensity={2}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-4e-4}
        shadow-normalBias={0.6}
        shadow-camera-left={-190}
        shadow-camera-right={190}
        shadow-camera-top={190}
        shadow-camera-bottom={-190}
        shadow-camera-near={10}
        shadow-camera-far={1100}
      />
    </group>
  );
}

/** Darkens untextured standard materials (grade) and turns on shadows for them, 300ms after mount. */
function Grade({ enabled, grade = 0.7 }: { enabled: boolean; grade?: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat.isMeshStandardMaterial || mat.transparent) return;
        m.castShadow = true;
        m.receiveShadow = true;
        if (!mat.map && !mat.vertexColors && !mat.userData.graded) {
          mat.color.multiplyScalar(grade);
          mat.userData.graded = true;
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [scene, enabled, grade]);
  return null;
}

/**
 * Eases the per-day focus values and the scene clock towards the current stop, then runs the light
 * model. Scrolling from a morning stop to a night stop plays a short sunset rather than cutting.
 */
function Driver() {
  useFrame((s, dt) => {
    const st = ui.get();
    const d = byId[st.at];
    const k = 1 - Math.exp(-2.2 * Math.min(dt, 0.05));
    const exploring = st.phase === "explore";
    for (let i = 0; i < 5; i++) world.focus[i] += ((exploring && d.day === i ? 1 : 0) - world.focus[i]) * k;
    world.overview += ((exploring && st.at === "overview" ? 1 : 0) - world.overview) * k;
    // Intro holds at dusk; the journey settles towards the overview's sunset light.
    const target = st.phase === "explore" ? d.minutes : st.phase === "journey" ? 18 * 60 + 40 + 12 * Math.min(1, world.introT / 15.6) : 18 * 60 + 40;
    // Ease the clock: about 1.5 s to cross from morning to night; reduced motion jumps.
    const km = st.reduced ? 1 : 1 - Math.exp(-1.6 * Math.min(dt, 0.05));
    world.minutes += (target - world.minutes) * km;
    applyLight(s.scene, s.clock.elapsedTime, s.viewport.dpr);
  });
  return null;
}

/** Stop rendering while the tab is hidden. */
function PauseWhenHidden() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const sync = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [setFrameloop]);
  return null;
}

export { SkyDome, LightRig, Grade, Driver, PauseWhenHidden };
