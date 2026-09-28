import { accent, accentHi } from '../art/theme';

// Site-wide floating dust: a fixed, pointer-transparent canvas of pixel
// motes drifting over the whole page, like the dust in the hero room.
// Motes parallax against the scroll and scatter away from the cursor.

type Mote = { x: number; y: number; z: number; vx: number; vy: number; ph: number; hue: number };

const PX = 2; // one art pixel in CSS px

export function mountDust() {
  const cv = document.createElement('canvas');
  cv.className = 'site-dust px';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  // warm motes plus the accent, and a rare teal one from the window
  const COLS = ['#ffd9a8', accentHi(), accent(), '#fff1dc', '#7fd6cc'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;
  let motes: Mote[] = [];
  const pointer = { x: -1e4, y: -1e4 };

  const seed = () => {
    const n = Math.round(Math.min(160, (W * H) / 5200));
    motes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: 0.3 + Math.random() * 0.7, // depth: nearer motes are bigger, brighter, faster
      vx: 0, vy: 0, ph: Math.random() * 6.28,
      hue: Math.random() < 0.12 ? 4 : Math.floor(Math.random() * 4),
    }));
  };
  const resize = () => {
    W = Math.ceil(innerWidth / PX);
    H = Math.ceil(innerHeight / PX);
    cv.width = W;
    cv.height = H;
    seed();
  };
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / PX; pointer.y = e.clientY / PX; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e4; });

  let lastScroll = scrollY, last = 0;
  const frame = (now: number) => {
    const t = now / 1000;
    const dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    const ds = (scrollY - lastScroll) / PX;
    lastScroll = scrollY;
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      // slow buoyant drift, a little wander, parallax with scroll by depth
      const wx = Math.sin(t * 0.4 + m.ph) * 4 + Math.sin(t * 0.13 + m.ph * 3) * 3;
      const wy = -3 - m.z * 3 + Math.cos(t * 0.33 + m.ph) * 2;
      const dx = m.x - pointer.x, dy = m.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < 1600) {
        const f = (1 - d2 / 1600) * 60;
        const d = Math.sqrt(d2) || 1;
        m.vx += (dx / d) * f * dt;
        m.vy += (dy / d) * f * dt;
      }
      m.vx *= 1 - Math.min(1, dt * 2.2);
      m.vy *= 1 - Math.min(1, dt * 2.2);
      m.x += (wx + m.vx) * m.z * dt;
      m.y += (wy + m.vy) * m.z * dt - ds * m.z * 0.35;
      if (m.y < -4) m.y += H + 8;
      if (m.y > H + 4) m.y -= H + 8;
      if (m.x < -4) m.x += W + 8;
      if (m.x > W + 4) m.x -= W + 8;
      // twinkle: quantised so it steps like the pixel art
      const tw = Math.floor((0.55 + 0.45 * Math.sin(t * (0.8 + m.z) + m.ph * 5)) * 4) / 4;
      ctx.globalAlpha = (0.25 + m.z * 0.55) * tw;
      ctx.fillStyle = COLS[m.hue];
      const s = m.z > 0.82 ? 2 : 1;
      ctx.fillRect(Math.round(m.x), Math.round(m.y), s, s);
      if (m.z > 0.9 && tw > 0.7) {
        // the nearest motes get a faint plus-shaped glint
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y), s + 2, s);
        ctx.fillRect(Math.round(m.x), Math.round(m.y) - 1, s, s + 2);
      }
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
