import * as THREE from 'three';
import { Pix } from '../art/pix';
import { flyer, poster, rng, PW, PH, type PosterId } from '../art/posters';
import { emissive, lit, pixelTexture } from './materials';
import floydUrl from '../art/wall/floyd.png';
import tr909Url from '../art/wall/tr909.png';
import mixerUrl from '../art/wall/mixer.png';
import chiefUrl from '../art/wall/chief.png';
import marioUrl from '../art/wall/mario.png';

// World units are metres. The back wall sits at z = WALL_Z; the desk top at y = DESK_Y.
export const WALL_Z = -0.7;
export const DESK_Y = 0.76;
export const PX_PER_M = 260; // texel density that matches the low-res render

export const WINDOW = { x0: 1.46, x1: 2.3, y0: 0.98, y1: 2.5 };

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// ---------------------------------------------------------------- wall art

const PERSONAL = { floyd: floydUrl, tr909: tr909Url, mixer: mixerUrl, chief: chiefUrl, mario: marioUrl };
export type WallArt = Record<keyof typeof PERSONAL, HTMLImageElement>;

// Personal picks are pixelated photos; load them before the wall is drawn.
export async function loadWallArt(): Promise<WallArt> {
  const entries = await Promise.all(Object.entries(PERSONAL).map(([k, url]) => new Promise<[string, HTMLImageElement]>((res, rej) => {
    const im = new Image();
    im.onload = () => res([k, im]);
    im.onerror = rej;
    im.src = url;
  })));
  return Object.fromEntries(entries) as WallArt;
}

// Where each piece hangs: centre on the wall in metres, and printed width.
type Hang = { id: PosterId | keyof WallArt; cx: number; cy: number; w?: number; tilt?: number };
const WALL: Hang[] = [
  // homages first so the personal picks layer on top
  { id: 'crown', cx: 0.44, cy: 1.42 },
  { id: 'keys', cx: 1.2, cy: 1.78 },
  { id: 'helmets', cx: -0.9, cy: 1.16 },
  { id: 'hero', cx: -1.3, cy: 1.12 },
  { id: 'rain', cx: -0.62, cy: 1.02 },
  { id: 'stones', cx: -0.98, cy: 2.04 },
  { id: 'bolt', cx: -1.45, cy: 2.0 },
  { id: 'cube', cx: 1.22, cy: 2.0 },
  // personal picks, kept in the band the default camera sees
  { id: 'floyd', cx: 0.0, cy: 1.55, w: 0.34 },
  { id: 'chief', cx: -0.47, cy: 1.2, w: 0.3 },
  { id: 'tr909', cx: 0.5, cy: 1.74, w: 0.48 },
  { id: 'mixer', cx: 1.27, cy: 1.4, w: 0.27 },
  { id: 'mario', cx: 0.95, cy: 1.22, w: 0.3 },
];

