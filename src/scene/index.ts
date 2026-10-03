import * as THREE from 'three';
import type { Levels } from '../music';
import { floorGrid } from './grid';
import { MINT, setGlow } from './mats';
import { webMockups } from './mockups';
import { INTRO, mountIntro } from './intro';
import { devLog } from './screen';
import { buildDeskSet } from './set';

// Hero scene: the desk standing in a void on a floor grid, drawn on a canvas
// that fills the whole hero behind the text. The camera drifts slowly round a
// point on the desk, with a little pointer parallax, and the desk is framed
// to one side with a view offset: right of the copy on wide screens, below
// it on narrow ones. The first time it's shown, the scene is built in front
// of you: traced in glowing lines over a hologram, then filled in with the
// real thing (see intro.ts). After that, a mouse over the desk gets an X-ray
// lens that shows the hologram again inside a circle round the pointer.
//
// Two modes, blended over most of a second: night (black void, mint rim and
// CRT glow, the dev log typing) and day (white void, daylight, website
// mockups on the CRT).
//
// With the site's music playing (`setMusic`), the scene listens: the boombox
// meters show the real levels and its reels turn, the speaker grilles and the
// box bump on each beat, the CRT glow and rim light swell with the bass, and
// the tower's disk light flickers with the hi-hats. With reduced motion only
// the meters and reels move. The intro doesn't listen.

const WIDE = 980; // px; matches the layout breakpoint in styles.css
const TARGET = new THREE.Vector3(-0.02, 0.62, 0.1); // what the camera circles
const RADIUS = 7.2;

export type Mode = 'day' | 'night';
export type MusicSource = { readonly playing: boolean; read(dt: number): Levels };
export type SceneHandle = {
  setMode(mode: Mode): void;
  // listen to the music; call musicChanged() when it starts or stops
  setMusic(m: MusicSource): void;
  musicChanged(): void;
  // is this point (client px) over the boombox?
  overBoombox(x: number, y: number): boolean;
  dispose(): void;
};

// Everything that differs between night and day.
const col = (s: string) => new THREE.Color(s);
const LOOKS = {
  night: {
    sky: col('#e4e4e4'), ground: col('#141414'), hemi: 1.5, key: col('#ffeedd'), keyI: 3.2,
    rim: col(MINT), rimI: 0.28, glow: col(MINT), glowI: 0.35, shadow: 0.6,
    minor: col('#3a3a3a'), major: col('#565656'), mint: col(MINT), minorA: 0.5, majorA: 0.75, axisA: 0.55,
    // the intro: lines and grid, their hot ends, the hologram's tint, whether colour adds or is drawn on
    line: col(MINT), tip: col('#dcfff4'), holo: col(MINT), paint: 0,
  },
  day: {
    sky: col('#ffffff'), ground: col('#d4d4d4'), hemi: 2.1, key: col('#fff8ee'), keyI: 3.4,
    rim: col('#ffffff'), rimI: 0.45, glow: col('#e6fff7'), glowI: 0.1, shadow: 0.3,
    minor: col('#8c8c8c'), major: col('#6e6e6e'), mint: col('#00b386'), minorA: 0.22, majorA: 0.36, axisA: 0.5,
    line: col('#00a37a'), tip: col('#00543f'), holo: col('#00a37a'), paint: 1,
  },
};

