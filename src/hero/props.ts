import * as THREE from 'three';
import { Pix } from '../art/pix';
import { rng } from '../art/posters';
import { emissive, lit, pixelTexture } from './materials';
import { DESK_Y, WALL_Z } from './room';

export type Hover = { value: number };

// Texel density for prop surfaces (texels per metre).
const TD = 300;

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function cyl(rt: number, rb: number, h: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}

// A texture sized for a w x h metre surface.
function surf(wm: number, hm: number, draw: (g: Pix, W: number, H: number) => void, scale = 1) {
  const W = Math.max(4, Math.round(wm * TD * scale)), H = Math.max(4, Math.round(hm * TD * scale));
  const g = new Pix(W, H);
  draw(g, W, H);
  return pixelTexture(g.canvas);
}

// Box face order: +x, -x, +y, -y, +z, -z
function mats6(o: { px?: THREE.Material; nx?: THREE.Material; py?: THREE.Material; ny?: THREE.Material; pz?: THREE.Material; nz?: THREE.Material }, base: THREE.Material) {
  return [o.px ?? base, o.nx ?? base, o.py ?? base, o.ny ?? base, o.pz ?? base, o.nz ?? base];
}

// Horizontal vent slits.
function vents(g: Pix, x: number, y: number, w: number, rows: number, gap: number, dark: string, light: string) {
  for (let i = 0; i < rows; i++) { g.r(x, y + i * gap, w, 1, dark); g.r(x, y + i * gap + 1, w, 1, light); }
}

// ---------------------------------------------------------------- CRT
export function buildComputer(hover: Hover, screenTex: THREE.Texture) {
  const g = new THREE.Group();
  const cx = 0, cz = WALL_Z + 0.32;
  const caseW = 0.48, caseH = 0.42, caseD = 0.3;
  const caseY = DESK_Y + 0.07 + caseH / 2;
  const scrW = 0.36, scrH = 0.27;
  const scrY = caseY + 0.035;

  const B = { base: '#dccdb6', hi: '#efe4d0', lo: '#c4b39a', dk: '#a8977e', ink: '#6e604e' };
  const side = lit({ hover, map: surf(caseD, caseH, (p, W, H) => {
    p.grad(0, 0, W, H, [B.hi, B.base, B.base, B.lo]);
    vents(p, 10, 12, W - 20, 10, 4, B.dk, B.hi);
    p.r(0, 0, W, 1, '#f6eee0');
  }) });
  const top = lit({ hover, map: surf(caseW, caseD, (p, W, H) => {
    p.r(0, 0, W, H, B.base);
    vents(p, 20, 8, W - 40, 8, 4, B.lo, B.hi);
    p.r(0, H - 2, W, 2, B.hi);
  }) });
  const front = lit({ hover, map: surf(caseW, caseH, (p, W, H) => {
    p.grad(0, 0, W, H, [B.hi, B.base, B.base, B.base, B.lo]);
    p.r(0, 0, W, 2, '#f8f2e6');
    p.r(0, 0, 2, H, '#f2e8d8');
    p.r(W - 2, 0, 2, H, B.lo);
    // recessed bezel around the tube: stepped shading
    const sx = Math.round((W - scrW * TD) / 2), sw = Math.round(scrW * TD), sh = Math.round(scrH * TD);
    const sy = Math.round(H / 2 - 0.035 * TD - sh / 2);
    for (let k = 7; k >= 1; k--) {
      const c = k > 5 ? B.lo : k > 3 ? B.dk : k > 1 ? B.ink : '#3a3228';
      p.r(sx - k, sy - k, sw + k * 2, sh + k * 2, c);
    }
    p.r(sx - 7, sy + sh + 6, sw + 14, 1, B.hi);
    // chin: badge, floppy slot, power button + LED, speaker grille
    const cy = sy + sh + 12;
    p.text('DESK-86', sx, cy + 2, B.ink);
    p.r(W / 2 - 22, cy, 44, 6, B.dk);
    p.r(W / 2 - 21, cy + 2, 42, 2, '#1e1a16');
    p.r(W / 2 + 14, cy + 1, 6, 1, B.hi);
    p.r(W - 30, cy, 9, 7, B.lo); p.r(W - 29, cy + 1, 7, 5, B.hi); p.r(W - 29, cy + 5, 7, 1, B.dk);
    p.r(W - 17, cy + 2, 3, 3, '#3a2a20'); p.p(W - 16, cy + 3, '#7aff9a');
    for (let i = 0; i < 6; i++) p.r(sx + sw - 30 + i * 5, cy + 1, 3, 5, B.dk);
    p.grain(0.05, 3);
  }) });
  const beige = lit({ color: B.base, hover });
  const beigeDk = lit({ color: B.lo, hover });

  // swivel foot
  g.add(cyl(0.12, 0.13, 0.02, beigeDk, cx, DESK_Y + 0.01, cz, 28));
  g.add(cyl(0.07, 0.09, 0.05, beige, cx, DESK_Y + 0.045, cz, 24));
  // case + rear tube housing (tapered)
  g.add(box(caseW, caseH, caseD, mats6({ px: side, nx: side, py: top, pz: front }, beige), cx, caseY, cz + 0.02));
  const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.24, 4, 1), beigeDk);
  rear.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  rear.scale.set(1.25, 1, 1);
  rear.position.set(cx, caseY + 0.01, cz - 0.24);
  g.add(rear);

  // curved glass: a subdivided plane bulging toward the viewer
  const scrZ = cz + 0.02 + caseD / 2 + 0.001;
  const geo = new THREE.PlaneGeometry(scrW, scrH, 12, 9);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (scrW / 2), v = pos.getY(i) / (scrH / 2);
    pos.setZ(i, 0.012 * (1 - 0.5 * (u * u + v * v)));
  }
  geo.computeVertexNormals();
  const screen = new THREE.Mesh(geo, emissive({ map: screenTex, intensity: 1, hover }));
  screen.position.set(cx, scrY, scrZ);
  g.add(screen);
  // sticky note on the bezel
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), lit({ hover, map: surf(0.05, 0.05, (p, W, H) => {
    p.r(0, 0, W, H, '#ffe066'); p.r(0, 0, W, 2, '#fff0a0');
    for (let y = 4; y < H - 2; y += 3) p.r(2, y, W - 4 - (y % 5), 1, '#8a6a2a');
  }, 1.4) }));
  note.position.set(cx + caseW / 2 - 0.05, scrY + scrH / 2 + 0.02, scrZ + 0.004);
  note.rotation.z = -0.12;
  g.add(note);

  // keyboard: shaded keycaps on a sloped case
  const kbW = 0.46, kbD = 0.16;
  const kbTop = lit({ hover, map: surf(kbW, kbD, (p, W, H) => {
    p.r(0, 0, W, H, '#cbbca2');
    p.r(0, 0, W, 1, '#e8dcc6');
    const rows = [
      { y: 4, keys: 13, w: 8, x: 4, fn: true },
      { y: 13, keys: 13, w: 8, x: 4 },
      { y: 22, keys: 12, w: 8, x: 7 },
      { y: 31, keys: 11, w: 8, x: 9 },
      { y: 40, keys: 10, w: 8, x: 12 },
    ];
    const cap = (x: number, y: number, w: number, c = '#efe6d4') => {
      p.r(x, y, w, 7, '#8a7d6a');
      p.r(x, y, w - 1, 6, '#b8ab94');
      p.r(x + 1, y, w - 2, 5, c);
      p.r(x + 1, y, w - 2, 1, '#fbf6ea');
    };
    for (const r of rows) for (let k = 0; k < r.keys; k++) cap(r.x + k * 8.2, r.y, r.w, r.fn && k % 4 === 0 ? '#d8cbb4' : k === r.keys - 1 && r.y === 13 ? '#e8a58a' : '#efe6d4');
    cap(36, 49, 48);
    cap(20, 49, 14, '#d8cbb4'); cap(86, 49, 14, '#d8cbb4');
    for (let i = 0; i < 12; i++) cap(W - 36 + (i % 4) * 8.2, 13 + Math.floor(i / 4) * 9, 8, '#d8cbb4');
    p.r(W - 30, 4, 3, 2, '#62ff7a'); p.r(W - 22, 4, 3, 2, '#3a3228');
  }) });
  const keyboard = box(kbW, 0.03, kbD, mats6({ py: kbTop }, beige), cx, DESK_Y + 0.017, WALL_Z + 0.72);
  keyboard.rotation.x = 0.07;
  g.add(keyboard);
  g.add(box(kbW, 0.012, 0.02, beigeDk, cx, DESK_Y + 0.006, WALL_Z + 0.8));

  // curly cable from the keyboard to the case
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const base = new THREE.Vector3(cx - 0.12 + t * 0.02, DESK_Y + 0.012 + Math.sin(t * Math.PI) * 0.01, WALL_Z + 0.64 - t * 0.2);
    base.x += Math.cos(t * 50) * 0.008; base.y += Math.sin(t * 50) * 0.008;
    pts.push(base);
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0025, 4), lit({ color: '#b8a58c' })));

  // mouse on a pad
  g.add(box(0.2, 0.004, 0.17, lit({ color: '#2a3a4a' }), 0.34, DESK_Y + 0.002, WALL_Z + 0.73));
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), beige);
  mouse.scale.set(0.8, 0.5, 1.2);
  mouse.position.set(0.34, DESK_Y + 0.012, WALL_Z + 0.74);
  g.add(mouse);
  g.add(box(0.002, 0.004, 0.035, lit({ color: '#8a7d6a' }), 0.34, DESK_Y + 0.028, WALL_Z + 0.72));

  const screenCenter = new THREE.Vector3(cx, scrY, scrZ);
  return { group: g, screen, screenCenter, screenSize: { w: scrW, h: scrH } };
}

