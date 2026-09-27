// Torn pixel-paper panels, adapted from ThreeUI's Agentic template: a panel's
// background is a low-res canvas with ragged edges, a bright rim and fibres,
// drawn at 3 CSS px per texel and redrawn when the element resizes.

const PX = 3;

type Tone = { base: number[]; fiber: number[]; fleck: number[]; rim: number[]; line: number[]; shadow: string };

export const TONES: Record<'board' | 'card' | 'ink', Tone> = {
  // warm dark board for the pegboards
  board: { base: [42, 24, 30, 255], fiber: [50, 30, 36, 255], fleck: [62, 38, 44, 255], rim: [96, 62, 66, 255], line: [52, 32, 38, 255],
    shadow: 'drop-shadow(0 2px 2px rgba(0,0,0,.28)) drop-shadow(0 16px 26px rgba(0,0,0,.3))' },
  // pale card stock
  card: { base: [246, 236, 220, 255], fiber: [236, 224, 206, 255], fleck: [222, 206, 186, 255], rim: [255, 250, 240, 255], line: [226, 212, 194, 255],
    shadow: 'drop-shadow(0 1px 0 rgba(0,0,0,.25)) drop-shadow(0 10px 16px rgba(0,0,0,.28))' },
  ink: { base: [27, 18, 22, 255], fiber: [38, 26, 31, 255], fleck: [52, 36, 42, 255], rim: [92, 70, 76, 255], line: [40, 28, 33, 255],
    shadow: 'drop-shadow(0 2px 2px rgba(0,0,0,.22)) drop-shadow(0 14px 22px rgba(0,0,0,.25))' },
};

const rnd = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};

const tornEdge = (n: number, d: number, R: () => number) => {
  const a = new Array<number>(n);
  let v = d * R();
  for (let i = 0; i < n; i++) {
    v += (R() - 0.5) * 1.5;
    if (R() < 0.035) v += R() * d * 0.9;
    v = Math.max(0, Math.min(d, v));
    a[i] = Math.round(v);
  }
  return a;
};

export function paperCanvas(w: number, h: number, o: { tone: keyof typeof TONES; seed: number; depth?: number; lines?: [number, number] }) {
  const tone = TONES[o.tone], R = rnd(o.seed), d = o.depth ?? 2;
  const T = tornEdge(w, d, R), B = tornEdge(w, d, R), L = tornEdge(h, d, R), Rt = tornEdge(h, d, R);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  const img = x.createImageData(w, h);
  const D = img.data;
  const set = (i: number, col: number[]) => { D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = col[3]; };
  for (let y = 0; y < h; y++)
    for (let xx = 0; xx < w; xx++) {
      if (y < T[xx] || y >= h - B[xx] || xx < L[y] || xx >= w - Rt[y]) continue;
      const e = Math.min(y - T[xx], h - 1 - B[xx] - y, xx - L[y], w - 1 - Rt[y] - xx);
      let col = tone.base;
      if (e === 0) col = R() < 0.78 ? tone.rim : tone.fiber;
      else if (e === 1 && R() < 0.28) col = tone.rim;
      else if (R() < 0.012) col = tone.fleck;
      set((y * w + xx) * 4, col);
    }
  const nF = Math.round((w * h) / 90);
  const dirs = [[1, 0], [1, 1], [0, 1], [1, -1]];
  for (let i = 0; i < nF; i++) {
    let fx = Math.floor(R() * w), fy = Math.floor(R() * h);
    const [dx, dy] = dirs[Math.floor(R() * 4)];
    const len = 2 + Math.floor(R() * 4);
    for (let k = 0; k < len; k++, fx += dx, fy += dy) {
      if (fx < 0 || fy < 0 || fx >= w || fy >= h) break;
      const q = (fy * w + fx) * 4;
      if (D[q + 3]) set(q, tone.fiber);
    }
  }
  if (o.lines) for (let y = o.lines[0]; y < h - 3; y += o.lines[1]) for (let xx = 2; xx < w - 2; xx++) { const q = (y * w + xx) * 4; if (D[q + 3] && R() > 0.08) set(q, tone.line); }
  x.putImageData(img, 0, 0);
  return c;
}

const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const draws = new Map<Element, () => void>();
const ro = new ResizeObserver((ents) => ents.forEach((e) => draws.get(e.target)?.()));

export function paperize(el: HTMLElement, o: { tone: keyof typeof TONES; seed?: number; depth?: number; lines?: [number, number] }) {
  let key = '';
  const draw = () => {
    const w = Math.max(2, Math.round(el.offsetWidth / PX)), h = Math.max(2, Math.round(el.offsetHeight / PX));
    const k = `${w}x${h}`;
    if (k === key) return;
    key = k;
    const cv = paperCanvas(w, h, { ...o, seed: o.seed ?? hashStr(el.className + (el.textContent ?? '').slice(0, 40)) });
    el.style.backgroundImage = `url(${cv.toDataURL()})`;
    el.style.backgroundSize = `${w * PX}px ${h * PX}px`;
  };
  el.classList.add('paper');
  el.style.filter = TONES[o.tone].shadow;
  draws.set(el, draw);
  ro.observe(el);
  draw();
}
