import { Pix } from './pix';

// Pixel-art poster homages (original drawings, no official artwork or logos).
// Each returns a 48x64 canvas; the same art is used on the wall and in the page.

export const PW = 48;
export const PH = 64;

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frame(g: Pix, paper: string) {
  g.r(0, 0, PW, PH, paper);
}

function title(g: Pix, s: string, y: number, c: string, shadow?: string) {
  const x = Math.round((PW - g.textWidth(s)) / 2);
  if (shadow) g.text(s, x + 1, y + 1, shadow);
  g.text(s, x, y, c);
}

function stars(g: Pix, R: () => number, n: number, h: number, c = '#fff6d8') {
  for (let i = 0; i < n; i++) g.p(2 + Math.floor(R() * (PW - 4)), 2 + Math.floor(R() * h), R() < 0.3 ? '#ffffff' : c);
}

function helmetsPoster() {
  const g = new Pix(PW, PH);
  const R = rng(1);
  frame(g, '#0d0b16');
  g.grad(2, 2, PW - 4, 44, ['#0d0b16', '#1b1030', '#3a1640', '#6a1f45']);
  stars(g, R, 26, 30);
  // gold helmet
  g.ellipse(15, 28, 9, 11, '#e8b24a');
  g.ellipse(14, 26, 7, 8, '#f6cf6a');
  g.r(7, 25, 17, 5, '#1a1420');
  g.r(8, 26, 15, 1, '#3b2f4a');
  g.r(13, 38, 5, 4, '#b9832e');
  // chrome helmet with LED visor
  g.ellipse(33, 28, 9, 11, '#aeb8c8');
  g.ellipse(32, 26, 7, 8, '#dde5f0');
  g.r(25, 24, 16, 7, '#12141c');
  for (let x = 26; x < 40; x += 2) g.p(x, 27, x % 4 ? '#ff4a3a' : '#ffb03a');
  g.r(31, 38, 5, 4, '#7b8596');
  g.p(12, 20, '#ffffff'); g.p(30, 20, '#ffffff');
  title(g, 'DAFT PUNK', 50, '#f6cf6a', '#6a1f45');
  g.r(10, 57, 28, 1, '#ff4a3a');
  return g.canvas;
}

function boltPoster() {
  const g = new Pix(PW, PH);
  frame(g, '#e9e2d0');
  g.r(3, 3, PW - 6, 46, '#8fd0e8');
  // hair
  g.ellipse(24, 20, 15, 12, '#e8622c');
  g.ellipse(22, 17, 12, 9, '#ff8a3d');
  // face
  g.ellipse(24, 30, 10, 14, '#f3d6c2');
  g.r(14, 33, 20, 14, '#f3d6c2');
  // lightning bolt across the face
  const bolt: [number, number][] = [[22, 16], [16, 29], [23, 29], [18, 44], [32, 24], [25, 25], [30, 16]];
  for (let i = 0; i < bolt.length - 1; i++) {
    const [a, b] = bolt[i], [c, d] = bolt[i + 1];
    g.line(a, b, c, d, '#d8232a');
    g.line(a + 1, b, c + 1, d, i % 2 ? '#2b5fb8' : '#d8232a');
  }
  g.r(18, 32, 3, 1, '#3a2530'); g.r(28, 32, 3, 1, '#3a2530');
  g.r(21, 41, 6, 1, '#b8606a');
  title(g, 'BOWIE', 52, '#1a1620');
  g.r(12, 58, 24, 1, '#d8232a');
  return g.canvas;
}

function rainPoster() {
  const g = new Pix(PW, PH);
  const R = rng(3);
  frame(g, '#1a0f2a');
  g.grad(2, 2, PW - 4, 46, ['#2a1648', '#4a2170', '#6d2a8f', '#a13f9c']);
  for (let i = 0; i < 40; i++) {
    const x = 2 + Math.floor(R() * 44), y = 2 + Math.floor(R() * 40);
    g.line(x, y, x - 1, y + 3, '#c9a8f0');
  }
  // guitar silhouette
  g.ellipse(20, 36, 7, 8, '#0f0818');
  g.ellipse(26, 30, 5, 6, '#0f0818');
  g.line(27, 28, 38, 10, '#0f0818'); g.line(28, 28, 39, 10, '#0f0818');
  g.r(37, 7, 4, 4, '#0f0818');
  g.circle(21, 35, 2, '#e8c6ff');
  g.r(16, 46, 22, 2, '#e8c6ff');
  title(g, 'PRINCE', 52, '#f0d8ff', '#0f0818');
  return g.canvas;
}

