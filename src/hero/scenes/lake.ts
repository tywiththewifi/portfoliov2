import * as THREE from 'three';
import { flat, lit } from '../materials';
import { rng, poster } from '../../art/posters';
import { buildSky } from '../outdoor/sky';
import { buildGrass } from '../outdoor/grass';
import { pine } from '../outdoor/trees';
import { mountainTex, pineRowTex, plankTex } from '../outdoor/paint';
import { posterMesh } from '../outdoor/furniture';
import { buildWater } from '../outdoor/water';
import { buildAurora } from '../outdoor/aurora';
import { castShadows } from '../outdoor/shadow';
import type { OutdoorScene, SceneBuilder } from './types';

// Concept 3 · Aurora Lake
// Night. The desk has been carried to the end of a wooden dock on a still
// northern lake. Green-to-pink aurora curtains ripple over black pines and
// snowy ridges and lie mirrored in the water; the only warm light is the
// lamp and the CRT. Posters are pinned to a notice board on the dock.
export const buildLake: SceneBuilder = (art) => {
  const group = new THREE.Group();
  const R = rng(27);
  const moonDir = new THREE.Vector3(-0.5, 0.26, -0.83).normalize();
  const WATER_Y = -0.34;

  const sky = buildSky({ zenith: '#03060f', mid: '#071a2c', horizon: '#0f3a48', below: '#061018', sunDir: moonDir, sunCol: '#f2f0e0', sunSize: 0.0009, glow: 0.35, glowCol: '#6aa0c0', stars: 1, moon: true });
  group.add(sky.mesh);

  const aurora = buildAurora({
    strength: 0.9,
    bands: [
      { x: -40, z: -110, w: 170, h: 38, y: 2.5, bend: 16, phase: 0 },
      { x: 38, z: -125, w: 180, h: 42, y: 3.5, bend: -20, phase: 2.3 },
      { x: 0, z: -95, w: 110, h: 30, y: 7, bend: 10, phase: 4.1 },
    ],
  });
  group.add(aurora.group);

  // ---- ridges (drawn with the sky, behind the haze) and pine shorelines
  const ranges = [
    { z: -170, w: 440, h: 30, seed: 12, body: ['#16283a', '#1e3446', '#284256'], snow: '#9ab8c8', top: 22 },
    { z: -120, w: 330, h: 22, seed: 14, body: ['#0e1c2a', '#142636', '#1a3042'], snow: '#7a9aae', top: 12 },
  ];
  ranges.forEach((m, i) => {
    const mat = flat({ map: mountainTex({ w: Math.round(m.w * 1.4), h: Math.round(m.h * 1.4), seed: m.seed, body: m.body, snow: m.snow, rough: 1.6 }) });
    mat.depthWrite = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), mat);
    mesh.position.set(0, m.top - m.h / 2, m.z);
    mesh.renderOrder = -8 + i;
    group.add(mesh);
  });
  // shore of pines wrapping round the lake: far back, then both flanks
  const shores = [
    { x: 0, z: -60, w: 180, h: 9, ry: 0, seed: 1 },
    { x: -38, z: -24, w: 70, h: 10, ry: Math.PI / 2.6, seed: 2 },
    { x: 40, z: -28, w: 70, h: 10, ry: -Math.PI / 2.6, seed: 3 },
  ];
  for (const s of shores) {
    const tex = pineRowTex({ w: Math.round(s.w * 6), h: Math.round(s.h * 6), seed: s.seed, cols: ['#0a1a1e', '#0c1f24', '#08161a', '#061014'] });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), flat({ map: tex, side: THREE.DoubleSide }));
    m.position.set(s.x, WATER_Y + s.h / 2 - 0.1, s.z);
    m.rotation.y = s.ry;
    group.add(m);
  }
  // a few real pines on a spit of rock to the left, for depth
  const rock = lit({ color: '#1a2226' });
  for (let i = 0; i < 5; i++) {
    const x = -9 - R() * 6, z = -15 - R() * 10;
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + R(), 0), rock);
    stone.scale.set(1.6, 0.35, 1.2);
    stone.position.set(x, WATER_Y, z);
    group.add(stone);
    const p = pine({ h: 4 + R() * 3, r: 0.9 + R() * 0.4, cols: ['#0f2a26', '#133430', '#0c2220'], trunkMat: lit({ color: '#2a1e18' }), seed: 50 + i });
    p.position.set(x, WATER_Y + 0.3, z);
    group.add(p);
  }

  // ---- the lake
  const water = buildWater({ size: 500, y: WATER_Y, deep: '#041018', res: 768 });
  group.add(water.mesh);

  // ---- the dock
  const planks = lit({ map: plankTex(['#2e2016', '#4a3624', '#644a32', '#7e6044'], 14) });
  const dock = new THREE.Group();
  const dx0 = -2.8, dx1 = 2.5, dz0 = -1.5, dz1 = 2.2;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(dx1 - dx0, 0.08, dz1 - dz0), [lit({ color: '#3a2a1c' }), lit({ color: '#3a2a1c' }), planks, lit({ color: '#2a1e14' }), lit({ color: '#3a2a1c' }), lit({ color: '#3a2a1c' })]);
  deck.position.set((dx0 + dx1) / 2, -0.04, (dz0 + dz1) / 2);
  dock.add(deck);
  const postMat = lit({ color: '#3a2c20' });
  for (const x of [dx0, (dx0 + dx1) / 2, dx1]) for (const z of [dz0, (dz0 + dz1) / 2, dz1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.4, 8), postMat);
    p.position.set(x, -0.79, z);
    dock.add(p);
  }
  // mooring posts poking above the deck at the corners
  for (const [x, z] of [[dx0, dz1], [dx1, dz1]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), postMat);
    p.position.set(x, 0.25, z);
    dock.add(p);
  }
  group.add(castShadows(dock));

  // ---- notice board on the dock with the posters pinned up
  const board = new THREE.Group();
  const bw = 1.5, bh = 1.0;
  board.add(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.04), lit({ color: '#5a4430' })));
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.1, bh - 0.1), lit({ color: '#8a6a44' }));
  cork.position.z = 0.021;
  board.add(cork);
  for (const x of [-bw / 2 + 0.08, bw / 2 - 0.08]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.9, 0.07), postMat);
    leg.position.set(x, -0.45, -0.03);
    board.add(leg);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 0.05, 0.26), postMat);
  roof.position.set(0, bh / 2 + 0.05, 0.05);
  roof.rotation.x = 0.25;
  board.add(roof);
  const pins: [CanvasImageSource & { width: number; height: number }, number, number, number][] = [
    [art.floyd, -0.52, 0.12, 0.3], [art.chief, -0.18, 0.16, 0.28], [art.mario, 0.18, 0.14, 0.3], [art.mixer, 0.52, 0.12, 0.28],
    [art.tr909, -0.3, -0.26, 0.4], [poster('helmets'), 0.28, -0.24, 0.22],
  ];
  for (const [src, x, y, w] of pins) {
    const p = posterMesh(src, w, { tape: false });
    p.position.set(x, y, 0.03);
    p.rotation.z = (R() - 0.5) * 0.1;
    board.add(p);
  }
  board.position.set(2.05, 1.4, -1.25);
  board.rotation.y = -0.35;
  group.add(castShadows(board));

  // ---- reeds around the dock
  group.add(buildGrass({
    count: 3500, seed: 44, wind: 0.05, rootShade: 0.5,
    colors: ['#2a4a2a', '#34583a', '#1e3a24', '#4a5e30'],
    sample: (r) => {
      const x = -6 + r() * 12, z = -4 + r() * 6;
      const onDock = x > dx0 - 0.15 && x < dx1 + 0.15 && z > dz0 - 0.15 && z < dz1 + 0.15;
      if (onDock || Math.abs(x) < 3.1) return null; // flanks only, keep the water behind the desk open
      if (r() > Math.exp(-((Math.hypot(x, z + 1) - 3.5) ** 2) / 2)) return null; // a ring hugging the dock
      return { x, y: WATER_Y, z, h: 0.3 + r() * 0.6, w: 0.025 + r() * 0.02 };
    },
  }));

  const scene: OutdoorScene = {
    id: 'lake',
    label: 'Aurora lake',
    group,
    sun: { dir: moonDir, col: '#9cc0ff', i: 0.32 },
    hemi: { sky: '#163250', ground: '#05080c', i: 0.55 },
    amb: '#06080e',
    rim: { pos: new THREE.Vector3(0, 7, -10), col: '#3cffb0', i: 0.55 },
    fill: { pos: new THREE.Vector3(1, 3, 5), col: '#304a70', i: 0.25 },
    lampI: 1.35,
    screenI: 0.7,
    fog: { col: '#0a202c', den: 0.012, start: 8 },
    post: { bloomCol: '#9affd6', bloom: 1.1, vignette: 1.0, outlineFar: 8, grade: [0.96, 1.0, 1.06] },
    shadow: { center: new THREE.Vector3(0, 0, 0), half: 4.5 },
    camera: { pos: new THREE.Vector3(0.25, 1.42, 2.9), look: new THREE.Vector3(-0.12, 1.02, -0.5), fov: 48 },
    tick: (t, _dt, cam) => { sky.tick(t, cam); aurora.tick(t); water.tick(t); },
  };
  return scene;
};
