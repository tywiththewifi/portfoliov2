import * as THREE from 'three';
import { HeroView } from './HeroView';
import { col, shared } from './materials';
import { DESK_Y as DESK_TOP, type WallArt } from './room';
import { buildChair, buildTable } from './outdoor/furniture';
import { QUALITY, SunShadow, castShadows } from './outdoor/shadow';
import { buildClearing } from './scenes/clearing';
import { buildMeadow } from './scenes/meadow';
import { buildLake } from './scenes/lake';
import type { OutdoorScene, SceneBuilder, SceneId } from './scenes/types';
import { buildAudioStack, buildCamera, buildComputer, buildLamp, buildMPC, makeScreen } from './props';

export type HotspotId = 'computer' | 'mpc' | 'camera' | 'lamp';

export type Hotspot = {
  id: HotspotId;
  label: string;
  hint: string;
  hover: { value: number };
  target: number; // hover target, eased toward each frame
  object: THREE.Object3D; // raycast target
  anchor: () => THREE.Vector3; // tooltip anchor in world space
};

export function createHero(canvas: HTMLCanvasElement, stage: HTMLElement, art: WallArt) {
  const view = new HeroView(canvas, stage);
  const S = view.scene;
  const H = {
    computer: { value: 0 }, mpc: { value: 0 }, camera: { value: 0 }, lamp: { value: 0 },
  };

  // a minimal desk: a short folding table with just the computer, speakers,
  // the MPC, the lamp and the camera on it, and the chair from the photo
  const table = buildTable({ top: '#cdc6b4', edge: '#a8a090', legs: '#7a7c80', x0: -1.1, x1: 1.47 });
  S.add(castShadows(table));
  const chair = buildChair();
  // pushed back from the desk end, as if someone just stood up
  chair.position.set(1.4, 0, 0.85);
  chair.rotation.y = -2.35;
  S.add(castShadows(chair));

  const screen = makeScreen();
  const computer = buildComputer(H.computer, screen.tex);
  S.add(computer.group);
  const mpc = buildMPC(H.mpc);
  S.add(mpc.group);
  const stack = buildAudioStack({ speakersOnly: true });
  S.add(stack.group);
  const lamp = buildLamp(H.lamp);
  S.add(lamp.group);
  const camera = buildCamera(H.camera);
  S.add(camera.group);
  for (const g of [computer.group, mpc.group, stack.group, lamp.group, camera.group]) castShadows(g);

  const hotspots: Hotspot[] = [
    { id: 'computer', label: 'Work', hint: 'open projects', hover: H.computer, target: 0, object: computer.group, anchor: () => computer.screenCenter.clone().add(new THREE.Vector3(0, 0.21, 0)) },
    { id: 'mpc', label: 'MPC', hint: 'play the pads', hover: H.mpc, target: 0, object: mpc.group, anchor: () => new THREE.Vector3(-0.72, 0.92, -0.18) },
    { id: 'camera', label: 'Camera', hint: 'photo roll', hover: H.camera, target: 0, object: camera.group, anchor: () => camera.group.position.clone().add(new THREE.Vector3(0, 0.14, 0)) },
    { id: 'lamp', label: 'Lamp', hint: 'drag to aim · click to switch', hover: H.lamp, target: 0, object: lamp.group, anchor: () => lamp.bulb.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.16, 0)) },
  ];

  const tmpQ = new THREE.Quaternion();
  // Lamp rig: two arm joints and the shade angle (absolute, in the arm's
  // plane) are damped springs chasing targets. Dragging the arm moves the
  // head with two-bone IK; dragging the shade swings it to point at you.
  const lampState = { on: true, flicker: 0 };
  const rig = {
    a: [0.35, 1.25, -0.38], v: [0, 0, 0], g: [0.35, 1.25, -0.38],
    grab: new THREE.Vector2(), headV: new THREE.Vector2(), mode: '' as '' | 'arm' | 'shade',
  };
  const lampPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -lamp.base.z);
  const bulbMat = lamp.bulb.material as THREE.ShaderMaterial, innerMat = lamp.inner.material as THREE.ShaderMaterial;
  const headAt = (a1: number, a2: number) => new THREE.Vector2(
    lamp.base.x - Math.sin(a1) * lamp.armL - Math.sin(a1 + a2) * lamp.armU,
    lamp.base.y + Math.cos(a1) * lamp.armL + Math.cos(a1 + a2) * lamp.armU);
  // two-bone IK in the arm plane, elbow up
  const solve = (tx: number, ty: number) => {
    const L1 = lamp.armL, L2 = lamp.armU;
    let dx = tx - lamp.base.x, dy = Math.max(ty, DESK_TOP + 0.1) - lamp.base.y;
    let d = Math.hypot(dx, dy);
    const dMax = L1 + L2 - 0.01, dMin = Math.abs(L1 - L2) + 0.06;
    if (d > dMax || d < dMin) { const k = Math.min(dMax, Math.max(dMin, d)) / (d || 1); dx *= k; dy *= k; d = Math.hypot(dx, dy); }
    const th = Math.atan2(-dx, dy);
    const a1 = th - Math.acos(Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
    const a2 = Math.PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
    rig.g[0] = Math.max(-0.5, Math.min(1.3, a1));
    rig.g[1] = a2;
  };
  const pointerOnPlane = (clientX: number, clientY: number) => {
    const r = view.canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), view.camera);
    return ray.ray.intersectPlane(lampPlane, new THREE.Vector3());
  };
  const soundState = { on: false };

  view.onTick((t, dt) => {
    // idle "you can click me" shimmer, staggered across objects, plus hover easing
    hotspots.forEach((h, i) => {
      const idle = Math.max(0, Math.sin(t * 0.9 - i * 1.3)) ** 24 * 0.35;
      h.hover.value += (Math.max(h.target, idle) - h.hover.value) * Math.min(1, dt * 10);
    });

    // lamp: springs toward the targets (a little overshoot reads as weight);
    // the shade also swings against the head's acceleration like a pendulum
    const h0 = headAt(rig.a[0], rig.a[1]);
    for (let i = 0; i < 3; i++) {
      const k = i === 2 ? 70 : 110, c = i === 2 ? 7 : 13;
      rig.v[i] += (k * (rig.g[i] - rig.a[i]) - c * rig.v[i]) * dt;
      rig.a[i] += rig.v[i] * dt;
    }
    const h1 = headAt(rig.a[0], rig.a[1]);
    if (dt > 0) {
      const vx = (h1.x - h0.x) / dt;
      rig.v[2] -= ((vx - rig.headV.x) / Math.max(dt, 1e-3)) * 0.02;
      rig.headV.set(vx, (h1.y - h0.y) / dt);
    }
    lamp.lower.rotation.z = rig.a[0];
    lamp.upper.rotation.z = rig.a[1] + Math.sin(t * 1.3) * 0.004;
    lamp.shadeHolder.rotation.z = rig.a[2] - rig.a[0] - rig.a[1]; // keep the shade's world angle
    const lh = H.lamp.value;
    lamp.switchPivot.rotation.x += ((lampState.on ? 0.35 : -0.35) - lamp.switchPivot.rotation.x) * Math.min(1, dt * 20);
    lamp.bulb.getWorldPosition(shared.uLampPos.value);
    lamp.shadeHolder.getWorldQuaternion(tmpQ);
    shared.uLampDir.value.set(0, -1, 0).applyQuaternion(tmpQ).normalize();
    const flick = lampState.flicker > 0 ? (Math.random() < 0.5 ? 0.3 : 1) : 1;
    lampState.flicker = Math.max(0, lampState.flicker - dt);
    const lampTarget = (lampState.on ? lampScale : 0.05) * flick * (1 + lh * 0.25);
    shared.uLampI.value += (lampTarget - shared.uLampI.value) * Math.min(1, dt * 12);
    bulbMat.uniforms.uIntensity.value = 0.2 + shared.uLampI.value * 1.1;
    innerMat.uniforms.uIntensity.value = 0.15 + shared.uLampI.value * 0.85;

    // CRT
    screen.draw(t, H.computer.value, view.rig.zoom > 0.9);

    // MPC pads: chase pattern on hover, slow breathing otherwise
    mpc.pads.forEach((p, i) => {
      const chase = Math.max(0, Math.sin(t * 9 - i * 0.7)) ** 6;
      p.mat.uniforms.uIntensity.value = 0.28 + H.mpc.value * chase * 1.1 + (i === Math.floor(t * 1.5) % 16 ? 0.3 : 0);
    });

    // flash exposure decays back to normal
    const ex = view.post.uniforms.uExposure;
    ex.value += (1 - ex.value) * Math.min(1, dt * 7);

    // camera hop on hover
    camera.group.position.y = 0.76 + Math.max(0, Math.sin(t * 10)) * 0.012 * H.camera.value;
  });

  // ---------------------------------------------------------------- scenes
  const BUILDERS: Record<SceneId, SceneBuilder> = { clearing: buildClearing, meadow: buildMeadow, lake: buildLake };
  const built = new Map<SceneId, OutdoorScene>();
  const sun = new SunShadow(QUALITY < 1 ? 1024 : 2048);
  let current: OutdoorScene | null = null;
  let lampScale = 1;
  // the canopy light pattern is a small texture: crisp texels suit the pixel
  // style, smooth filtering suits the full-res poly style
  // painted backdrops and leaf/flower cards: smooth-filtered in the poly
  // style so they read as painted rather than pixelated
  const cardFilters = () => {
    const f = view.style === 'poly' ? THREE.LinearFilter : THREE.NearestFilter;
    S.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
      if (!m || !m.uniforms?.uMap?.value) return;
      if (!(o as THREE.InstancedMesh).isInstancedMesh && !m.userData.backdrop) return;
      const t = m.uniforms.uMap.value as THREE.Texture;
      if (t.magFilter !== f) { t.magFilter = t.minFilter = f; t.needsUpdate = true; }
    });
  };
  const goboFilter = () => {
    const g = shared.uGobo.value;
    if (!g) return;
    const f = view.style === 'poly' ? THREE.LinearFilter : THREE.NearestFilter;
    if (g.magFilter !== f) { g.magFilter = g.minFilter = f; g.needsUpdate = true; }
  };
  const setScene = (id: SceneId) => {
    if (!built.has(id)) built.set(id, BUILDERS[id](art));
    const sc = built.get(id)!;
    if (current) S.remove(current.group);
    S.add(sc.group);
    current = sc;
    // light
    shared.uSunDir.value.copy(sc.sun.dir).normalize();
    shared.uSunCol.value.set(col(sc.sun.col));
    shared.uSunI.value = sc.sun.i;
    shared.uSkyCol.value.set(col(sc.hemi.sky));
    shared.uGroundCol.value.set(col(sc.hemi.ground));
    shared.uHemiI.value = sc.hemi.i;
    shared.uAmb.value.set(col(sc.amb));
    shared.uWinI.value = sc.rim?.i ?? 0;
    if (sc.rim) { shared.uWinPos.value.copy(sc.rim.pos); shared.uWinCol.value.set(col(sc.rim.col)); }
    shared.uFillI.value = sc.fill?.i ?? 0;
    if (sc.fill) { shared.uFillPos.value.copy(sc.fill.pos); shared.uFillCol.value.set(col(sc.fill.col)); }
    shared.uScrI.value = sc.screenI ?? 0.35;
    lampScale = sc.lampI ?? 1;
    shared.uGoboOn.value = sc.gobo ? 1 : 0;
    if (sc.gobo) { shared.uGobo.value = sc.gobo.tex; shared.uGoboScale.value = sc.gobo.scale; goboFilter(); }
    cardFilters();
    shared.uShadowOn.value = 1;
    shared.uLevels.value = 8;
    sun.aim(sc.sun.dir, sc.shadow.center, sc.shadow.half);
    // haze + post grade
    const pu = view.post.uniforms;
    pu.uFogCol.value.set(col(sc.fog.col));
    pu.uFogDen.value = sc.fog.den;
    pu.uFogStart.value = sc.fog.start;
    pu.uBloomCol.value.set(col(sc.post.bloomCol));
    pu.uBloom.value = sc.post.bloom;
    pu.uVignette.value = sc.post.vignette;
    pu.uOutlineFar.value = sc.post.outlineFar;
    pu.uGrade.value.set(...(sc.post.grade ?? [1, 1, 1]));
    // camera
    view.rig.pos.copy(sc.camera.pos);
    view.rig.look.copy(sc.camera.look);
    view.rig.fov = sc.camera.fov;
    view.updateCamera();
    stage.dataset.scene = id;
    view.renderOnce();
  };
  view.onTick((t, dt) => {
    if (!current) return;
    current.tick?.(t, dt, view.camera);
    if (current.gobo) shared.uGoboOff.value.set(t * current.gobo.drift[0], t * current.gobo.drift[1]);
  });
  // the sun's depth map is rendered right before each frame
  view.beforeRender(() => sun.render(view.renderer, S));

  return {
    setScene,
    setStyle(style: 'pixel' | 'poly') {
      view.setStyle(style);
      stage.dataset.style = style;
      goboFilter();
      cardFilters();
      view.renderOnce();
    },
    scene: () => current?.id ?? null,
    view, hotspots, computer, camera, lampState, mpc, soundState,
    // Keyboard: nudge the lamp head by (dx, dy) metres.
    aimLamp(dx: number, dy: number) {
      const h = headAt(rig.g[0], rig.g[1]);
      solve(h.x + dx, h.y - dy);
    },
    // Start a drag on the lamp; the shade swings, anything else moves the arm.
    lampGrab(clientX: number, clientY: number) {
      const r = view.canvas.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), view.camera);
      rig.mode = ray.intersectObject(lamp.shadeHolder, true).length ? 'shade' : 'arm';
      // remember where on the lamp it was grabbed relative to the head
      const p = pointerOnPlane(clientX, clientY);
      const h = headAt(rig.g[0], rig.g[1]);
      rig.grab.set(p ? h.x - p.x : 0, p ? h.y - p.y : 0);
    },
    lampDrag(clientX: number, clientY: number) {
      const p = pointerOnPlane(clientX, clientY);
      if (!p) return;
      if (rig.mode === 'arm') solve(p.x + rig.grab.x, p.y + rig.grab.y);
      else if (rig.mode === 'shade') {
        const h = headAt(rig.a[0], rig.a[1]);
        // shade points (down its axis) at the pointer
        rig.g[2] = Math.max(-1.5, Math.min(1.5, Math.atan2(p.x - h.x, -(p.y - h.y))));
      }
    },
    lampRelease() { rig.mode = ''; },
    toggleLamp() {
      lampState.on = !lampState.on;
      lampState.flicker = lampState.on ? 0.25 : 0.08;
    },
    flash() {
      camera.setFlash(true);
      view.post.uniforms.uExposure.value = 2.2;
      setTimeout(() => camera.setFlash(false), 140);
    },
  };
}

export type Hero = ReturnType<typeof createHero>;
