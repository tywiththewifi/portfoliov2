import * as THREE from 'three';
import { shared } from '../hero/materials';
import { buildCamera, buildComputer, buildLamp, buildMPC, buildPothos, buildTurntable, makeScreen } from '../hero/props';

// ASCII renders of the actual desk props. Each model is rendered once
// (supersampled, plus a normals pass), read back and turned into glyphs: a
// density ramp for shading, slashes and bars along silhouettes and creases,
// tinted with the model's own colours. Scrolling a figure into view types
// it out; once it is complete it stays put as a still image.

const H = () => ({ value: 0 });
const MODELS: Record<string, () => THREE.Object3D> = {
  computer: () => {
    const s = makeScreen();
    s.draw(3, 0); // all boot lines showing
    return buildComputer(H(), s.tex).group;
  },
  turntable: () => buildTurntable(H()).group,
  camera: () => buildCamera(H()).group,
  mpc: () => buildMPC(H()).group,
  lamp: () => buildLamp(H()).group,
  plant: () => buildPothos(new THREE.Vector3(0, 0, 0), { drop: 0.26 }).group,
};

const RAMP = '.,:;-~=+*ox%#&@';
const SCRAMBLE = '01<>/\\|=+*#%&@$?!';
const SS = 2; // supersample per cell
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Glyph = { x: number; y: number; c: string; col: string };
type Fig = {
  el: HTMLElement;
  ctx: CanvasRenderingContext2D;
  cols: number;
  rows: number;
  glyphs: Glyph[];
  k: number; // how much has been typed, only ever grows
};

let cw = 6, ch = 10;
const fs = 9;

// studio light rig, in multiples of the model's radius, relative to the camera side
const KEY = new THREE.Vector3(0.9, 1.5, 1.7);
const RIM = new THREE.Vector3(-1.8, 0.5, -1.4);
const FILL = new THREE.Vector3(-2, 0.4, 1.4);
const NORMALS = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const LIGHT_KEYS = ['uAmb', 'uTime', 'uLampPos', 'uLampDir', 'uLampI', 'uWinPos', 'uWinI', 'uFillPos', 'uFillI', 'uScrI', 'uLevels'] as const;

export async function mountAscii3D(els: HTMLElement[]) {
  if (!els.length) return;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    els.forEach((el) => el.classList.add('fig-off'));
    return;
  }
  renderer.setClearColor(0x000000, 0);
  await document.fonts.load(`${fs}px "Departure Mono"`).catch(() => undefined);
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `${fs}px "Departure Mono", monospace`;
  cw = probe.measureText('M').width;
  ch = Math.round(fs * 1.12);

  const figs: Fig[] = [];
  for (const el of els) {
    const make = MODELS[el.dataset.ascii3d ?? ''];
    if (!make) continue;
    const cols = +(el.dataset.cols ?? 64), rows = +(el.dataset.rows ?? 34);
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(cols * cw * dpr);
    cv.height = Math.round(rows * ch * dpr);
    cv.style.aspectRatio = `${cols * cw} / ${rows * ch}`;
    cv.setAttribute('aria-hidden', 'true');
    el.prepend(cv);
    const ctx = cv.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const glyphs = renderGlyphs(renderer, make(), cols, rows, +(el.dataset.yaw ?? 0.35), +(el.dataset.pitch ?? 0.28));
    const f: Fig = { el, ctx, cols, rows, glyphs, k: REDUCED ? 1 : 0 };
    figs.push(f);
    paint(f);
  }
  // every figure is baked, so the GL context can go
  renderer.dispose();
  renderer.forceContextLoss();
  if (REDUCED) return;

  // Typing progress follows the scroll: it starts as the figure's top
  // enters the bottom of the viewport and finishes by 40% from the top.
  let queued = false;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    for (const f of figs) {
      if (f.k >= 1) continue;
      const top = f.el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (vh * 0.95 - top) / (vh * 0.55)));
      if (p > f.k) { f.k = p; paint(f); }
    }
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// Fraction of sorted values below v.
function rank(sorted: number[], v: number) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
  return sorted.length ? lo / sorted.length : 0;
}

