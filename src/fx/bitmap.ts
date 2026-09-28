import * as THREE from 'three';
import { lit, shared } from '../hero/materials';
import { accent } from '../art/theme';

// Abstract 1-bit graphics for the page body, drawn in the accent colour at
// 2 CSS px per pixel. Some are generated directly as bit patterns (op-art
// rings, Truchet arcs, ridge lines); others are simple 3D forms rendered
// once under a studio light and Atkinson-dithered, with an inked outline.
// Everything is baked at load; nothing animates afterwards.

type Bits = Uint8Array; // W*H, 1 = ink
const PX = 2;

// ---------------------------------------------------------------- helpers
// 8x8 ordered-dither threshold in 0..1
function bayer8(x: number, y: number) {
  let v = 0;
  for (let m = 4; m > 0; m >>= 1) {
    const xb = x & m ? 1 : 0, yb = y & m ? 1 : 0;
    v = v * 4 + ((xb ^ yb) | (yb << 1));
  }
  return (v + 0.5) / 64;
}
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
// smooth 1D value noise
function noise1(x: number, seed: number) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

// ---------------------------------------------------------------- 2D patterns
// Op-art: concentric rings warped by a slow angular wave, inside a disc,
// with a dithered halo fading out around it.
function rings(W: number, H: number): Bits {
  const b = new Uint8Array(W * H);
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    if (r < R) {
      const warp = 3.2 * Math.sin(th * 3 + r * 0.06) * (r / R);
      b[y * W + x] = Math.sin((r + warp) * 0.62) > 0.15 ? 1 : 0;
    } else {
      // halo reaches zero before the canvas edge so it never crops square
      const fade = Math.max(0, 1 - (r - R) / (Math.min(W, H) / 2 - R));
      b[y * W + x] = bayer8(x & 7, y & 7) < fade * 0.35 ? 1 : 0;
    }
  }
  return b;
}

// Truchet tiles: each cell holds two quarter-circle arcs in one of two
// orientations, so the arcs join into meandering loops. Density fades
// toward the edges with ordered dithering.
function truchet(W: number, H: number): Bits {
  const b = new Uint8Array(W * H);
  const s = 14, r = s / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const tx = Math.floor(x / s), ty = Math.floor(y / s);
    const lx = x - tx * s, ly = y - ty * s;
    const flip = hash(tx + 3, ty + 7) > 0.5;
    const c1 = flip ? [0, 0] : [s, 0], c2 = flip ? [s, s] : [0, s];
    const d = Math.min(Math.abs(Math.hypot(lx - c1[0], ly - c1[1]) - r), Math.abs(Math.hypot(lx - c2[0], ly - c2[1]) - r));
    if (d > 1.1) continue;
    // keep the middle solid, crumble the arcs away toward the edges
    const ex = Math.min(x, W - 1 - x) / (W * 0.28), ey = Math.min(y, H - 1 - y) / (H * 0.3);
    const keep = Math.min(1, Math.min(ex, ey));
    if (bayer8(x & 7, y & 7) < keep) b[y * W + x] = 1;
  }
  return b;
}

// Ridge lines: stacked horizontal traces with a noisy swell in the middle,
// drawn back to front so nearer lines hide the ones behind them.
function ridges(W: number, H: number): Bits {
  const b = new Uint8Array(W * H);
  const lines = 26, top = Math.round(H * 0.18), gap = (H - top - 6) / lines, mx = W * 0.14;
  for (let k = 0; k < lines; k++) {
    const base = top + k * gap;
    const ys: number[] = [];
    for (let x = 0; x < W; x++) {
      const t = (x - mx) / (W - 2 * mx); // 0..1 across the active band
      const env = t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 3;
      const n = noise1(x * 0.09, k * 5.1) * 0.6 + noise1(x * 0.23, k * 9.7) * 0.4;
      ys.push(Math.round(base - env * n * gap * 5.5 - (env > 0 ? noise1(x * 0.5, k) * 1.2 : 0)));
    }
    for (let x = 0; x < W; x++) {
      // occlude everything under this line down to its baseline
      for (let y = Math.max(0, ys[x] + 1); y <= Math.min(H - 1, Math.round(base) + 1); y++) b[y * W + x] = 0;
      // draw the trace, joining vertical steps so it stays continuous
      const y0 = ys[x], y1 = x > 0 ? ys[x - 1] : y0;
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (y >= 0 && y < H) b[y * W + x] = 1;
    }
  }
  return b;
}

// ---------------------------------------------------------------- 3D forms
const KEY = new THREE.Vector3(1.2, 1.6, 2.0);
const RIM = new THREE.Vector3(-2.2, 0.4, -1.2);
const FILL = new THREE.Vector3(-2.0, -0.6, 1.4);
const LIGHT_KEYS = ['uAmb', 'uTime', 'uLampPos', 'uLampDir', 'uLampI', 'uWinPos', 'uWinI', 'uFillPos', 'uFillI', 'uScrI', 'uLevels', 'uSunI', 'uHemiI', 'uShadowOn', 'uGoboOn'] as const;

