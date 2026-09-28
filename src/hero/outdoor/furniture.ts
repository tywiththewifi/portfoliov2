import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { lit, pixelTexture } from '../materials';
import { DESK_Y, WALL_Z, spineTex, woodTex } from '../room';
import { Pix } from '../../art/pix';
import { rng } from '../../art/posters';

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function cyl(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}
function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  m.position.set(x, y, z);
  return m;
}

// ---------------------------------------------------------------- table
// The same desk top the props were laid out on, now a freestanding
// folding table on thin metal legs (like the reference photo).
export function buildTable(o: { top: string; edge: string; legs: string }) {
  const g = new THREE.Group();
  const cx = -0.15, cz = WALL_Z + 0.475, W = 3.4, D = 0.95;
  const top = lit({ map: (() => {
    const p = new Pix(96, 32);
    p.r(0, 0, 96, 32, o.top);
    const R = rng(4);
    for (let i = 0; i < 90; i++) p.p(Math.floor(R() * 96), Math.floor(R() * 32), o.edge); // scuffs
    for (let i = 0; i < 3; i++) p.ellipse(10 + Math.floor(R() * 76), 6 + Math.floor(R() * 20), 3, 1, o.edge); // cup rings
    return pixelTexture(p.canvas);
  })() });
  g.add(box(W, 0.045, D, [lit({ color: o.edge }), lit({ color: o.edge }), top, lit({ color: o.edge }), lit({ color: o.edge }), lit({ color: o.edge })], cx, DESK_Y - 0.0225, cz));
  const leg = lit({ color: o.legs, gloss: 0.5 });
  const lh = DESK_Y - 0.045;
  for (const x of [cx - W / 2 + 0.06, cx + W / 2 - 0.06]) for (const z of [cz - D / 2 + 0.06, cz + D / 2 - 0.06]) g.add(box(0.035, lh, 0.035, leg, x, lh / 2, z));
  // aprons and a cross brace under the top
  g.add(box(W - 0.1, 0.05, 0.02, leg, cx, DESK_Y - 0.07, cz + D / 2 - 0.06));
  g.add(box(W - 0.1, 0.05, 0.02, leg, cx, DESK_Y - 0.07, cz - D / 2 + 0.06));
  g.add(box(W - 0.1, 0.025, 0.025, leg, cx, 0.18, cz - D / 2 + 0.06));
  return g;
}

// ---------------------------------------------------------------- office chair
// Black leather swivel chair: star base on casters, gas lift, stitched seat
// and back with a headrest. Built facing +z at the origin.
export function buildChair() {
  const g = new THREE.Group();
  const leatherTex = (() => {
    const p = new Pix(32, 32);
    p.r(0, 0, 32, 32, '#2c2930');
    for (const x of [8, 16, 24]) for (let y = 0; y < 32; y += 2) p.p(x, y, '#151317'); // stitch lines
    for (let i = 0; i < 40; i++) p.p((i * 13) % 32, (i * 7) % 32, '#34303a'); // sheen
    return pixelTexture(p.canvas);
  })();
  const leather = lit({ map: leatherTex, gloss: 0.9 });
  const plastic = lit({ color: '#1a181b', gloss: 0.4 });
  const chrome = lit({ color: '#b8bcc6', gloss: 1 });
  // five-star base with casters
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = box(0.3, 0.035, 0.05, plastic, Math.cos(a) * 0.15, 0.085, Math.sin(a) * 0.15);
    arm.rotation.y = -a;
    arm.rotation.z = 0.06;
    g.add(arm);
    const wheel = cyl(0.026, 0.03, plastic, Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29, 10);
    wheel.rotation.x = Math.PI / 2;
    wheel.rotation.z = a;
    g.add(wheel);
  }
  g.add(cyl(0.045, 0.06, plastic, 0, 0.1, 0));
  g.add(cyl(0.022, 0.3, chrome, 0, 0.26, 0));
  g.add(cyl(0.036, 0.12, plastic, 0, 0.18, 0));
  g.add(box(0.22, 0.04, 0.22, plastic, 0, 0.41, 0));
  // seat, back, headrest
  g.add(rbox(0.54, 0.1, 0.52, 0.045, leather, 0, 0.47, 0.01));
  const back = rbox(0.5, 0.68, 0.1, 0.045, leather, 0, 0.9, -0.26);
  back.rotation.x = -0.14;
  g.add(back);
  const head = rbox(0.34, 0.15, 0.09, 0.04, leather, 0, 1.32, -0.33);
  head.rotation.x = -0.14;
  g.add(head);
  g.add(box(0.06, 0.34, 0.03, plastic, 0, 0.62, -0.25)); // spine bracket
  // armrests
  for (const s of [-1, 1]) {
    g.add(box(0.035, 0.2, 0.04, plastic, s * 0.29, 0.6, 0.02));
    g.add(rbox(0.07, 0.035, 0.3, 0.015, plastic, s * 0.29, 0.71, 0.04));
  }
  return g;
}

