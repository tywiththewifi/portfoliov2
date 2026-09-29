import * as THREE from 'three';
import { rng } from './kit';
import { MINT } from './mats';

// The CRT's screen: a terminal typing a short dev log (pull, build, perf
// check, commit, deploy) in NB International Pro Mono, then clearing and
// starting over. A tmux-style status bar runs along the bottom. The canvas
// is only redrawn when something on it changes.

type Kind = 'out' | 'dim' | 'ok' | 'blank';
type Line = { text: string; kind: Kind | 'cmd' };

const PROMPT = '~ $ ';
const LOG: { cmd: string; out: [string, Kind][]; wait: number }[] = [
  { cmd: 'git pull --rebase', out: [['Already up to date.', 'dim']], wait: 0.9 },
  {
    cmd: 'npm run build',
    out: [
      ['vite v8.3.1 building...', 'dim'],
      ['✓ 42 modules transformed', 'out'],
      ['index.html          2.1 kB', 'dim'],
      ['assets/index.css    4.8 kB', 'dim'],
      ['assets/index.js   612.4 kB', 'dim'],
      ['✓ built in 1.84s', 'ok'],
    ],
    wait: 1.2,
  },
  { cmd: 'npm run perf', out: [['LCP 0.9s  CLS 0  INP 64ms', 'out'], ['score 98/100', 'ok']], wait: 1.1 },
  {
    cmd: 'git commit -m "desk in a void"',
    out: [['[main 7c1e2a9] desk in a void', 'out'], [' 3 files changed, 214(+)', 'dim']],
    wait: 0.8,
  },
  { cmd: 'npm run deploy', out: [['deploying...', 'dim'], ['✓ live in 14s', 'ok'], ['conversion ▲ 12.4% wk/wk', 'ok']], wait: 4 },
];

const W = 640, H = 480;
const PAD_X = 34, PAD_Y = 30, ROW = 35, BAR = 34;
const ROWS = Math.floor((H - PAD_Y - BAR - 14) / ROW);
const FONT = '"NB International Pro Mono", ui-monospace, Menlo, monospace';
const COLORS: Record<Line['kind'], string> = { cmd: '#e9fff7', out: '#a9dcc9', dim: '#5f927f', ok: MINT, blank: '#000' };

export function devLog() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const lines: Line[] = [];
  const R = rng(9);
  let typing = false;

  function* play(): Generator<number, void> {
    for (;;) {
      lines.length = 0;
      lines.push({ text: PROMPT, kind: 'cmd' });
      yield 1.2;
      for (const b of LOG) {
        const line = lines[lines.length - 1];
        typing = true;
        for (let i = 1; i <= b.cmd.length; i++) {
          line.text = PROMPT + b.cmd.slice(0, i);
          yield 0.04 + R() * 0.07 + (b.cmd[i - 1] === ' ' ? 0.05 : 0) + (R() < 0.04 ? 0.3 : 0);
        }
        typing = false;
        yield 0.4;
        for (const [text, kind] of b.out) {
          lines.push({ text, kind });
          yield 0.05 + R() * 0.14;
        }
        lines.push({ text: PROMPT, kind: 'cmd' });
        yield b.wait;
      }
    }
  }

  let run = play();
  let wait = 0, acc = 0, blink = 0, cursor = true;

  function draw() {
    // phosphor: a dark green-black, brighter toward the middle
    const bg = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
    bg.addColorStop(0, '#0b3326'); bg.addColorStop(1, '#03100b');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    c.font = `25px ${FONT}`;
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(33, 255, 192, 0.45)';
    c.shadowBlur = 8;
    const shown = lines.slice(-ROWS);
    shown.forEach((l, i) => {
      const y = PAD_Y + i * ROW + ROW / 2;
      if (l.kind === 'cmd') {
        c.fillStyle = MINT;
        c.fillText(PROMPT, PAD_X, y);
        c.fillStyle = COLORS.cmd;
        c.fillText(l.text.slice(PROMPT.length), PAD_X + c.measureText(PROMPT).width, y);
      } else if (l.text) {
        c.fillStyle = COLORS[l.kind];
        c.fillText(l.text, PAD_X, y);
      }
    });
    // block cursor at the end of the prompt line
    const last = shown[shown.length - 1];
    if (last && last.kind === 'cmd' && (cursor || typing)) {
      c.fillStyle = MINT;
      c.fillRect(PAD_X + c.measureText(last.text).width + 3, PAD_Y + (shown.length - 1) * ROW + 6, 14, ROW - 12);
    }
    c.shadowBlur = 0;

    // status bar
    c.fillStyle = MINT;
    c.fillRect(0, H - BAR, W, BAR);
    c.fillStyle = '#04140e';
    c.font = `19px ${FONT}`;
    c.fillText('[site] 0:zsh*', PAD_X - 12, H - BAR / 2 + 1);
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    c.textAlign = 'right';
    c.fillText(`main  ${time}`, W - PAD_X + 12, H - BAR / 2 + 1);
    c.textAlign = 'left';

    // scanlines and a soft vignette into the tube's corners
    c.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
    const v = c.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.66);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    tex.needsUpdate = true;
  }

  return {
    tex,
    draw,
    // Advance by dt seconds; redraws only if something changed.
    update(dt: number) {
      let changed = false;
      acc += dt;
      while (acc >= wait) {
        acc -= wait;
        const r = run.next();
        if (r.done) run = play();
        wait = r.done ? 0 : r.value;
        changed = true;
      }
      blink += dt;
      if (blink > 0.53) { blink = 0; cursor = !cursor; changed = changed || !typing; }
      if (changed) draw();
    },
    // A still frame of the whole log (for reduced motion).
    full() {
      lines.length = 0;
      for (const b of LOG) {
        lines.push({ text: PROMPT + b.cmd, kind: 'cmd' });
        for (const [text, kind] of b.out) lines.push({ text, kind });
      }
      lines.push({ text: PROMPT, kind: 'cmd' });
      typing = false;
      cursor = true;
      draw();
    },
  };
}
