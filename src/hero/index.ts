import * as THREE from 'three';
import { HeroView } from './HeroView';
import { shared } from './materials';
import { buildRoom, type WallArt } from './room';
import {
  buildAudioStack, buildCamera, buildComputer, buildDeskClutter, buildLamp, buildMPC,
  buildRubberPlant, buildSpiderPlant, buildTurntable, makeScreen,
} from './props';
import { buildDust } from './dust';

export type HotspotId = 'computer' | 'bookshelf' | 'mpc' | 'camera' | 'lamp' | 'turntable';

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
    computer: { value: 0 }, shelf: { value: 0 }, mpc: { value: 0 }, camera: { value: 0 }, lamp: { value: 0 }, turntable: { value: 0 },
  };

  const room = buildRoom({ shelf: H.shelf }, art);
  S.add(room.group);

  const screen = makeScreen();
  const computer = buildComputer(H.computer, screen.tex);
  S.add(computer.group);
  const mpc = buildMPC(H.mpc);
  S.add(mpc.group);
  const turntable = buildTurntable(H.turntable);
  S.add(turntable.group);
  const stack = buildAudioStack();
  S.add(stack.group);
  const lamp = buildLamp(H.lamp);
  S.add(lamp.group);
  const spider = buildSpiderPlant();
  S.add(spider.group);
  const rubber = buildRubberPlant(new THREE.Vector3(0.4, 0.76 + 0.26, -0.5), 0.72);
  S.add(rubber.group);
  const camera = buildCamera(H.camera);
  S.add(camera.group);
  S.add(buildDeskClutter().group);
  const dust = buildDust();
  S.add(dust.points);

  const hotspots: Hotspot[] = [
    { id: 'computer', label: 'Work', hint: 'open projects', hover: H.computer, target: 0, object: computer.group, anchor: () => computer.screenCenter.clone().add(new THREE.Vector3(0, 0.21, 0)) },
    { id: 'bookshelf', label: 'Bookshelf', hint: 'favourite books', hover: H.shelf, target: 0, object: room.shelf, anchor: () => new THREE.Vector3(-0.93, 1.86, -0.6) },
    { id: 'mpc', label: 'MPC', hint: 'play the pads', hover: H.mpc, target: 0, object: mpc.group, anchor: () => new THREE.Vector3(-0.72, 0.92, -0.18) },
    { id: 'camera', label: 'Camera', hint: 'photo roll', hover: H.camera, target: 0, object: camera.group, anchor: () => camera.group.position.clone().add(new THREE.Vector3(0, 0.14, 0)) },
    { id: 'turntable', label: 'Turntable', hint: 'sound on / off', hover: H.turntable, target: 0, object: turntable.group, anchor: () => new THREE.Vector3(-1.22, 0.98, -0.24) },
    { id: 'lamp', label: 'Lamp', hint: 'drag to aim · click to switch', hover: H.lamp, target: 0, object: lamp.group, anchor: () => lamp.bulb.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.16, 0)) },
  ];

  const tmp = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  // aim is set by dragging the lamp head; tx/ty are the targets it eases to
  const lampState = { on: 1, flicker: 0, aimX: 0, aimY: 0, tx: 0, ty: 0 };
  const soundState = { on: false };
  let spin = 0;

  view.onTick((t, dt) => {
    // idle "you can click me" shimmer, staggered across objects, plus hover easing
    hotspots.forEach((h, i) => {
      const idle = Math.max(0, Math.sin(t * 0.9 - i * 1.3)) ** 24 * 0.35;
      h.hover.value += (Math.max(h.target, idle) - h.hover.value) * Math.min(1, dt * 10);
    });

    // lamp head follows the drag target; the light follows the bulb
    const m = view.mouse;
    lampState.aimX += (lampState.tx - lampState.aimX) * Math.min(1, dt * 6);
    lampState.aimY += (lampState.ty - lampState.aimY) * Math.min(1, dt * 6);
    const lh = H.lamp.value;
    lamp.upper.rotation.z = 1.25 + lampState.aimX * 0.42 + Math.sin(t * 1.3) * 0.006;
    lamp.upper.rotation.y = lampState.aimX * 0.1;
    lamp.shadeHolder.rotation.z = -1.98 - lampState.aimY * 0.55;
    lamp.shadeHolder.rotation.x = lampState.aimX * 0.35;
    lamp.switchPivot.rotation.x += ((lampState.on > 0.5 ? 0.35 : -0.35) - lamp.switchPivot.rotation.x) * Math.min(1, dt * 20);
    lamp.bulb.getWorldPosition(shared.uLampPos.value);
    lamp.shadeHolder.getWorldQuaternion(tmpQ);
    shared.uLampDir.value.set(0, -1, 0).applyQuaternion(tmpQ).normalize();
    const flick = lampState.flicker > 0 ? (Math.random() < 0.5 ? 0.3 : 1) : 1;
    lampState.flicker = Math.max(0, lampState.flicker - dt);
    shared.uLampI.value += (lampState.on * flick * (1 + lh * 0.25) - shared.uLampI.value) * Math.min(1, dt * 12);

    // plants: breeze that picks up when the cursor is close
    const near = (c: THREE.Vector3) => {
      const s = view.toScreen(c);
      const mx = ((m.x + 1) / 2) * view.lw * view.P, my = ((m.y + 1) / 2) * view.lh * view.P;
      return Math.max(0, 1 - Math.hypot(s.x - mx, s.y - my) / 380);
    };
    const sp = 0.012 + near(spider.center) * 0.05;
    spider.mats.forEach((mm) => (mm.uniforms.uWind.value += (sp - mm.uniforms.uWind.value) * Math.min(1, dt * 2)));
    const rp = 0.006 + near(rubber.center) * 0.03;
    rubber.mats.forEach((mm) => (mm.uniforms.uWind.value += (rp - mm.uniforms.uWind.value) * Math.min(1, dt * 2)));

    // CRT, record, city
    screen.draw(t, H.computer.value, view.rig.zoom > 0.9);
    spin += ((soundState.on ? 3.5 : 0.25) - spin) * Math.min(1, dt * 2);
    turntable.platter.rotation.y -= dt * spin;
    for (const car of room.cars) {
      car.position.x += car.userData.speed * dt;
      if (car.position.x > 5) car.position.x = -0.5;
      if (car.position.x < -0.5) car.position.x = 5;
    }
    const rm = room.rain.material as THREE.ShaderMaterial;
    (rm.uniforms.uMap.value as THREE.Texture).offset.y = (t * 0.9) % 1;

    // VU meters dance harder with the sound on
    const lvl = soundState.on ? 1 : 0.35;
    stack.meters.forEach((m, i) => {
      const v = 0.3 + lvl * (0.45 + 0.35 * Math.abs(Math.sin(t * (7 + i * 1.3)) * Math.sin(t * 2.1 + i)));
      (m.material as THREE.ShaderMaterial).uniforms.uIntensity.value = v;
    });
    (stack.counter.material as THREE.ShaderMaterial).uniforms.uIntensity.value = Math.floor(t * 2) % 2 ? 0.6 : 0.45;

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

    // books nudge on hover
    room.books.forEach((b, i) => {
      b.position.y = b.userData.baseY + Math.max(0, Math.sin(t * 4 - i * 0.5)) ** 8 * 0.02 * H.shelf.value;
    });

    // dust reacts to the cursor on a plane in front of the desk
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(m.x, -m.y), view.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.2);
    if (ray.ray.intersectPlane(plane, tmp)) dust.uniforms.uMouse.value.copy(tmp);
    dust.uniforms.uMouseOn.value = Math.min(1, Math.hypot(m.tx, m.ty) > 0 ? 1 : 0);
  });

  return {
    view, hotspots, computer, camera, lampState, mpc, soundState,
    // Move the lamp aim by a drag delta (in stage fractions).
    aimLamp(dx: number, dy: number) {
      lampState.tx = Math.max(-1, Math.min(1, lampState.tx + dx * 2.2));
      lampState.ty = Math.max(-1, Math.min(1, lampState.ty + dy * 2.2));
    },
    toggleLamp() {
      lampState.on = lampState.on ? 0.12 : 1;
      lampState.flicker = 0.25;
    },
    flash() {
      camera.setFlash(true);
      view.post.uniforms.uExposure.value = 2.2;
      setTimeout(() => camera.setFlash(false), 140);
    },
  };
}

export type Hero = ReturnType<typeof createHero>;
