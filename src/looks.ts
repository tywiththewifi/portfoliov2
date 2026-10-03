import './looks.css';

// Exploration: the case-study galleries in four treatments (see looks.css),
// with a switcher at the bottom of the screen to compare them. The choice is
// kept in the URL (?look=) and in localStorage. Once one is chosen, it moves
// into styles.css and this file goes.
const LOOKS = [
  ['panel', 'Current'],
  ['floor', 'Floor'],
  ['room', 'Room'],
  ['lattice', 'Lattice'],
  ['float', 'No container'],
] as const;
type Look = (typeof LOOKS)[number][0];

const SVG = 'http://www.w3.org/2000/svg';

// A grid floor like the hero's, seen from just above: it runs back from the
// panel's bottom edge to a horizon at 42% of its height, in square cells
// `cell` px across at the front; its centre line is mint. (CSS fades it out
// toward the horizon.)
function drawFloor(svg: SVGSVGElement, w: number, h: number) {
  const cx = w / 2, hy = h * 0.42, depth = h - hy;
  const cell = Math.max(30, Math.min(60, w / 14));
  const P = (x: number, z: number) => `${(cx + x / z).toFixed(1)} ${(hy + depth / z).toFixed(1)}`;
  const far = 14; // how far back the lines are drawn (they're faded out by then)
  const lines: string[] = [], axis: string[] = [];
  // lines running back, a cell apart at the front; those beyond the panel's
  // bottom corners come in from its sides
  const K = Math.ceil((cx * far) / cell);
  for (let k = -K; k <= K; k++) (k === 0 ? axis : lines).push(`M${P(k * cell, 1)}L${P(k * cell, far)}`);
  // lines across, spaced so the cells are square at the front
  const dz = cell / depth;
  for (let z = 1 + dz; z < far; z += dz * Math.max(1, z * 0.6)) lines.push(`M${P(-cx * far, z)}L${P(cx * far, z)}`);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<path class="near" d="${lines.join('')}"/><path class="axis" d="${axis.join('')}"/>`;
}

// A room in one-point perspective round the panel's middle: floor, ceiling
// and walls run back from the panel's edges to a back wall at `back` of its
// size, gridded in square cells `cell` px across at the front. Lines nearer
// the front are a little stronger; the floor's centre line and the back
// wall's foot (the horizon) are mint.
function drawRoom(svg: SVGSVGElement, w: number, h: number) {
  const back = 0.5, Z = 1 / back;
  const cx = w / 2, cy = h * 0.47; // the vanishing point, a touch above centre
  const cell = Math.max(26, Math.min(56, w / 16));
  const P = (x: number, y: number, z: number) => `${(cx + (x - cx) / z).toFixed(1)} ${(cy + (y - cy) / z).toFixed(1)}`;
  const seg = (a: string, b: string) => `M${a}L${b}`;
  const near: string[] = [], far: string[] = [], axis: string[] = [];
  // lines running back: on the floor and ceiling from points along the
  // panel's bottom and top edges, on the walls from points down its sides
  for (let x = cx - Math.floor(cx / cell) * cell; x <= w + 0.5; x += cell) {
    (Math.abs(x - cx) < 0.5 ? axis : near).push(seg(P(x, h, 1), P(x, h, Z)));
    near.push(seg(P(x, 0, 1), P(x, 0, Z)));
    far.push(seg(P(x, 0, Z), P(x, h, Z))); // and up the back wall
  }
  for (let y = cy - Math.floor(cy / cell) * cell; y <= h + 0.5; y += cell) {
    near.push(seg(P(0, y, 1), P(0, y, Z)), seg(P(w, y, 1), P(w, y, Z)));
    far.push(seg(P(0, y, Z), P(w, y, Z))); // and across the back wall
  }
  // rings round the room, spaced so the floor's cells are square at the front
  const steps = Math.max(3, Math.round((Z - 1) / (cell / (h - cy))));
  for (let k = 1; k < steps; k++) {
    const z = 1 + ((Z - 1) * k) / steps;
    (k < steps / 2 ? near : far).push(`M${P(0, 0, z)}L${P(w, 0, z)}L${P(w, h, z)}L${P(0, h, z)}Z`);
  }
  // the back wall's outline, its foot in mint
  far.push(seg(P(0, 0, Z), P(w, 0, Z)), seg(P(0, 0, Z), P(0, h, Z)), seg(P(w, 0, Z), P(w, h, Z)));
  axis.push(seg(P(0, h, Z), P(w, h, Z)));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<path class="far" d="${far.join('')}"/><path class="near" d="${near.join('')}"/><path class="axis" d="${axis.join('')}"/>`;
}

