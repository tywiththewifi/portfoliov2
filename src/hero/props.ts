import { Pix } from '../art/pix';
import { pixelTexture } from './materials';

// Idle CRT: a tiny terminal that invites a click. Redrawn every frame.
export function makeScreen() {
  const W = 108, H = 81;
  const g = new Pix(W, H);
  const tex = pixelTexture(g.canvas);
  const lines = ['> BOOT YOURNAME.OS', '> MOUNT /WORK', '> 4 PROJECTS FOUND', '> READY_'];
  const draw = (t: number, hover: number, os = false) => {
    if (os) { g.grad(0, 0, W, H, ['#0a3326', '#062019']); tex.needsUpdate = true; return; }
    g.grad(0, 0, W, H, ['#07261d', '#0b3a2b', '#082c21', '#061f18']);
    g.r(0, 0, W, 9, '#0f4a36');
    g.text('WORK', 4, 2, '#b8ffd8');
    g.text(new Date().toTimeString().slice(0, 5), W - 26, 2, '#62ff9a');
    const shown = Math.min(lines.length, Math.floor((t % 10) / 0.7) + 1);
    for (let i = 0; i < shown; i++) g.text(lines[i], 4, 14 + i * 9, '#62ff9a');
    // tiny progress bar
    const prog = Math.min(1, (t % 10) / 3);
    g.r(4, 52, 60, 4, '#0f4a36'); g.r(4, 52, Math.round(60 * prog), 4, '#62ff9a');
    const blink = Math.floor(t * 2.2) % 2 === 0;
    if (blink || hover > 0.5) {
      g.r(4, 64, W - 8, 11, hover > 0.5 ? '#62ff9a' : '#0f4a36');
      g.text('CLICK TO OPEN', Math.round(W / 2 - 26), 67, hover > 0.5 ? '#062019' : '#b8ffd8');
    }
    // scanlines, vignette corners, roll bar, glare
    for (let y = 0; y < H; y += 2) g.dens(0, y, W, 1, '#000000', 0.35);
    const roll = Math.floor((t * 18) % (H + 12)) - 6;
    g.dens(0, roll, W, 4, '#bfffe0', 0.16);
    g.dens(0, 0, 6, H, '#000000', 0.4); g.dens(W - 6, 0, 6, H, '#000000', 0.4);
    g.dens(6, 3, 26, 2, '#ffffff', 0.2);
    tex.needsUpdate = true;
  };
  draw(0, 0);
  return { tex, draw };
}
