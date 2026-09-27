import { Pix } from './pix';

// Pixel-art poster homages (original drawings, no official artwork or logos).
// Each returns a 48x64 canvas; the same art is used on the wall and in the page.

export const PW = 96;
export const PH = 128;

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Paper sheet with a printed art panel; returns the panel rect.
function sheet(g: Pix, paper: string, panel: string, artH = 92) {
  g.r(0, 0, PW, PH, paper);
  g.r(0, 0, PW, 1, 'rgba(255,255,255,.35)');
  g.r(0, PH - 1, PW, 1, 'rgba(0,0,0,.25)');
  g.r(5, 5, PW - 10, artH, panel);
  return { x: 5, y: 5, w: PW - 10, h: artH };
}

function title(g: Pix, s: string, y: number, c: string, shadow?: string, scale = 2) {
  const x = Math.round((PW - g.textWidth(s, scale)) / 2);
  if (shadow) g.text(s, x + 1, y + 1, shadow, scale);
  g.text(s, x, y, c, scale);
}

function sub(g: Pix, s: string, y: number, c: string) {
  const x = Math.round((PW - g.textWidth(s)) / 2);
  g.text(s, x, y, c);
}

function stars(g: Pix, R: () => number, n: number, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(R() * w), sy = y + Math.floor(R() * h);
    const big = R() < 0.12;
    g.p(sx, sy, R() < 0.4 ? '#ffffff' : '#f6e7c8');
    if (big) { g.p(sx - 1, sy, '#8a7aa8'); g.p(sx + 1, sy, '#8a7aa8'); g.p(sx, sy - 1, '#8a7aa8'); g.p(sx, sy + 1, '#8a7aa8'); }
  }
}

function finish(g: Pix, seed: number) {
  g.grain(0.09, seed);
  // folded crease and a worn corner
  g.dens(0, Math.floor(PH / 2), PW, 1, 'rgba(255,255,255,.18)', 0.6);
  g.poly([PW - 6, 0, PW, 0, PW, 6], 'rgba(0,0,0,.22)');
  return g.canvas;
}

function helmetsPoster() {
  const g = new Pix(PW, PH);
  const R = rng(1);
  const A = sheet(g, '#15121c', '#0d0b16');
  g.grad(A.x, A.y, A.w, A.h, ['#0b0914', '#150f28', '#281640', '#4a1a4a', '#7a2248', '#b8364a']);
  stars(g, R, 60, A.x, A.y, A.w, 50);
  // floor grid
  for (let i = 0; i < 6; i++) g.r(A.x, A.y + A.h - 4 - i * i, A.w, 1, 'rgba(255,120,120,.35)');
  for (let k = -5; k <= 5; k++) g.line(48 + k * 4, A.y + A.h - 30, 48 + k * 16, A.y + A.h - 1, 'rgba(255,120,120,.3)');
  // gold helmet
  g.sphere(30, 50, 17, 21, ['#5a3a10', '#8a5a18', '#c08428', '#e8b24a', '#f8d888', '#fff6d0']);
  g.r(14, 44, 33, 11, '#120e16');
  g.r(15, 45, 31, 2, '#2a2436');
  g.r(18, 52, 22, 1, '#3a3050');
  g.r(12, 46, 3, 8, '#b8842a'); g.r(45, 46, 3, 8, '#b8842a');
  g.r(24, 70, 13, 5, '#8a5a18'); g.r(26, 70, 9, 2, '#c08428');
  // chrome helmet with LED visor
  g.sphere(66, 50, 17, 21, ['#2a2e3a', '#4a5264', '#7e889c', '#b8c2d4', '#e6ecf6', '#ffffff']);
  g.r(50, 41, 33, 16, '#0c0e14');
  const led = ['#ff3a2a', '#ff7a2a', '#ffc03a', '#ff7a2a'];
  for (let x = 52; x < 81; x += 2) for (let y = 44; y < 55; y += 2) if ((x * 7 + y * 3) % 5 < 2) g.p(x, y, led[(x + y) % 4]);
  g.r(60, 70, 13, 5, '#4a5264'); g.r(62, 70, 9, 2, '#b8c2d4');
  g.r(48, 44, 2, 12, '#7e889c'); g.r(82, 44, 2, 12, '#7e889c');
  title(g, 'DAFT PUNK', 103, '#f8c85a', '#7a2248');
  sub(g, 'LIVE  2007  WORLD TOUR', 118, '#b8a8c8');
  return finish(g, 11);
}

