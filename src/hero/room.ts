import { Pix } from '../art/pix';
import { rng } from '../art/posters';
import { pixelTexture } from './materials';
import floydUrl from '../art/wall/floyd.png';
import tr909Url from '../art/wall/tr909.png';
import mixerUrl from '../art/wall/mixer.png';
import chiefUrl from '../art/wall/chief.png';
import marioUrl from '../art/wall/mario.png';

// World units are metres. Props were laid out against a back plane at
// z = WALL_Z; the desk top is at y = DESK_Y.
export const WALL_Z = -0.7;
export const DESK_Y = 0.76;

// ---------------------------------------------------------------- personal art
const PERSONAL = { floyd: floydUrl, tr909: tr909Url, mixer: mixerUrl, chief: chiefUrl, mario: marioUrl };
export type WallArt = Record<keyof typeof PERSONAL, HTMLImageElement>;

// Personal picks are pixelated photos; load them before the scene is built.
export async function loadWallArt(): Promise<WallArt> {
  const entries = await Promise.all(Object.entries(PERSONAL).map(([k, url]) => new Promise<[string, HTMLImageElement]>((res, rej) => {
    const im = new Image();
    im.onload = () => res([k, im]);
    im.onerror = rej;
    im.src = url;
  })));
  return Object.fromEntries(entries) as WallArt;
}

// ---------------------------------------------------------------- wood + spines
export function woodTex(seed: number) {
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

export function spineTex(col: string, seed: number, bw: number, bh: number) {
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
