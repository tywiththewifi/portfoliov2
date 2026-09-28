import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { Pix, bayer } from '../../art/pix';
import { rng } from '../../art/posters';
import { pixelTexture } from '../materials';

// Procedural pixel textures for the outdoor scenes. Everything is painted
// at low resolution with small palettes and ordered dithering so it sits
// with the hero's pixel post-process.

const simplex = new SimplexNoise({ random: rng(2024) });
export const noise2 = (x: number, y: number) => simplex.noise(x, y);
export const fbm = (x: number, y: number, oct = 4) => {
  let a = 0, f = 1, amp = 0.5;
  for (let i = 0; i < oct; i++) { a += simplex.noise(x * f, y * f) * amp; f *= 2; amp *= 0.5; }
  return a;
};

// pick from a ramp by a 0..1 value with an ordered dither between steps
function ramp(cols: string[], v: number, x: number, y: number) {
  const n = cols.length - 1;
  const f = Math.max(0, Math.min(n, v * n + bayer(x, y) - 0.5));
  return cols[Math.round(f)];
}

export function repeatTex(t: THREE.Texture, rx: number, ry: number) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

// Tileable ground: noise-mottled soil / grass / moss.
export function groundTex(cols: string[], size = 128, scale = 0.06, seed = 0) {
  const g = new Pix(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // tile by sampling noise on a torus
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    const r = size * scale;
    const v = simplex.noise4d(Math.cos(a) * r, Math.sin(a) * r, Math.cos(b) * r + seed, Math.sin(b) * r) * 0.5 + 0.5;
    g.p(x, y, ramp(cols, v, x, y));
  }
  g.grain(0.08, 3 + seed);
  return repeatTex(pixelTexture(g.canvas), 1, 1);
}

// Vertical bark with knots and moss, tileable on U.
export function barkTex(base: string[], moss?: string) {
  const W = 32, H = 128;
  const g = new Pix(W, H);
  const R = rng(9);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = 0.5 + 0.35 * Math.sin((x / W) * Math.PI * 2 * 3 + noise2(x * 0.1, y * 0.03) * 2) + (R() - 0.5) * 0.3;
    g.p(x, y, ramp(base, Math.max(0, Math.min(1, v)), x, y));
  }
  for (let i = 0; i < 6; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * H); g.ellipse(x, y, 2, 3, base[0]); g.p(x, y - 1, base[base.length - 1]); }
  if (moss) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (noise2(x * 0.15, y * 0.05) > 0.35 && bayer(x, y) < 0.7) g.p(x, y, moss);
  const t = pixelTexture(g.canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A cluster of small leaves on transparency, for foliage cards.
export function leafClusterTex(cols: string[], seed = 1, n = 70, size = 64) {
  const g = new Pix(size, size);
  const R = rng(seed);
  const c = size / 2;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * (c - 6);
    const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
    // leaves further up-left are lighter (sunlit side)
    const lit = 0.5 - (Math.cos(a) * d + Math.sin(a) * d) / (size * 1.2) + (R() - 0.5) * 0.3;
    const col = cols[Math.max(0, Math.min(cols.length - 1, Math.round(lit * (cols.length - 1))))];
    const len = 3 + R() * 3, ang = R() * Math.PI;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let t = -len; t <= len; t++) {
      const w = Math.round((1 - Math.abs(t) / (len + 1)) * 2);
      for (let k = -w; k <= w; k++) g.p(Math.round(x + dx * t - dy * k), Math.round(y + dy * t + dx * k), col);
    }
  }
  return pixelTexture(g.canvas);
}