function boltPoster() {
  const g = new Pix(PW, PH);
  const A = sheet(g, '#ece4d2', '#9fd4ea');
  g.grad(A.x, A.y, A.w, A.h, ['#b8e2f0', '#9fd4ea', '#7fc0dc']);
  g.dens(A.x, A.y, A.w, A.h, '#ffffff', 0.08);
  // hair mass
  g.sphere(48, 32, 27, 21, ['#8a2a10', '#c24a18', '#e8702a', '#ff9a4a', '#ffc080']);
  g.sphere(30, 42, 10, 14, ['#8a2a10', '#c24a18', '#e8702a', '#ff9a4a']);
  g.sphere(66, 42, 10, 14, ['#8a2a10', '#c24a18', '#e8702a', '#ff9a4a']);
  // face + neck + shoulders
  g.r(38, 74, 20, 14, '#e8c0a8');
  g.poly([14, 97, 30, 84, 66, 84, 82, 97], '#e8c0a8');
  g.sphere(48, 52, 17, 23, ['#b8806a', '#d8a088', '#f0c4ac', '#fbe0cc']);
  // closed eyes, brows, lips
  g.r(36, 49, 8, 1, '#5a3028'); g.r(52, 49, 8, 1, '#5a3028');
  g.r(37, 46, 7, 1, '#a0604a'); g.r(52, 46, 7, 1, '#a0604a');
  g.r(44, 66, 8, 2, '#b84a4a'); g.r(45, 66, 6, 1, '#d8686a');
  // the bolt, outlined
  const bolt = [44, 26, 30, 50, 44, 50, 34, 78, 62, 44, 48, 44, 58, 26];
  g.poly(bolt.map((v, i) => v + (i % 2 ? 1 : 1)), '#1a1620');
  g.poly(bolt, '#d8232a');
  g.poly([44, 26, 50, 26, 40, 46, 36, 46], '#2b6fd8');
  g.poly([54, 44, 58, 44, 40, 70, 42, 62], '#2b6fd8');
  // teardrop on the collarbone
  g.sphere(58, 88, 2, 3, ['#6ab8d8', '#d8f4ff']);
  title(g, 'BOWIE', 103, '#1a1620');
  sub(g, 'STARMAN  -  1972', 118, '#d8232a');
  return finish(g, 12);
}

function rainPoster() {
  const g = new Pix(PW, PH);
  const R = rng(3);
  const A = sheet(g, '#1a1026', '#2a1648');
  g.grad(A.x, A.y, A.w, A.h, ['#140a24', '#2a1648', '#4a2170', '#6d2a8f', '#9a3a9c', '#c85ab0']);
  // moon
  g.sphere(70, 24, 11, 11, ['#b89ad8', '#d8c0f0', '#f4e8ff']);
  // rain
  for (let i = 0; i < 140; i++) {
    const x = A.x + Math.floor(R() * A.w), y = A.y + Math.floor(R() * (A.h - 6));
    g.line(x, y, x - 1, y + 3 + Math.floor(R() * 3), R() < 0.3 ? '#f0d8ff' : '#a888d0');
  }
  // figure on a motorbike silhouette
  const k = '#0c0616';
  g.circle(30, 84, 9, k); g.circle(30, 84, 5, '#3a2060'); g.circle(30, 84, 2, k);
  g.circle(68, 84, 9, k); g.circle(68, 84, 5, '#3a2060'); g.circle(68, 84, 2, k);
  g.poly([30, 80, 44, 70, 62, 70, 70, 78, 60, 82, 38, 84], k);
  g.poly([44, 70, 46, 50, 54, 46, 58, 52, 56, 70], k);
  g.circle(52, 42, 5, k);
  g.poly([46, 36, 58, 36, 60, 40, 44, 40], k);
  g.line(56, 52, 68, 62, k); g.line(57, 52, 69, 62, k);
  // puddle reflections
  for (let x = A.x; x < A.x + A.w; x += 3) g.p(x, 96, R() < 0.5 ? '#c85ab0' : '#6d2a8f');
  title(g, 'PRINCE', 103, '#f0d8ff', '#0c0616');
  sub(g, 'PURPLE RAIN', 118, '#c85ab0');
  return finish(g, 13);
}

