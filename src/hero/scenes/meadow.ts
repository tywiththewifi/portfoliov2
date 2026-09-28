import * as THREE from 'three';
import { flat, lit } from '../materials';
import { rng } from '../../art/posters';
import { buildSky } from '../outdoor/sky';
import { buildFlowers, buildGrass } from '../outdoor/grass';
import { branch, foliage, trunk } from '../outdoor/trees';
import { barkTex, cloudTex, fbm, groundTex, leafClusterTex, mountainTex, repeatTex } from '../outdoor/paint';
import { castShadows } from '../outdoor/shadow';
import type { OutdoorScene, SceneBuilder } from './types';

// Concept 2 · Golden Hour Meadow
// The desk on a hilltop at sunset. The land falls away into a hazy valley
// and layered ranges; a lone oak stands nearby, poppies and cornflowers
// dot the grass, and everything casts a long gold shadow.

// Terrain: a flat crown for the desk, falling away behind, with far hills.
export function meadowHeight(x: number, z: number) {
  const r = Math.hypot(x * 0.8, z);
  let y = 0;
  if (r > 4) y -= Math.min(9, (r - 4) ** 2 * 0.035);
  if (z > 1.5) y = Math.max(y, -0.2); // keep the ground under the camera
  const rough = Math.max(0, Math.min(1, (r - 2.6) / 3.5)); // dead flat under the desk
  y += fbm(x * 0.06, z * 0.06, 3) * rough * 0.6;
  const far = Math.max(0, r - 30);
  y += Math.min(1, far / 25) * (1.5 + fbm(x * 0.02 + 5, z * 0.02, 4) * 3);
  return y;
}