function collageTexture(wx0: number, wx1: number, wy0: number, wy1: number, art: WallArt) {
  const W = Math.round((wx1 - wx0) * PX_PER_M), H = Math.round((wy1 - wy0) * PX_PER_M);
  const g = new Pix(W, H);
  const R = rng(77);
  g.r(0, 0, W, H, '#b8646a');
  // layer upon layer of flyers so no bare wall shows through
  for (let pass = 0; pass < 3; pass++) {
    for (let y = -16; y < H; y += 36 + Math.floor(R() * 24)) {
      for (let x = -16; x < W; x += 32 + Math.floor(R() * 32)) {
        const w = 36 + Math.floor(R() * 44), h = 44 + Math.floor(R() * 48);
        const f = flyer(Math.floor(R() * 1e9), w, h);
        g.ctx.drawImage(f, x + Math.floor(R() * 12), y + Math.floor(R() * 12));
        if (R() < 0.35) g.r(x + 4, y, 9, 4, 'rgba(243,236,216,.85)');
      }
    }
  }
  // feature pieces: drop shadow, paper mat for photos, tape strip, pins
  for (const h of WALL) {
    const personal = h.id in art;
    const src: CanvasImageSource = personal ? art[h.id as keyof WallArt] : poster(h.id as PosterId);
    const iw = personal ? (src as HTMLImageElement).naturalWidth : PW;
    const ih = personal ? (src as HTMLImageElement).naturalHeight : PH;
    const pw = Math.round((h.w ?? 0.33) * PX_PER_M);
    const ph = Math.round((pw * ih) / iw);
    const x = Math.round((h.cx - wx0) * PX_PER_M - pw / 2), y = Math.round((wy1 - h.cy) * PX_PER_M - ph / 2);
    const m = personal ? 4 : 0;
    g.r(x - m + 3, y - m + 5, pw + m * 2, ph + m * 2, 'rgba(40,10,20,0.5)');
    if (personal) { g.r(x - m, y - m, pw + m * 2, ph + m * 2, '#f2eadc'); g.r(x - m, y - m, pw + m * 2, 1, '#ffffff'); }
    g.ctx.drawImage(src, x, y, pw, ph);
    g.r(x + Math.floor(pw / 2) - 7, y - m - 3, 14, 6, 'rgba(239,230,207,.85)');
    g.p(x + 3, y + 3, '#c9c2b0'); g.p(x + pw - 4, y + 3, '#c9c2b0');
  }
  return pixelTexture(g.canvas);
}

// ---------------------------------------------------------------- wood + spines
function woodTex(seed: number) {
  const g = new Pix(128, 16);
  g.r(0, 0, 128, 16, '#7a3e38');
  const R = rng(seed);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 128; x++) {
    const v = Math.sin(x * 0.08 + Math.sin(y * 0.9 + seed) * 2) + (R() - 0.5) * 0.6;
    if (v > 0.8) g.p(x, y, '#8a4a40'); else if (v < -0.9) g.p(x, y, '#6a3430');
  }
  g.r(0, 0, 128, 1, '#9a5a4a');
  return pixelTexture(g.canvas);
}

function spineTex(col: string, seed: number, bw: number, bh: number) {
  const W = Math.max(8, Math.round(bw * 300)), H = Math.round(bh * 300);
  const g = new Pix(W, H);
  const R = rng(seed);
  g.r(0, 0, W, H, col);
  g.r(0, 0, 1, H, 'rgba(255,255,255,.25)'); g.r(W - 1, 0, 1, H, 'rgba(0,0,0,.3)');
  const band = ['#f2e6c8', '#1a1418', '#e8c35a', '#ffffff'][Math.floor(R() * 4)];
  const style = Math.floor(R() * 3);
  if (style === 0) { g.r(0, 6, W, 3, band); g.r(0, H - 10, W, 3, band); }
  if (style === 1) g.r(0, Math.floor(H * 0.15), W, Math.floor(H * 0.2), band);
  // title as a column of dashes
  for (let y = Math.floor(H * 0.4); y < H * 0.8; y += 4) g.r(Math.floor(W / 2) - 1, y, 2, 2 + Math.floor(R() * 2), style === 1 ? band : '#f6ecd8');
  g.r(Math.floor(W / 2) - 2, H - 6, 4, 3, '#f6ecd8');
  g.grain(0.08, seed);
  return pixelTexture(g.canvas);
}

// ---------------------------------------------------------------- city
function cityLayer(seed: number, w: number, h: number, o: { body: string; lit: string[]; density: number; min: number; max: number; signs?: boolean }) {
  const g = new Pix(w, h);
  const R = rng(seed);
  let x = -2;
  while (x < w) {
    const bw = 6 + Math.floor(R() * 14), bh = o.min + Math.floor(R() * (o.max - o.min));
    g.r(x, h - bh, bw, bh, o.body);
    if (R() < 0.4) { g.r(x + Math.floor(bw / 2), h - bh - 5, 1, 5, o.body); g.p(x + Math.floor(bw / 2), h - bh - 6, '#ff4a4a'); }
    for (let yy = h - bh + 2; yy < h; yy += 3)
      for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (R() < o.density) g.p(xx, yy, o.lit[Math.floor(R() * o.lit.length)]);
    if (o.signs && R() < 0.35) {
      const sc = R() < 0.75 ? '#6ff2d8' : '#ff6a5a';
      const sh = 6 + Math.floor(R() * 10);
      g.r(x + bw - 3, h - bh + 3, 2, sh, sc);
    }
    x += bw + Math.floor(R() * 3);
  }
  return pixelTexture(g.canvas);
}

