import * as THREE from 'three';
import { shared } from '../hero/materials';
import { buildCamera, buildComputer, buildLamp, buildMPC, buildRubberPlant, buildTurntable, makeScreen } from '../hero/props';

// ASCII renders of the actual desk props. Each figure renders its model
// (supersampled) into a tiny target, reads the pixels back and turns every
// cell into a glyph: a density ramp for shading, slashes and bars along
// silhouettes and hard edges, tinted with the model's own colours. Figures
// type themselves in when they scroll into view, then keep slowly turning.

type Model = { group: THREE.Object3D; tick?: (t: number) => void };
const H = () => ({ value: 0 });

const MODELS: Record<string, () => Model> = {
  computer: () => {
    const s = makeScreen();
    return { group: buildComputer(H(), s.tex).group, tick: (t) => s.draw(t, 0) };
  },
  turntable: () => {
    const tt = buildTurntable(H());
    return { group: tt.group, tick: (t) => { tt.platter.rotation.y = -t * 3.4; } };
  },
  camera: () => ({ group: buildCamera(H()).group }),
  mpc: () => ({ group: buildMPC(H()).group }),
  lamp: () => ({ group: buildLamp(H()).group }),
  plant: () => ({ group: buildRubberPlant(new THREE.Vector3(0, 0, 0), 1).group }),
};

const RAMP = '.,:;-~=+*ox%#&@';
const SCRAMBLE = '01<>/\\|=+*#%&@$?!';
const SS = 2; // supersample per cell
const FPS = 15;
const TYPE_MS = 1700;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Fig = {
  el: HTMLElement;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cols: number;
  rows: number;
  scene: THREE.Scene;
  cam: THREE.PerspectiveCamera;
  rt: THREE.WebGLRenderTarget;
  nrt: THREE.WebGLRenderTarget;
  buf: Uint8Array;
  nbuf: Uint8Array;
  model: Model;
  center: THREE.Vector3;
  radius: number;
  dist: number;
  yaw: number;
  pitch: number;
  visible: boolean;
  t0: number; // typing start time, -1 until on screen
  last: number;
  lo: number;
  hi: number;
  pointer: number;
};

let renderer: THREE.WebGLRenderer | null = null;
const figs: Fig[] = [];
let raf = 0;
let cw = 6, ch = 10, fs = 9;

// light rig in the model's frame, rotated with the camera so it reads well
const KEY = new THREE.Vector3(0.9, 1.5, 1.7);
const RIM = new THREE.Vector3(-1.8, 0.5, -1.4);
const FILL = new THREE.Vector3(-2, 0.4, 1.4);

export async function mountAscii3D(els: HTMLElement[]) {
  if (!els.length) return;
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

  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    const f = figs.find((x) => x.el === e.target)!;
    if (e.intersectionRatio >= 0.3 && f.t0 < 0) f.t0 = performance.now();
    f.visible = e.isIntersecting;
    // replay the typing next time it arrives
    if (!e.isIntersecting) f.t0 = -1;
    if (f.visible && !raf) raf = requestAnimationFrame(loop);
  }), { threshold: [0, 0.3] });

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

    const model = make();
    const scene = new THREE.Scene();
    scene.add(model.group);
    const box = new THREE.Box3().setFromObject(model.group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const cam = new THREE.PerspectiveCamera(24, (cols * cw) / (rows * ch), 0.01, 20);
    const opts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    const rt = new THREE.WebGLRenderTarget(cols * SS, rows * SS, opts);
    const nrt = new THREE.WebGLRenderTarget(cols * SS, rows * SS, opts);
    const f: Fig = {
      el, cv, ctx, cols, rows, scene, cam, rt, nrt, buf: new Uint8Array(cols * SS * rows * SS * 4), nbuf: new Uint8Array(cols * SS * rows * SS * 4), model,
      center: box.getCenter(new THREE.Vector3()), radius: sphere.radius, dist: 1,
      yaw: +(el.dataset.yaw ?? 0.35), pitch: +(el.dataset.pitch ?? 0.28),
      visible: false, t0: -1, last: 0, lo: 0, hi: 1, pointer: 0,
    };
    fit(f, model.group);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      f.pointer = ((e.clientX - r.left) / r.width - 0.5) * 2;
    });
    el.addEventListener('pointerleave', () => { f.pointer = 0; });
    figs.push(f);
    io.observe(el);
    if (REDUCED) { f.t0 = 0; draw(f, 0, 1); }
  }
}

// Pick a camera distance so the model fills the frame across the orbit,
// measured on a sample of its real vertices rather than its bounding box.
function fit(f: Fig, root: THREE.Object3D) {
  const pts: THREE.Vector3[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const pos = m.isMesh ? m.geometry.getAttribute('position') : null;
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 200));
    for (let i = 0; i < pos.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  });
  const extent = (d: number) => {
    let e = 0;
    for (const s of [-1, -0.5, 0, 0.5, 1]) {
      place(f, f.yaw + s * 0.55, d);
      for (const c of pts) {
        const v = c.clone().project(f.cam);
        if (Math.abs(v.z) <= 1) e = Math.max(e, Math.abs(v.x), Math.abs(v.y));
      }
    }
    return e;
  };
  let d = f.radius / Math.sin(THREE.MathUtils.degToRad(f.cam.fov / 2));
  for (let i = 0; i < 4; i++) d *= extent(d) / 0.95;
  f.dist = d;
}