// Canopy light pattern for the "gobo": bright patches with soft leafy
// holes, stepped into a few levels. Tileable.
export function goboTex(size = 128) {
  const g = new Pix(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    const v = simplex.noise4d(Math.cos(a) * 1.6, Math.sin(a) * 1.6, Math.cos(b) * 1.6, Math.sin(b) * 1.6) * 0.6
      + simplex.noise4d(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(b) * 4 + 9, Math.sin(b) * 4) * 0.4;
    const l = v > 0.18 ? 255 : v > 0.02 ? (bayer(x, y) < 0.5 ? 255 : 70) : 60;
    const c = `rgb(${l},${l},${l})`;
    g.p(x, y, c);
  }
  const t = pixelTexture(g.canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A painted wall of forest for the far backdrop: trunks and canopy masses.
export function forestLayerTex(o: { w: number; h: number; seed: number; trunk: string; leaves: string[]; trunks: number; sky?: boolean }) {
  const g = new Pix(o.w, o.h);
  const R = rng(o.seed);
  // canopy mass across the top two thirds, ragged bottom edge
  for (let x = 0; x < o.w; x++) {
    const edge = o.h * (0.55 + 0.25 * (noise2(x * 0.03, o.seed) * 0.5 + 0.5)) + noise2(x * 0.2, o.seed + 3) * 6;
    for (let y = 0; y < edge; y++) {
      const v = 0.5 + 0.5 * fbm(x * 0.04, y * 0.05 + o.seed, 3);
      if (o.sky && y < o.h * 0.12 && v < 0.45) continue; // gaps to the sky
      g.p(x, y, ramp(o.leaves, v, x, y));
    }
  }
  // trunks down to the ground
  for (let i = 0; i < o.trunks; i++) {
    const x = Math.floor(R() * o.w), w = 1 + Math.floor(R() * 3);
    const top = Math.floor(o.h * (0.2 + R() * 0.4));
    g.r(x, top, w, o.h - top, o.trunk);
  }
  // undergrowth band
  for (let x = 0; x < o.w; x++) {
    const hh = o.h * (0.12 + 0.08 * (noise2(x * 0.08, o.seed + 7) * 0.5 + 0.5));
    for (let y = Math.floor(o.h - hh); y < o.h; y++) g.p(x, y, ramp(o.leaves, 0.3 + 0.4 * (noise2(x * 0.2, y * 0.2) * 0.5 + 0.5), x, y));
  }
  return pixelTexture(g.canvas);
}

// Mountain silhouette strip, optional snow caps.
export function mountainTex(o: { w: number; h: number; seed: number; body: string[]; snow?: string; rough?: number }) {
  const g = new Pix(o.w, o.h);
  const rough = o.rough ?? 1;
  const top: number[] = [];
  for (let x = 0; x < o.w; x++) {
    const v = fbm(x * 0.012 * rough, o.seed, 5);
    top.push(Math.round(o.h * (0.35 - v * 0.45)));
  }
  for (let x = 0; x < o.w; x++) {
    for (let y = Math.max(0, top[x]); y < o.h; y++) {
      // light from the left: slopes facing left are lighter
      const slope = (top[Math.min(o.w - 1, x + 1)] - top[Math.max(0, x - 1)]) * 0.5;
      const v = 0.5 + Math.max(-0.5, Math.min(0.5, slope * 0.3)) - (y - top[x]) / o.h * 0.4;
      g.p(x, y, ramp(o.body, Math.max(0, Math.min(1, v)), x, y));
      if (o.snow && y - top[x] < 6 + noise2(x * 0.3, y) * 3 && top[x] < o.h * 0.3) g.p(x, y, o.snow);
    }
  }
  return pixelTexture(g.canvas);
}

// Row of pine silhouettes for a shoreline.
export function pineRowTex(o: { w: number; h: number; seed: number; cols: string[] }) {
  const g = new Pix(o.w, o.h);
  const R = rng(o.seed);
  let x = -4;
  while (x < o.w + 4) {
    const th = o.h * (0.45 + R() * 0.5), tw = th * (0.28 + R() * 0.1);
    const base = o.h - 2, cx = x;
    for (let y = 0; y < th; y++) {
      const t = y / th; // 0 at tip
      const half = tw * t * (0.8 + 0.2 * Math.sin(y * 1.3)); // stepped boughs
      const col = o.cols[Math.min(o.cols.length - 1, Math.floor(t * o.cols.length))];
      g.r(cx - half, base - th + y, half * 2 + 1, 1, col);
    }
    x += tw * (0.9 + R() * 0.8);
  }
  g.r(0, o.h - 3, o.w, 3, o.cols[o.cols.length - 1]);
  return pixelTexture(g.canvas);
}

// Stylised cumulus with a warm lit edge on the sun side (left or right).
export function cloudTex(o: { w: number; h: number; seed: number; cols: string[]; sunLeft: boolean }) {
  const g = new Pix(o.w, o.h);
  const R = rng(o.seed);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const x = o.w * (0.15 + R() * 0.7), r = o.h * (0.18 + R() * 0.2);
    const y = o.h - r - 2 - R() * o.h * 0.25;
    blobs.push([x, y, r]);
  }
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    let inside = false, lx = 0;
    for (const [bx, by, r] of blobs) {
      const d = Math.hypot(x - bx, (y - by) * 1.2);
      if (d < r) { inside = true; lx = Math.max(lx, ((o.sunLeft ? bx - x : x - bx) + (by - y) * 0.6) / r); }
    }
    if (!inside) continue;
    const v = Math.max(0, Math.min(1, 0.45 + lx * 0.6 - (y / o.h) * 0.25));
    g.p(x, y, ramp(o.cols, v, x, y));
  }
  return pixelTexture(g.canvas);
}

// Planks for a dock / weathered table top.
export function plankTex(cols: string[], planks = 8, W = 128, H = 128) {
  const g = new Pix(W, H);
  const pw = H / planks;
  for (let p = 0; p < planks; p++) {
    const tone = (p * 37) % 3;
    for (let y = Math.floor(p * pw); y < Math.floor((p + 1) * pw); y++) for (let x = 0; x < W; x++) {
      const v = 0.45 + tone * 0.08 + 0.25 * Math.sin(x * 0.09 + noise2(x * 0.02, y * 0.3 + p) * 3) * 0.5;
      g.p(x, y, ramp(cols, Math.max(0, Math.min(1, v)), x, y));
    }
    g.r(0, Math.floor(p * pw), W, 1, cols[0]);
    // nails
    g.p(3, Math.floor(p * pw + pw / 2), cols[0]); g.p(W - 4, Math.floor(p * pw + pw / 2), cols[0]);
  }
  return pixelTexture(g.canvas);
}