function renderGlyphs(r: THREE.WebGLRenderer, model: THREE.Object3D, cols: number, rows: number, yaw: number, pitch: number): Glyph[] {
  const scene = new THREE.Scene();
  scene.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const cam = new THREE.PerspectiveCamera(24, (cols * cw) / (rows * ch), 0.01, 20);
  const place = (d: number) => {
    cam.position.copy(center).addScaledVector(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)), d);
    cam.lookAt(center);
    cam.updateMatrixWorld();
  };
  // fit the camera to a sample of the real vertices so the model fills the frame
  const pts: THREE.Vector3[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    const pos = m.isMesh ? m.geometry.getAttribute('position') : null;
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 200));
    for (let i = 0; i < pos.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  });
  let d = radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2));
  for (let i = 0; i < 4; i++) {
    place(d);
    let e = 0;
    for (const c of pts) { const v = c.clone().project(cam); if (Math.abs(v.z) <= 1) e = Math.max(e, Math.abs(v.x), Math.abs(v.y)); }
    d *= e / 0.95;
  }
  place(d);

  // borrow the shared light uniforms for a studio rig, then put them back
  const saved: Record<string, unknown> = {};
  for (const k of LIGHT_KEYS) { const v = shared[k].value; saved[k] = typeof v === 'number' ? v : (v as THREE.Vector3 | THREE.Color).clone(); }
  const rot = (v: THREE.Vector3) => v.clone().multiplyScalar(radius).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(center);
  shared.uTime.value = 0;
  shared.uLampPos.value.copy(rot(KEY));
  shared.uLampDir.value.copy(center).sub(shared.uLampPos.value).normalize();
  shared.uLampI.value = 1.15;
  shared.uWinPos.value.copy(rot(RIM));
  shared.uWinI.value = 0.9;
  shared.uFillPos.value.copy(rot(FILL));
  shared.uFillI.value = 0.35;
  shared.uScrI.value = 0.1;
  shared.uLevels.value = 24;
  shared.uAmb.value.setRGB(0.05, 0.03, 0.035);

  const W = cols * SS, Hh = rows * SS;
  const opts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
  const read = (override: THREE.Material | null) => {
    const rt = new THREE.WebGLRenderTarget(W, Hh, opts);
    const buf = new Uint8Array(W * Hh * 4);
    scene.overrideMaterial = override;
    r.setRenderTarget(rt);
    r.clear();
    r.render(scene, cam);
    r.readRenderTargetPixels(rt, 0, 0, W, Hh, buf);
    r.setRenderTarget(null);
    rt.dispose();
    return buf;
  };
  const buf = read(null);
  const nb = read(NORMALS);
  scene.overrideMaterial = null;
  for (const k of LIGHT_KEYS) {
    const v = saved[k];
    if (typeof v === 'number') (shared[k] as { value: number }).value = v;
    else (shared[k].value as { copy(x: unknown): void }).copy(v);
  }

  // per-cell coverage, colour, luminance and normal
  const n = cols * rows;
  const A = new Float32Array(n), L = new Float32Array(n);
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  const N = new Float32Array(n * 3);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let a = 0, rr = 0, gg = 0, bb = 0, nx = 0, ny = 0, nz = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const i = (((rows - 1 - cy) * SS + sy) * W + cx * SS + sx) * 4; // GL rows run bottom-up
      if (buf[i + 3] === 0) continue;
      a++; rr += buf[i]; gg += buf[i + 1]; bb += buf[i + 2];
      nx += nb[i] / 127.5 - 1; ny += nb[i + 1] / 127.5 - 1; nz += nb[i + 2] / 127.5 - 1;
    }
    const j = cy * cols + cx;
    A[j] = a / (SS * SS);
    if (!a) continue;
    const nl = Math.hypot(nx, ny, nz) || 1;
    N[j * 3] = nx / nl; N[j * 3 + 1] = ny / nl; N[j * 3 + 2] = nz / nl;
    R[j] = rr / (a * 255); G[j] = gg / (a * 255); B[j] = bb / (a * 255);
    L[j] = R[j] * 0.3 + G[j] * 0.59 + B[j] * 0.11;
  }
  const ls = Array.from(L.filter((_, j) => A[j] > 0)).sort((a, b) => a - b);
  const lo = ls.length ? ls[Math.floor(ls.length * 0.04)] : 0;
  const span = Math.max(0.08, (ls.length ? ls[Math.floor(ls.length * 0.97)] : 1) - lo);

  const cov = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : A[y * cols + x]);
  const lum = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : (L[y * cols + x] - lo) / span);
  // how different the surface normals are across a cell, 0 (flat) .. 2 (opposed)
  const crease = (x0: number, y0: number, x1: number, y1: number) => {
    if (cov(x0, y0) < 0.25 || cov(x1, y1) < 0.25) return 0;
    const a = (y0 * cols + x0) * 3, b = (y1 * cols + x1) * 3;
    return 1 - (N[a] * N[b] + N[a + 1] * N[b + 1] + N[a + 2] * N[b + 2]);
  };

  const glyphs: Glyph[] = [];
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const j = cy * cols + cx;
    if (A[j] < 0.25) continue;
    // half linear exposure, half histogram-equalised so big flat panels
    // still spread across the ramp instead of all landing on one glyph
    const l = Math.max(0, Math.min(1, 0.45 * ((L[j] - lo) / span) + 0.55 * rank(ls, L[j])));
    let c: string;
    let edge = true;
    const gx = cov(cx + 1, cy) - cov(cx - 1, cy), gy = cov(cx, cy + 1) - cov(cx, cy - 1);
    const lx = lum(cx + 1, cy) - lum(cx - 1, cy), ly = lum(cx, cy + 1) - lum(cx, cy - 1);
    let ex = gx, ey = gy;
    if (Math.abs(gx) + Math.abs(gy) < 0.5 && Math.abs(lx) + Math.abs(ly) > 1.1) { ex = lx; ey = ly; }
    const cx2 = crease(cx - 1, cy, cx + 1, cy), cy2 = crease(cx, cy - 1, cx, cy + 1);
    if (Math.abs(ex) + Math.abs(ey) >= 0.5) {
      // silhouette or hard tonal edge: glyph follows the edge direction
      const ax = Math.abs(ex), ay = Math.abs(ey);
      if (ay < ax * 0.4) c = '|';
      else if (ax < ay * 0.4) c = ey < 0 ? '_' : '-';
      else c = Math.sign(ex) === Math.sign(ey) ? '/' : '\\';
    } else if (Math.max(cx2, cy2) > 0.45) {
      // a fold in the surface: orient the glyph along the crease
      if (cx2 > cy2 * 2) c = '|';
      else if (cy2 > cx2 * 2) c = '-';
      else c = crease(cx - 1, cy - 1, cx + 1, cy + 1) > crease(cx - 1, cy + 1, cx + 1, cy - 1) ? '/' : '\\';
    } else {
      edge = false;
      c = RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))];
    }
    // colour: the model's own hue, lifted so dark glyphs stay legible
    const mx = Math.max(R[j], G[j], B[j], 0.04);
    const v = ((edge ? 0.62 : 0.34) + l * 0.66) * 255;
    glyphs.push({ x: cx, y: cy, c, col: `rgb(${Math.min(255, (R[j] / mx) * v) | 0},${Math.min(255, (G[j] / mx) * v) | 0},${Math.min(255, (B[j] / mx) * v) | 0})` });
  }
  return glyphs;
}

function paint(f: Fig) {
  const { ctx, glyphs } = f;
  ctx.clearRect(0, 0, f.cols * cw, f.rows * ch);
  ctx.font = `${fs}px "Departure Mono", monospace`;
  ctx.textBaseline = 'top';
  const head = f.k >= 1 ? glyphs.length : Math.floor(f.k * glyphs.length);
  for (let i = 0; i < head; i++) {
    const g = glyphs[i];
    // the last few typed glyphs are still "resolving"
    const fresh = head - i <= 6 && f.k < 1;
    ctx.fillStyle = fresh ? '#ffa25c' : g.col;
    ctx.fillText(fresh ? SCRAMBLE[(i * 7 + head) % SCRAMBLE.length] : g.c, g.x * cw, g.y * ch);
  }
  if (f.k > 0 && f.k < 1 && glyphs.length) {
    const g = glyphs[Math.min(head, glyphs.length - 1)];
    ctx.fillStyle = '#ff7a2e';
    ctx.fillRect(g.x * cw, g.y * ch + 1, cw - 1, ch - 2);
  }
  f.el.classList.toggle('typing', f.k < 1);
}
