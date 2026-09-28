import knot from '../art/ascii/knot.txt?raw';
import horizon from '../art/ascii/horizon.txt?raw';
import moon from '../art/ascii/moon.txt?raw';
import letter from '../art/ascii/letter.txt?raw';

// Hand-drawn ASCII pieces that type themselves out as they scroll into
// view (row by row, a few freshly typed glyphs still scrambling, a block
// cursor at the head). Progress only grows; once complete they are static.
// `accent` lists substrings drawn in the accent colour.

const ART: Record<string, { text: string; accent?: string[] }> = {
  knot: { text: knot },
  horizon: { text: horizon, accent: ['(_)'] },
  moon: { text: moon, accent: ['-O-', 'o'] },
  letter: { text: letter, accent: ['@@', '*'] },
};

const SCRAMBLE = '01<>/\\|=+*#%&@$?!';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (c: string) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c);

type Piece = {
  pre: HTMLElement;
  fig: HTMLElement;
  lines: string[];
  acc: Uint8Array[];
  order: [number, number][]; // typing order: non-space glyphs, row-major
  k: number;
};

export function mountAsciiType(pres: HTMLElement[]) {
  const pieces: Piece[] = [];
  for (const pre of pres) {
    const art = ART[pre.dataset.art ?? ''];
    if (!art) continue;
    const lines = art.text.replace(/\r/g, '').replace(/^\n+|\s+$/g, '').split('\n').map((l) => l.replace(/\s+$/, ''));
    const acc = lines.map((l) => {
      const m = new Uint8Array(l.length);
      for (const tok of art.accent ?? []) {
        for (let i = l.indexOf(tok); i >= 0; i = l.indexOf(tok, i + tok.length)) m.fill(1, i, i + tok.length);
      }
      return m;
    });
    const order: [number, number][] = [];
    lines.forEach((l, y) => [...l].forEach((c, x) => { if (c !== ' ') order.push([x, y]); }));
    pre.setAttribute('aria-hidden', 'true');
    const p: Piece = { pre, fig: pre.closest('figure') ?? pre, lines, acc, order, k: REDUCED ? 1 : 0 };
    pieces.push(p);
    paint(p);
  }
  if (REDUCED) return;

  // typing starts as the piece's top enters the bottom of the viewport and
  // finishes by the time it is 40% from the top
  let queued = false;
  const update = () => {
    queued = false;
    const vh = innerHeight;
    for (const p of pieces) {
      if (p.k >= 1) continue;
      const top = p.pre.getBoundingClientRect().top;
      const k = Math.min(1, Math.max(0, (vh * 0.95 - top) / (vh * 0.55)));
      if (k > p.k) { p.k = k; paint(p); }
    }
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

function paint(p: Piece) {
  const head = p.k >= 1 ? p.order.length : Math.floor(p.k * p.order.length);
  // 0 hidden, 1 typed, 2 typed accent, 3 fresh (scrambling), 4 cursor
  const state = p.lines.map((l) => new Uint8Array(l.length));
  for (let i = 0; i < head; i++) {
    const [x, y] = p.order[i];
    state[y][x] = head - i <= 6 && p.k < 1 ? 3 : p.acc[y][x] ? 2 : 1;
  }
  if (p.k > 0 && p.k < 1 && head < p.order.length) { const [x, y] = p.order[head]; state[y][x] = 4; }
  const CLS = ['', '', 'a', 'n', 'cur'];
  p.pre.innerHTML = p.lines.map((l, y) => {
    let out = '', run = -1, buf = '';
    const flush = () => { if (buf) out += CLS[run] ? `<span class="${CLS[run]}">${buf}</span>` : buf; buf = ''; };
    for (let x = 0; x < l.length; x++) {
      const s = state[y][x];
      const c = s === 0 ? ' ' : s === 3 ? SCRAMBLE[(x * 7 + y * 3 + head) % SCRAMBLE.length] : s === 4 ? ' ' : l[x];
      const cls = s === 0 ? 1 : s; // hidden spaces share the plain run
      if (cls !== run) { flush(); run = cls; }
      buf += esc(c);
    }
    flush();
    return out;
  }).join('\n');
  p.fig.classList.toggle('typing', p.k < 1);
}