// Idle CRT: a tiny terminal that invites a click. Redrawn every frame.
export function makeScreen() {
  const W = 108, H = 81;
  const g = new Pix(W, H);
  const tex = pixelTexture(g.canvas);
  const lines = ['> BOOT YOURNAME.OS', '> MOUNT /WORK', '> 6 PROJECTS FOUND', '> READY_'];
  const draw = (t: number, hover: number, os = false) => {
    if (os) { g.grad(0, 0, W, H, ['#0a3326', '#062019']); tex.needsUpdate = true; return; }
    g.grad(0, 0, W, H, ['#07261d', '#0b3a2b', '#082c21', '#061f18']);
    g.r(0, 0, W, 9, '#0f4a36');
    g.text('WORK', 4, 2, '#b8ffd8');
    g.text(new Date().toTimeString().slice(0, 5), W - 26, 2, '#62ff9a');
    const shown = Math.min(lines.length, Math.floor((t % 10) / 0.7) + 1);
    for (let i = 0; i < shown; i++) g.text(lines[i], 4, 14 + i * 9, '#62ff9a');
    // tiny progress bar
    const prog = Math.min(1, (t % 10) / 3);
    g.r(4, 52, 60, 4, '#0f4a36'); g.r(4, 52, Math.round(60 * prog), 4, '#62ff9a');
    const blink = Math.floor(t * 2.2) % 2 === 0;
    if (blink || hover > 0.5) {
      g.r(4, 64, W - 8, 11, hover > 0.5 ? '#62ff9a' : '#0f4a36');
      g.text('CLICK TO OPEN', Math.round(W / 2 - 26), 67, hover > 0.5 ? '#062019' : '#b8ffd8');
    }
    // scanlines, vignette corners, roll bar, glare
    for (let y = 0; y < H; y += 2) g.dens(0, y, W, 1, '#000000', 0.35);
    const roll = Math.floor((t * 18) % (H + 12)) - 6;
    g.dens(0, roll, W, 4, '#bfffe0', 0.16);
    g.dens(0, 0, 6, H, '#000000', 0.4); g.dens(W - 6, 0, 6, H, '#000000', 0.4);
    g.dens(6, 3, 26, 2, '#ffffff', 0.2);
    tex.needsUpdate = true;
  };
  draw(0, 0);
  return { tex, draw };
}