function place(f: Fig, yaw: number, dist: number) {
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(f.pitch), Math.sin(f.pitch), Math.cos(yaw) * Math.cos(f.pitch));
  f.cam.position.copy(f.center).addScaledVector(dir, dist);
  f.cam.lookAt(f.center);
  f.cam.updateMatrixWorld();
}

function loop(now: number) {
  raf = 0;
  if (REDUCED) return;
  let any = false;
  for (const f of figs) {
    if (!f.visible) continue;
    any = true;
    if (now - f.last < 1000 / FPS) continue;
    f.last = now;
    const k = f.t0 < 0 ? 0 : Math.min(1, (now - f.t0) / TYPE_MS);
    draw(f, now / 1000, k);
  }
  if (any) raf = requestAnimationFrame(loop);
}

const saved: Record<string, unknown> = {};
const NORMALS = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const LIGHT_KEYS = ['uAmb', 'uTime', 'uLampPos', 'uLampDir', 'uLampI', 'uWinPos', 'uWinI', 'uFillPos', 'uFillI', 'uScrI', 'uLevels'] as const;

function render(f: Fig, t: number) {
  const r = renderer!;
  // slow turntable orbit, nudged by the pointer
  const yaw = f.yaw + (REDUCED ? 0 : Math.sin(t * 0.32) * 0.55) + f.pointer * 0.35;
  place(f, yaw, f.dist);
  f.model.tick?.(t);

  // borrow the shared light uniforms for a studio rig, then put them back
  for (const k of LIGHT_KEYS) {
    const v = shared[k].value;
    saved[k] = typeof v === 'number' ? v : (v as THREE.Vector3 | THREE.Color).clone();
  }
  const rot = (v: THREE.Vector3) => v.clone().multiplyScalar(f.radius).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(f.center);
  shared.uTime.value = t;
  shared.uLampPos.value.copy(rot(KEY));
  shared.uLampDir.value.copy(f.center).sub(shared.uLampPos.value).normalize();
  shared.uLampI.value = 1.15;
  shared.uWinPos.value.copy(rot(RIM));
  shared.uWinI.value = 0.9;
  shared.uFillPos.value.copy(rot(FILL));
  shared.uFillI.value = 0.35;
  shared.uScrI.value = 0.1;
  shared.uLevels.value = 24;
  shared.uAmb.value.setRGB(0.05, 0.03, 0.035);

  r.setRenderTarget(f.rt);
  r.clear();
  r.render(f.scene, f.cam);
  r.setRenderTarget(null);
  r.readRenderTargetPixels(f.rt, 0, 0, f.cols * SS, f.rows * SS, f.buf);
  // second pass: view-space normals, for crease lines inside the silhouette
  f.scene.overrideMaterial = NORMALS;
  r.setRenderTarget(f.nrt);
  r.clear();
  r.render(f.scene, f.cam);
  r.setRenderTarget(null);
  f.scene.overrideMaterial = null;
  r.readRenderTargetPixels(f.nrt, 0, 0, f.cols * SS, f.rows * SS, f.nbuf);

  for (const k of LIGHT_KEYS) {
    const v = saved[k];
    if (typeof v === 'number') (shared[k] as { value: number }).value = v;
    else (shared[k].value as { copy(x: unknown): void }).copy(v);
  }
}

// Fraction of sorted values below v.
function rank(sorted: number[], v: number) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
  return sorted.length ? lo / sorted.length : 0;
}