// ---------------------------------------------------------------- bookcase
// A freestanding open bookcase (the bookshelf hotspot), two rows of books.
export function buildBookcase(hover: { value: number }, at: THREE.Vector3) {
  const g = new THREE.Group();
  const W = 0.8, H = 1.12, D = 0.3, T = 0.03;
  const wood = lit({ hover, map: woodTex(1) });
  g.add(box(T, H, D, wood, -W / 2 + T / 2, H / 2, 0));
  g.add(box(T, H, D, wood, W / 2 - T / 2, H / 2, 0));
  for (const y of [0.06, 0.55, H - T / 2]) g.add(box(W, T, D, wood, 0, y, 0));
  g.add(box(W, H, 0.012, lit({ hover, color: '#5a2e2a' }), 0, H / 2, -D / 2 + 0.006)); // back panel
  const books: THREE.Mesh[] = [];
  const cols = ['#c9483a', '#3a6ea5', '#e8c35a', '#2f6b4f', '#e6ddc8', '#b0506a', '#1f3a5a', '#e07a4f', '#d8b890', '#3fa89a', '#8a2a2a'];
  const R = rng(41);
  for (const shelfY of [0.06 + T / 2, 0.55 + T / 2]) {
    let x = -W / 2 + T + 0.01;
    while (x < W / 2 - T - 0.06) {
      const bw = 0.026 + R() * 0.03, bh = 0.2 + R() * 0.14;
      if (shelfY > 0.3 && bh > 0.3) continue;
      const c = cols[Math.floor(R() * cols.length)];
      const spine = lit({ hover, map: spineTex(c, Math.floor(R() * 1e6), bw, bh) });
      const cover = lit({ hover, color: c }), pages = lit({ hover, color: '#efe6d4' });
      const b = box(bw, bh, 0.2, [cover, cover, pages, pages, spine, spine], x + bw / 2, shelfY + bh / 2, 0.02);
      if (R() < 0.08) { b.rotation.z = -0.2; b.position.x += 0.02; x += 0.03; }
      b.userData.baseY = b.position.y;
      books.push(b);
      g.add(b);
      x += bw + 0.003;
    }
  }
  g.position.copy(at);
  return { group: g, books, top: new THREE.Vector3(at.x, at.y + H, at.z) };
}

// ---------------------------------------------------------------- garden hook
// Wrought-iron shepherd's hook for the hanging spider plant.
export function buildHook(ground: THREE.Vector3, hangAt: THREE.Vector3) {
  const iron = lit({ color: '#1e1c1e', gloss: 0.3 });
  const top = new THREE.Vector3(ground.x, hangAt.y + 0.08, ground.z);
  const curve = new THREE.CatmullRomCurve3([
    ground.clone(), new THREE.Vector3(ground.x, top.y - 0.25, ground.z), top,
    new THREE.Vector3((top.x + hangAt.x) / 2, top.y + 0.1, ground.z), new THREE.Vector3(hangAt.x + 0.06, top.y + 0.04, hangAt.z),
    new THREE.Vector3(hangAt.x, hangAt.y, hangAt.z),
  ]);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 6, false), iron));
  // little scroll at the foot bar
  g.add(box(0.14, 0.012, 0.012, iron, ground.x, ground.y + 0.12, ground.z));
  return g;
}

// ---------------------------------------------------------------- posters
// A hung print: the art on a paper mat, with a strip of tape. Built facing
// +z, centred, `w` metres wide.
export function posterMesh(src: CanvasImageSource & { width: number; height: number }, w: number, o: { mat?: boolean; tape?: boolean } = {}) {
  const c = document.createElement('canvas');
  const iw = (src as HTMLImageElement).naturalWidth || src.width, ih = (src as HTMLImageElement).naturalHeight || src.height;
  c.width = iw; c.height = ih;
  c.getContext('2d')!.drawImage(src, 0, 0);
  const h = (w * ih) / iw;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit({ map: pixelTexture(c) })));
  const m = o.mat === false ? 0.004 : 0.018;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w + m * 2, h + m * 2), lit({ color: '#efe6d6', side: THREE.DoubleSide }));
  back.position.z = -0.004;
  g.add(back);
  if (o.tape !== false) {
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.022), lit({ color: '#e8dcc0' }));
    tape.position.set(0, h / 2 + m * 0.3, 0.002);
    tape.rotation.z = 0.08;
    g.add(tape);
  }
  g.userData.h = h + m * 2;
  return g;
}