// ---------------------------------------------------------------- MPC
export function buildMPC(hover: Hover) {
  const g = new THREE.Group();
  const x = -0.72, z = WALL_Z + 0.52;
  const uw = 0.42, ud = 0.32;
  const body = lit({ color: '#3e383c', hover });
  const topMat = lit({ hover, map: surf(uw, ud, (p, W, H) => {
    p.grad(0, 0, W, H, ['#56505a', '#4a4448', '#423c40']);
    p.r(0, 0, W, 1, '#6e6870');
    // pad well (left-front)
    const px0 = 4, py0 = 33, pw = 56, ph = 58;
    p.r(px0, py0, pw, ph, '#1e1a1c');
    p.r(px0, py0, pw, 1, '#141012');
    p.r(px0, py0 + ph - 1, pw, 1, '#6a6468');
    // LCD
    p.r(64, 6, 56, 24, '#1a1a1a');
    p.r(66, 8, 52, 20, '#8fd89a');
    p.dens(66, 8, 52, 20, '#7ac88a', 0.3);
    p.text('SEQ01  090', 68, 10, '#1e3a24');
    p.text('PAD BANK A', 68, 17, '#1e3a24');
    p.r(68, 24, 30, 2, '#1e3a24');
    // brand
    p.text('MPC', 8, 8, '#e8e0d8', 2);
    p.text('MIDI PRODUCTION', 8, 22, '#8a8488');
    // knobs row
    for (let i = 0; i < 4; i++) p.sphere(70 + i * 12, 38, 4, 4, ['#1a1618', '#3a3438', '#8a8488', '#d8d2d0']);
    // data wheel
    p.sphere(106, 62, 11, 11, ['#141012', '#2a2528', '#4a4448', '#8a8488', '#c8c2c4']);
    p.circle(106, 62, 3, '#1a1618');
    p.p(100, 56, '#ffffff');
    // transport + function buttons
    const btn = (bx: number, by: number, c: string) => { p.r(bx, by, 8, 5, '#1a1618'); p.r(bx, by, 7, 4, c); p.r(bx, by, 7, 1, '#ffffff33'); };
    btn(66, 80, '#e8483b'); btn(76, 80, '#8a8488'); btn(86, 80, '#8a8488'); btn(96, 80, '#8a8488');
    for (let i = 0; i < 4; i++) btn(66 + i * 10, 48, '#6a6468');
    for (let i = 0; i < 4; i++) btn(66 + i * 10, 56, i === 0 ? '#ff7a2e' : '#6a6468');
    p.text('NOTE RPT', 66, 66, '#c8c2c4');
    p.grain(0.05, 9);
  }) });
  const unit = box(uw, 0.055, ud, mats6({ py: topMat }, body), x, DESK_Y + 0.028, z);
  unit.rotation.x = 0.08;
  g.add(unit);
  // rubber feet
  for (const [fx, fz] of [[-0.19, -0.14], [0.19, -0.14], [-0.19, 0.14], [0.19, 0.14]] as const) unit.add(cyl(0.012, 0.012, 0.01, lit({ color: '#141012' }), fx, -0.03, fz, 8));
  // 4x4 pads: framed, slightly raised, glow when hit
  const pads: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  const frame = lit({ color: '#2a2628', hover });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const mat = emissive({ color: ['#ff8a6a', '#ffcf6a', '#6ff2d8', '#e8e0d8'][(r + c) % 4], intensity: 0.3 });
      const px = -0.19 + c * 0.045, pz = -0.04 + r * 0.045;
      unit.add(box(0.041, 0.008, 0.041, frame, px, 0.03, pz));
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.035), mat);
      pad.position.set(px, 0.034, pz);
      unit.add(pad);
      pads.push({ mesh: pad, mat });
    }
  return { group: g, pads, unit };
}

