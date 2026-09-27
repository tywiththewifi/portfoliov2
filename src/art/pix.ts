// Tiny pixel painter for procedurally drawn sprites (placeholders until the
// generated art layers are in).

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '111101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110', ' ': '000000000000000',
  '/': '001001010100100', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000',
  '!': '010010010000010', '+': '000010111010000', "'": '010010000000000', '&': '010101010101011',
};

const BAYER =[0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

export class Pix {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  r(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  p(x: number, y: number, c: string) {
    this.r(x, y, 1, 1, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let dy = -ry; dy <= ry; dy++) {
      const t = 1 - (dy * dy) / (ry * ry + 0.0001);
      if (t < 0) continue;
      const half = Math.round(rx * Math.sqrt(t));
      this.r(cx - half, cy + dy, half * 2 + 1, 1, c);
    }
  }

  circle(cx: number, cy: number, r: number, c: string) {
    this.ellipse(cx, cy, r, r, c);
  }

  // Vertical banded gradient with ordered dithering between bands.
  grad(x: number, y: number, w: number, h: number, cols: string[]) {
    const n = cols.length - 1;
    for (let j = 0; j < h; j++) {
      const f = (j / Math.max(1, h - 1)) * n;
      const i0 = Math.min(n, Math.floor(f));
      const fr = f - i0;
      for (let i = 0; i < w; i++) {
        this.p(x + i, y + j, fr > bayer(x + i, y + j) && i0 < n ? cols[i0 + 1] : cols[i0]);
      }
    }
  }

  dens(x: number, y: number, w: number, h: number, c: string, d: number) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if (bayer(x + i, y + j) < d) this.p(x + i, y + j, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.p(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }

  // 3x5 bitmap font. Returns the x after the last glyph.
  text(s: string, x: number, y: number, c: string, scale = 1) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT[' '];
      for (let j = 0; j < 5; j++)
        for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') this.r(cx + i * scale, y + j * scale, scale, scale, c);
      cx += 4 * scale;
    }
    return cx;
  }

  textWidth(s: string, scale = 1) {
    return s.length * 4 * scale - scale;
  }

  // Add a 1px dark outline around every opaque pixel.
  outline(c = '#1a0d10') {
    const img = this.ctx.getImageData(0, 0, this.w, this.h).data;
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : img[(y * this.w + x) * 4 + 3]);
    this.ctx.fillStyle = c;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) this.ctx.fillRect(x, y, 1, 1);
    return this;
  }
}

// 2000s silver point-and-shoot, front view. `flash` lights the flash window.
export function drawCamera(flash = false) {
  const g = new Pix(44, 28);
  // body
  g.r(1, 5, 42, 21, '#b9bcc6');
  g.grad(1, 5, 42, 21, ['#e2e5ec', '#c7cbd5', '#a9adb9', '#8d919e']);
  g.r(1, 5, 42, 1, '#f4f6fa');
  g.r(1, 24, 42, 2, '#6f7380');
  // grip + brand strip
  g.r(1, 7, 6, 17, '#9296a3');
  g.r(2, 8, 1, 15, '#b0b4c0');
  g.r(30, 21, 10, 1, '#5d6170');
  // top plate: shutter + power
  g.r(31, 3, 7, 2, '#8d919e');
  g.r(32, 2, 5, 1, '#c9483a');
  g.r(10, 4, 4, 1, '#6f7380');
  // flash window
  g.r(29, 8, 11, 5, '#6f7380');
  g.r(30, 9, 9, 3, flash ? '#ffffff' : '#dfe6f0');
  if (!flash) {
    g.p(31, 9, '#ffffff');
    g.r(33, 10, 5, 1, '#c4ccd9');
  }
  // viewfinder + AF lamp
  g.r(21, 8, 4, 3, '#2b2d36');
  g.p(22, 9, '#5e7aa0');
  g.circle(26, 16, 1, flash ? '#ff9a4a' : '#c9483a');
  // lens barrel
  g.circle(15, 16, 8, '#6f7380');
  g.circle(15, 16, 7, '#d5d8e0');
  g.circle(15, 16, 6, '#8d919e');
  g.circle(15, 16, 5, '#2b2d36');
  g.circle(15, 16, 3, '#16171d');
  g.circle(15, 16, 2, '#2d3a55');
  g.p(13, 14, '#9fb7e0');
  g.p(14, 14, '#dfe8ff');
  g.p(17, 18, '#4a5f86');
  return g.outline().canvas;
}
