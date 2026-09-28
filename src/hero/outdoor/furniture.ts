import * as THREE from 'three';
import { lit, pixelTexture } from '../materials';
import { Kit, box as kbox, cyl as kcyl, lathe, rbox as krbox, tube } from '../desk/kit';
import { DESK_Y, WALL_Z, spineTex, woodTex } from '../room';
import { rng } from '../../art/posters';

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
// ---------------------------------------------------------------- table
// A compact folding table, as in the reference photo: a laminate top on a
// thicker moulded edge, steel aprons and a centre rail underneath, and
// round tube legs with hinge brackets, fold-out braces, a stretcher per
// leg pair and rubber feet. Spans x0..x1 against the back line at WALL_Z.
export function buildTable(o: { top: string; edge: string; legs: string; x0?: number; x1?: number; depth?: number }) {
  const g = new THREE.Group();
  const x0 = o.x0 ?? -0.78, x1 = o.x1 ?? 0.78, D = o.depth ?? 0.76;
  const cx = (x0 + x1) / 2, cz = WALL_Z + D / 2, W = x1 - x0;
  const k = new Kit({
    top: lit({ color: o.top, vcol: true, rough: 0.46, grain: 0.05, grainScale: [90, 90, 90] }),
    edge: lit({ color: o.edge, vcol: true, rough: 0.55, grain: 0.04, grainScale: [300, 300, 300] }),
    steel: lit({ color: o.legs, vcol: true, rough: 0.34, metal: 0.8, grain: 0.06, grainScale: [400, 400, 400] }),
    rubber: lit({ color: '#1c1b1a', vcol: true, rough: 0.9 }),
    stain: lit({ color: o.edge, vcol: true, rough: 0.5 }),
  }, 3);
  // top: a thin laminate sheet on a thicker moulded core with a soft edge
  k.add('edge', krbox(W, 0.034, D, 0.012, 3), { x: cx, y: DESK_Y - 0.017, z: cz });
  k.add('top', krbox(W - 0.014, 0.004, D - 0.014, 0.0018, 1), { x: cx, y: DESK_Y - 0.0015, z: cz, wear: 0 });
  // a faded coffee ring on the laminate
  k.add('stain', new THREE.RingGeometry(0.033, 0.037, 40), { x: cx + W * 0.36, y: DESK_Y + 0.0006, z: cz + 0.16, rx: -Math.PI / 2, tint: 1.06, jitter: 0 });
  k.add('stain', new THREE.RingGeometry(0.031, 0.033, 40, 1, 0.4, 4.2), { x: cx + W * 0.36 + 0.012, y: DESK_Y + 0.0006, z: cz + 0.152, rx: -Math.PI / 2, tint: 1.08, jitter: 0 });
  // under-frame: C-channel aprons all round and a centre rail
  const uy = DESK_Y - 0.034 - 0.02;
  for (const s of [-1, 1]) {
    k.add('steel', kbox(W - 0.12, 0.04, 0.003), { x: cx, y: uy, z: cz + s * (D / 2 - 0.06) });
    k.add('steel', kbox(W - 0.12, 0.003, 0.018), { x: cx, y: uy - 0.0185, z: cz + s * (D / 2 - 0.069) });
    k.add('steel', kbox(0.003, 0.04, D - 0.12), { x: cx + s * (W / 2 - 0.06), y: uy, z: cz });
  }
  k.add('steel', kbox(0.03, 0.02, D - 0.12), { x: cx, y: uy + 0.01, z: cz });
  // legs: a pair at each end, joined by a stretcher, with hinge brackets
  // and fold-out braces up to the centre rail
  const lh = DESK_Y - 0.074, lr = 0.0135;
  for (const sx of [-1, 1]) {
    const lx = cx + sx * (W / 2 - 0.085);
    for (const sz of [-1, 1]) {
      const lz = cz + sz * (D / 2 - 0.085);
      k.add('steel', kcyl(lr, lr, lh, 20), { x: lx, y: lh / 2 + 0.012, z: lz });
      k.add('rubber', kcyl(lr + 0.0025, lr + 0.004, 0.02, 20), { x: lx, y: 0.01, z: lz, ao: 0.01 });
      // hinge bracket and pivot bolt
      k.add('steel', krbox(0.04, 0.05, 0.034, 0.003), { x: lx, y: uy - 0.004, z: lz, tint: 0.9 });
      k.add('steel', kcyl(0.005, 0.005, 0.044, 12), { x: lx, y: uy - 0.012, z: lz, rx: Math.PI / 2, tint: 1.1 });
    }
    // stretcher between the pair, low down
    k.add('steel', kcyl(0.009, 0.009, D - 0.17, 16), { x: lx, y: 0.13, z: cz, rx: Math.PI / 2 });
    // fold-out brace: from the stretcher's middle up to the centre rail
    const from = new THREE.Vector3(lx, 0.13, cz), to = new THREE.Vector3(cx + sx * (W / 2 - 0.3), uy - 0.004, cz);
    const len = from.distanceTo(to), mid = from.clone().add(to).multiplyScalar(0.5);
    k.add('steel', kcyl(0.0075, 0.0075, len, 14), { x: mid.x, y: mid.y, z: mid.z, rz: sx * Math.atan2(Math.abs(to.x - from.x), to.y - from.y) });
    k.add('steel', krbox(0.03, 0.022, 0.03, 0.003), { x: lx, y: 0.13, z: cz, tint: 0.9 });
    k.add('steel', krbox(0.04, 0.012, 0.032, 0.002), { x: to.x, y: uy - 0.006, z: cz, tint: 0.9 });
  }
  g.add(k.build('table'));
  return g;
}

