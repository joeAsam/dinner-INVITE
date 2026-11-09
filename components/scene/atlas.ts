import * as THREE from "three";

/**
 * Crowd sprite atlas generated on a canvas, in the same layout as the original's crowd atlas:
 * 2048 × 2048, 64 × 160 px frames, 32 columns. Per outfit there are 45 frames:
 *   0..20  standing: view (front / three-quarter / back) × 7 poses
 *          (0 still, 1 hands raised, 2 & 3 clap, 4 & 5 sway, 6 spare)
 *   21..44 walking: view (front / ¾ / side / back) × 6 stride frames
 * Channels are masks, not colours: R = main cloth, G = skin, B = second cloth, A = coverage.
 * The shader recolours each figure from per-instance colours, so 8 outfits make a varied crowd.
 */
export const ATLAS = { cols: 32, size: [2048, 2048] as [number, number], frame: [64, 160] as [number, number], world: [0.9, 2.25] as [number, number], feet: 0.05 };

type Ctx = CanvasRenderingContext2D;
const CLOTH = "rgb(255,0,0)";
const SKIN = "rgb(0,255,0)";
const CLOTH2 = "rgb(0,0,255)";
const DARK = "rgb(10,10,10)";

type Outfit = { bottom: "trousers" | "dress" | "robe" | "skirt"; wrap: boolean; sleeves: "long" | "short" };
const OUTFITS: Outfit[] = [
  { bottom: "trousers", wrap: false, sleeves: "short" },
  { bottom: "dress", wrap: false, sleeves: "short" },
  { bottom: "skirt", wrap: true, sleeves: "long" },
  { bottom: "trousers", wrap: false, sleeves: "long" },
  { bottom: "robe", wrap: false, sleeves: "long" },
  { bottom: "dress", wrap: true, sleeves: "long" },
  { bottom: "trousers", wrap: false, sleeves: "short" },
  { bottom: "robe", wrap: true, sleeves: "long" }, // choir robe (the 6% "special" outfit)
];

function limb(g: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, upper: string, lower: string, split = 0.5) {
  const mx = x0 + (x1 - x0) * split;
  const my = y0 + (y1 - y0) * split;
  g.lineCap = "round";
  g.lineWidth = w;
  g.strokeStyle = upper;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(mx, my);
  g.stroke();
  g.strokeStyle = lower;
  g.beginPath();
  g.moveTo(mx, my);
  g.lineTo(x1, y1);
  g.stroke();
}

