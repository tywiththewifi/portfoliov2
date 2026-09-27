import * as THREE from 'three';
import { Pix, drawCamera } from '../art/pix';
import { rng } from '../art/posters';
import { emissive, lit, pixelTexture } from './materials';
import { DESK_Y, WALL_Z } from './room';

export type Hover = { value: number };

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// A textured face on the +z side of a box, other faces plain.
function faceMats(front: THREE.Material, side: THREE.Material) {
  return [side, side, side, side, front, side];
}
function topMats(top: THREE.Material, side: THREE.Material) {
  return [side, side, top, side, side, side];
}

// ---------------------------------------------------------------- CRT
export function buildComputer(hover: Hover, screenTex: THREE.Texture) {
  const g = new THREE.Group();
  const beige = lit({ color: '#dccdb6', hover });
  const beigeDark = lit({ color: '#b8a58c', hover });
  const cx = 0, cz = WALL_Z + 0.32;
  // stand + case
  g.add(box(0.26, 0.03, 0.26, beigeDark, cx, DESK_Y + 0.015, cz));
  g.add(box(0.12, 0.03, 0.12, beigeDark, cx, DESK_Y + 0.045, cz));
  const faceG = new Pix(60, 52);
  faceG.r(0, 0, 60, 52, '#dccdb6');
  faceG.r(0, 0, 60, 1, '#efe4d0');
  faceG.r(0, 44, 60, 8, '#d0c0a6');
  for (let i = 0; i < 5; i++) faceG.r(36 + i * 3, 47, 2, 1, '#8a7a66');
  faceG.p(52, 47, '#62ff7a');
  faceG.r(4, 47, 12, 1, '#b8a58c');
  const front = lit({ map: pixelTexture(faceG.canvas), hover });
  const caseW = 0.48, caseH = 0.42, caseD = 0.3;
  const caseY = DESK_Y + 0.06 + caseH / 2;
  g.add(box(caseW, caseH, caseD, faceMats(front, beige), cx, caseY, cz + 0.02));
  g.add(box(caseW * 0.72, caseH * 0.78, 0.2, beigeDark, cx, caseY + 0.01, cz - 0.2));
  // screen glass (emissive canvas texture), slightly recessed look via a dark bezel
  const scrW = 0.36, scrH = 0.27;
  const scrY = caseY + 0.035;
  const scrZ = cz + 0.02 + caseD / 2 + 0.002;
  g.add(box(scrW + 0.03, scrH + 0.03, 0.004, lit({ color: '#241c20', hover }), cx, scrY, scrZ - 0.001));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(scrW, scrH), emissive({ map: screenTex, intensity: 1, hover }));
  screen.position.set(cx, scrY, scrZ + 0.002);
  g.add(screen);
  // keyboard
  const kb = new Pix(58, 20);
  kb.r(0, 0, 58, 20, '#d6c8b0');
  for (let row = 0; row < 5; row++)
    for (let k = 0; k < 14; k++) {
      const w = row === 4 && k > 3 && k < 9 ? (k === 4 ? 17 : 0) : 3;
      if (!w) continue;
      kb.r(2 + k * 4 - (row % 2), 2 + row * 3.4, w, 2, k === 13 && row === 1 ? '#c9483a' : '#efe6d4');
    }
  const kbTop = lit({ map: pixelTexture(kb.canvas), hover });
  const keyboard = box(0.46, 0.028, 0.16, topMats(kbTop, beige), cx, DESK_Y + 0.014, WALL_Z + 0.72);
  keyboard.rotation.x = 0.06;
  g.add(keyboard);
  // mouse
  g.add(box(0.05, 0.022, 0.08, beige, 0.33, DESK_Y + 0.011, WALL_Z + 0.73));
  const screenCenter = new THREE.Vector3(cx, scrY, scrZ);
  return { group: g, screen, screenCenter, screenSize: { w: scrW, h: scrH } };
}