// ---------------------------------------------------------------- turntable
export function buildTurntable(hover: Hover) {
  const g = new THREE.Group();
  const x = -1.22, z = WALL_Z + 0.46;
  const w = 0.46, d = 0.36;
  const plinthFront = lit({ hover, map: surf(w, 0.08, (p, W, H) => {
    p.grad(0, 0, W, H, ['#5a4448', '#4a3a3e', '#3a2c30']);
    p.r(0, 0, W, 1, '#7a6468');
    p.text('DIRECT DRIVE', 6, Math.round(H / 2) - 2, '#b8a8ac');
    p.r(W - 22, Math.round(H / 2) - 2, 4, 4, '#ff7a2e');
  }) });
  const plinthSide = lit({ color: '#4a3a3e', hover });
  const plate = lit({ hover, gloss: 0.4, map: surf(w, d, (p, W, H) => {
    p.r(0, 0, W, H, '#9a8a8c');
    for (let y = 0; y < H; y += 2) p.dens(0, y, W, 1, '#b0a0a2', 0.35);
    // strobe dots around where the platter sits
    const cx = Math.round((0.19) * TD), cy = Math.round(H / 2);
    for (let a = 0; a < 360; a += 6) p.p(Math.round(cx + Math.cos((a * Math.PI) / 180) * 49), Math.round(cy + Math.sin((a * Math.PI) / 180) * 49), '#5a4a4c');
    // start/stop, 33/45, pitch fader
    p.r(6, H - 22, 18, 14, '#2a2024'); p.r(7, H - 21, 16, 12, '#4a3a3e'); p.text('START', 6, H - 7, '#3a2c30');
    p.r(28, H - 18, 9, 6, '#3a2c30'); p.r(39, H - 18, 9, 6, '#3a2c30');
    p.r(W - 16, 40, 3, 58, '#1a1418');
    p.r(W - 20, 64, 11, 6, '#e8e0d8'); p.r(W - 20, 64, 11, 1, '#ffffff');
    for (let i = 0; i < 9; i++) p.r(W - 10, 42 + i * 7, 3, 1, '#3a2c30');
    // tonearm base plate
    p.circle(W - 34, 26, 12, '#7a6a6c'); p.circle(W - 34, 26, 10, '#b8a8aa');
  }) });
  g.add(box(w, 0.08, d, mats6({ pz: plinthFront, py: plate }, plinthSide), x, DESK_Y + 0.04, z));
  for (const [fx, fz] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]] as const) g.add(cyl(0.025, 0.028, 0.015, lit({ color: '#1a1418' }), x + fx, DESK_Y + 0.004, z + fz, 12));

  // record with grooves, sheen band and a label
  const rec = new Pix(144, 144);
  const c = 72;
  rec.circle(c, c, 71, '#141014');
  for (let r = 24; r < 70; r++) if (r % 2 === 0) rec.ring(c, c, r, r % 6 === 0 ? '#2a2228' : '#1e181c');
  for (const r of [40, 55]) rec.ring(c, c, r, '#0a080a');
  for (let r = 26; r < 70; r++) for (let a = -20; a < 20; a += 1) rec.p(Math.round(c + Math.cos(((a - 45) * Math.PI) / 180) * r), Math.round(c + Math.sin(((a - 45) * Math.PI) / 180) * r), r % 3 ? '#3a3238' : '#4a4048');
  rec.circle(c, c, 22, '#ff7a2e');
  rec.circle(c, c, 21, '#e8622c');
  rec.text('SIDE A', c - 11, c - 12, '#fff0e0');
  rec.r(c - 14, c + 6, 28, 1, '#fff0e0');
  rec.text('33', c - 4, c + 9, '#fff0e0');
  rec.circle(c, c, 2, '#141014');
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 48), [lit({ color: '#b8b0b4', hover, gloss: 0.8 }), lit({ map: pixelTexture(rec.canvas), gloss: 0.6, hover }), lit({ color: '#1a1418', hover })]);
  platter.position.set(x - 0.04, DESK_Y + 0.095, z);
  g.add(platter);
  g.add(cyl(0.004, 0.004, 0.02, lit({ color: '#e8e0d8' }), x - 0.04, DESK_Y + 0.105, z, 6));

  // tonearm: pivot, arm tube, counterweight, headshell resting on the record
  const arm = lit({ color: '#d8d4dc', hover, gloss: 0.6 });
  const pivotX = x + 0.17, pivotZ = z - 0.1;
  g.add(cyl(0.025, 0.03, 0.03, arm, pivotX, DESK_Y + 0.1, pivotZ, 16));
  const tonearm = new THREE.Group();
  tonearm.position.set(pivotX, DESK_Y + 0.118, pivotZ);
  tonearm.rotation.y = 0.42;
  g.add(tonearm);
  const tube = cyl(0.005, 0.005, 0.25, arm, 0, 0, 0.09, 8);
  tube.rotation.x = Math.PI / 2;
  tonearm.add(tube);
  const cw = cyl(0.018, 0.018, 0.035, lit({ color: '#2a2428', gloss: 0.5 }), 0, 0, -0.06, 14);
  cw.rotation.x = Math.PI / 2;
  tonearm.add(cw);
  const shell = box(0.022, 0.008, 0.035, lit({ color: '#1a1418' }), 0.004, -0.004, 0.22);
  shell.rotation.y = -0.35;
  tonearm.add(shell);
  // arm rest
  g.add(cyl(0.004, 0.004, 0.03, arm, pivotX - 0.03, DESK_Y + 0.1, pivotZ + 0.16, 6));
  return { group: g, platter };
}