function figure(g: Ctx, o: Outfit, view: number, pose: number, walk: number | null) {
  const cx = 32;
  const side = view === 1 || view === 2;
  const back = (walk === null && view === 2) || (walk !== null && view === 3);
  const torsoW = side && walk !== null && view === 2 ? 15 : view === 1 ? 20 : 25;
  const shoulderY = 38;
  const hipY = 84;
  const sleeve = o.sleeves === "long" ? 0.85 : 0.4;
  // Legs
  const stride = walk === null ? 0 : Math.sin((walk / 6) * Math.PI * 2) * (view === 0 || view === 3 ? 3 : 11);
  const legLen = 64;
  const legs = (colorTop: string) => {
    for (const s of [-1, 1]) {
      const hx = cx + s * (torsoW / 4);
      const fx = hx + s * stride * (view === 0 || view === 3 ? 1 : -1) * (s === 1 ? 1 : -1);
      limb(g, hx, hipY, fx, hipY + legLen, 9, colorTop, colorTop === SKIN ? SKIN : colorTop, 0.9);
      g.fillStyle = DARK;
      g.fillRect(fx - 5, hipY + legLen - 2, 10, 5);
    }
  };
  if (o.bottom === "trousers") legs(CLOTH2);
  else if (o.bottom === "dress" || o.bottom === "skirt") legs(SKIN);
  else legs(SKIN);
  // Lower garment
  g.fillStyle = o.bottom === "dress" ? CLOTH : CLOTH2;
  if (o.bottom === "dress" || o.bottom === "skirt") {
    g.beginPath();
    g.moveTo(cx - torsoW / 2, hipY - 6);
    g.lineTo(cx + torsoW / 2, hipY - 6);
    g.lineTo(cx + torsoW / 2 + 7, hipY + 44);
    g.lineTo(cx - torsoW / 2 - 7, hipY + 44);
    g.closePath();
    g.fill();
  } else if (o.bottom === "robe") {
    g.fillStyle = CLOTH;
    g.beginPath();
    g.moveTo(cx - torsoW / 2, shoulderY);
    g.lineTo(cx + torsoW / 2, shoulderY);
    g.lineTo(cx + torsoW / 2 + 6, hipY + 60);
    g.lineTo(cx - torsoW / 2 - 6, hipY + 60);
    g.closePath();
    g.fill();
  }
  // Torso
  g.fillStyle = CLOTH;
  g.beginPath();
  g.roundRect(cx - torsoW / 2, shoulderY - 4, torsoW, hipY - shoulderY + 6, 7);
  g.fill();
  // Arms by pose
  const sx = torsoW / 2;
  const arms: [number, number, number, number][] = [];
  const swing = walk === null ? 0 : Math.sin((walk / 6) * Math.PI * 2) * 8;
  if (walk !== null || pose === 0 || pose === 6) arms.push([-sx, shoulderY + 2, -sx - 3 + swing, hipY + 4], [sx, shoulderY + 2, sx + 3 - swing, hipY + 4]);
  else if (pose === 1) arms.push([-sx, shoulderY, -sx - 10, 2], [sx, shoulderY, sx + 10, 2]);
  else if (pose === 2) arms.push([-sx, shoulderY + 2, -2, shoulderY + 18], [sx, shoulderY + 2, 2, shoulderY + 18]);
  else if (pose === 3) arms.push([-sx, shoulderY + 2, -9, shoulderY + 14], [sx, shoulderY + 2, 9, shoulderY + 14]);
  else if (pose === 4) arms.push([-sx, shoulderY, -sx - 14, shoulderY - 18], [sx, shoulderY + 2, sx + 1, hipY]);
  else if (pose === 5) arms.push([-sx, shoulderY + 2, -sx - 1, hipY], [sx, shoulderY, sx + 14, shoulderY - 18]);
  for (const [x0, y0, x1, y1] of arms) {
    if (view === 1 && x0 < 0 && walk === null) continue; // far arm hidden in three-quarter view
    limb(g, cx + x0, y0, cx + x1, y1, 7, CLOTH, SKIN, sleeve);
  }
  // Neck + head
  g.fillStyle = SKIN;
  g.fillRect(cx - 3, shoulderY - 10, 6, 8);
  g.beginPath();
  g.ellipse(cx + (view === 1 ? 2 : 0), 21, 9, 11, 0, 0, Math.PI * 2);
  g.fill();
  if (back) {
    g.fillStyle = DARK;
    g.beginPath();
    g.ellipse(cx, 20, 9.5, 11, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.fillStyle = DARK;
    g.beginPath();
    g.ellipse(cx + (view === 1 ? 2 : 0), 14, 9.5, 5, 0, Math.PI, Math.PI * 2);
    g.fill();
  }
  if (o.wrap) {
    g.fillStyle = CLOTH2;
    g.beginPath();
    g.ellipse(cx, 11, 13, 8, 0, 0, Math.PI * 2);
    g.fill();
  }
}

let cached: THREE.CanvasTexture | null = null;

export function crowdAtlas() {
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = ATLAS.size[0];
  c.height = ATLAS.size[1];
  const g = c.getContext("2d")!;
  const [fw, fh] = ATLAS.frame;
  OUTFITS.forEach((o, oi) => {
    for (let f = 0; f < 45; f++) {
      const frame = oi * 45 + f;
      const col = frame % ATLAS.cols;
      const row = Math.floor(frame / ATLAS.cols);
      g.save();
      g.translate(col * fw, row * fh);
      g.beginPath();
      g.rect(0, 0, fw, fh);
      g.clip();
      if (f < 21) figure(g, o, Math.floor(f / 7), f % 7, null);
      else figure(g, o, Math.floor((f - 21) / 6), 0, (f - 21) % 6);
      g.restore();
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  cached = t;
  return t;
}