// Idle CRT: a tiny terminal that invites a click. Redrawn every frame.
export function makeScreen() {
  const W = 72, H = 54;
  const g = new Pix(W, H);
  const tex = pixelTexture(g.canvas);
  const lines = ['> BOOT YOURNAME.OS', '> LOADING WORK...', '> 6 PROJECTS FOUND', ''];
  const draw = (t: number, hover: number, os = false) => {
    g.r(0, 0, W, H, '#062019');
    if (os) { g.grad(0, 0, W, H, ['#0a3326', '#062019']); tex.needsUpdate = true; return; }
    g.grad(0, 0, W, H, ['#07261d', '#0a3326', '#07261d']);
    g.r(0, 0, W, 7, '#0f4a36');
    g.text('WORK', 3, 1, '#b8ffd8');
    g.r(W - 10, 2, 7, 3, '#62ff9a');
    const shown = Math.min(lines.length, Math.floor((t % 9) / 0.6) + 1);
    for (let i = 0; i < shown; i++) g.text(lines[i].slice(0, 17), 3, 10 + i * 8, '#62ff9a');
    const blink = Math.floor(t * 2.2) % 2 === 0;
    if (blink || hover > 0.5) {
      g.r(3, 42, 66, 9, hover > 0.5 ? '#62ff9a' : '#0f4a36');
      g.text('CLICK TO OPEN', 9, 44, hover > 0.5 ? '#062019' : '#b8ffd8');
    }
    // scanlines + roll bar
    for (let y = 0; y < H; y += 2) g.dens(0, y, W, 1, '#000000', 0.35);
    const roll = Math.floor((t * 14) % (H + 10)) - 5;
    g.dens(0, roll, W, 3, '#bfffe0', 0.18);
    tex.needsUpdate = true;
  };
  draw(0, 0);
  return { tex, draw };
}

// ---------------------------------------------------------------- MPC
export function buildMPC(hover: Hover) {
  const g = new THREE.Group();
  const body = lit({ color: '#3a3438', hover });
  const top = new Pix(46, 36);
  top.r(0, 0, 46, 36, '#4a4448');
  top.r(3, 3, 16, 7, '#1a2a1c');
  top.r(4, 4, 14, 5, '#8fe0a0');
  top.text('MPC', 5, 4, '#1a2a1c');
  for (let i = 0; i < 6; i++) top.circle(24 + (i % 3) * 7, 5 + Math.floor(i / 3) * 5, 1, '#c9c2b8');
  for (let i = 0; i < 10; i++) top.r(28 + (i % 5) * 3, 16 + Math.floor(i / 5) * 3, 2, 2, i === 2 ? '#e8483b' : '#8a8488');
  top.r(26, 27, 16, 6, '#2a2528');
  const topMat = lit({ map: pixelTexture(top.canvas), hover });
  const x = -0.72, z = WALL_Z + 0.52;
  const unit = box(0.42, 0.055, 0.32, topMats(topMat, body), x, DESK_Y + 0.028, z);
  unit.rotation.x = 0.08;
  g.add(unit);
  // 4x4 pads as their own meshes so they can light up
  const pads: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const mat = emissive({ color: ['#ff8a6a', '#ffcf6a', '#6ff2d8', '#e8e0d8'][(r + c) % 4], intensity: 0.3 });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.038), mat);
      pad.position.set(-0.18 + c * 0.048, 0.032, -0.03 + r * 0.048);
      unit.add(pad);
      pads.push({ mesh: pad, mat });
    }
  return { group: g, pads, unit };
}

// ---------------------------------------------------------------- turntable
export function buildTurntable(hover: Hover) {
  const g = new THREE.Group();
  const x = -1.22, z = WALL_Z + 0.46;
  const plinth = lit({ color: '#4a3a3e', hover });
  g.add(box(0.46, 0.08, 0.36, plinth, x, DESK_Y + 0.04, z));
  g.add(box(0.46, 0.012, 0.36, lit({ color: '#9a8a8c', gloss: 0.4, hover }), x, DESK_Y + 0.082, z));
  const rec = new Pix(48, 48);
  rec.circle(24, 24, 23, '#141014');
  for (let r = 8; r < 23; r += 3) {
    for (let a = 0; a < 360; a += 3) {
      const rr = r + (a % 9 === 0 ? 1 : 0);
      rec.p(24 + Math.round(Math.cos((a * Math.PI) / 180) * rr), 24 + Math.round(Math.sin((a * Math.PI) / 180) * rr), '#2a2228');
    }
  }
  rec.circle(24, 24, 7, '#e8622c');
  rec.circle(24, 24, 1, '#141014');
  rec.r(20, 21, 5, 1, '#ffd0a0');
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 40), [lit({ color: '#1a1418', hover }), lit({ map: pixelTexture(rec.canvas), gloss: 0.6, hover }), lit({ color: '#1a1418', hover })]);
  platter.position.set(x - 0.04, DESK_Y + 0.094, z);
  g.add(platter);
  // tonearm
  const arm = lit({ color: '#c9c6cc', hover });
  g.add(box(0.03, 0.03, 0.03, arm, x + 0.17, DESK_Y + 0.1, z - 0.12));
  const tone = box(0.012, 0.012, 0.24, arm, x + 0.14, DESK_Y + 0.112, z - 0.01);
  tone.rotation.y = 0.35;
  g.add(tone);
  return { group: g, platter };
}