function knot() {
  return new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 260, 28, 2, 3), lit({ color: '#ffffff' }));
}
function render3D(r: THREE.WebGLRenderer, model: THREE.Object3D, W: number, H: number, yaw: number, pitch: number): Bits {
  const scene = new THREE.Scene();
  scene.add(model);
  model.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(26, W / H, 0.01, 50);
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const fit = sphere.radius / Math.sin(THREE.MathUtils.degToRad(Math.min(cam.fov, cam.fov * cam.aspect) / 2));
  cam.position.copy(sphere.center).addScaledVector(dir, fit * 1.02);
  cam.lookAt(sphere.center);

  // borrow the shared light uniforms for a studio rig, then put them back
  const saved: Record<string, unknown> = {};
  for (const k of LIGHT_KEYS) { const v = shared[k].value; saved[k] = typeof v === 'number' ? v : (v as THREE.Vector3 | THREE.Color).clone(); }
  const at = (v: THREE.Vector3) => v.clone().multiplyScalar(sphere.radius).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(sphere.center);
  shared.uTime.value = 0;
  shared.uLampPos.value.copy(at(KEY));
  shared.uLampDir.value.copy(sphere.center).sub(shared.uLampPos.value).normalize();
  shared.uLampI.value = 1.4;
  shared.uWinPos.value.copy(at(RIM));
  shared.uWinI.value = 0.6;
  shared.uFillPos.value.copy(at(FILL));
  shared.uFillI.value = 0.25;
  shared.uScrI.value = 0;
  shared.uLevels.value = 40;
  shared.uAmb.value.setRGB(0.02, 0.02, 0.02);
  shared.uSunI.value = 0;
  shared.uHemiI.value = 0;
  shared.uShadowOn.value = 0;
  shared.uGoboOn.value = 0;
  const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const buf = new Uint8Array(W * H * 4);
  r.setRenderTarget(rt);
  r.clear();
  r.render(scene, cam);
  r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  r.setRenderTarget(null);
  rt.dispose();
  for (const k of LIGHT_KEYS) {
    const v = saved[k];
    if (typeof v === 'number') (shared[k] as { value: number }).value = v;
    else (shared[k].value as { copy(x: unknown): void }).copy(v);
  }

  // luminance (top-down rows), contrast-stretched, then Atkinson dithered
  const n = W * H, A = new Uint8Array(n), E = new Float32Array(n);
  const ls: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((H - 1 - y) * W + x) * 4, j = y * W + x;
    if (!buf[i + 3]) continue;
    A[j] = 1;
    E[j] = (buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11) / 255;
    ls.push(E[j]);
  }
  ls.sort((a, b) => a - b);
  const lo = ls[Math.floor(ls.length * 0.02)] ?? 0, hi = ls[Math.floor(ls.length * 0.99)] ?? 1;
  for (let j = 0; j < n; j++) if (A[j]) E[j] = Math.max(0, Math.min(1, (E[j] - lo) / Math.max(0.05, hi - lo)));
  const b = new Uint8Array(n);
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x;
    if (!A[j]) continue;
    const o = E[j] > 0.5 ? 1 : 0;
    b[j] = o;
    const err = (E[j] - o) / 8;
    for (const [dx, dy] of spread) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < W && yy < H && A[yy * W + xx]) E[yy * W + xx] += err;
    }
  }
  // ink the silhouette
  const cov = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : A[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (A[y * W + x] && (!cov(x - 1, y) || !cov(x + 1, y) || !cov(x, y - 1) || !cov(x, y + 1))) b[y * W + x] = 1;
  }
  return b;
}

// ---------------------------------------------------------------- mount
const PATTERNS: Record<string, (W: number, H: number) => Bits> = { rings, truchet, ridges };
const FORMS: Record<string, () => THREE.Object3D> = { knot };

export function mountBitmaps(els: HTMLElement[]) {
  if (!els.length) return;
  let r: THREE.WebGLRenderer | null = null;
  const ink = new THREE.Color(accent());
  const [cr, cg, cb] = [ink.r * 255, ink.g * 255, ink.b * 255];
  for (const el of els) {
    const kind = el.dataset.bitmap ?? '';
    const W = +(el.dataset.w ?? 200), H = +(el.dataset.h ?? 150);
    let bits: Bits | null = null;
    if (PATTERNS[kind]) bits = PATTERNS[kind](W, H);
    else if (FORMS[kind]) {
      try {
        r ??= new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
        r.setClearColor(0x000000, 0);
        bits = render3D(r, FORMS[kind](), W, H, +(el.dataset.yaw ?? 0.3), +(el.dataset.pitch ?? 0.3));
      } catch { bits = null; }
    }
    if (!bits) { el.remove(); continue; }
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    cv.className = 'px';
    cv.style.width = `${W * PX}px`;
    cv.setAttribute('aria-hidden', 'true');
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < W * H; j++) if (bits[j]) { img.data[j * 4] = cr; img.data[j * 4 + 1] = cg; img.data[j * 4 + 2] = cb; img.data[j * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    el.prepend(cv);
  }
  // everything is baked, so the GL context can go
  r?.dispose();
  r?.forceContextLoss();
}