function draw(f: Fig, t: number, k: number) {
  render(f, t);
  const { cols, rows, buf, ctx } = f;
  const n = cols * rows;
  const A = new Float32Array(n), L = new Float32Array(n);
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  const N = new Float32Array(n * 3);
  const W = cols * SS;
  const nb = f.nbuf;
  let lo = 1, hi = 0, r0 = rows, r1 = -1;
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let a = 0, rr = 0, gg = 0, bb = 0, nx = 0, ny = 0, nz = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      // GL rows run bottom-up
      const i = (((rows - 1 - cy) * SS + sy) * W + cx * SS + sx) * 4;
      if (buf[i + 3] === 0) continue;
      a++; rr += buf[i]; gg += buf[i + 1]; bb += buf[i + 2];
      nx += nb[i] / 127.5 - 1; ny += nb[i + 1] / 127.5 - 1; nz += nb[i + 2] / 127.5 - 1;
    }
    const j = cy * cols + cx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    N[j * 3] = nx / nl; N[j * 3 + 1] = ny / nl; N[j * 3 + 2] = nz / nl;
    A[j] = a / (SS * SS);
    if (!a) continue;
    rr /= a * 255; gg /= a * 255; bb /= a * 255;
    R[j] = rr; G[j] = gg; B[j] = bb;
    const l = rr * 0.3 + gg * 0.59 + bb * 0.11;
    L[j] = l;
    if (l < lo) lo = l;
    if (l > hi) hi = l;
    if (cy < r0) r0 = cy;
    if (cy > r1) r1 = cy;
  }
  // adapt exposure smoothly so the full ramp gets used (clip the extremes)
  const ls = Array.from(L.filter((_, j) => A[j] > 0)).sort((a, b) => a - b);
  if (ls.length) { lo = ls[Math.floor(ls.length * 0.04)]; hi = ls[Math.floor(ls.length * 0.97)]; }
  f.lo += (lo - f.lo) * 0.25;
  f.hi += (Math.max(hi, lo + 0.1) - f.hi) * 0.25;
  const span = Math.max(0.08, f.hi - f.lo);

  ctx.clearRect(0, 0, cols * cw, rows * ch);
  ctx.font = `${fs}px "Departure Mono", monospace`;
  ctx.textBaseline = 'top';
  // typing: row-major through the rows that hold the model
  const first = Math.max(0, r0), total = Math.max(1, (r1 - first + 1) * cols);
  const head = k >= 1 ? Infinity : Math.floor(k * total);
  const cov = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : A[y * cols + x]);
  // how different the surface normals are across a cell, 0 (flat) .. 2 (opposed)
  const crease = (x0: number, y0: number, x1: number, y1: number) => {
    if (cov(x0, y0) < 0.25 || cov(x1, y1) < 0.25) return 0;
    const a = (y0 * cols + x0) * 3, b = (y1 * cols + x1) * 3;
    return 1 - (N[a] * N[b] + N[a + 1] * N[b + 1] + N[a + 2] * N[b + 2]);
  };
  const lum = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : (L[y * cols + x] - f.lo) / span);

  for (let cy = first; cy <= r1; cy++) for (let cx = 0; cx < cols; cx++) {
    const ord = (cy - first) * cols + cx;
    if (ord > head) {
      if (ord === head + 1) {
        ctx.fillStyle = '#ff7a2e';
        ctx.fillRect(cx * cw, cy * ch + 1, cw - 1, ch - 2);
      }
      continue;
    }
    const j = cy * cols + cx;
    const a = A[j];
    if (a < 0.25) continue;
    // half linear exposure, half histogram-equalised so big flat panels
    // still spread across the ramp instead of all landing on one glyph
    const l = Math.max(0, Math.min(1, 0.45 * ((L[j] - f.lo) / span) + 0.55 * rank(ls, L[j])));
    let c: string;
    let edge = false;
    // silhouette and hard-edge detection picks a directional glyph
    const gx = cov(cx + 1, cy) - cov(cx - 1, cy), gy = cov(cx, cy + 1) - cov(cx, cy - 1);
    const lx = lum(cx + 1, cy) - lum(cx - 1, cy), ly = lum(cx, cy + 1) - lum(cx, cy - 1);
    let ex = gx, ey = gy;
    if (Math.abs(gx) + Math.abs(gy) < 0.5 && Math.abs(lx) + Math.abs(ly) > 1.1) { ex = lx; ey = ly; }
    const m = Math.abs(ex) + Math.abs(ey);
    const cx2 = crease(cx - 1, cy, cx + 1, cy), cy2 = crease(cx, cy - 1, cx, cy + 1);
    if (m >= 0.5) {
      edge = true;
      const ax = Math.abs(ex), ay = Math.abs(ey);
      if (ay < ax * 0.4) c = '|';
      else if (ax < ay * 0.4) c = ey < 0 ? '_' : '-';
      else c = Math.sign(ex) === Math.sign(ey) ? '/' : '\\';
    } else if (Math.max(cx2, cy2) > 0.45) {
      // a fold in the surface: orient the glyph along the crease
      edge = true;
      if (cx2 > cy2 * 2) c = '|';
      else if (cy2 > cx2 * 2) c = '-';
      else c = crease(cx - 1, cy - 1, cx + 1, cy + 1) > crease(cx - 1, cy + 1, cx + 1, cy - 1) ? '/' : '\\';
    } else {
      c = RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))];
    }
    const recent = head - ord < 7;
    if (recent) c = SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
    // colour: the model's own hue, lifted so dark glyphs stay legible
    const mx = Math.max(R[j], G[j], B[j], 0.04);
    const v = (edge ? 0.62 : 0.34) + l * 0.66;
    const rr = Math.min(255, (R[j] / mx) * v * 255), gg = Math.min(255, (G[j] / mx) * v * 255), bb = Math.min(255, (B[j] / mx) * v * 255);
    ctx.fillStyle = recent ? '#ffa25c' : `rgb(${rr | 0},${gg | 0},${bb | 0})`;
    ctx.fillText(c, cx * cw, cy * ch);
  }
  f.el.classList.toggle('typing', k < 1);
}