// ---------------------------------------------------------------- speaker + decks
export function buildAudioStack() {
  const g = new THREE.Group();
  const cab = lit({ color: '#2a2024' });
  const sp = new Pix(24, 40);
  sp.r(0, 0, 24, 40, '#2a2024');
  sp.circle(12, 11, 6, '#141014'); sp.circle(12, 11, 4, '#3a3034'); sp.circle(12, 11, 1, '#6a5a60');
  sp.circle(12, 28, 9, '#141014'); sp.circle(12, 28, 7, '#3a3034'); sp.circle(12, 28, 2, '#6a5a60');
  sp.p(10, 26, '#8a7a80');
  const spFront = lit({ map: pixelTexture(sp.canvas) });
  g.add(box(0.19, 0.31, 0.2, faceMats(spFront, cab), 0.4, DESK_Y + 0.155, WALL_Z + 0.2));

  const deck = (y: number, variant: number) => {
    const f = new Pix(52, 11);
    f.r(0, 0, 52, 11, variant % 2 ? '#3a3236' : '#2e2830');
    f.r(3, 3, 20, 5, '#141014');
    f.r(4, 4, 18, 3, variant === 1 ? '#3a2a1e' : '#1e2a26');
    f.p(6 + variant * 3, 5, '#f2efe6'); f.p(17 - variant, 5, '#f2efe6');
    for (let i = 0; i < 5; i++) f.r(27 + i * 4, 6, 3, 2, '#8a8488');
    f.r(28, 2, 12, 2, variant === 0 ? '#62ff9a' : '#ffb347');
    f.p(47, 3, '#ff4a3a');
    const mat = lit({ map: pixelTexture(f.canvas) });
    g.add(box(0.42, 0.085, 0.28, faceMats(mat, cab), 0.76, y, WALL_Z + 0.18));
  };
  deck(DESK_Y + 0.043, 0);
  deck(DESK_Y + 0.13, 1);
  deck(DESK_Y + 0.217, 2);
  // stacked cassettes on top
  const R = rng(5);
  for (let i = 0; i < 5; i++) {
    const c = ['#e8c35a', '#e6ddc8', '#c9483a', '#3fa89a', '#e07a4f'][i];
    const cas = box(0.11, 0.018, 0.07, lit({ color: c }), 0.7 + (R() - 0.5) * 0.02, DESK_Y + 0.27 + i * 0.019, WALL_Z + 0.16);
    cas.rotation.y = (R() - 0.5) * 0.3;
    g.add(cas);
  }
  return { group: g };
}

// ---------------------------------------------------------------- lamp
export function buildLamp(hover: Hover) {
  const g = new THREE.Group();
  const metal = lit({ color: '#e6d8c0', hover, gloss: 0.4 });
  const joint = lit({ color: '#8a7a6a', hover });
  const baseX = 1.2, baseZ = WALL_Z + 0.3;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 20), metal).translateX(baseX).translateY(DESK_Y + 0.015).translateZ(baseZ));
  // lower arm (fixed), upper arm + head pivot at the elbow
  const lower = new THREE.Group();
  lower.position.set(baseX, DESK_Y + 0.03, baseZ);
  lower.rotation.z = 0.35;
  const armL = 0.55;
  lower.add(box(0.018, armL, 0.018, metal, 0, armL / 2, 0));
  lower.add(box(0.012, armL * 0.9, 0.012, joint, 0.03, armL / 2, 0));
  g.add(lower);
  const elbow = new THREE.Group();
  elbow.position.set(0, armL, 0);
  lower.add(elbow);
  elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), joint));
  const upper = new THREE.Group();
  upper.rotation.z = 1.25; // swing over toward the desk
  elbow.add(upper);
  const armU = 0.42;
  upper.add(box(0.016, armU, 0.016, metal, 0, armU / 2, 0));
  const head = new THREE.Group();
  head.position.set(0, armU, 0);
  upper.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), joint));
  const shadeHolder = new THREE.Group();
  shadeHolder.rotation.z = -1.98; // point the shade down at the desk
  head.add(shadeHolder);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.14, 0.16, 24, 1, true), [lit({ color: '#efe4d0', hover, side: THREE.DoubleSide })]);
  shade.position.set(0, -0.09, 0);
  shadeHolder.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), emissive({ color: '#fff2c8', intensity: 1.3 }));
  bulb.position.set(0, -0.14, 0);
  shadeHolder.add(bulb);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.135, 24), emissive({ color: '#ffdca0', intensity: 1 }));
  inner.rotation.x = Math.PI / 2;
  inner.position.set(0, -0.165, 0);
  shadeHolder.add(inner);
  return { group: g, upper, head, shadeHolder, bulb, inner };
}