// ---------------------------------------------------------------- speaker + stack
export function buildAudioStack() {
  const g = new THREE.Group();
  const veneer = lit({ map: surf(0.2, 0.31, (p, W, H) => {
    p.r(0, 0, W, H, '#6a3a26');
    const R = rng(7);
    for (let x = 0; x < W; x++) if (R() < 0.35) p.r(x, 0, 1, H, R() < 0.5 ? '#5a3020' : '#7a4630');
    p.r(0, 0, W, 1, '#8a5a3a');
  }) });
  const baffle = lit({ map: surf(0.19, 0.31, (p, W, H) => {
    p.r(0, 0, W, H, '#1e1a1c');
    p.r(0, 0, W, 2, '#3a3234');
    // tweeter
    p.circle(W / 2, 18, 10, '#141012');
    p.sphere(W / 2, 18, 6, 6, ['#2a2426', '#5a5256', '#a8a0a4', '#e8e0e4']);
    // woofer: surround, cone, dust cap
    const wy = 60;
    p.circle(W / 2, wy, 25, '#0e0c0d');
    p.circle(W / 2, wy, 23, '#2a2426');
    p.sphere(W / 2, wy, 20, 20, ['#141012', '#1e1a1c', '#2e282a', '#3e3638', '#4e4648'], 0.3, 0.4);
    p.sphere(W / 2, wy, 6, 6, ['#1a1618', '#3a3436', '#6a6266', '#9a9296']);
    // bass port + badge
    p.r(W / 2 - 14, H - 12, 28, 5, '#070606'); p.r(W / 2 - 14, H - 12, 28, 1, '#2a2426');
    p.text('HI-FI', W / 2 - 9, 32, '#8a8286');
  }) });
  g.add(box(0.19, 0.31, 0.2, mats6({ pz: baffle, px: veneer, nx: veneer, py: veneer }, veneer), 0.4, DESK_Y + 0.155, WALL_Z + 0.2));

  const cab = lit({ color: '#2a2226' });
  const stackX = 0.76;
  const units: THREE.Mesh[] = [];
  const unit = (y: number, draw: (p: Pix, W: number, H: number) => void) => {
    const face = lit({ map: surf(0.42, 0.085, draw) });
    const m = box(0.42, 0.083, 0.28, mats6({ pz: face }, cab), stackX, y, WALL_Z + 0.18);
    g.add(m);
    units.push(m);
  };
  // amp/tuner
  unit(DESK_Y + 0.043, (p, W, H) => {
    p.grad(0, 0, W, H, ['#3a3236', '#2e282c']);
    p.r(0, 0, W, 1, '#5a4e54');
    p.r(6, 5, 60, 12, '#140e0a'); p.r(7, 6, 58, 10, '#3a2410');
    for (let i = 0; i < 12; i++) p.r(9 + i * 5, 8, 1, i % 3 ? 2 : 4, '#ffb050');
    p.r(38, 6, 1, 10, '#ff5a2a');
    p.text('FM 98.7', 9, 19, '#b8a8ac');
    for (let i = 0; i < 3; i++) p.sphere(84 + i * 14, 12, 5, 5, ['#141012', '#3a3438', '#8a8488', '#d8d2d4']);
    p.sphere(W - 12, 12, 7, 7, ['#141012', '#3a3438', '#8a8488', '#d8d2d4']);
  });
  // cassette deck
  unit(DESK_Y + 0.13, (p, W, H) => {
    p.grad(0, 0, W, H, ['#3e3438', '#302a2e']);
    p.r(0, 0, W, 1, '#5a4e54');
    for (const cx of [8, 50]) {
      p.r(cx, 4, 36, 16, '#141012');
      p.r(cx + 2, 6, 32, 12, '#2a2024');
      p.r(cx + 6, 9, 24, 6, '#e8dcc8');
      p.r(cx + 6, 9, 24, 2, '#ff7a2e');
      p.circle(cx + 12, 13, 2, '#3a2a22'); p.circle(cx + 24, 13, 2, '#3a2a22');
    }
    for (let i = 0; i < 6; i++) { p.r(94 + i * 5, 14, 4, 5, '#8a8488'); p.r(94 + i * 5, 14, 4, 1, '#c8c2c4'); }
    p.r(94, 5, 28, 5, '#101010');
  });
  // CD / VU meters
  unit(DESK_Y + 0.217, (p, W, H) => {
    p.grad(0, 0, W, H, ['#342e32', '#282226']);
    p.r(0, 0, W, 1, '#5a4e54');
    p.r(6, 9, 56, 3, '#141012');
    p.r(70, 4, 20, 14, '#140e0a'); p.r(94, 4, 20, 14, '#140e0a');
    p.sphere(W - 8, 12, 4, 4, ['#141012', '#6a6468', '#c8c2c4']);
  });
  // glowing displays as emissive quads on the units
  const glow = (w: number, h: number, x: number, y: number, c: string, i = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), emissive({ color: c, intensity: i }));
    m.position.set(stackX - 0.21 + x, y, WALL_Z + 0.18 + 0.141);
    g.add(m);
    return m;
  };
  const tunerGlow = glow(0.19, 0.03, 0.12, DESK_Y + 0.059, '#ff9a3a', 0.35);
  const vuL = glow(0.06, 0.04, 0.265, DESK_Y + 0.221, '#ffb04a', 0.5);
  const vuR = glow(0.06, 0.04, 0.345, DESK_Y + 0.221, '#ffb04a', 0.5);
  const counter = glow(0.09, 0.015, 0.36, DESK_Y + 0.155, '#62ff9a', 0.6);

  // stacked cassettes on top
  const R = rng(5);
  for (let i = 0; i < 5; i++) {
    const c = ['#e8c35a', '#e6ddc8', '#c9483a', '#3fa89a', '#e07a4f'][i];
    const cas = box(0.11, 0.017, 0.07, mats6({ pz: lit({ map: surf(0.11, 0.017, (p, W, H) => { p.r(0, 0, W, H, c); p.r(2, 1, W - 4, 1, '#ffffff'); p.r(0, H - 1, W, 1, '#00000055'); }, 2) }) }, lit({ color: c })), stackX - 0.06 + (R() - 0.5) * 0.02, DESK_Y + 0.268 + i * 0.018, WALL_Z + 0.16);
    cas.rotation.y = (R() - 0.5) * 0.3;
    g.add(cas);
  }
  return { group: g, meters: [vuL, vuR], tunerGlow, counter, units };
}

