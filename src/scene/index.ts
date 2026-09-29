import * as THREE from 'three';
import { floorGrid } from './grid';
import { MINT, setGlow } from './mats';
import { devLog } from './screen';
import { buildDeskSet } from './set';

// Hero scene: the desk standing in a black void on a floor grid, drawn on a
// canvas that fills the whole hero behind the text. The camera drifts slowly
// round a point on the desk, with a little pointer parallax, and the desk is
// framed to one side with a view offset: right of the copy on wide screens,
// below it on narrow ones.

const WIDE = 980; // px; matches the layout breakpoint in styles.css
const TARGET = new THREE.Vector3(-0.02, 0.62, 0.1); // what the camera circles
const RADIUS = 7.2;

export type SceneHandle = { dispose(): void };

export function mountScene(canvas: HTMLCanvasElement, hero: HTMLElement, copy: HTMLElement): SceneHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // nothing that casts a visible shadow moves, so the shadow map is drawn
  // once rather than every frame
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);

  // ---------------------------------------------------------------- light
  // hemisphere fill, a warm key from front right with soft shadows, a faint
  // mint rim from behind left, and the CRT's own mint glow
  scene.add(new THREE.HemisphereLight('#e4e4e4', '#141414', 1.5));
  const key = new THREE.DirectionalLight('#ffeedd', 3.2);
  key.position.set(2.6, 4.4, 2.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 1, far: 12 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  key.shadow.radius = 5;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(MINT, 0.28);
  rim.position.set(-3, 2.4, -2.6);
  scene.add(rim);

  // ---------------------------------------------------------------- world
  scene.add(floorGrid({ cell: 0.25, major: 4, near: 3.5, far: 16 }));
  // the floor catches the key light's shadows and nothing else
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.6, depthWrite: false }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.001;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const log = devLog();
  const set = buildDeskSet(log.tex);
  scene.add(set.root);
  const GLOW = 0.35;
  const glowLight = new THREE.PointLight(MINT, GLOW, 1.6, 2);
  glowLight.position.copy(set.screenCenter).addScaledVector(set.screenNormal, 0.34).add(new THREE.Vector3(0, -0.08, 0));
  scene.add(glowLight);

  // ---------------------------------------------------------------- framing
  // The set's bounding box, seen from the camera's resting pose, is fitted
  // into the free part of the hero: right of the copy on wide screens,
  // below it on narrow ones. The fit sets the FOV (size) and a view offset
  // (position), so the camera itself never moves off its orbit.
  const head = hero.querySelector('.head');
  const b = set.bounds;
  const corners = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
    i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  const tmp = new THREE.Vector3();
  let w = 1, h = 1;
  const frame = () => {
    const r = hero.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    // cap the drawing buffer at ~3.5 MP so tall phones stay smooth
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.5e6 / (w * h)));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);

    // the free area, in hero pixels
    const c = copy.getBoundingClientRect();
    const gutter = c.left - r.left;
    let x0: number, x1: number, y0: number, y1: number;
    if (w >= WIDE) {
      x0 = c.right - r.left + 16;
      x1 = w - gutter;
      y0 = (head ? head.getBoundingClientRect().bottom - r.top : 0) + 16;
      y1 = h - 24;
      // don't let very wide screens blow the desk up
      const spare = x1 - x0 - w * 0.48;
      if (spare > 0) { x0 += spare / 2; x1 -= spare / 2; }
    } else {
      x0 = 12;
      x1 = w - 12;
      y0 = c.bottom - r.top + 24;
      y1 = h - 16;
    }

    // the box's extent in tan units (x/-z, y/-z in camera space)
    place(0, true);
    camera.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of corners) {
      tmp.copy(p).applyMatrix4(camera.matrixWorldInverse);
      const ex = tmp.x / -tmp.z, ey = tmp.y / -tmp.z;
      minX = Math.min(minX, ex); maxX = Math.max(maxX, ex);
      minY = Math.min(minY, ey); maxY = Math.max(maxY, ey);
    }
    // pixels per tan unit, leaving a little room for the drift
    const s = Math.min((x1 - x0) / (maxX - minX), (y1 - y0) / (maxY - minY)) * 0.97;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / (2 * s)));
    camera.aspect = w / h;
    const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    camera.setViewOffset(w, h, w / 2 + mx * s - (x0 + x1) / 2, h / 2 - my * s - (y0 + y1) / 2, w, h);
    camera.updateProjectionMatrix();
    dirty = true;
  };

  // ---------------------------------------------------------------- motion
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = hero.getBoundingClientRect();
    ptr.tx = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    ptr.ty = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
  };
  const onLeave = () => { ptr.tx = 0; ptr.ty = 0; };
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  // `rest`: the pose with no drift or parallax
  const place = (t: number, rest = false) => {
    const still = rest || reduce.matches;
    const az = THREE.MathUtils.degToRad(-38 + (still ? 0 : Math.sin(t * 0.11) * 7 + ptr.x * 4));
    const el = THREE.MathUtils.degToRad(17 + (still ? 0 : Math.sin(t * 0.083) * 2 - ptr.y * 2));
    camera.position.set(
      TARGET.x - Math.sin(az) * Math.cos(el) * RADIUS,
      TARGET.y + Math.sin(el) * RADIUS,
      TARGET.z + Math.cos(az) * Math.cos(el) * RADIUS,
    );
    camera.lookAt(TARGET);
  };

  // ---------------------------------------------------------------- loop
  let dirty = true, raf = 0, last = 0, t = 0, onScreen = true;
  const render = () => {
    renderer.render(scene, camera);
    dirty = false;
  };
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    t += dt;
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 2.5);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 2.5);
    place(t);
    log.update(dt);
    set.boombox.update(t, dt);
    // the tower's disk light: bursts of access
    setGlow(set.disk, Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1) > 0.25 && Math.random() < 0.5 ? 1 : 0.1);
    // a faint phosphor flicker, echoed by the glow it throws
    const f = 0.97 + Math.sin(t * 13.7) * 0.012 + Math.sin(t * 5.3) * 0.018;
    set.phosphor.color.setScalar(f);
    glowLight.intensity = GLOW * f;
    render();
  };
  const start = () => {
    if (raf || reduce.matches || !onScreen || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  // Reduced motion: a single still frame, redrawn only when the layout
  // changes; the screen shows the finished log.
  const still = () => {
    stop();
    ptr.x = ptr.y = 0;
    place(0);
    log.full();
    set.boombox.update(0, 0);
    render();
  };
  const sync = () => (reduce.matches ? still() : (stop(), start()));

  const ro = new ResizeObserver(() => {
    frame();
    if (!raf && dirty) render();
  });
  ro.observe(hero);
  ro.observe(copy);
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start(); else stop();
  });
  io.observe(hero);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  reduce.addEventListener('change', sync);

  frame();
  log.draw();
  sync();
  // canvas-drawn labels and the screen use the NB faces: redraw once
  // they're in
  document.fonts?.ready.then(() => {
    log.draw();
    if (!raf) render();
  });

  return {
    dispose() {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      reduce.removeEventListener('change', sync);
      renderer.dispose();
    },
  };
}