function crownPoster() {
  const g = new Pix(PW, PH);
  const R = rng(4);
  frame(g, '#f0ebe0');
  g.r(3, 3, PW - 6, 46, '#b3202a');
  // skyline
  let x = 3;
  while (x < PW - 3) {
    const w = 3 + Math.floor(R() * 5), h = 6 + Math.floor(R() * 14);
    g.r(x, 49 - h, w, h, '#4a0c12');
    for (let yy = 49 - h + 2; yy < 48; yy += 3) if (R() < 0.5) g.p(x + 1, yy, '#ffcf6b');
    x += w;
  }
  // crown
  g.r(12, 22, 24, 8, '#f2c14a');
  for (const [cx, h] of [[13, 8], [18, 5], [24, 10], [30, 5], [35, 8]] as const) {
    g.r(cx - 1, 22 - h, 3, h, '#f2c14a');
    g.p(cx, 21 - h, '#fff3c0');
  }
  g.r(12, 26, 24, 1, '#b8872a');
  g.p(18, 24, '#3fbfb0'); g.p(24, 24, '#ffffff'); g.p(30, 24, '#3fbfb0');
  title(g, 'KENDRICK', 52, '#1a1016');
  g.r(10, 58, 28, 1, '#b3202a');
  return g.canvas;
}

function stonesPoster() {
  const g = new Pix(PW, PH);
  const R = rng(5);
  frame(g, '#f3e6c8');
  g.r(3, 3, PW - 6, 46, '#141214');
  stars(g, R, 18, 40, '#f3e6c8');
  // rolling boulder with speed lines
  g.circle(28, 28, 11, '#8a7f76');
  g.circle(26, 26, 9, '#a89b90');
  g.circle(24, 23, 3, '#c9bdb2');
  g.p(31, 32, '#6a6058'); g.p(29, 34, '#6a6058'); g.p(33, 27, '#6a6058');
  for (const [y, l] of [[20, 10], [25, 14], [30, 12], [35, 8]] as const) g.r(4, y, l, 1, '#e83b3b');
  g.r(4, 42, 40, 2, '#e83b3b');
  title(g, 'STONES', 52, '#141214', '#e83b3b');
  return g.canvas;
}

function cubePoster() {
  const g = new Pix(PW, PH);
  frame(g, '#1c1a3a');
  g.grad(2, 2, PW - 4, 46, ['#2c2a5e', '#3f3c84', '#5b58b0']);
  // isometric cube
  const cx = 24, cy = 26;
  for (let i = 0; i < 12; i++) {
    g.r(cx - 12 + i, cy - 6 + Math.floor(i / 2), 1, 14, '#6b5fd8');
    g.r(cx + i, cy - Math.floor(i / 2), 1, 14, '#4a3fb0');
  }
  for (let j = 0; j < 7; j++) g.r(cx - 12 + j * 2, cy - 6 - j + 0, 24 - j * 4, 1, '#9a8ff0');
  g.r(cx - 3, cy + 1, 6, 6, '#2c2470');
  g.r(cx - 2, cy + 2, 4, 4, '#b7afff');
  g.r(cx - 4, cy + 16, 8, 3, '#2c2470');
  title(g, 'CUBE 01', 52, '#e6e2ff');
  g.r(8, 58, 32, 1, '#9a8ff0');
  return g.canvas;
}

function drumPoster() {
  const g = new Pix(PW, PH);
  frame(g, '#e6e2d8');
  g.r(3, 3, PW - 6, 46, '#e6621f');
  // drum machine body
  g.r(5, 16, 38, 22, '#c9c6bd');
  g.r(5, 16, 38, 2, '#efece4');
  g.r(5, 36, 38, 2, '#8d8a82');
  for (let i = 0; i < 6; i++) g.circle(9 + i * 6, 22, 1, '#3a3834');
  for (let i = 0; i < 8; i++) {
    g.r(7 + i * 4, 30, 3, 4, i % 4 === 0 ? '#e6621f' : i % 2 ? '#f0e8d0' : '#f6c24a');
  }
  g.r(30, 19, 10, 3, '#1a1a1a');
  g.text('909', 18, 8, '#1a1a1a', 1);
  title(g, 'RHYTHM', 52, '#1a1a1a');
  g.r(10, 58, 28, 1, '#e6621f');
  return g.canvas;
}

function keysPoster() {
  const g = new Pix(PW, PH);
  frame(g, '#15171a');
  g.r(3, 3, PW - 6, 46, '#20242a');
  g.r(4, 14, 40, 26, '#3b3230');
  g.r(4, 14, 40, 2, '#5a4c47');
  // membrane buttons
  for (let i = 0; i < 16; i++) g.r(6 + (i % 8) * 4 + Math.floor(i / 8), 18 + Math.floor(i / 8) * 3, 3, 2, i % 3 ? '#3fbfb0' : '#e8e3d8');
  g.r(30, 18, 12, 4, '#4a1a1a'); g.text('DX', 31, 18, '#ff6a4a', 1);
  // keys
  for (let i = 0; i < 13; i++) g.r(5 + i * 3, 27, 2, 12, '#efece4');
  for (const i of [0, 1, 3, 4, 5, 7, 8, 10, 11]) g.r(7 + i * 3, 27, 2, 7, '#15171a');
  title(g, 'DX7 FM', 52, '#3fbfb0');
  g.r(10, 58, 28, 1, '#e8e3d8');
  return g.canvas;
}