// ---------------------------------------------------------------- lamp
export function buildLamp(hover: Hover) {
  const g = new THREE.Group();
  const metal = lit({ color: '#e6d8c0', hover, gloss: 0.5 });
  const joint = lit({ color: '#8a7a6a', hover });
  const spring = lit({ color: '#b8a888', hover, gloss: 0.4 });
  const baseX = 1.2, baseZ = WALL_Z + 0.3;
  g.add(cyl(0.08, 0.095, 0.03, metal, baseX, DESK_Y + 0.015, baseZ, 24));
  g.add(cyl(0.03, 0.04, 0.03, joint, baseX, DESK_Y + 0.04, baseZ, 12));
  g.add(box(0.012, 0.006, 0.02, lit({ color: '#1a1a1a' }), baseX + 0.06, DESK_Y + 0.032, baseZ + 0.04));

  const armPair = (len: number) => {
    const grp = new THREE.Group();
    grp.add(box(0.014, len, 0.014, metal, -0.008, len / 2, 0));
    grp.add(box(0.014, len, 0.014, metal, 0.008, len / 2, 0));
    // coil spring alongside the arm
    for (let i = 0; i < 18; i++) grp.add(box(0.01, 0.004, 0.01, spring, 0.026, len * 0.2 + i * 0.012, 0));
    grp.add(box(0.003, len * 0.25, 0.003, spring, 0.026, len * 0.1, 0));
    return grp;
  };
  const lower = new THREE.Group();
  lower.position.set(baseX, DESK_Y + 0.05, baseZ);
  lower.rotation.z = 0.35;
  const armL = 0.55;
  lower.add(armPair(armL));
  g.add(lower);
  const elbow = new THREE.Group();
  elbow.position.set(0, armL, 0);
  lower.add(elbow);
  const knuckle = cyl(0.02, 0.02, 0.04, joint, 0, 0, 0, 12);
  knuckle.rotation.x = Math.PI / 2;
  elbow.add(knuckle);
  const upper = new THREE.Group();
  upper.rotation.z = 1.25;
  elbow.add(upper);
  const armU = 0.42;
  upper.add(armPair(armU));
  const head = new THREE.Group();
  head.position.set(0, armU, 0);
  upper.add(head);
  const k2 = cyl(0.018, 0.018, 0.036, joint, 0, 0, 0, 12);
  k2.rotation.x = Math.PI / 2;
  head.add(k2);
  const shadeHolder = new THREE.Group();
  shadeHolder.rotation.z = -1.98;
  head.add(shadeHolder);
  const shadeMat = lit({ color: '#efe4d0', hover, side: THREE.DoubleSide, gloss: 0.3 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.14, 0.16, 32, 1, true), shadeMat);
  shade.position.set(0, -0.09, 0);
  shadeHolder.add(shade);
  shadeHolder.add(cyl(0.05, 0.05, 0.04, metal, 0, 0.0, 0, 16));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.006, 6, 36), metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, -0.17, 0);
  shadeHolder.add(rim);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), emissive({ color: '#fff2c8', intensity: 1.3 }));
  bulb.position.set(0, -0.14, 0);
  shadeHolder.add(bulb);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.135, 32), emissive({ color: '#ffdca0', intensity: 1 }));
  inner.rotation.x = Math.PI / 2;
  inner.position.set(0, -0.165, 0);
  shadeHolder.add(inner);
  return { group: g, upper, head, shadeHolder, bulb, inner };
}

// ---------------------------------------------------------------- plants
function leafTex(variegated: boolean) {
  const g = new Pix(12, 48);
  g.grad(0, 0, 12, 48, ['#2f7a3a', '#3f8a44', '#4f9a4a', '#5aa850']);
  g.r(0, 0, 1, 48, '#245c2e'); g.r(11, 0, 1, 48, '#245c2e');
  if (variegated) { g.r(4, 0, 4, 48, '#f0eec8'); g.r(3, 0, 1, 48, '#9ac27a'); g.r(8, 0, 1, 48, '#9ac27a'); }
  else g.r(5, 0, 2, 48, '#7abe62');
  return pixelTexture(g.canvas);
}

function potTex(c: string, band: string) {
  return pixelTexture((() => {
    const g = new Pix(64, 32);
    g.grad(0, 0, 64, 32, [c, c, band]);
    g.r(0, 0, 64, 5, band);
    g.r(0, 5, 64, 1, '#00000033');
    g.grain(0.1, 4);
    return g.canvas;
  })());
}

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
  const pot = lit({ map: potTex('#b86a4a', '#d88a62') });
  g.add(cyl(0.13, 0.1, 0.13, pot, potX, potY, potZ, 20));
  g.add(cyl(0.12, 0.12, 0.01, lit({ color: '#3a2420' }), potX, potY + 0.062, potZ, 20));
  // macrame hanger: cords with knots
  const cord = lit({ color: '#e8dcc0' });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const c = box(0.005, 0.9, 0.005, cord, potX + Math.cos(a) * 0.1, potY + 0.5, potZ + Math.sin(a) * 0.1);
    c.rotation.z = -Math.cos(a) * 0.12; c.rotation.x = Math.sin(a) * 0.12;
    g.add(c);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), cord).translateX(potX + Math.cos(a) * 0.12).translateY(potY + 0.02).translateZ(potZ + Math.sin(a) * 0.12));
  }
  const mats = [
    lit({ map: leafTex(true), side: THREE.DoubleSide, wind: 0.02, windAnchor: potY + 0.05 }),
    lit({ map: leafTex(false), side: THREE.DoubleSide, wind: 0.02, windAnchor: potY + 0.05 }),
  ];
  const R = rng(12);
  for (let i = 0; i < 84; i++) {
    const a = R() * Math.PI * 2;
    const out = 0.7 + R() * 0.8;
    const dir = new THREE.Vector3(Math.cos(a) * out, 0.8 + R() * 0.5, Math.sin(a) * out * 0.8).normalize();
    const geo = ribbon(0.22 + R() * 0.26, 0.036 + R() * 0.014, dir, 0.55 + R() * 1.1, 12);
    const phase = new Float32Array(geo.attributes.position.count).fill(R() * 6.28);
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const m = new THREE.Mesh(geo, mats[i % 3 === 0 ? 1 : 0]);
    m.position.set(potX + Math.cos(a) * 0.05, potY + 0.06, potZ + Math.sin(a) * 0.05);
    g.add(m);
  }
  for (const [dx, len] of [[-0.18, 0.55], [0.22, 0.72]] as const) {
    g.add(box(0.004, len, 0.004, lit({ color: '#b8c890' }), potX + dx, potY - len / 2, potZ + 0.08));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const geo = ribbon(0.09, 0.016, new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a)).normalize(), 1.2, 5);
      const m = new THREE.Mesh(geo, mats[0]);
      m.position.set(potX + dx, potY - len, potZ + 0.08);
      g.add(m);
    }
  }
  return { group: g, mats, center: new THREE.Vector3(potX, potY - 0.2, potZ) };
}