function crownPoster() {
  const g = new Pix(PW, PH);
  const R = rng(4);
  const A = sheet(g, '#f0ebe0', '#b3202a');
  g.grad(A.x, A.y, A.w, A.h, ['#d83a2a', '#b3202a', '#7a1018']);
  // sun rays
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    if (a % 2) g.poly([48, 46, 48 + Math.cos(t) * 70, 46 + Math.sin(t) * 70, 48 + Math.cos(t + 0.2) * 70, 46 + Math.sin(t + 0.2) * 70], 'rgba(255,200,120,.12)');
  }
  // skyline
  let x = A.x;
  while (x < A.x + A.w) {
    const w = 5 + Math.floor(R() * 8), h = 14 + Math.floor(R() * 26);
    g.r(x, A.y + A.h - h, w, h, '#3a0810');
    g.r(x, A.y + A.h - h, 1, h, '#5a1018');
    for (let yy = A.y + A.h - h + 3; yy < A.y + A.h - 2; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) if (R() < 0.5) g.p(xx, yy, '#ffcf6b');
    x += w;
  }
  // crown, shaded gold with jewels
  const gold = ['#6a4a10', '#a8781c', '#e0a830', '#f8d060', '#fff0b0'];
  g.r(24, 42, 48, 16, gold[2]);
  g.r(24, 42, 48, 3, gold[3]); g.r(24, 55, 48, 3, gold[1]);
  for (const [cx, h] of [[26, 14], [36, 9], [48, 20], [60, 9], [70, 14]] as const) {
    g.poly([cx - 5, 43, cx, 43 - h, cx + 5, 43], gold[2]);
    g.poly([cx - 5, 43, cx, 43 - h, cx - 1, 43], gold[3]);
    g.sphere(cx, 41 - h, 2, 2, [gold[1], gold[3], gold[4]]);
  }
  g.sphere(36, 50, 3, 3, ['#0a5a50', '#3fbfb0', '#bff8f0']);
  g.sphere(48, 50, 3, 3, ['#6a0a10', '#e83a3a', '#ffc0c0']);
  g.sphere(60, 50, 3, 3, ['#0a5a50', '#3fbfb0', '#bff8f0']);
  title(g, 'KENDRICK', 103, '#1a1016');
  sub(g, 'GOOD KID  M.A.A.D', 118, '#b3202a');
  return finish(g, 14);
}

function stonesPoster() {
  const g = new Pix(PW, PH);
  const R = rng(5);
  const A = sheet(g, '#f3e6c8', '#141214');
  stars(g, R, 45, A.x, A.y, A.w, A.h - 20);
  // hill and the rolling stone
  g.poly([A.x, 80, 40, 70, A.x + A.w, 88, A.x + A.w, A.y + A.h, A.x, A.y + A.h], '#2a2220');
  g.poly([A.x, 82, 40, 72, A.x + A.w, 90, A.x + A.w, 92, 40, 74, A.x, 84], '#4a3a34');
  g.sphere(56, 52, 20, 20, ['#2a2420', '#4a4038', '#6e6258', '#948878', '#bcb0a0', '#e0d6c8']);
  for (const [cx, cy, r] of [[50, 46, 3], [62, 58, 2], [58, 42, 2], [66, 50, 1]] as const) g.circle(cx, cy, r, '#4a4038');
  // speed lines + dust
  for (const [y, l] of [[38, 16], [46, 22], [54, 18], [62, 12]] as const) g.r(A.x + 4, y, l, 2, '#e83b3b');
  for (let i = 0; i < 20; i++) g.p(20 + Math.floor(R() * 20), 70 + Math.floor(R() * 8), '#948878');
  title(g, 'STONES', 103, '#141214', '#e83b3b');
  sub(g, 'GATHER NO MOSS', 118, '#6a5a50');
  return finish(g, 15);
}

