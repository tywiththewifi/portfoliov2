import * as THREE from 'three';
import { MINT } from './mats';

// The CRT's screen by day: a browser cycling through website mockups in
// progress. On each one a cursor picks an element, which gets a design-tool
// selection box with handles and its size, then the page scrolls to the
// bottom and fades into the next. Redrawn at ~24 fps while it plays.

const W = 640, H = 480, BAR = 34; // browser toolbar height
const VIEW = H - BAR;
const SANS = '"NB International Pro", "Helvetica Neue", Arial, sans-serif';
const MONO = '"NB International Pro Mono", ui-monospace, Menlo, monospace';
const INK = '#141414', GREY = '#bdbdbd', SOFT = '#e8e8e8', PAPER = '#fbfbfb', DEEP = '#0b3a2c';

type Ctx = CanvasRenderingContext2D;
type Box = { x: number; y: number; w: number; h: number };
type Page = { path: string; height: number; pick: Box; draw: (c: Ctx) => void };

const rr = (c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) => {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
const bars = (c: Ctx, x: number, y: number, widths: number[], h = 7, gap = 9, fill = GREY) =>
  widths.forEach((w, i) => rr(c, x, y + i * (h + gap), w, h, h / 2, fill));
const text = (c: Ctx, s: string, x: number, y: number, size: number, fill = INK, font = SANS) => {
  c.fillStyle = fill;
  c.font = `${size}px ${font}`;
  c.textBaseline = 'alphabetic';
  c.fillText(s, x, y);
};
const sphere = (c: Ctx, x: number, y: number, r: number) => {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#d9fff3'); g.addColorStop(0.45, MINT); g.addColorStop(1, '#0a6b50');
  c.fillStyle = 'rgba(0,0,0,0.08)';
  c.beginPath(); c.ellipse(x, y + r * 1.15, r * 0.9, r * 0.16, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
};
const nav = (c: Ctx, brand: string, mark: 'dot' | 'square' = 'dot') => {
  rr(c, 0, 0, W, 56, 0, PAPER);
  if (mark === 'dot') { c.fillStyle = MINT; c.beginPath(); c.arc(32, 28, 8, 0, Math.PI * 2); c.fill(); }
  else rr(c, 24, 20, 16, 16, 4, INK);
  text(c, brand, 48, 34, 16);
  [0, 1, 2, 3].forEach((i) => rr(c, 300 + i * 62, 25, 44, 6, 3, GREY));
  rr(c, W - 118, 15, 94, 26, 13, INK);
  rr(c, W - 95, 25, 48, 6, 3, '#f2f2f2');
  rr(c, 0, 56, W, 1, 0, '#ececec');
};
const footer = (c: Ctx, y: number) => {
  rr(c, 0, y, W, 90, 0, INK);
  rr(c, 24, y + 28, 60, 8, 4, '#555');
  [0, 1, 2].forEach((i) => bars(c, 300 + i * 110, y + 26, [70, 54, 62], 6, 10, '#3d3d3d'));
};

const PAGES: Page[] = [
  {
    // a product landing page
    path: '/',
    height: 1010,
    pick: { x: 20, y: 104, w: 262, h: 116 },
    draw(c) {
      rr(c, 0, 0, W, this.height, 0, PAPER);
      nav(c, 'nova');
      rr(c, 24, 84, 86, 20, 10, '#dffbf2');
      rr(c, 34, 91, 66, 6, 3, '#11a57d');
      text(c, 'Sound,', 22, 158, 52);
      text(c, 'shaped.', 22, 212, 52);
      bars(c, 24, 238, [240, 196], 7, 9);
      rr(c, 24, 282, 118, 34, 17, MINT);
      rr(c, 50, 296, 66, 6, 3, DEEP);
      c.strokeStyle = GREY; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(152, 282, 108, 34, 17); c.stroke();
      const g = c.createLinearGradient(340, 84, 616, 380);
      g.addColorStop(0, '#f1f1f1'); g.addColorStop(1, '#e3f7f0');
      rr(c, 340, 80, 276, 300, 16, g);
      sphere(c, 478, 214, 76);
      rr(c, 356, 318, 112, 42, 10, '#ffffff');
      rr(c, 368, 330, 18, 18, 5, MINT);
      bars(c, 394, 331, [58, 40], 5, 6);
      [0, 1, 2, 3, 4].forEach((i) => rr(c, 34 + i * 120, 426, 80, 12, 6, SOFT));
      for (let i = 0; i < 3; i++) {
        const x = 24 + i * 204;
        rr(c, x, 488, 188, 196, 14, '#f1f1f1');
        rr(c, x + 18, 508, 30, 30, 8, i === 1 ? MINT : INK);
        rr(c, x + 18, 562, 110, 10, 5, INK);
        bars(c, x + 18, 586, [150, 140, 96], 6, 10);
      }
      text(c, '“It finally sounds', 120, 776, 30);
      text(c, 'like the room.”', 150, 814, 30);
      c.fillStyle = SOFT; c.beginPath(); c.arc(294, 860, 14, 0, Math.PI * 2); c.fill();
      rr(c, 316, 853, 80, 7, 3.5, GREY);
      footer(c, this.height - 90);
    },
  },
  {
    // a shop
    path: '/shop',
    height: 1040,
    pick: { x: 24, y: 176, w: 188, h: 200 },
    draw(c) {
      rr(c, 0, 0, W, this.height, 0, PAPER);
      nav(c, 'atelier', 'square');
      text(c, 'New arrivals', 22, 120, 34);
      ['All', 'Audio', 'Desk', 'Light'].forEach((_, i) => {
        rr(c, 24 + i * 76, 138, 66, 24, 12, i === 0 ? INK : '#efefef');
        rr(c, 38 + i * 76, 147, 38, 6, 3, i === 0 ? '#f2f2f2' : GREY);
      });
      for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
        const x = 24 + i * 204, y = 176 + r * 290, k = r * 3 + i;
        rr(c, x, y, 188, 200, 12, '#efefef');
        // a product: a cylinder, a box or a sphere
        if (k % 3 === 0) {
          rr(c, x + 70, y + 52, 48, 104, 20, k === 3 ? MINT : '#d2d2d2');
          rr(c, x + 70, y + 52, 48, 14, 7, 'rgba(255,255,255,0.4)');
        } else if (k % 3 === 1) {
          rr(c, x + 52, y + 74, 84, 70, 10, k === 1 ? INK : '#cfcfcf');
          rr(c, x + 64, y + 88, 30, 30, 15, k === 1 ? '#3a3a3a' : '#bdbdbd');
        } else sphere(c, x + 94, y + 96, 40);
        rr(c, x, y + 214, 120, 9, 4.5, INK);
        text(c, `$${[48, 120, 36, 64, 210, 18][k]}`, x, y + 248, 13, '#6b6b6b', MONO);
      }
      rr(c, 24, 776, 592, 124, 16, '#dffbf2');
      text(c, 'Free shipping over $100', 48, 832, 24);
      rr(c, 48, 852, 110, 30, 15, INK);
      rr(c, 70, 864, 66, 6, 3, '#f2f2f2');
      footer(c, this.height - 90);
    },
  },
  {
    // a studio's work grid
    path: '/work',
    height: 1060,
    pick: { x: 24, y: 168, w: 288, h: 240 },
    draw(c) {
      rr(c, 0, 0, W, this.height, 0, PAPER);
      nav(c, 'studio');
      text(c, 'Selected work', 22, 120, 38);
      bars(c, 24, 140, [300], 7, 9);
      const cols: [number, number, string][][] = [
        [[240, 0, 'dark'], [180, 1, 'soft'], [230, 2, 'mint']],
        [[180, 3, 'soft'], [270, 4, 'dark'], [200, 5, 'soft']],
      ];
      cols.forEach((col, ci) => {
        let y = 168;
        const x = 24 + ci * 304;
        col.forEach(([h, k, kind]) => {
          if (kind === 'dark') {
            rr(c, x, y, 288, h, 12, '#161616');
            c.strokeStyle = 'rgba(33,255,192,0.35)'; c.lineWidth = 1;
            for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(x + 144 + (i - 4) * 12, y + h * 0.55); c.lineTo(x + 144 + (i - 4) * 70, y + h); c.stroke(); }
            c.beginPath(); c.moveTo(x, y + h * 0.55); c.lineTo(x + 288, y + h * 0.55); c.stroke();
            sphere(c, x + 144, y + h * 0.42, 34);
          } else if (kind === 'mint') {
            rr(c, x, y, 288, h, 12, MINT);
            text(c, 'Aa', x + 24, y + h - 30, 64, DEEP);
          } else {
            rr(c, x, y, 288, h, 12, '#ececec');
            rr(c, x + 40, y + 34, 208, h - 68, 8, '#ffffff');
            bars(c, x + 58, y + 54, [120, 90], 6, 9);
            rr(c, x + 58, y + h - 66, 60, 16, 8, k % 2 ? INK : MINT);
          }
          rr(c, x, y + h + 12, 110, 8, 4, INK);
          rr(c, x, y + h + 28, 70, 6, 3, GREY);
          y += h + 56;
        });
      });
      footer(c, this.height - 90);
    },
  },
  {
    // a web app dashboard
    path: '/dashboard',
    height: 720,
    pick: { x: 162, y: 176, w: 300, h: 196 },
    draw(c) {
      rr(c, 0, 0, W, this.height, 0, '#f6f6f6');
      rr(c, 0, 0, 140, this.height, 0, '#ffffff');
      rr(c, 139, 0, 1, this.height, 0, '#ececec');
      c.fillStyle = MINT; c.beginPath(); c.arc(30, 30, 8, 0, Math.PI * 2); c.fill();
      rr(c, 46, 26, 60, 8, 4, INK);
      for (let i = 0; i < 7; i++) {
        if (i === 0) rr(c, 12, 62 + i * 30, 116, 24, 6, '#effcf8');
        rr(c, 24, 70 + i * 30, 10, 10, 3, i === 0 ? '#11a57d' : GREY);
        rr(c, 42, 72 + i * 30, 54 + ((i * 13) % 24), 6, 3, i === 0 ? INK : GREY);
      }
      text(c, 'Overview', 162, 58, 24);
      rr(c, W - 118, 36, 94, 28, 14, INK);
      rr(c, W - 95, 47, 48, 6, 3, '#f2f2f2');
      for (let i = 0; i < 3; i++) {
        const x = 162 + i * 154;
        rr(c, x, 84, 142, 76, 12, '#ffffff');
        rr(c, x + 14, 100, 50, 6, 3, GREY);
        text(c, ['2,481', '$18.2k', '4.6%'][i], x + 14, 138, 22, INK);
        rr(c, x + 96, 124, 32, 14, 7, '#dffbf2');
      }
      rr(c, 162, 176, 300, 196, 12, '#ffffff');
      rr(c, 178, 192, 80, 8, 4, INK);
      c.strokeStyle = '#f0f0f0'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(178, 226 + i * 36); c.lineTo(446, 226 + i * 36); c.stroke(); }
      const pts = [0.6, 0.5, 0.62, 0.4, 0.46, 0.3, 0.36, 0.18, 0.28, 0.1].map((v, i) => [178 + i * 29.8, 222 + v * 120]);
      const fill = c.createLinearGradient(0, 222, 0, 340);
      fill.addColorStop(0, 'rgba(33,255,192,0.35)'); fill.addColorStop(1, 'rgba(33,255,192,0)');
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.lineTo(446, 340); c.lineTo(178, 340); c.closePath(); c.fillStyle = fill; c.fill();
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = '#11c996'; c.lineWidth = 2.5; c.stroke();
      rr(c, 474, 176, 142, 196, 12, '#ffffff');
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i % 2 ? SOFT : '#dffbf2'; c.beginPath(); c.arc(494, 206 + i * 34, 9, 0, Math.PI * 2); c.fill();
        rr(c, 510, 202 + i * 34, 60, 6, 3, INK); rr(c, 580, 202 + i * 34, 22, 6, 3, GREY);
      }
      rr(c, 162, 386, 454, 260, 12, '#ffffff');
      for (let i = 0; i < 6; i++) {
        const y = 404 + i * 40;
        rr(c, 178, y + 6, 90, 7, 3.5, i ? GREY : INK);
        rr(c, 300, y + 6, 60, 7, 3.5, GREY);
        rr(c, 400, y + 2, 52, 16, 8, i === 0 ? '#ffffff' : i % 2 ? '#dffbf2' : '#f2f2f2');
        rr(c, 530, y + 6, 60, 7, 3.5, i ? INK : '#ffffff');
        if (i) rr(c, 178, y - 6, 422, 1, 0, '#f2f2f2');
      }
    },
  },
];