function heroPoster() {
  const g = new Pix(PW, PH);
  const R = rng(9);
  frame(g, '#e8e0c8');
  g.grad(3, 3, PW - 6, 46, ['#7fc4e8', '#a8dcef', '#dff0d0']);
  for (let i = 0; i < 6; i++) g.ellipse(6 + Math.floor(R() * 36), 44, 5, 3, '#4f9a4a');
  g.r(3, 44, PW - 6, 5, '#3f8a44');
  // hero: pointed green cap, blond hair, tunic, sword + shield
  g.r(20, 26, 9, 14, '#3a9a3a');
  g.r(21, 17, 8, 8, '#f3d2b0');
  g.r(20, 16, 10, 3, '#f2cf4a');
  for (let i = 0; i < 7; i++) g.r(20 + i, 14 - Math.floor(i / 2), 10 - i, 2, '#3a9a3a');
  g.r(29, 10, 5, 2, '#3a9a3a');
  g.p(23, 21, '#1a2a4a'); g.p(26, 21, '#1a2a4a');
  g.r(20, 32, 9, 1, '#6a4a2a');
  g.r(21, 40, 3, 4, '#6a4a2a'); g.r(26, 40, 3, 4, '#6a4a2a');
  g.r(12, 27, 7, 9, '#2a5fb8'); g.r(13, 28, 5, 7, '#3f7ad8'); g.p(15, 30, '#f2cf4a');
  g.r(31, 16, 2, 16, '#dfe6f0'); g.r(29, 31, 6, 2, '#8a5fd0'); g.r(31, 33, 2, 3, '#6a4a2a');
  title(g, 'HERO', 52, '#1a2a1a');
  g.r(12, 58, 24, 1, '#3a9a3a');
  return g.canvas;
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
export function flyer(seed: number, w: number, h: number) {
  const g = new Pix(w, h);
  const R = rng(seed);
  const papers = ['#f0d8cc', '#e8c4be', '#f3e2d2', '#d99a98', '#f0b8b0', '#e4c8d0', '#c98a8e', '#e6d2b8'];
  const inks = ['#2a1018', '#3a1422', '#5a1a2a', '#1a1424', '#6a2030', '#8a2a3a'];
  const paper = papers[Math.floor(R() * papers.length)];
  const ink = inks[Math.floor(R() * inks.length)];
  g.r(0, 0, w, h, paper);
  const kind = Math.floor(R() * 5);
  if (kind <= 1) {
    // halftone photo: silhouettes of a crowd / a face / a figure on a tinted field
    const bh = Math.floor(h * (0.55 + R() * 0.25));
    g.r(2, 2, w - 4, bh, ink);
    const light = papers[Math.floor(R() * papers.length)];
    const sub = Math.floor(R() * 3);
    if (sub === 0) for (let i = 0; i < 5; i++) g.circle(4 + Math.floor(R() * (w - 8)), bh - 4 - Math.floor(R() * 4), 3 + Math.floor(R() * 3), light);
    else if (sub === 1) { g.ellipse(Math.floor(w / 2), Math.floor(bh / 2) + 2, Math.floor(w / 5) + 2, Math.floor(bh / 3), light); g.r(Math.floor(w / 2) - 4, bh - 6, 8, 6, light); }
    else { g.r(Math.floor(w / 2) - 2, 6, 4, bh - 8, light); g.circle(Math.floor(w / 2), 6, 3, light); }
    g.dens(2, 2, w - 4, bh, ink, 0.35 + R() * 0.3);
    g.r(2, bh + 3, Math.floor((w - 4) * 0.8), 3, ink);
    for (let y = bh + 8; y < h - 2; y += 3) g.r(2, y, Math.floor((w - 4) * (0.4 + R() * 0.5)), 1, ink);
  } else if (kind === 2) {
    // gig bill: big header band + date blocks
    g.r(0, 0, w, Math.floor(h * 0.3), ink);
    g.r(3, 3, Math.floor(w * 0.7), 3, paper);
    for (let y = Math.floor(h * 0.36); y < h - 3; y += 5) g.r(3, y, Math.floor((w - 6) * (0.5 + R() * 0.5)), 2, ink);
  } else if (kind === 3) {
    // sun / record graphic
    g.circle(Math.floor(w / 2), Math.floor(h / 2.4), Math.floor(Math.min(w, h) / 3), ink);
    g.circle(Math.floor(w / 2), Math.floor(h / 2.4), Math.floor(Math.min(w, h) / 9), paper);
    for (let y = Math.floor(h * 0.78); y < h - 2; y += 3) g.r(3, y, w - 6, 1, ink);
  } else {
    // collage stripes
    for (let x = 1; x < w - 1; x += 3) g.r(x, 1, 1, h - 2, R() < 0.5 ? ink : paper);
    g.r(2, Math.floor(h / 2) - 3, w - 4, 7, paper);
    g.r(3, Math.floor(h / 2) - 1, Math.floor(w * 0.6), 3, ink);
  }
  return g.canvas;
}