// ---------------------------------------------------------------- plants
function leafTex(variegated: boolean) {
  const g = new Pix(8, 32);
  g.r(0, 0, 8, 32, '#3f8a44');
  g.r(0, 0, 1, 32, '#2f6a36'); g.r(7, 0, 1, 32, '#2f6a36');
  if (variegated) { g.r(3, 0, 2, 32, '#e8e6b8'); g.r(2, 0, 1, 32, '#8fc27a'); g.r(5, 0, 1, 32, '#8fc27a'); }
  else g.r(3, 0, 1, 32, '#6fae5a');
  return pixelTexture(g.canvas);
}

// A bent ribbon leaf: starts at the crown, arches up and out, then droops.
function ribbon(len: number, width: number, dir: THREE.Vector3, droop: number, segs = 10) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  if (side.lengthSq() < 0.01) side.set(1, 0, 0);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = width * (t < 0.15 ? 0.5 + t * 3.3 : 1 - (t - 0.15) * 0.95);
    const p = dir.clone().multiplyScalar(len * t);
    p.y += Math.sin(t * Math.PI * 0.6) * len * 0.35 - t * t * droop * len;
    const a = p.clone().addScaledVector(side, -w / 2), b = p.clone().addScaledVector(side, w / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uv.push(0, t, 1, t);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function buildSpiderPlant() {
  const g = new THREE.Group();
  const potX = 1.0, potY = 1.64, potZ = WALL_Z + 0.52;
  const pot = lit({ color: '#b86a4a' });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.13, 16), pot).translateX(potX).translateY(potY).translateZ(potZ));
  const cord = lit({ color: '#2a1a1a' });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = box(0.006, 0.9, 0.006, cord, potX + Math.cos(a) * 0.11, potY + 0.5, potZ + Math.sin(a) * 0.11);
    c.rotation.z = -Math.cos(a) * 0.18; c.rotation.x = Math.sin(a) * 0.18;
    g.add(c);
  }
  const mats = [
    lit({ map: leafTex(true), side: THREE.DoubleSide, wind: 0.02, windAnchor: potY + 0.05 }),
    lit({ map: leafTex(false), side: THREE.DoubleSide, wind: 0.02, windAnchor: potY + 0.05 }),
  ];
  const R = rng(12);
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2;
    const out = 0.7 + R() * 0.8;
    const dir = new THREE.Vector3(Math.cos(a) * out, 0.8 + R() * 0.5, Math.sin(a) * out * 0.8).normalize();
    const geo = ribbon(0.22 + R() * 0.26, 0.036 + R() * 0.014, dir, 0.55 + R() * 1.1);
    const phase = new Float32Array(geo.attributes.position.count).fill(R() * 6.28);
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const m = new THREE.Mesh(geo, mats[i % 3 === 0 ? 1 : 0]);
    m.position.set(potX + Math.cos(a) * 0.05, potY + 0.06, potZ + Math.sin(a) * 0.05);
    g.add(m);
  }
  // a couple of runners with baby plantlets hanging below
  for (const [dx, len] of [[-0.18, 0.55], [0.22, 0.72]] as const) {
    g.add(box(0.005, len, 0.005, lit({ color: '#b8c890' }), potX + dx, potY - len / 2, potZ + 0.08));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const geo = ribbon(0.09, 0.016, new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a)).normalize(), 1.2, 5);
      const m = new THREE.Mesh(geo, mats[0]);
      m.position.set(potX + dx, potY - len, potZ + 0.08);
      g.add(m);
    }
  }
  return { group: g, mats, center: new THREE.Vector3(potX, potY - 0.2, potZ) };
}

function ovalLeaf(len: number, w: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w, len * 0.2, w * 0.9, len * 0.75, 0, len);
  s.bezierCurveTo(-w * 0.9, len * 0.75, -w, len * 0.2, 0, 0);
  return new THREE.ShapeGeometry(s, 6);
}