// timeline for each page, in seconds
const FADE = 0.5, AIM = 1.6, CLICK = 1.75, SCROLL0 = 3.4, SCROLL1 = 6.4, END = 7.6;
const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

export function webMockups() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  // each page is drawn once to its own canvas and scrolled from there
  let sheets: HTMLCanvasElement[] = [];
  const paint = () => {
    sheets = PAGES.map((p) => {
      const s = document.createElement('canvas');
      s.width = W; s.height = p.height;
      p.draw(s.getContext('2d')!);
      return s;
    });
  };
  paint();

  let page = 0, t = 0, acc = 0;
  const rest = { x: 520, y: 400 };
  let from = { ...rest };

  const scrollAt = (p: number, time: number) => (PAGES[p].height - VIEW) * ease((time - SCROLL0) / (SCROLL1 - SCROLL0));

  function drawPage(p: number, scroll: number, alpha: number, select: number) {
    c.globalAlpha = alpha;
    c.drawImage(sheets[p], 0, scroll, W, VIEW, 0, BAR, W, VIEW);
    if (select > 0) {
      // selection box, handles and size tag, scrolling with the page
      const b = PAGES[p].pick, y = BAR + b.y - scroll;
      c.globalAlpha = alpha * select;
      c.strokeStyle = '#11c996'; c.lineWidth = 2;
      c.strokeRect(b.x, y, b.w, b.h);
      for (const [hx, hy] of [[b.x, y], [b.x + b.w, y], [b.x, y + b.h], [b.x + b.w, y + b.h]]) {
        c.fillStyle = '#ffffff'; c.fillRect(hx - 5, hy - 5, 10, 10);
        c.strokeRect(hx - 5, hy - 5, 10, 10);
      }
      const tag = `${Math.round(b.w * 2)} × ${Math.round(b.h * 2)}`;
      c.font = `12px ${MONO}`;
      const tw = c.measureText(tag).width + 14;
      rr(c, b.x + b.w / 2 - tw / 2, y + b.h + 8, tw, 20, 4, '#11c996');
      c.fillStyle = '#ffffff'; c.textBaseline = 'middle'; c.textAlign = 'center';
      c.fillText(tag, b.x + b.w / 2, y + b.h + 18.5);
      c.textAlign = 'left';
    }
    c.globalAlpha = 1;
  }

  function cursor(x: number, y: number, click: number) {
    if (click > 0) {
      c.strokeStyle = `rgba(17, 201, 150, ${1 - click})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 6 + click * 18, 0, Math.PI * 2); c.stroke();
    }
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(0, 20); c.lineTo(5, 15); c.lineTo(9, 24); c.lineTo(12.5, 22.5); c.lineTo(8.5, 14); c.lineTo(15, 14); c.closePath();
    c.fillStyle = INK; c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke();
    c.restore();
  }

  function chrome(path: string) {
    rr(c, 0, 0, W, BAR, 0, '#ececec');
    ['#d6d6d6', '#d6d6d6', '#d6d6d6'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(20 + i * 16, BAR / 2, 5, 0, Math.PI * 2); c.fill(); });
    rr(c, 150, 7, 340, 20, 10, '#f8f8f8');
    c.fillStyle = MINT; c.beginPath(); c.arc(166, BAR / 2, 4, 0, Math.PI * 2); c.fill();
    c.font = `12px ${MONO}`; c.fillStyle = '#7a7a7a'; c.textBaseline = 'middle';
    c.fillText(`localhost:5173${path}`, 178, BAR / 2 + 1);
    rr(c, 0, BAR - 1, W, 1, 0, '#dcdcdc');
  }

  function draw() {
    const p = PAGES[page];
    const scroll = scrollAt(page, t);
    c.clearRect(0, 0, W, H);
    // the previous page fades out under the new one
    if (t < FADE) {
      const prev = (page + PAGES.length - 1) % PAGES.length;
      drawPage(prev, PAGES[prev].height - VIEW, 1, 1);
    }
    drawPage(page, scroll, ease(t / FADE), ease((t - CLICK) / 0.15));
    chrome(p.path);
    // scrollbar
    const th = (VIEW / p.height) * VIEW;
    rr(c, W - 7, BAR + 3 + (scroll / (p.height - VIEW)) * (VIEW - th - 6), 4, th, 2, 'rgba(0,0,0,0.25)');
    // cursor: glides to the element, clicks, then drifts off while it scrolls
    const target = { x: p.pick.x + p.pick.w * 0.62, y: BAR + p.pick.y + p.pick.h * 0.55 };
    let x: number, y: number;
    if (t < AIM) {
      const k = ease((t - FADE) / (AIM - FADE));
      x = from.x + (target.x - from.x) * k; y = from.y + (target.y - from.y) * k;
    } else if (t < SCROLL0) {
      x = target.x; y = target.y;
    } else {
      const k = ease((t - SCROLL0) / 1.2);
      x = target.x + (rest.x - target.x) * k; y = target.y - scroll + (rest.y - target.y + scroll) * k;
    }
    cursor(x, y, t > CLICK && t < CLICK + 0.45 ? (t - CLICK) / 0.45 : 0);

    // a light touch of the tube: scanlines and darker corners
    c.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let yy = 0; yy < H; yy += 3) c.fillRect(0, yy, W, 1);
    const v = c.createRadialGradient(W / 2, H / 2, W * 0.34, W / 2, H / 2, W * 0.68);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.32)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    tex.needsUpdate = true;
  }

  return {
    tex,
    draw,
    // repaint the pages once the NB faces have loaded
    repaint() { paint(); draw(); },
    update(dt: number) {
      t += dt;
      if (t >= END) {
        from = { x: rest.x, y: rest.y };
        t -= END;
        page = (page + 1) % PAGES.length;
      }
      acc += dt;
      if (acc < 1 / 24) return;
      acc = 0;
      draw();
    },
    // a still frame: the landing page with its heading selected
    full() { page = 0; t = SCROLL0 - 0.01; draw(); },
  };
}