// ---------------------------------------------------------------- office chair
// Black leather swivel chair: a five-star base with twin-wheel casters, a
// gas lift in a stepped shroud, a tilt mechanism with its lever, a
// cushioned seat and back with piped edges and channel stitching, a
// headrest on chrome posts and padded armrests. Built facing +z.
export function buildChair() {
  const g = new THREE.Group();
  const k = new Kit({
    leather: lit({ color: '#2c2930', vcol: true, rough: 0.42, grain: 0.14, grainScale: [260, 260, 260] }),
    seam: lit({ color: '#18161a', vcol: true, rough: 0.6 }),
    plastic: lit({ color: '#1a181b', vcol: true, rough: 0.55, grain: 0.05, grainScale: [300, 300, 300] }),
    chrome: lit({ color: '#c4c8d0', vcol: true, rough: 0.12, metal: 1 }),
    rubber: lit({ color: '#101012', vcol: true, rough: 0.8 }),
  }, 13);
  // base: hub, tapered arms, casters
  k.add('plastic', lathe([[0, 0.06], [0.05, 0.06], [0.058, 0.075], [0.05, 0.115], [0.036, 0.12], [0, 0.12]], 32));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, ca = Math.cos(a), sa = Math.sin(a);
    const arm = new THREE.CylinderGeometry(0.014, 0.022, 0.29, 6, 1).toNonIndexed();
    arm.scale(1.4, 1, 1);
    arm.rotateZ(Math.PI / 2 - 0.1);
    k.add('plastic', arm, { x: ca * 0.16, y: 0.082, z: sa * 0.16, ry: -a, wear: 0.5 });
    k.add('plastic', krbox(0.034, 0.022, 0.034, 0.006), { x: ca * 0.3, y: 0.06, z: sa * 0.3 });
    k.add('chrome', kcyl(0.004, 0.004, 0.03, 8), { x: ca * 0.3, y: 0.04, z: sa * 0.3 });
    for (const s of [-1, 1]) k.add('rubber', kcyl(0.024, 0.024, 0.011, 20), { x: ca * 0.3 + s * sa * 0.009, y: 0.025, z: sa * 0.3 - s * ca * 0.009, rx: Math.PI / 2, ry: -a + Math.PI / 2, ao: 0.004 });
  }
  // gas lift: chrome piston in a three-step shroud
  k.add('chrome', kcyl(0.014, 0.014, 0.16, 20), { y: 0.3 });
  for (let i = 0; i < 3; i++) k.add('plastic', kcyl(0.028 - i * 0.004, 0.03 - i * 0.004, 0.055, 24), { y: 0.14 + i * 0.05 });
  // tilt mechanism and lever
  k.add('plastic', krbox(0.2, 0.035, 0.24, 0.006), { y: 0.395 });
  k.add('chrome', tube([new THREE.Vector3(0.08, 0.39, 0.05), new THREE.Vector3(0.2, 0.38, 0.08), new THREE.Vector3(0.26, 0.37, 0.1)], 0.005, 12, 6));
  k.add('plastic', krbox(0.04, 0.018, 0.022, 0.008), { x: 0.27, y: 0.37, z: 0.1 });
  // seat: shell, cushion, piping round the top edge, channel stitching
  k.add('plastic', krbox(0.52, 0.03, 0.5, 0.02), { y: 0.425, z: 0.01 });
  k.add('leather', krbox(0.54, 0.09, 0.52, 0.04, 4), { y: 0.48, z: 0.01 });
  const pipe = (w: number, d: number, r: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const x = Math.sign(Math.cos(a)) * Math.min(Math.abs(Math.cos(a)) * 1.6, 1) * (w / 2 - r);
      const z = Math.sign(Math.sin(a)) * Math.min(Math.abs(Math.sin(a)) * 1.6, 1) * (d / 2 - r);
      pts.push(new THREE.Vector3(x + Math.cos(a) * r, 0, z + Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.005, 6, true);
  };
  k.add('seam', pipe(0.53, 0.51, 0.05), { y: 0.518, z: 0.01 });
  for (const x of [-0.09, 0.09]) k.add('seam', kbox(0.004, 0.003, 0.4), { x, y: 0.5245, z: 0.02 });
  // back: cushion with a lumbar roll and stitching, a hard shell behind
  const back = new THREE.Group();
  const kb = new Kit(k.mats, 14);
  kb.add('leather', krbox(0.5, 0.64, 0.09, 0.04, 4), { y: 0.36 });
  kb.add('leather', krbox(0.46, 0.13, 0.05, 0.025, 3), { y: 0.14, z: 0.05 });
  kb.add('plastic', krbox(0.48, 0.62, 0.03, 0.02), { y: 0.36, z: -0.05 });
  for (const y of [0.3, 0.46]) kb.add('seam', kbox(0.4, 0.004, 0.004), { y, z: 0.0455 });
  kb.add('seam', kbox(0.004, 0.44, 0.004), { y: 0.42, z: 0.0455 });
  // headrest on two posts
  for (const s of [-1, 1]) kb.add('chrome', kcyl(0.006, 0.006, 0.12, 12), { x: s * 0.09, y: 0.72, z: -0.02 });
  kb.add('leather', krbox(0.34, 0.14, 0.085, 0.035, 4), { y: 0.8, z: -0.01 });
  // spine bracket down to the mechanism
  kb.add('plastic', krbox(0.07, 0.3, 0.03, 0.01), { y: 0.02, z: -0.06 });
  back.add(kb.build('chair-back'));
  back.position.set(0, 0.5, -0.24);
  back.rotation.x = -0.14;
  // armrests: T supports and padded tops
  for (const s of [-1, 1]) {
    k.add('plastic', krbox(0.04, 0.2, 0.045, 0.008), { x: s * 0.29, y: 0.6, z: 0.0 });
    k.add('plastic', krbox(0.1, 0.02, 0.05, 0.006), { x: s * 0.26, y: 0.51, z: 0.0 });
    k.add('leather', krbox(0.075, 0.035, 0.3, 0.015, 3), { x: s * 0.29, y: 0.715, z: 0.03, tint: 0.9 });
  }
  g.add(k.build('chair'));
  g.add(back);
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