export const buildMeadow: SceneBuilder = () => {
  const group = new THREE.Group();
  const R = rng(17);
  const sunDir = new THREE.Vector3(0.35, 0.1, -0.93).normalize();

  const sky = buildSky({ zenith: '#2f5f9c', mid: '#f0a07e', horizon: '#ffd894', below: '#e0a870', sunDir, sunCol: '#fff4cc', sunSize: 0.0016, glow: 1.6, glowCol: '#ffb070' });
  group.add(sky.mesh);

  // ---- terrain
  const geo = new THREE.PlaneGeometry(240, 240, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, meadowHeight(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, lit({ map: repeatTex(groundTex(['#5a5a22', '#7a7428', '#9a8e34', '#b8a444', '#d0bc5a'], 128, 0.07, 3), 80, 80) }));
  group.add(ground);

  // ---- mountains and clouds, all painted
  const ranges = [
    { z: -150, w: 420, h: 24, seed: 3, body: ['#d8a494', '#e4b09c', '#f0c0a6'], top: 11 },
    { z: -110, w: 320, h: 18, seed: 5, body: ['#a88c86', '#b89a90', '#c8aa9c'], top: 7.6 },
    { z: -80, w: 250, h: 14, seed: 8, body: ['#4e6a78', '#5c7884', '#6e8892'], top: 5.3 },
  ];
  for (const m of ranges) {
    const tex = mountainTex({ w: Math.round(m.w * 1.6), h: Math.round(m.h * 1.6), seed: m.seed, body: m.body, rough: 1.3 });
    const mat = flat({ map: tex });
    mat.depthWrite = false; // drawn as part of the sky: no haze, behind everything
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), mat);
    mesh.position.set(-10, m.top - m.h / 2, m.z);
    mesh.renderOrder = -8 + ranges.indexOf(m); // after the sky, far ridge first
    group.add(mesh);
  }
  const clouds: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const w = 26 + R() * 30, h = w * 0.36;
    const tex = cloudTex({ w: Math.round(w * 3), h: Math.round(h * 3), seed: 40 + i, cols: ['#b9787e', '#d8948a', '#f0b494', '#ffd8a8', '#fff2cc'], sunLeft: true });
    const cm = flat({ map: tex });
    cm.depthWrite = false;
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cm);
    c.renderOrder = -9;
    c.position.set(-90 + i * 26 + (R() - 0.5) * 12, 22 + R() * 22, -150 - R() * 30);
    c.userData.speed = 0.3 + R() * 0.4;
    clouds.push(c);
    group.add(c);
  }

  // ---- the lone oak
  const oakAt = new THREE.Vector3(-4.6, meadowHeight(-4.6, -3.4), -3.4);
  const oakBark = lit({ map: barkTex(['#2e2418', '#4a3a26', '#66503a', '#8a7050']) });
  const oak = new THREE.Group();
  oak.add(trunk({ h: 3.4, r0: 0.5, r1: 0.32, lean: new THREE.Vector2(0.2, 0.1), mat: oakBark, seg: 12 }));
  const boughs: THREE.Vector3[][] = [
    [new THREE.Vector3(0.1, 2.6, 0), new THREE.Vector3(1.4, 3.6, 0.3), new THREE.Vector3(2.8, 4.1, 0.6)],
    [new THREE.Vector3(0, 2.8, 0), new THREE.Vector3(-1.2, 3.9, -0.2), new THREE.Vector3(-2.6, 4.4, -0.4)],
    [new THREE.Vector3(0.2, 3.1, 0), new THREE.Vector3(0.6, 4.4, 0.9), new THREE.Vector3(1.1, 5.5, 1.3)],
    [new THREE.Vector3(0.1, 3.0, 0), new THREE.Vector3(-0.3, 4.5, -1), new THREE.Vector3(-0.4, 5.6, -1.6)],
    [new THREE.Vector3(0.25, 1.7, 0.1), new THREE.Vector3(1.5, 1.95, 0.8), new THREE.Vector3(2.4, 1.9, 1.2)]
  ];
  for (const b of boughs) oak.add(branch(b, 0.13, oakBark));
  oak.add(foliage({
    puffs: [
      { c: new THREE.Vector3(2.6, 4.5, 0.6), r: new THREE.Vector3(2.2, 1.4, 1.8), n: 110 },
      { c: new THREE.Vector3(-2.4, 4.8, -0.4), r: new THREE.Vector3(2.2, 1.5, 1.8), n: 110 },
      { c: new THREE.Vector3(0.8, 5.9, 1.1), r: new THREE.Vector3(2.4, 1.6, 2), n: 120 },
      { c: new THREE.Vector3(-0.4, 6.1, -1.4), r: new THREE.Vector3(2.4, 1.6, 2), n: 120 },
      { c: new THREE.Vector3(0.1, 4.6, 0), r: new THREE.Vector3(2.8, 1.4, 2.4), n: 110 },
    ],
    map: leafClusterTex(['#1f3a18', '#2f5424', '#4a7430', '#7a9a3c', '#d2b85a'], 21, 90),
    size: [0.9, 1.5], tints: ['#ffffff', '#f0e4c0', '#d8e0b0'], seed: 31, wind: 0.008,
  }));
  oak.position.copy(oakAt);
  oak.rotation.y = 0.3;
  group.add(castShadows(oak));
  // (the foliage cards were marked as casters by castShadows; unmark them,
  // the long trunk/bough shadows read better without a solid blob)
  oak.children.forEach((c) => { if ((c as THREE.InstancedMesh).isInstancedMesh) c.layers.disable(1); });

  // ---- golden grass and wildflowers over the crown of the hill
  const onHill = (r: () => number, spread: number, zMin: number, zMax: number) => {
    const x = (r() - 0.5) * spread, z = zMin + r() * (zMax - zMin);
    return { x, z, y: meadowHeight(x, z) };
  };
  group.add(buildGrass({
    count: 26000, seed: 33, wind: 0.14, rootShade: 0.55,
    colors: ['#c8b24a', '#a8a83e', '#d8c060', '#8a9a3a', '#e0c870', '#9aa844'],
    sample: (r) => {
      const p = onHill(r, 26, -14, 1.35);
      const d = Math.hypot(p.x + 0.15, p.z + 0.2);
      if (r() > Math.exp(-((d / 7) ** 2)) * 0.8 + 0.2) return null;
      if (Math.abs(p.x + 0.15) < 1.85 && p.z > -0.72 && p.z < 0.3) return { ...p, h: 0.12 + r() * 0.2, w: 0.04 };
      const h = p.z > 0.45 ? 0.05 + r() * 0.12 : 0.18 + r() * 0.34;
      return { ...p, h, w: p.z > 0.45 ? 0.016 + r() * 0.016 : 0.035 + r() * 0.035 };
    },
  }));
  group.add(buildFlowers({
    count: 1600, seed: 34,
    kinds: [{ petal: '#e0402a', centre: '#2a1612' }, { petal: '#5a80e0', centre: '#f0e0a0' }, { petal: '#f4f0e4', centre: '#e8b030' }, { petal: '#f2c83a', centre: '#b07818' }],
    sample: (r) => {
      const p = onHill(r, 20, -11, 0.4);
      if (Math.abs(p.x + 0.15) < 1.9 && p.z > -0.75) return null;
      const h = 0.22 + r() * 0.3;
      return { ...p, h, w: h * 0.3 };
    },
  }));

  const scene: OutdoorScene = {
    id: 'meadow',
    label: 'Golden hour meadow',
    group,
    sun: { dir: sunDir, col: '#ffb466', i: 1.45 },
    hemi: { sky: '#8fb0de', ground: '#7a6030', i: 0.5 },
    amb: '#1e140e',
    rim: { pos: new THREE.Vector3(-6, 1.5, -8), col: '#ff9a56', i: 0.6 },
    fill: { pos: new THREE.Vector3(1.2, 3, 5), col: '#ffd6b0', i: 0.3 },
    lampI: 1.1,
    fog: { col: '#f6c69a', den: 0.0055, start: 12 },
    post: { bloomCol: '#ffc07a', bloom: 0.95, vignette: 0.85, outlineFar: 9, grade: [1.04, 1.0, 0.94] },
    shadow: { center: new THREE.Vector3(-1.2, 0, -1.2), half: 6.5 },
    camera: { pos: new THREE.Vector3(0.25, 1.36, 2.8), look: new THREE.Vector3(-0.15, 1.05, -0.5), fov: 48 },
    tick: (t, dt, cam) => {
      sky.tick(t, cam);
      for (const c of clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 130) c.position.x = -130; }
    },
  };
  return scene;
};