function cubePoster() {
  const g = new Pix(PW, PH);
  const A = sheet(g, '#1c1a3a', '#2c2a5e');
  g.grad(A.x, A.y, A.w, A.h, ['#1c1a44', '#2c2a5e', '#44408a', '#6a64c0']);
  for (let y = A.y; y < A.y + A.h; y += 6) g.dens(A.x, y, A.w, 1, '#8a84e0', 0.2);
  // isometric cube, three shaded faces
  const cx = 48, cy = 52, s = 24;
  g.poly([cx, cy - s, cx + s, cy - s / 2, cx, cy, cx - s, cy - s / 2], '#9a8ff0');
  g.poly([cx - s, cy - s / 2, cx, cy, cx, cy + s, cx - s, cy + s / 2], '#6b5fd8');
  g.poly([cx + s, cy - s / 2, cx, cy, cx, cy + s, cx + s, cy + s / 2], '#4a3fb0');
  g.line(cx, cy, cx, cy + s, '#c8c0ff');
  // inner cube + letter window
  g.poly([cx - 8, cy + 2, cx, cy + 6, cx, cy + 16, cx - 8, cy + 12], '#2c2470');
  g.poly([cx - 6, cy + 5, cx - 2, cy + 7, cx - 2, cy + 12, cx - 6, cy + 10], '#d8d2ff');
  // handle
  g.r(cx - 10, cy + s + 2, 20, 3, '#2c2470');
  g.r(cx - 12, cy + s - 4, 3, 8, '#2c2470'); g.r(cx + 9, cy + s - 4, 3, 8, '#2c2470');
  // controller buttons motif
  g.circle(78, 22, 5, '#3fbf6a'); g.circle(86, 30, 3, '#e83a3a'); g.circle(72, 30, 2, '#f0f0f0');
  title(g, 'CUBE', 103, '#e6e2ff');
  sub(g, 'NOW PLAYING  -  2001', 118, '#9a8ff0');
  return finish(g, 16);
}

function drumPoster() {
  const g = new Pix(PW, PH);
  const A = sheet(g, '#e6e2d8', '#e6621f');
  g.grad(A.x, A.y, A.w, A.h, ['#f07a2a', '#e6621f', '#c84a10']);
  for (let i = 0; i < 8; i++) g.r(A.x, A.y + 8 + i * 10, A.w, 3, 'rgba(255,255,255,.08)');
  // the machine, three-quarter top view
  g.r(8, 34, 80, 44, '#3a3834');
  g.r(10, 32, 76, 42, '#d4d0c6');
  g.r(10, 32, 76, 2, '#f4f0e8');
  g.r(10, 72, 76, 2, '#9a968c');
  g.r(10, 32, 76, 8, '#c8c4ba');
  g.text('RHYTHM COMPOSER', 13, 34, '#3a3834');
  for (let i = 0; i < 9; i++) { g.circle(16 + i * 8, 46, 2, '#2a2824'); g.p(16 + i * 8, 45, '#8a867c'); }
  for (let i = 0; i < 4; i++) g.circle(16 + i * 8, 54, 1, '#2a2824');
  g.r(52, 51, 30, 6, '#1a1a1a'); g.r(53, 52, 12, 4, '#ff5a2a');
  for (let i = 0; i < 16; i++) g.r(12 + i * 4.6, 62, 3, 7, i % 4 === 0 ? '#e6621f' : i % 2 ? '#f0e8d0' : '#f6c24a');
  title(g, '909', 84, '#1a1a1a', undefined, 3);
  sub(g, 'HOUSE  TECHNO  DUB', 118, '#e6621f');
  g.r(10, 108, 76, 2, '#1a1a1a');
  return finish(g, 17);
}

function keysPoster() {
  const g = new Pix(PW, PH);
  const A = sheet(g, '#15171a', '#20242a');
  g.grad(A.x, A.y, A.w, A.h, ['#0c0e12', '#1a1e26', '#26303a']);
  // synth body
  g.r(6, 30, 84, 50, '#2a2624');
  g.r(6, 30, 84, 2, '#4a4440');
  g.r(10, 34, 30, 8, '#101418');
  g.r(11, 35, 28, 6, '#4a1a14');
  g.text('ALGO 32', 13, 36, '#ff6a4a');
  for (let i = 0; i < 16; i++) g.r(44 + (i % 8) * 5, 34 + Math.floor(i / 8) * 5, 4, 3, i % 3 === 0 ? '#3fbfb0' : i % 3 === 1 ? '#e8e3d8' : '#e0703a');
  g.r(10, 45, 76, 1, '#3fbfb0');
  // keys with shading
  for (let i = 0; i < 26; i++) { g.r(8 + i * 3, 50, 2, 26, '#f4f0e6'); g.r(8 + i * 3, 74, 2, 2, '#b8b0a4'); }
  for (let i = 0; i < 26; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) g.r(10 + i * 3, 50, 2, 15, '#16181c');
  // FM operator waves
  for (let x = 0; x < 80; x++) g.p(8 + x, 20 + Math.round(Math.sin(x * 0.3) * 4 * Math.sin(x * 0.05)), '#3fbfb0');
  title(g, 'DX7', 90, '#3fbfb0', undefined, 3);
  sub(g, 'DIGITAL FM  -  1983', 118, '#e8e3d8');
  return finish(g, 18);
}