// Oval leaf with UVs for a veined texture.
function ovalLeaf(len: number, w: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w, len * 0.2, w * 0.9, len * 0.75, 0, len);
  s.bezierCurveTo(-w * 0.9, len * 0.75, -w, len * 0.2, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 8);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * w) + 0.5, pos.getY(i) / len);
  return geo;
}

function rubberLeafTex(shade: number) {
  const g = new Pix(24, 48);
  const ramp = shade ? ['#163a24', '#1f4a30', '#2a5e3a', '#3a7048'] : ['#123020', '#1a4028', '#245236', '#326442'];
  g.grad(0, 0, 24, 48, [ramp[3], ramp[2], ramp[1], ramp[0]]);
  g.r(0, 0, 8, 48, ramp[1]);
  g.r(11, 0, 2, 48, '#8a3a3a');
  g.r(12, 0, 1, 48, '#c86a5a');
  for (let y = 6; y < 44; y += 5) { g.line(12, y, 3, y - 4, ramp[3]); g.line(12, y, 21, y - 4, ramp[0]); }
  g.dens(14, 4, 6, 30, '#9ac8a0', 0.25);
  return pixelTexture(g.canvas);
}

export function buildRubberPlant() {
  const g = new THREE.Group();
  const x = -0.37, z = WALL_Z + 0.3;
  g.add(cyl(0.09, 0.07, 0.15, lit({ map: potTex('#d8c0a0', '#e8d4b8') }), x, DESK_Y + 0.075, z, 20));
  g.add(cyl(0.085, 0.085, 0.01, lit({ color: '#3a2420' }), x, DESK_Y + 0.15, z, 20));
  const stem = lit({ color: '#5a3a2a' });
  const s1 = box(0.016, 0.62, 0.016, stem, x, DESK_Y + 0.46, z);
  s1.rotation.z = 0.06;
  g.add(s1);
  const s2 = box(0.012, 0.36, 0.012, stem, x - 0.04, DESK_Y + 0.33, z + 0.02);
  s2.rotation.z = 0.3;
  g.add(s2);
  const leafMats = [0, 1].map((k) => lit({ map: rubberLeafTex(k), side: THREE.DoubleSide, wind: 0.012, windAnchor: DESK_Y + 0.15, gloss: 0.9 }));
  const R = rng(21);
  for (let i = 0; i < 17; i++) {
    const branch = i > 12;
    const y = branch ? DESK_Y + 0.36 + (i - 13) * 0.05 : DESK_Y + 0.2 + i * 0.045;
    const a = i * 2.4 + R() * 0.5;
    const geo = ovalLeaf(0.19 + R() * 0.07, 0.075 + R() * 0.02);
    const phase = new Float32Array(geo.attributes.position.count).fill(R() * 6.28);
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const leaf = new THREE.Mesh(geo, leafMats[i % 2]);
    leaf.position.set(x + (branch ? -0.1 : 0) + Math.cos(a) * 0.02, y, z + Math.sin(a) * 0.02);
    leaf.rotation.set(0, a, 0);
    leaf.rotateX(0.9 + R() * 0.4);
    g.add(leaf);
  }
  // new leaf sheath at the top
  g.add(box(0.008, 0.05, 0.008, lit({ color: '#c8584a' }), x + 0.02, DESK_Y + 0.8, z));
  return { group: g, mats: leafMats, center: new THREE.Vector3(x, DESK_Y + 0.4, z) };
}

// ---------------------------------------------------------------- camera + small stuff
function cameraFront(flash: boolean) {
  const g = new Pix(80, 48);
  g.grad(0, 0, 80, 48, ['#eef0f4', '#d4d8e0', '#b4b8c4', '#9a9eaa']);
  g.r(0, 0, 80, 1, '#ffffff');
  g.r(0, 46, 80, 2, '#7a7e8a');
  // grip with texture
  g.r(0, 4, 10, 40, '#a4a8b4');
  for (let y = 6; y < 42; y += 3) g.r(2, y, 6, 1, '#8a8e9a');
  // flash window
  g.r(50, 6, 24, 10, '#7a7e8a');
  g.r(51, 7, 22, 8, flash ? '#ffffff' : '#e4eaf2');
  if (!flash) { for (let x = 52; x < 72; x += 3) g.r(x, 8, 1, 6, '#c8d0dc'); g.p(53, 8, '#ffffff'); }
  // viewfinder, AF lamp, mic holes
  g.r(38, 8, 7, 5, '#22242c'); g.r(39, 9, 3, 2, '#5e7aa0');
  g.circle(46, 22, 2, flash ? '#ff9a4a' : '#c9483a');
  for (let i = 0; i < 4; i++) g.p(70 + (i % 2) * 2, 22 + Math.floor(i / 2) * 2, '#5a5e6a');
  g.text('CYBERSNAP', 50, 36, '#6a6e7a');
  g.r(50, 42, 24, 1, '#c9483a');
  return g.canvas;
}

