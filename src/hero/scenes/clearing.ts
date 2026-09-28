import * as THREE from 'three';
import { flat, lit } from '../materials';
import { rng } from '../../art/posters';
import { buildSky } from '../outdoor/sky';
import { buildFlowers, buildGrass } from '../outdoor/grass';
import { foliage, trunk } from '../outdoor/trees';
import { barkTex, forestLayerTex, goboTex, groundTex, leafClusterTex, noise2, repeatTex } from '../outdoor/paint';
import { lightShafts } from '../outdoor/shafts';
import { castShadows } from '../outdoor/shadow';
import type { OutdoorScene, SceneBuilder } from './types';

// Concept 1 · Overgrown Clearing
// The reference photo, lived in: a desk abandoned to a spring wood. Tall
// wild grass swallows the table legs, slim mossy trunks crowd in, and the
// midday sun comes through the canopy in drifting coins of light and a few
// dusty shafts.
export const buildClearing: SceneBuilder = () => {
  const group = new THREE.Group();
  const R = rng(7);
  const sunDir = new THREE.Vector3(-0.35, 0.85, -0.42).normalize();

  const sky = buildSky({ zenith: '#eaf6d4', mid: '#d6edb4', horizon: '#c4e0a0', sunDir, sunCol: '#fffbe6', sunSize: 0.0006, glow: 0.8, glowCol: '#fff6c8' });
  group.add(sky.mesh);

  // ---- ground: dark loam and moss
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), lit({ map: repeatTex(groundTex(['#1f2a12', '#2d3d18', '#3e5420', '#557030'], 128, 0.08), 30, 30) }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // ---- trunks: slim, mossy, leaning; a few feature trunks carry posters
  const bark = lit({ map: barkTex(['#4c5244', '#6f7564', '#8e9480', '#b6b9a4'], '#5f8a34') });
  const trunks: { x: number; z: number; r: number }[] = [
    { x: -1.85, z: -1.6, r: 0.2 }, { x: 1.95, z: -1.7, r: 0.19 }, { x: -0.95, z: -2.5, r: 0.15 },
  ];
  while (trunks.length < 42) {
    const x = (R() - 0.5) * 26, z = -3.2 - R() * 15;
    const side = Math.abs(x) > 4.2 && z > -6;
    if (!side && z > -3.6 && Math.abs(x) < 3) continue;
    if (trunks.some((t) => Math.hypot(t.x - x, t.z - z) < 1.3)) continue;
    trunks.push({ x, z, r: 0.07 + R() * 0.16 });
  }
  // flanking trunks close to camera frame the shot
  trunks.push({ x: -4.4, z: 0.6, r: 0.24 }, { x: 4.7, z: 0.9, r: 0.2 });
  const trunkGroup = new THREE.Group();
  for (const t of trunks) {
    const m = trunk({ h: 9 + R() * 5, r0: t.r * 1.25, r1: t.r * 0.55, lean: new THREE.Vector2((R() - 0.5) * 0.9, (R() - 0.5) * 0.6), mat: bark });
    m.position.set(t.x, 0, t.z);
    trunkGroup.add(m);
  }
  group.add(castShadows(trunkGroup));

  // ---- canopy overhead and understory shrubs
  const leafMap = leafClusterTex(['#1f4a1c', '#2f6a24', '#4a8a2c', '#78b23c', '#a8d85a'], 5, 80);
  const puffs: { c: THREE.Vector3; r: THREE.Vector3; n: number }[] = [];
  for (const t of trunks) {
    if (t.z > -1) continue;
    for (let k = 0; k < 2; k++) puffs.push({ c: new THREE.Vector3(t.x + (R() - 0.5) * 2, 3.6 + R() * 2.6, t.z + (R() - 0.5) * 2), r: new THREE.Vector3(1.8, 1, 1.8), n: 34 });
  }
  // a low ceiling of leaves right over the desk, for the dappled look
  for (let i = 0; i < 6; i++) puffs.push({ c: new THREE.Vector3(-3 + i * 1.2, 4.4 + R() * 0.6, -0.8 - R() * 1.5), r: new THREE.Vector3(1.4, 0.6, 1.2), n: 30 });
  group.add(foliage({ puffs, map: leafMap, size: [0.7, 1.3], tints: ['#ffffff', '#e8f0c0', '#c8dca0'], seed: 3, wind: 0.01 }));
  const shrubMap = leafClusterTex(['#1a3a16', '#2a5a20', '#3f7a28', '#62a034', '#8cc44a'], 11, 90);
  const shrubs: typeof puffs = [];
  for (let i = 0; i < 16; i++) {
    const x = (R() - 0.5) * 18, z = -3 - R() * 7;
    if (Math.abs(x) < 1.5 && z > -4.5) continue;
    shrubs.push({ c: new THREE.Vector3(x, 0.5 + R() * 0.5, z), r: new THREE.Vector3(1 + R(), 0.7 + R() * 0.5, 0.8), n: 26 });
  }
  // the ivy-choked stump from the photo, left of the desk
  shrubs.push({ c: new THREE.Vector3(-3.6, 0.9, -1.2), r: new THREE.Vector3(0.9, 1.1, 0.8), n: 60 });
  group.add(foliage({ puffs: shrubs, map: shrubMap, size: [0.45, 0.85], tints: ['#ffffff', '#dcebb8'], seed: 9, wind: 0.02 }));

  // ---- tall wild grass: short in front so the desk reads, chest-high elsewhere
  group.add(buildGrass({
    count: 30000, seed: 21,
    colors: ['#7fb03a', '#5e9a2e', '#9cc84a', '#4a8a2a', '#b8d45a', '#3d7426', '#a4bc48'],
    wind: 0.1, rootShade: 0.6,
    sample: (r) => {
      const x = (r() - 0.5) * 22, z = -12 + r() * 13.4;
      const d = Math.hypot(x + 0.15, (z + 0.2) * 1.3);
      if (r() > Math.exp(-((d / 6) ** 2)) * 0.85 + 0.15) return null; // denser near the desk
      const clump = 0.75 + 0.45 * noise2(x * 0.35, z * 0.35);
      let h: number;
      if (z > 0.45) { if (r() < 0.35) return null; h = 0.06 + r() * 0.16; } // foreground: low, so the desk shows
      else if (Math.abs(x + 0.15) < 1.85 && z > -0.72) h = 0.25 + r() * 0.4; // under the table
      else h = (0.55 + r() * 0.65) * clump;
      if (Math.hypot(x - 1.3, z - 1.6) < 0.45) h *= 0.5; // flattened under the chair
      return { x, y: 0, z, h, w: z > 0.45 ? 0.018 + r() * 0.018 : 0.045 + r() * 0.045 };
    },
  }));

  // ---- a scatter of wildflowers poking through: daisies, buttercups, campion
  group.add(buildFlowers({
    count: 900, seed: 5,
    kinds: [{ petal: '#f4f0e4', centre: '#e8b030' }, { petal: '#f2d23a', centre: '#c88a18' }, { petal: '#e87aa0', centre: '#f4d8e0' }],
    sample: (r) => {
      const x = (r() - 0.5) * 16, z = -9 + r() * 9.2;
      if (Math.abs(x + 0.15) < 1.9 && z > -0.75 && z < 0.3) return null;
      const h = z > 0.45 ? 0.08 + r() * 0.06 : 0.3 + r() * 0.5;
      return { x, y: 0, z, h, w: h * 0.4 };
    },
  }));

  // ---- painted forest beyond, three hazy layers
  const layers = [
    { z: -19, w: 64, h: 15, seed: 1, leaves: ['#2c5424', '#3f7430', '#5e9640', '#86b85a'], trunk: '#3c4a30', trunks: 60 },
    { z: -27, w: 80, h: 18, seed: 2, leaves: ['#4a7440', '#628c50', '#80a866', '#a4c486'], trunk: '#5a6a4a', trunks: 70 },
    { z: -38, w: 110, h: 22, seed: 3, leaves: ['#7a9a6c', '#8eac7e', '#a8c296', '#c0d6ae'], trunk: '#8a9a7a', trunks: 80 },
  ];
  for (const L of layers) {
    const tex = forestLayerTex({ w: Math.round(L.w * 5), h: Math.round(L.h * 5), seed: L.seed, trunk: L.trunk, leaves: L.leaves, trunks: L.trunks, sky: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), flat({ map: tex }));
    m.position.set(0, L.h / 2 - 0.4, L.z);
    group.add(m);
  }

  // ---- shafts of light slanting down through gaps
  const shafts = lightShafts({
    sunDir, len: 11, width: 0.9, col: '#3a3a20', strength: 0.55,
    feet: [new THREE.Vector3(-1.6, 0, -3.2), new THREE.Vector3(0.9, 0, -4.6), new THREE.Vector3(2.8, 0, -3.4), new THREE.Vector3(-4.2, 0, -5.5), new THREE.Vector3(4.6, 0, -6.5)],
  });
  group.add(shafts.group);

  const gobo = goboTex();
  const scene: OutdoorScene = {
    id: 'clearing',
    label: 'Overgrown clearing',
    group,
    sun: { dir: sunDir, col: '#ffe6a8', i: 1.0 },
    hemi: { sky: '#bfe0a0', ground: '#4a4420', i: 0.5 },
    amb: '#18220e',
    rim: { pos: new THREE.Vector3(-3, 4, -6), col: '#e8ffb0', i: 0.35 },
    fill: { pos: new THREE.Vector3(0.5, 3, 4), col: '#e4f2cc', i: 0.35 },
    lampI: 0.7,
    fog: { col: '#c2d9a0', den: 0.05, start: 5 },
    post: { bloomCol: '#fff2c0', bloom: 0.6, vignette: 0.7, outlineFar: 7 },
    gobo: { tex: gobo, scale: 0.17, drift: [0.006, 0.003] },
    shadow: { center: new THREE.Vector3(-0.2, 0, -0.3), half: 4.2 },
    camera: { pos: new THREE.Vector3(0.25, 1.42, 2.7), look: new THREE.Vector3(-0.12, 1.0, -0.45), fov: 48 },
    tick: (t, _dt, cam) => { sky.tick(t, cam); shafts.tick(t); },
  };
  return scene;
};