function skyTexture() {
  const g = new Pix(64, 96);
  g.grad(0, 0, 64, 96, ['#08161c', '#0c2229', '#123038', '#1b4448', '#2a5e5a', '#3f7a6c']);
  const R = rng(3);
  for (let i = 0; i < 28; i++) g.p(Math.floor(R() * 64), Math.floor(R() * 50), R() < 0.3 ? '#e8fff6' : '#8fc8c0');
  // a pale moon
  g.circle(46, 18, 5, '#dff5ea');
  g.circle(48, 16, 4, '#bfe0d4');
  return pixelTexture(g.canvas);
}

export type RoomParts = {
  group: THREE.Group;
  shelf: THREE.Group;
  books: THREE.Mesh[];
  cars: THREE.Mesh[];
  rain: THREE.Mesh;
};

export function buildRoom(hover: { shelf: { value: number } }, art: WallArt): RoomParts {
  const group = new THREE.Group();

  // ---- back wall (with a hole for the window) + side wall + ceiling + floor
  const wx0 = -2.8, wx1 = 2.8, wy0 = 0, wy1 = 3.0;
  const collage = collageTexture(wx0, wx1, wy0, wy1, art);
  const wallMat = lit({ map: collage });
  const addWallPiece = (x0: number, x1: number, y0: number, y1: number) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, (x0 + u * (x1 - x0) - wx0) / (wx1 - wx0), (y0 + v * (y1 - y0) - wy0) / (wy1 - wy0));
    }
    const m = new THREE.Mesh(geo, wallMat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, WALL_Z);
    group.add(m);
  };
  const W = WINDOW;
  addWallPiece(wx0, W.x0, wy0, wy1);
  addWallPiece(W.x1, wx1, wy0, wy1);
  addWallPiece(W.x0, W.x1, wy0, W.y0);
  addWallPiece(W.x0, W.x1, W.y1, wy1);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), lit({ color: '#3a1c22' }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.5);
  group.add(floor);

  // ---- window: city layers behind the wall, frame, sill, rain
  const cityGroup = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), emissive({ map: skyTexture(), intensity: 1 }));
  sky.position.set(3.2, 2.6, -9);
  cityGroup.add(sky);
  const layers = [
    { z: -7.5, w: 10, h: 4.6, seed: 11, o: { body: '#10302f', lit: ['#3f8f82', '#2f6f66'], density: 0.18, min: 60, max: 150 } },
    { z: -5.2, w: 7, h: 3.6, seed: 12, o: { body: '#0b2226', lit: ['#8ff2dc', '#4fd0b8', '#ffb46a'], density: 0.26, min: 50, max: 130, signs: true } },
    { z: -3.2, w: 4.6, h: 2.2, seed: 13, o: { body: '#071619', lit: ['#bafff0', '#ffcf8a', '#ff7a6a'], density: 0.2, min: 30, max: 90, signs: true } },
  ];
  for (const L of layers) {
    const tex = cityLayer(L.seed, Math.round(L.w * 40), Math.round(L.h * 40), L.o);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), emissive({ map: tex }));
    m.position.set(2.4, L.h / 2 - 0.2, L.z);
    cityGroup.add(m);
  }
  // flying cars: tiny emissive slivers with a tail light
  const cars: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const car = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.018), emissive({ color: i % 2 ? '#ff6a5a' : '#dffcff', intensity: 1.2 }));
    car.position.set(0.8 + i * 0.7, 1.4 + i * 0.35, -4.4 - i * 0.4);
    car.userData.speed = (i % 2 ? -1 : 1) * (0.18 + i * 0.05);
    cars.push(car);
    cityGroup.add(car);
  }
  group.add(cityGroup);

  // rain streaks on the glass (animated by offsetting the texture)
  const rg = new Pix(40, 80);
  const R = rng(8);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(R() * 40), y = Math.floor(R() * 80);
    rg.r(x, y, 1, 2 + Math.floor(R() * 3), R() < 0.3 ? '#bfeee6' : '#5fa8a0');
  }
  const rainTex = pixelTexture(rg.canvas);
  rainTex.wrapS = rainTex.wrapT = THREE.RepeatWrapping;
  const rainMat = emissive({ map: rainTex, intensity: 0.8 });
  rainMat.transparent = false;
  const rain = new THREE.Mesh(new THREE.PlaneGeometry(W.x1 - W.x0, W.y1 - W.y0), rainMat);
  rain.position.set((W.x0 + W.x1) / 2, (W.y0 + W.y1) / 2, WALL_Z - 0.02);
  group.add(rain);

  const frameMat = lit({ color: '#4a2a2c' });
  const fw = 0.06;
  group.add(box(W.x1 - W.x0 + fw * 2, fw, 0.1, frameMat, (W.x0 + W.x1) / 2, W.y1 + fw / 2, WALL_Z));
  group.add(box(fw, W.y1 - W.y0, 0.1, frameMat, W.x0 - fw / 2, (W.y0 + W.y1) / 2, WALL_Z));
  group.add(box(fw, W.y1 - W.y0, 0.1, frameMat, W.x1 + fw / 2, (W.y0 + W.y1) / 2, WALL_Z));
  group.add(box(0.035, W.y1 - W.y0, 0.06, frameMat, (W.x0 + W.x1) / 2, (W.y0 + W.y1) / 2, WALL_Z));
  group.add(box(W.x1 - W.x0, 0.035, 0.06, frameMat, (W.x0 + W.x1) / 2, W.y0 + (W.y1 - W.y0) * 0.55, WALL_Z));
  group.add(box(W.x1 - W.x0 + 0.2, 0.05, 0.22, lit({ color: '#6a3a38' }), (W.x0 + W.x1) / 2, W.y0 - 0.025, WALL_Z + 0.08));

  // ---- desk
  const deskMat = lit({ color: '#8f4f48' });
  const deskEdge = lit({ color: '#6e3a36' });
  group.add(box(3.4, 0.045, 0.95, deskMat, -0.15, DESK_Y - 0.0225, WALL_Z + 0.475));
  group.add(box(3.4, 0.06, 0.04, deskEdge, -0.15, DESK_Y - 0.05, WALL_Z + 0.95));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, DESK_Y - 0.05), lit({ color: '#1c0c12' }));
  shadow.position.set(-0.15, (DESK_Y - 0.05) / 2, WALL_Z + 0.01);
  group.add(shadow);
  const under = lit({ color: '#2a1418' });
  group.add(box(0.5, 0.7, 0.8, under, -1.35, 0.35, WALL_Z + 0.45));
  group.add(box(0.5, 0.7, 0.8, under, 1.05, 0.35, WALL_Z + 0.45));
  group.add(box(0.04, 0.02, 0.2, lit({ color: '#b98a6a' }), -1.35, 0.55, WALL_Z + 0.86));
  group.add(box(0.04, 0.02, 0.2, lit({ color: '#b98a6a' }), 1.05, 0.55, WALL_Z + 0.86));

  // ---- floating bookshelf, upper left
  const shelf = new THREE.Group();
  const shelfMat = lit({ color: '#7a3e38', hover: hover.shelf });
  const sx0 = -1.5, sx1 = -0.36, sy = 1.42, sd = 0.22;
  shelf.add(box(sx1 - sx0, 0.035, sd, shelfMat, (sx0 + sx1) / 2, sy, WALL_Z + sd / 2));
  shelf.add(box(sx1 - sx0, 0.035, sd, shelfMat, (sx0 + sx1) / 2, sy + 0.36, WALL_Z + sd / 2));
  shelf.add(box(0.03, 0.36, sd, shelfMat, sx0 + 0.015, sy + 0.18, WALL_Z + sd / 2));
  shelf.add(box(0.03, 0.36, sd, shelfMat, sx1 - 0.015, sy + 0.18, WALL_Z + sd / 2));
  // shelf wood with grain on the front edge, and brackets
  shelf.children.forEach((m) => ((m as THREE.Mesh).material = lit({ hover: hover.shelf, map: woodTex(1) })));
  for (const bxp of [sx0 + 0.12, sx1 - 0.12]) shelf.add(box(0.02, 0.06, sd * 0.8, lit({ color: '#2a1a1a' }), bxp, sy - 0.045, WALL_Z + sd * 0.4));

  const books: THREE.Mesh[] = [];
  const bookCols = ['#c9483a', '#3a6ea5', '#e8c35a', '#2f6b4f', '#e6ddc8', '#b0506a', '#1f3a5a', '#e07a4f', '#5a3a6a', '#d8b890', '#3fa89a', '#8a2a2a'];
  const BR = rng(41);
  let bx = sx0 + 0.05;
  let n = 0;
  while (bx < sx1 - 0.2) {
    const bw = 0.026 + BR() * 0.03, bh = 0.2 + BR() * 0.1;
    const lean = n > 0 && BR() < 0.08;
    const col = bookCols[Math.floor(BR() * bookCols.length)];
    const spine = lit({ hover: hover.shelf, map: spineTex(col, Math.floor(BR() * 1e6), bw, bh) });
    const b = box(bw, bh, 0.15 + BR() * 0.04, [lit({ color: col, hover: hover.shelf }), lit({ color: col, hover: hover.shelf }), lit({ color: '#efe6d4', hover: hover.shelf }), lit({ color: '#efe6d4', hover: hover.shelf }), spine, spine], bx + bw / 2, sy + 0.0175 + bh / 2, WALL_Z + 0.11);
    if (lean) { b.rotation.z = -0.22; b.position.x += 0.025; bx += 0.03; }
    b.userData.baseY = b.position.y;
    books.push(b);
    shelf.add(b);
    bx += bw + 0.002;
    n++;
  }
  // bookend + a small horizontal stack, a cassette and a figurine on the right
  shelf.add(box(0.012, 0.14, 0.12, lit({ color: '#2a2a30', gloss: 0.5 }), bx + 0.01, sy + 0.09, WALL_Z + 0.11));
  for (let i = 0; i < 3; i++) {
    const c = bookCols[(i * 5 + 3) % bookCols.length];
    shelf.add(box(0.16 - i * 0.01, 0.03, 0.14, [lit({ color: '#efe6d4' }), lit({ color: '#efe6d4' }), lit({ color: c }), lit({ color: c }), lit({ color: c }), lit({ color: c })], sx1 - 0.11, sy + 0.033 + i * 0.03, WALL_Z + 0.11));
  }
  shelf.add(box(0.1, 0.064, 0.016, lit({ color: '#e8dcc8' }), sx1 - 0.11, sy + 0.15, WALL_Z + 0.08));
  const fig = new THREE.Group();
  fig.add(box(0.03, 0.04, 0.02, lit({ color: '#3a9a3a' }), 0, 0.02, 0));
  fig.add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), lit({ color: '#f0c8a0' })).translateY(0.052));
  fig.add(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 6), lit({ color: '#3a9a3a' })).translateY(0.075).rotateZ(-0.5));
  fig.position.set(sx1 - 0.17, sy + 0.2, WALL_Z + 0.1);
  shelf.add(fig);
  // records/zines lying flat on top
  shelf.add(box(0.2, 0.012, 0.18, lit({ color: '#1a1216' }), sx1 - 0.15, sy + 0.036 + 0.36, WALL_Z + 0.11));
  shelf.add(box(0.18, 0.012, 0.16, lit({ color: '#e8c35a' }), sx1 - 0.16, sy + 0.05 + 0.36, WALL_Z + 0.11));
  group.add(shelf);

  return { group, shelf, books, cars, rain };
}

export { PW, PH };