export function buildCamera(hover: Hover) {
  const g = new THREE.Group();
  const silver = lit({ color: '#c4c8d2', hover, gloss: 0.6 });
  const frontTex = pixelTexture(cameraFront(false));
  const flashTex = pixelTexture(cameraFront(true));
  const front = lit({ map: frontTex, hover, gloss: 0.3 });
  const topTex = lit({ hover, map: surf(0.13, 0.04, (p, W, H) => {
    p.r(0, 0, W, H, '#c4c8d2');
    p.r(W - 16, 2, 10, 6, '#8a8e9a'); p.r(W - 15, 2, 8, 4, '#e8483b');
    p.r(W - 30, 3, 8, 3, '#6a6e7a');
    p.r(6, 3, 6, 3, '#6a6e7a');
  }, 2) });
  const body = box(0.13, 0.08, 0.04, mats6({ pz: front, py: topTex }, silver), 0, 0.04, 0);
  g.add(body);
  // lens barrel (extended), glass and ring
  const barrel = cyl(0.028, 0.03, 0.02, silver, -0.016, 0.042, 0.03, 24);
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  const barrel2 = cyl(0.022, 0.024, 0.016, lit({ color: '#6a6e7a', hover, gloss: 0.5 }), -0.016, 0.042, 0.046, 24);
  barrel2.rotation.x = Math.PI / 2;
  g.add(barrel2);
  const glassT = new Pix(24, 24);
  glassT.circle(12, 12, 11, '#141620');
  glassT.circle(12, 12, 8, '#1e2a44');
  glassT.circle(12, 12, 4, '#0a0c14');
  glassT.r(7, 6, 4, 2, '#9fb7e0'); glassT.p(14, 16, '#4a5f86');
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.019, 24), lit({ map: pixelTexture(glassT.canvas), hover, gloss: 1 }));
  glass.position.set(-0.016, 0.042, 0.0545);
  g.add(glass);
  g.position.set(0.55, DESK_Y, WALL_Z + 0.76);
  g.rotation.y = -0.28;
  const strap = box(0.012, 0.004, 0.14, lit({ color: '#1a1a22' }), 0.08, 0.002, 0.06);
  strap.rotation.y = 0.5;
  g.add(strap);
  const setFlash = (on: boolean) => { front.uniforms.uMap.value = on ? flashTex : frontTex; };
  return { group: g, body, setFlash };
}

export function buildDeskClutter() {
  const g = new THREE.Group();
  // notebook: dark cover with an open lined page
  g.add(box(0.22, 0.016, 0.28, lit({ color: '#2a2a3a' }), 0.34, DESK_Y + 0.008, WALL_Z + 0.62));
  const page = lit({ map: surf(0.2, 0.26, (p, W, H) => {
    p.r(0, 0, W, H, '#f0e6d2');
    for (let y = 10; y < H; y += 6) p.r(3, y, W - 6, 1, '#b8c8e0');
    p.r(10, 0, 1, H, '#e8a0a0');
    const R = rng(4);
    for (let y = 16; y < H - 10; y += 6) p.r(14, y - 2, Math.floor(10 + R() * (W - 30)), 1, '#2a3a78');
    p.r(W - 30, 30, 20, 12, '#2a3a78'); p.r(W - 29, 31, 18, 10, '#f0e6d2'); p.line(W - 29, 40, W - 12, 32, '#e8483b');
  }) });
  const nb = box(0.2, 0.012, 0.26, mats6({ py: page }, lit({ color: '#e8dcc8' })), 0.36, DESK_Y + 0.022, WALL_Z + 0.6);
  nb.rotation.y = 0.12;
  g.add(nb);
  const pencil = box(0.006, 0.006, 0.16, lit({ color: '#f2b73a' }), 0.44, DESK_Y + 0.031, WALL_Z + 0.6);
  pencil.rotation.y = 0.5;
  g.add(pencil);
  // mug of pens next to the MPC, with a handle
  const mug = cyl(0.04, 0.038, 0.1, lit({ map: potTex('#e8e0d4', '#ff7a2e') }), -0.36, DESK_Y + 0.05, WALL_Z + 0.62, 18);
  g.add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), lit({ color: '#e8e0d4' }));
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(-0.32, DESK_Y + 0.05, WALL_Z + 0.62);
  g.add(handle);
  const R = rng(3);
  for (let i = 0; i < 6; i++) {
    const pen = box(0.007, 0.16, 0.007, lit({ color: ['#e8483b', '#3a6ea5', '#1a1a1a', '#e8c35a', '#3fa89a', '#ff7a2e'][i] }), -0.36 + (R() - 0.5) * 0.04, DESK_Y + 0.13, WALL_Z + 0.62 + (R() - 0.5) * 0.04);
    pen.rotation.z = (R() - 0.5) * 0.4;
    g.add(pen);
  }
  // records leaning at the far left, with sleeve art
  for (let i = 0; i < 4; i++) {
    const c = ['#e8c35a', '#1a1216', '#c9483a', '#e6ddc8'][i];
    const sleeve = lit({ map: surf(0.3, 0.3, (p, W, H) => {
      p.r(0, 0, W, H, c);
      const k = ['#1a1216', '#e8c35a', '#f0e6d2', '#c9483a'][i];
      if (i % 2) p.circle(W / 2, H / 2, W / 3, k); else for (let y = 8; y < H; y += 12) p.r(6, y, W - 12, 5, k);
      p.grain(0.08, i);
    }, 0.5) });
    g.add(box(0.3, 0.3, 0.012, mats6({ pz: sleeve }, lit({ color: c })), -1.62, DESK_Y + 0.15, WALL_Z + 0.08 + i * 0.015));
  }
  // cables snaking behind the gear
  const cable = (pts: number[][], col: string) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([a, b, c]) => new THREE.Vector3(a, b, c))), 40, 0.004, 5), lit({ color: col })));
  cable([[-0.5, DESK_Y + 0.004, WALL_Z + 0.4], [-0.3, DESK_Y + 0.004, WALL_Z + 0.2], [-0.1, DESK_Y + 0.004, WALL_Z + 0.08], [0.2, DESK_Y + 0.004, WALL_Z + 0.06]], '#1a1418');
  cable([[0.55, DESK_Y + 0.004, WALL_Z + 0.08], [0.9, DESK_Y + 0.004, WALL_Z + 0.04], [1.2, DESK_Y + 0.004, WALL_Z + 0.2]], '#2a2226');
  return { group: g };
}