function heroPoster() {
  const g = new Pix(PW, PH);
  const R = rng(9);
  const A = sheet(g, '#e8e0c8', '#7fc4e8');
  g.grad(A.x, A.y, A.w, 60, ['#5aa8e0', '#7fc4e8', '#b8e0f0', '#e8f4e0']);
  // clouds, distant hills, field
  for (const [cx, cy] of [[20, 20], [70, 14]] as const) { g.ellipse(cx, cy, 10, 3, '#ffffff'); g.ellipse(cx + 5, cy - 2, 6, 3, '#ffffff'); }
  g.poly([A.x, 60, 30, 48, 60, 56, 91, 46, 91, 70, A.x, 70], '#6aa860');
  g.r(A.x, 68, A.w, A.h - 63, '#4f9a4a');
  for (let i = 0; i < 40; i++) g.p(A.x + Math.floor(R() * A.w), 70 + Math.floor(R() * 26), R() < 0.5 ? '#3f8a44' : '#8fce6a');
  // hero: pointed cap, hair, tunic, belt, shield, sword
  const skin = ['#c88a68', '#f0c8a0', '#fce4c8'];
  g.poly([36, 36, 60, 36, 72, 18, 66, 18], '#2f8a3a');
  g.poly([38, 36, 58, 36, 66, 20, 62, 20], '#4fb050');
  g.r(38, 36, 22, 4, '#f2cf4a');
  g.sphere(48, 46, 9, 9, skin);
  g.r(43, 45, 2, 2, '#1a2a4a'); g.r(51, 45, 2, 2, '#1a2a4a');
  g.r(38, 40, 3, 10, '#f2cf4a'); g.r(55, 40, 3, 10, '#f2cf4a');
  g.poly([36, 56, 60, 56, 64, 84, 32, 84], '#2f8a3a');
  g.poly([38, 56, 48, 56, 46, 84, 34, 84], '#4fb050');
  g.r(34, 66, 30, 3, '#6a4a2a'); g.r(46, 66, 4, 3, '#f2cf4a');
  g.r(38, 84, 6, 8, '#6a4a2a'); g.r(52, 84, 6, 8, '#6a4a2a');
  g.poly([18, 58, 32, 58, 32, 76, 25, 82, 18, 76], '#2a5fb8');
  g.poly([20, 60, 30, 60, 30, 74, 25, 79, 20, 74], '#3f7ad8');
  g.poly([25, 64, 28, 70, 22, 70], '#f2cf4a');
  g.r(68, 28, 3, 38, '#dfe6f0'); g.r(69, 28, 1, 38, '#ffffff');
  g.r(64, 64, 11, 3, '#8a5fd0'); g.r(68, 67, 3, 6, '#6a4a2a');
  title(g, 'HERO', 103, '#1a2a1a');
  sub(g, 'OF TIME', 118, '#2f8a3a');
  return finish(g, 19);
}

export const POSTERS = [
  { id: 'helmets', label: 'Daft Punk', draw: helmetsPoster },
  { id: 'bolt', label: 'David Bowie', draw: boltPoster },
  { id: 'rain', label: 'Prince', draw: rainPoster },
  { id: 'crown', label: 'Kendrick Lamar', draw: crownPoster },
  { id: 'stones', label: 'The Rolling Stones', draw: stonesPoster },
  { id: 'cube', label: 'GameCube', draw: cubePoster },
  { id: 'drum', label: 'TR-909', draw: drumPoster },
  { id: 'keys', label: 'Yamaha DX7', draw: keysPoster },
  { id: 'hero', label: 'Hero of Time', draw: heroPoster },
] as const;

export type PosterId = (typeof POSTERS)[number]['id'];

const cache = new Map<string, HTMLCanvasElement>();
export function poster(id: PosterId) {
  if (!cache.has(id)) cache.set(id, POSTERS.find((p) => p.id === id)!.draw());
  return cache.get(id)!;
}

// Photocopied zine flyers and gig bills for the collage wall.
const WORDS = ['LIVE', 'TONIGHT', 'DJ SET', 'LOFI', 'B-SIDES', 'NO WAVE', 'SYNTH', 'ZINE', 'SHOW', 'VINYL', 'RAVE', 'DUB', 'BEATS', 'FREE', 'MIXTAPE', 'CLUB', '3AM', 'SIDE A', 'BASS', 'TOUR'];

