// The case-study panels. Behind each screen, a grid floor like the hero's,
// seen from just above: it runs back from the panel's bottom edge to a
// horizon at 42% of its height, in square cells at the front, its centre
// line in mint (CSS fades it out toward the horizon and pools a glow under
// the screen). It's an SVG drawn to the panel's size, and redrawn when that
// changes.

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

export function mountPanels() {
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const svg = e.target as SVGSVGElement;
      drawFloor(svg, svg.clientWidth, svg.clientHeight);
    }
  });
  for (const p of document.querySelectorAll<HTMLElement>('.work .panel')) {
    const floor = document.createElementNS(SVG, 'svg');
    floor.classList.add('floor');
    floor.setAttribute('aria-hidden', 'true');
    floor.setAttribute('preserveAspectRatio', 'none');
    p.prepend(floor);
    ro.observe(floor);
  }
}