// Aspect ratio of what a figure shows: its media's, a phone row's (phones
// side by side, with gaps of about 5% of their height), or for a cropped
// long page, the crop's.
function aspect(fig: HTMLElement) {
  if (fig.classList.contains('clip')) return fig.classList.contains('ar-1') ? 1 : fig.classList.contains('fill') ? 0.75 : 16 / 7;
  const phones = fig.querySelector('.phones');
  if (phones) {
    const n = phones.children.length, img = phones.children[0];
    const a = +img.getAttribute('width')! / +img.getAttribute('height')!;
    return n * a + (n - 1) * 0.05;
  }
  const media = fig.querySelector('img, video')!;
  return +media.getAttribute('width')! / +media.getAttribute('height')!;
}

export function mountLooks() {
  const work = document.querySelector<HTMLElement>('.work');
  if (!work) return;
  const panels = [...work.querySelectorAll<HTMLElement>('.panel')];

  // float: aspect ratios for the justified rows
  for (const row of work.querySelectorAll<HTMLElement>('.row')) {
    let sum = 0, tall = true;
    for (const fig of row.querySelectorAll<HTMLElement>(':scope > .panel')) {
      const a = aspect(fig);
      fig.style.setProperty('--a', a.toFixed(4));
      sum += a;
      tall &&= !!fig.querySelector('.phone');
    }
    row.style.setProperty('--sum', sum.toFixed(4));
    row.classList.toggle('tall', tall);
  }

  // floor and room: an SVG behind each panel's screen, drawn to the
  // panel's size (and redrawn when it changes, while one of them shows)
  const draws: Partial<Record<Look, typeof drawRoom>> = { floor: drawFloor, room: drawRoom };
  const backdrops = new Map<HTMLElement, SVGSVGElement>();
  const draw = (p: HTMLElement) => {
    const f = draws[work.dataset.look as Look], svg = backdrops.get(p);
    if (f && svg) f(svg, p.clientWidth, p.clientHeight);
  };
  const ro = new ResizeObserver((entries) => entries.forEach((e) => draw(e.target as HTMLElement)));
  const drawAll = () => {
    for (const p of panels) {
      if (!backdrops.has(p)) {
        const svg = document.createElementNS(SVG, 'svg');
        svg.classList.add('backdrop');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('preserveAspectRatio', 'none');
        p.prepend(svg);
        backdrops.set(p, svg);
        ro.observe(p);
      }
      draw(p);
    }
  };

  // the switcher
  const bar = document.createElement('div');
  bar.className = 'looks';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Case-study gallery style');
  const set = (look: Look, remember = true) => {
    if (look === 'panel') delete work.dataset.look; else work.dataset.look = look;
    if (draws[look]) drawAll();
    for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.look === look));
    if (!remember) return;
    try { localStorage.setItem('tc-look', look); } catch { /* storage blocked */ }
    const url = new URL(location.href);
    url.searchParams.set('look', look);
    history.replaceState(null, '', url);
  };
  for (const [look, name] of LOOKS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.look = look;
    b.textContent = name;
    b.addEventListener('click', () => set(look));
    bar.append(b);
  }
  document.body.append(bar);

  const asked = new URL(location.href).searchParams.get('look');
  let stored: string | null = null;
  try { stored = localStorage.getItem('tc-look'); } catch { /* storage blocked */ }
  const start = [asked, stored].find((l) => LOOKS.some(([k]) => k === l)) as Look | undefined;
  set(start ?? 'panel', false);
}
