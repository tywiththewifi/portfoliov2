import * as THREE from 'three';
import { shared } from '../hero/materials';
import { buildCamera, buildComputer, buildMPC, buildTurntable, makeScreen } from '../hero/props';
import { accent } from '../art/theme';

// 1-bit bitmap renders of the desk props for the page body, like old
// MacPaint art: each model is rendered once under a studio light, then
// Atkinson-dithered to on/off pixels in the accent colour, with its
// silhouette and hard creases inked in. Baked once; the GL context is
// thrown away afterwards.

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
};

const PX = 2; // CSS px per bitmap pixel, matching the hero's pixel size
const KEY = new THREE.Vector3(0.9, 1.5, 1.7);
const RIM = new THREE.Vector3(-1.8, 0.5, -1.4);
const FILL = new THREE.Vector3(-2, 0.4, 1.4);
const NORMALS = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const LIGHT_KEYS = ['uAmb', 'uTime', 'uLampPos', 'uLampDir', 'uLampI', 'uWinPos', 'uWinI', 'uFillPos', 'uFillI', 'uScrI', 'uLevels'] as const;

export function mountBitmaps(els: HTMLElement[]) {
  if (!els.length) return;
  let r: THREE.WebGLRenderer;
  try {
    r = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    els.forEach((el) => el.remove());
    return;
  }
  r.setClearColor(0x000000, 0);
  const ink = new THREE.Color(accent());
  for (const el of els) {
    const make = MODELS[el.dataset.bitmap ?? ''];
    if (!make) continue;
    const w = +(el.dataset.w ?? 220), h = +(el.dataset.h ?? 160);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.className = 'px';
    cv.style.width = `${w * PX}px`;
    cv.style.aspectRatio = `${w} / ${h}`;
    cv.setAttribute('aria-hidden', 'true');
    el.prepend(cv);
    bake(r, make(), cv, +(el.dataset.yaw ?? 0.35), +(el.dataset.pitch ?? 0.28), ink);
  }
  r.dispose();
  r.forceContextLoss();
}

function bake(r: THREE.WebGLRenderer, model: THREE.Object3D, cv: HTMLCanvasElement, yaw: number, pitch: number, ink: THREE.Color) {
  const W = cv.width, Hh = cv.height;
  const scene = new THREE.Scene();
  scene.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const cam = new THREE.PerspectiveCamera(24, W / Hh, 0.01, 20);
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
    d *= e / 0.94;
  }
  place(d);

  // borrow the shared light uniforms for a studio rig, then put them back
  const saved: Record<string, unknown> = {};
  for (const k of LIGHT_KEYS) { const v = shared[k].value; saved[k] = typeof v === 'number' ? v : (v as THREE.Vector3 | THREE.Color).clone(); }
  const rot = (v: THREE.Vector3) => v.clone().multiplyScalar(radius).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(center);
  shared.uTime.value = 0;
  shared.uLampPos.value.copy(rot(KEY));
  shared.uLampDir.value.copy(center).sub(shared.uLampPos.value).normalize();
  shared.uLampI.value = 1.2;
  shared.uWinPos.value.copy(rot(RIM));
  shared.uWinI.value = 0.7;
  shared.uFillPos.value.copy(rot(FILL));
  shared.uFillI.value = 0.3;
  shared.uScrI.value = 0.1;
  shared.uLevels.value = 32;
  shared.uAmb.value.setRGB(0.04, 0.03, 0.03);

  const read = (override: THREE.Material | null) => {
    const rt = new THREE.WebGLRenderTarget(W, Hh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
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

  // luminance, coverage and normals, flipped to top-down rows
  const n = W * Hh;
  const A = new Uint8Array(n), L = new Float32Array(n), N = new Float32Array(n * 3);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = ((Hh - 1 - y) * W + x) * 4, j = y * W + x;
    if (buf[i + 3] === 0) continue;
    A[j] = 1;
    L[j] = (buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11) / 255;
    N[j * 3] = nb[i] / 127.5 - 1; N[j * 3 + 1] = nb[i + 1] / 127.5 - 1; N[j * 3 + 2] = nb[i + 2] / 127.5 - 1;
  }
  // stretch contrast between the 3rd and 98th percentiles, half equalised
  const ls = Array.from(L.filter((_, j) => A[j])).sort((a, b) => a - b);
  const lo = ls[Math.floor(ls.length * 0.03)] ?? 0, hi = ls[Math.floor(ls.length * 0.98)] ?? 1;
  const rank = (v: number) => {
    let a = 0, b = ls.length;
    while (a < b) { const m = (a + b) >> 1; if (ls[m] < v) a = m + 1; else b = m; }
    return a / ls.length;
  };
  const E = new Float32Array(n);
  for (let j = 0; j < n; j++) if (A[j]) E[j] = Math.max(0, Math.min(1, 0.5 * ((L[j] - lo) / Math.max(0.05, hi - lo)) + 0.5 * rank(L[j])));

  // Atkinson dithering: spreads 6/8 of the error, which keeps highlights
  // and shadows crisp (the MacPaint look)
  const on = new Uint8Array(n);
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x;
    if (!A[j]) continue;
    const v = E[j], o = v > 0.5 ? 1 : 0;
    on[j] = o;
    const err = (v - o) / 8;
    for (const [dx, dy] of spread) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < W && yy < Hh && A[yy * W + xx]) E[yy * W + xx] += err;
    }
  }
  // ink the silhouette and sharp folds so the shape reads at a glance
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= Hh ? 0 : A[y * W + x]);
  const fold = (a: number, b: number) => 1 - (N[a * 3] * N[b * 3] + N[a * 3 + 1] * N[b * 3 + 1] + N[a * 3 + 2] * N[b * 3 + 2]);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x;
    if (!A[j]) continue;
    if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { on[j] = 1; continue; }
    if (fold(j, j + 1) > 0.5 || fold(j, j + W) > 0.5) on[j] = 1;
  }

  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, Hh);
  const [cr, cg, cb] = [ink.r * 255, ink.g * 255, ink.b * 255];
  for (let j = 0; j < n; j++) if (on[j]) { img.data[j * 4] = cr; img.data[j * 4 + 1] = cg; img.data[j * 4 + 2] = cb; img.data[j * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
