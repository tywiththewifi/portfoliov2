// The case-study panels. Behind each screen, a grid floor like the hero's,
// seen from just above: it runs back from the panel's bottom edge to a
// horizon at 42% of its height, in square cells at the front, its centre
// line in mint (CSS fades it out toward the horizon and pools a glow under
// the screen). It's an SVG drawn to the panel's size, and redrawn when that
// changes.
//
// With a mouse, the screens are a little suspended in space: the pointer is
// like your eye moving, so as it moves over a panel each screen eases the
// other way and turns its near side toward you, and the floor behind it
// drifts the same way but less. In a row of phones each sits at its own
// depth, so they move by different amounts. A screen that runs off
// the panel's edge never moves in from that edge. Only transforms change,
// and only while the pointer is over a panel or the screens are settling
// back; nothing moves on touch screens or with reduced motion.

const SVG = 'http://www.w3.org/2000/svg';

function drawFloor(svg: SVGSVGElement, w: number, h: number) {
  const cx = w / 2, hy = h * 0.42, depth = h - hy;
  const cell = Math.max(30, Math.min(60, w / 14));
  const P = (x: number, z: number) => `${(cx + x / z).toFixed(1)} ${(hy + depth / z).toFixed(1)}`;
  const far = 10; // how far back the lines are drawn (faded out by then)
  const lines: string[] = [], axis: string[] = [];
  // lines running back, a cell apart at the front; those beyond the panel's
  // bottom corners come in from its sides
  const K = Math.ceil((cx * far) / cell);
  for (let k = -K; k <= K; k++) (k === 0 ? axis : lines).push(`M${P(k * cell, 1)}L${P(k * cell, far)}`);
  // lines across, spaced so the cells are square at the front (and wider
  // apart further back, where they're fading anyway)
  const dz = cell / depth;
  for (let z = 1 + dz; z < far; z += dz * Math.max(1, z * 0.6)) lines.push(`M${P(-cx * far, z)}L${P(cx * far, z)}`);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<path class="lines" d="${lines.join('')}"/><path class="axis" d="${axis.join('')}"/>`;
}

// how far the screens move at the panel's edge, in px (the floor moves a
// fraction of that), and how far they turn, in degrees
const SHIFT_X = 12, SHIFT_Y = 9, FLOOR = 0.35, TURN_X = 2.5, TURN_Y = 3.5;
// relative depths for the screens in a row of phones
const DEPTHS = [1, 1.4, 0.8, 1.2];

export function mountPanels() {
  const panels = [...document.querySelectorAll<HTMLElement>('.work .panel')];
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const svg = e.target as SVGSVGElement;
      drawFloor(svg, svg.clientWidth, svg.clientHeight);
    }
  });
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  for (const p of panels) {
    const floor = document.createElementNS(SVG, 'svg');
    floor.classList.add('floor');
    floor.setAttribute('aria-hidden', 'true');
    floor.setAttribute('preserveAspectRatio', 'none');
    p.prepend(floor);
    ro.observe(floor);

    const shots = [...p.querySelectorAll<HTMLElement>('.shot')];
    const pinY = p.matches('.bleed-b, .clip'), pinX = p.matches('.bleed-r');
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, last = 0;
    const apply = () => {
      shots.forEach((s, i) => {
        const d = shots.length > 1 ? DEPTHS[i % DEPTHS.length] : 1;
        let X = -x * SHIFT_X * d, Y = -y * SHIFT_Y * d;
        if (pinX) X = Math.max(X, 0);
        if (pinY) Y = Math.max(Y, 0);
        s.style.transform = `translate3d(${X.toFixed(2)}px, ${Y.toFixed(2)}px, 0) rotateY(${(-x * TURN_Y * d).toFixed(3)}deg) rotateX(${(y * TURN_X * d).toFixed(3)}deg)`;
      });
      floor.style.transform = `translate3d(${(-x * SHIFT_X * FLOOR).toFixed(2)}px, ${(-y * SHIFT_Y * FLOOR).toFixed(2)}px, 0)`;
    };
    const step = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = 1 - Math.exp(-dt * 7);
      x += (tx - x) * k;
      y += (ty - y) * k;
      const settled = Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001;
      if (settled) { x = tx; y = ty; }
      apply();
      if (!settled) { raf = requestAnimationFrame(step); return; }
      raf = 0;
      last = 0;
      // back at rest: drop the layers the transforms needed
      if (!tx && !ty) for (const el of [...shots, floor]) { el.style.transform = ''; el.style.willChange = ''; }
    };
    const kick = () => {
      if (raf) return;
      for (const el of [...shots, floor]) el.style.willChange = 'transform';
      raf = requestAnimationFrame(step);
    };
    p.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !mouse.matches || still.matches) return;
      const r = p.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    });
    p.addEventListener('pointerleave', () => {
      if (!tx && !ty) return;
      tx = ty = 0;
      kick();
    });
  }
}