// Halftone disc sized by a 0..1 tone.
function dot(g: Pix, x: number, y: number, t: number, c: string) {
  if (t > 0.75) g.r(x, y, 2, 2, c);
  else if (t > 0.45) { g.p(x, y, c); g.p(x + 1, y + 1, c); }
  else if (t > 0.2) g.p(x, y, c);
}

export function flyer(seed: number, w: number, h: number) {
  // flyers are drawn at the wall's texel density (~260 px/m)
  const g = new Pix(w, h);
  const R = rng(seed);
  const papers = ['#f0d8cc', '#e8c4be', '#f3e2d2', '#d99a98', '#f0b8b0', '#e4c8d0', '#c98a8e', '#e6d2b8', '#f4ead4'];
  const inks = ['#2a1018', '#3a1422', '#5a1a2a', '#1a1424', '#6a2030', '#8a2a3a'];
  const spots = ['#e8483b', '#ff7a2e', '#2f6ab8', '#3fa89a', '#f2c14a'];
  const paper = papers[Math.floor(R() * papers.length)];
  const ink = inks[Math.floor(R() * inks.length)];
  const spot = spots[Math.floor(R() * spots.length)];
  const word = () => WORDS[Math.floor(R() * WORDS.length)];
  g.r(0, 0, w, h, paper);
  const kind = Math.floor(R() * 6);
  if (kind <= 1) {
    // halftone photo: a face or a crowd, lit from one side
    const bh = Math.floor(h * (0.55 + R() * 0.2));
    const cx = w * (0.3 + R() * 0.4), cy = bh * (0.45 + R() * 0.2), r = Math.min(w, bh) * (0.25 + R() * 0.15);
    const crowd = R() < 0.4;
    for (let y = 3; y < bh; y += 2)
      for (let x = 3; x < w - 3; x += 2) {
        let t = 0.25 + (x / w) * 0.25;
        if (crowd) { if (y > bh * 0.55 + Math.sin(x * 0.4) * 4) t = 0.9; }
        else { const d = Math.hypot((x - cx) / r, (y - cy) / (r * 1.25)); if (d < 1) t = 0.15 + d * 0.3; if (y > cy + r) t = 0.85; }
        dot(g, x, y, t + (R() - 0.5) * 0.15, ink);
      }
    g.r(3, bh + 4, Math.min(w - 6, g.textWidth(word()) + 2), 7, ink);
    g.text(word(), 4, bh + 5, paper);
    for (let y = bh + 14; y < h - 3; y += 4) g.r(3, y, Math.floor((w - 6) * (0.4 + R() * 0.5)), 1, ink);
  } else if (kind === 2) {
    // gig bill: header band with headline, then the line-up
    const hh = Math.floor(h * 0.3);
    g.r(0, 0, w, hh, ink);
    const t1 = word();
    const sc = g.textWidth(t1, 2) < w - 6 ? 2 : 1;
    g.text(t1, 3, Math.floor(hh / 2) - 2 * sc, paper, sc);
    g.r(3, hh + 3, w - 6, 3, spot);
    for (let y = hh + 10; y < h - 6; y += 8) g.text(word(), 3, y, ink);
  } else if (kind === 3) {
    // record / sun graphic with rings
    const r = Math.floor(Math.min(w, h) / 3);
    const cx = Math.floor(w / 2), cy = Math.floor(h / 2.4);
    g.circle(cx, cy, r, ink);
    for (let k = 3; k < r - 3; k += 3) g.ring(cx, cy, k, paper);
    g.circle(cx, cy, Math.floor(r / 3), spot);
    g.circle(cx, cy, 1, ink);
    g.text(word(), 3, h - 9, ink);
  } else if (kind === 4) {
    // bold type poster, slightly misregistered two-colour print
    let y = 3;
    while (y < h - 12) {
      const t = word();
      const sc = g.textWidth(t, 2) < w - 6 ? 2 : 1;
      g.text(t, 4, y + 1, spot, sc);
      g.text(t, 3, y, ink, sc);
      y += 6 * sc + 3;
    }
  } else {
    // collage stripes with a torn photo strip
    for (let x = 1; x < w - 1; x += 4) g.r(x, 1, 2, h - 2, R() < 0.5 ? ink : paper);
    const y0 = Math.floor(h / 2) - 7;
    g.r(2, y0, w - 4, 14, paper);
    g.r(4, y0 + 3, Math.floor(w * 0.6), 8, spot);
    g.text(word(), 5, y0 + 5, paper);
  }
  g.grain(0.06, seed);
  return g.canvas;
}