export function mountScene(canvas: HTMLCanvasElement, hero: HTMLElement, copy: HTMLElement, initial: Mode = 'night'): SceneHandle | null {
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
  const hemi = new THREE.HemisphereLight('#e4e4e4', '#141414', 1.5);
  scene.add(hemi);
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
  const grid = floorGrid({ cell: 0.25, major: 4, near: 3.5, far: 16 });
  scene.add(grid.mesh);
  // the floor catches the key light's shadows and nothing else
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.6, depthWrite: false }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.001;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // the CRT's two programmes: the dev log by night, website mockups by day
  const log = devLog();
  const mock = webMockups();
  const set = buildDeskSet(log.tex);
  scene.add(set.root);
  const glowLight = new THREE.PointLight(MINT, 0.35, 1.6, 2);
  glowLight.position.copy(set.screenCenter).addScaledVector(set.screenNormal, 0.34).add(new THREE.Vector3(0, -0.08, 0));
  scene.add(glowLight);

  // ---------------------------------------------------------------- intro
  // the fill sweeps up and to the right as you see the desk (at 45° on
  // screen, from the camera's resting azimuth)
  const az = THREE.MathUtils.degToRad(-38);
  const intro = mountIntro(set.root, set.bounds, new THREE.Vector3(Math.cos(az), 1, Math.sin(az)).normalize());
  scene.add(intro.lines);

  // ---------------------------------------------------------------- modes
  let mode: Mode = initial;
  let mix = mode === 'day' ? 1 : 0; // 0 night .. 1 day
  let flash = 0; // the tube's brief flare when it changes programme
  const screen = () => (mode === 'day' ? mock : log);
  const shadowMat = catcher.material as THREE.ShadowMaterial;
  const u = grid.uniforms;
  let rimBase = 0, shadowBase = 0;
  const blend = (k: number) => {
    const n = LOOKS.night, d = LOOKS.day, l = (a: number, b: number) => a + (b - a) * k;
    hemi.color.lerpColors(n.sky, d.sky, k);
    hemi.groundColor.lerpColors(n.ground, d.ground, k);
    hemi.intensity = l(n.hemi, d.hemi);
    key.color.lerpColors(n.key, d.key, k);
    key.intensity = l(n.keyI, d.keyI);
    rim.color.lerpColors(n.rim, d.rim, k);
    rimBase = l(n.rimI, d.rimI);
    rim.intensity = rimBase;
    glowLight.color.lerpColors(n.glow, d.glow, k);
    shadowBase = l(n.shadow, d.shadow);
    shadowMat.opacity = shadowBase * intro.shadow;
    u.uMinor.value.lerpColors(n.minor, d.minor, k);
    u.uMajorCol.value.lerpColors(n.major, d.major, k);
    u.uMint.value.lerpColors(n.mint, d.mint, k);
    u.uMinorA.value = l(n.minorA, d.minorA);
    u.uMajorA.value = l(n.majorA, d.majorA);
    u.uAxisA.value = l(n.axisA, d.axisA);
    INTRO.uLine.value.lerpColors(n.line, d.line, k);
    INTRO.uTip.value.lerpColors(n.tip, d.tip, k);
    INTRO.uHolo.value.lerpColors(n.holo, d.holo, k);
    INTRO.uPaint.value = l(n.paint, d.paint);
    // the lines glow by night (the brighter of line and scene wins), and
    // are drawn on by day
    const lm = intro.lines.material;
    lm.blending = k < 0.5 ? THREE.CustomBlending : THREE.NormalBlending;
  };
  // the phosphor's flicker (and the glow it throws), plus the flare; `bass`
  // swells the glow and the rim light with the music
  const tube = (t: number, bass = 0) => {
    const f = (0.97 + (Math.sin(t * 13.7) * 0.012 + Math.sin(t * 5.3) * 0.018) * (1 - mix * 0.7)) * (1 + flash * 0.9);
    set.phosphor.color.setScalar(f * (1 + bass * 0.08));
    glowLight.intensity = (LOOKS.night.glowI + (LOOKS.day.glowI - LOOKS.night.glowI) * mix) * f * (1 + bass * 1.6);
    rim.intensity = rimBase * (1 + bass * 1.1);
  };
  set.phosphor.map = screen().tex;
  blend(mix);

  // ---------------------------------------------------------------- framing
  // The set's bounding box, seen from the camera's resting pose, is fitted
  // into the free part of the hero: right of the copy on wide screens,
  // below it on narrow ones. The fit sets the FOV (size) and a view offset
  // (position), so the camera itself never moves off its orbit.
  const head = document.querySelector('.head');
  const b = set.bounds;
  const corners = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(
    i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  const tmp = new THREE.Vector3();
  let w = 1, h = 1;
  let deskY = 0; // the middle of the desk's area, in hero px
  const frame = () => {
    const r = hero.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    // cap the drawing buffer at ~3.5 MP so tall phones stay smooth
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.5e6 / (w * h)));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    intro.setResolution(Math.round(w * dpr), Math.round(h * dpr), dpr);

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
    deskY = (y0 + y1) / 2;

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
    lens.x = e.clientX;
    lens.y = e.clientY;
    lens.mouse = e.pointerType === 'mouse';
    // a still frame (reduced motion) still follows the lens
    if (!raf && onScreen) { updateLens(0); render(); }
  };
  const onLeave = () => {
    ptr.tx = 0; ptr.ty = 0;
    lens.mouse = false;
    if (!raf && onScreen) { updateLens(0); render(); }
  };
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

  // ---------------------------------------------------------------- x-ray
  // Once the intro is over, a mouse over the desk (its box on screen, give or
  // take) gets an X-ray lens: inside a circle round the pointer the set is the
  // glowing hologram it was built from, the circle ringed in the accent.
  const ring = document.createElement('div');
  ring.className = 'xray';
  ring.setAttribute('aria-hidden', 'true');
  canvas.after(ring);
  const lens = { x: -1e4, y: -1e4, mouse: false, k: 0 };
  const lensRadius = () => Math.round(THREE.MathUtils.clamp(w * 0.075, 80, 140)); // CSS px
  const overDesk = () => {
    if (!lens.mouse || !intro.done) return false;
    const r = hero.getBoundingClientRect();
    const px = lens.x - r.left, py = lens.y - r.top, pad = 24;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of corners) {
      tmp.copy(c).project(camera);
      const sx = ((tmp.x + 1) / 2) * w, sy = ((1 - tmp.y) / 2) * h;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
      y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return px > x0 - pad && px < x1 + pad && py > y0 - pad && py < y1 + pad;
  };
  // `dt` 0: jump straight to where it should be
  const updateLens = (dt: number) => {
    const goal = overDesk() ? 1 : 0;
    lens.k = dt ? lens.k + (goal - lens.k) * Math.min(1, dt * 9) : goal;
    if (lens.k < 0.002) lens.k = 0;
    const r = hero.getBoundingClientRect(), R = lensRadius(), dpr = renderer.getPixelRatio();
    intro.setLens((lens.x - r.left) * dpr, (r.bottom - lens.y) * dpr, R * dpr, lens.k, t);
    ring.style.opacity = String(lens.k);
    if (lens.k > 0) {
      ring.style.width = ring.style.height = `${2 * R}px`;
      ring.style.transform = `translate(${(lens.x - r.left - R).toFixed(1)}px, ${(lens.y - r.top - R).toFixed(1)}px)`;
    }
  };

  // ---------------------------------------------------------------- music
  let music: MusicSource | null = null;
  const SILENT: Levels = { left: 0, right: 0, bass: 0, mid: 0, high: 0, kick: 0, beat: false };
  const listen = (dt: number, motion: boolean) => {
    const lv = music ? music.read(dt) : SILENT;
    const playing = !!music?.playing;
    set.boombox.update(dt, { playing, left: lv.left, right: lv.right, kick: motion ? lv.kick : 0 });
    // the tower's disk light: hi-hats while playing, else bursts of access
    setGlow(set.disk, playing ? (lv.high > 0.32 ? 1 : 0.1) : Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1) > 0.25 && Math.random() < 0.5 ? 1 : 0.1);
    return motion ? lv.bass : 0;
  };
  const boomboxBox = new THREE.Box3().setFromObject(set.boombox.group);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();

  // ---------------------------------------------------------------- loop
  let dirty = true, raf = 0, last = 0, t = 0, onScreen = true;
  // the loop runs for motion, or (with reduced motion) for the music's meters
  const running = () => !reduce.matches || !!music?.playing;
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
    // ease between night and day
    const goal = mode === 'day' ? 1 : 0;
    if (mix !== goal) {
      mix = goal > mix ? Math.min(goal, mix + dt / 0.8) : Math.max(goal, mix - dt / 0.8);
      blend(mix);
    }
    flash = Math.max(0, flash - dt * 3);
    const motion = !reduce.matches;
    if (motion) {
      screen().update(dt);
      if (!intro.done) {
        // (it waits for the desk to be on screen: on phones it's below the copy)
        if (hero.getBoundingClientRect().top + deskY < innerHeight) intro.begin(t + 0.2);
        intro.apply(t);
        shadowMat.opacity = shadowBase * intro.shadow;
      }
    } else if (!intro.done) intro.finish();
    const bass = listen(dt, motion);
    tube(motion ? t : 0, bass);
    updateLens(dt);
    render();
    if (!running()) still();
  };
  const start = () => {
    if (raf || !running() || !onScreen || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  // Reduced motion: a single still frame, redrawn only when the layout or
  // the mode changes; the screen shows a finished frame and there's no
  // intro.
  const still = () => {
    stop();
    ptr.x = ptr.y = 0;
    place(0);
    mix = mode === 'day' ? 1 : 0;
    flash = 0;
    if (reduce.matches && !intro.done) intro.finish();
    blend(mix);
    tube(0);
    screen().full();
    set.boombox.update(0, { playing: false, left: 0, right: 0, kick: 0 });
    updateLens(0);
    render();
  };
  const sync = () => {
    if (running()) { stop(); start(); } else still();
  };

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
  mock.draw();
  sync();
  // canvas-drawn labels and the screen use the NB faces: redraw once
  // they're in
  document.fonts?.ready.then(() => {
    log.draw();
    mock.repaint();
    if (!running()) still(); else if (!raf) render();
  });

  return {
    setMode(next: Mode) {
      if (next === mode) return;
      mode = next;
      set.phosphor.map = screen().tex;
      flash = 1;
      // not animating (reduced motion, or off screen): jump straight there
      if (!raf) { still(); if (running()) start(); }
    },
    setMusic(m: MusicSource) { music = m; },
    musicChanged() {
      if (running()) start();
      else if (!raf) still();
    },
    overBoombox(x: number, y: number) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectsBox(boomboxBox);
    },
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