export function buildRubberPlant() {
  const g = new THREE.Group();
  const x = -0.37, z = WALL_Z + 0.3;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.15, 16), lit({ color: '#c9a88a' })).translateX(x).translateY(DESK_Y + 0.075).translateZ(z));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 16), lit({ color: '#3a2420' })).translateX(x).translateY(DESK_Y + 0.15).translateZ(z));
  const stem = lit({ color: '#5a3a2a' });
  const s1 = box(0.016, 0.62, 0.016, stem, x, DESK_Y + 0.46, z);
  s1.rotation.z = 0.06;
  g.add(s1);
  const leafMats = [
    lit({ color: '#1f4a30', side: THREE.DoubleSide, wind: 0.012, windAnchor: DESK_Y + 0.15, gloss: 0.8 }),
    lit({ color: '#2a5e3a', side: THREE.DoubleSide, wind: 0.012, windAnchor: DESK_Y + 0.15, gloss: 0.8 }),
  ];
  const R = rng(21);
  const leaves: THREE.Mesh[] = [];
  for (let i = 0; i < 13; i++) {
    const y = DESK_Y + 0.2 + i * 0.048;
    const a = i * 2.4 + R() * 0.5;
    const geo = ovalLeaf(0.19 + R() * 0.07, 0.075 + R() * 0.02);
    const phase = new Float32Array(geo.attributes.position.count).fill(R() * 6.28);
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const leaf = new THREE.Mesh(geo, leafMats[i % 2]);
    leaf.position.set(x + Math.cos(a) * 0.02, y, z + Math.sin(a) * 0.02);
    leaf.rotation.set(0, a, 0);
    leaf.rotateX(0.9 + R() * 0.4);
    g.add(leaf);
    leaves.push(leaf);
  }
  return { group: g, mats: leafMats, center: new THREE.Vector3(x, DESK_Y + 0.4, z) };
}

// ---------------------------------------------------------------- camera + small stuff
export function buildCamera(hover: Hover) {
  const g = new THREE.Group();
  const silver = lit({ color: '#b9bcc6', hover, gloss: 0.5 });
  const frontCanvas = drawCamera(false);
  const flashCanvas = drawCamera(true);
  const frontTex = pixelTexture(frontCanvas);
  const flashTex = pixelTexture(flashCanvas);
  const front = lit({ map: frontTex, hover });
  const body = box(0.13, 0.08, 0.04, faceMats(front, silver), 0, 0.04, 0);
  g.add(body);
  g.position.set(0.55, DESK_Y, WALL_Z + 0.76);
  g.rotation.y = -0.28;
  // strap
  const strap = box(0.012, 0.004, 0.14, lit({ color: '#1a1a22' }), 0.08, 0.002, 0.06);
  strap.rotation.y = 0.5;
  g.add(strap);
  const setFlash = (on: boolean) => {
    front.uniforms.uMap.value = on ? flashTex : frontTex;
  };
  return { group: g, body, setFlash };
}

export function buildDeskClutter() {
  const g = new THREE.Group();
  // notebooks
  g.add(box(0.22, 0.02, 0.28, lit({ color: '#2a2a3a' }), 0.34, DESK_Y + 0.01, WALL_Z + 0.62));
  const nb = box(0.2, 0.018, 0.26, lit({ color: '#e8dcc8' }), 0.36, DESK_Y + 0.029, WALL_Z + 0.6);
  nb.rotation.y = 0.12;
  g.add(nb);
  // mug of pens next to the MPC
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 14), lit({ color: '#e8e0d4' }));
  mug.position.set(-0.36, DESK_Y + 0.05, WALL_Z + 0.62);
  g.add(mug);
  const R = rng(3);
  for (let i = 0; i < 5; i++) {
    const pen = box(0.007, 0.16, 0.007, lit({ color: ['#e8483b', '#3a6ea5', '#1a1a1a', '#e8c35a', '#3fa89a'][i] }), -0.36 + (R() - 0.5) * 0.04, DESK_Y + 0.13, WALL_Z + 0.62 + (R() - 0.5) * 0.04);
    pen.rotation.z = (R() - 0.5) * 0.4;
    g.add(pen);
  }
  // a small stack of zines/records leaning at the far left
  for (let i = 0; i < 4; i++) g.add(box(0.3, 0.3, 0.012, lit({ color: ['#e8c35a', '#1a1216', '#c9483a', '#e6ddc8'][i] }), -1.62, DESK_Y + 0.15, WALL_Z + 0.08 + i * 0.015));
  return { group: g };
}
