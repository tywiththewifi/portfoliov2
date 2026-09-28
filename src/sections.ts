import { Pix } from './art/pix';
import { rng } from './art/posters';
import { iconURL, type IconId } from './art/icons';
import { paperize } from './art/paper';
import { accent } from './art/theme';
import { projects, services, site } from './content/data';

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ARROW = '<svg viewBox="0 0 9 9" aria-hidden="true"><path d="M1.5 4.5h6M5 2l2.5 2.5L5 7" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';

// Placeholder project visual: a little pixel mock of the thing, per kind.
function workVisual(hue: number, k: number) {
  const W = 200, H = 124;
  const g = new Pix(W, H);
  const R = rng(900 + k);
  const c = (dh: number, s: number, l: number) => hsl(hue + dh, s, l);
  g.grad(0, 0, W, H, [c(0, 40, 14), c(20, 50, 24), c(35, 55, 34)]);
  g.dens(0, 0, W, H, '#000000', 0.12);
  // browser window
  const wx = 14, wy = 12, ww = W - 28, wh = H - 24;
  g.r(wx + 3, wy + 4, ww, wh, 'rgba(0,0,0,.35)');
  g.r(wx, wy, ww, wh, '#f3ead9');
  g.r(wx, wy, ww, 9, '#d9cdb8');
  ['#e8483b', '#f2b233', '#5cbf6a'].forEach((d, i) => g.r(wx + 4 + i * 6, wy + 3, 3, 3, d));
  g.r(wx + 26, wy + 2, ww - 34, 5, '#efe4d0');
  const x0 = wx + 8, y0 = wy + 15, iw = ww - 16;
  if (k % 4 === 0) {
    // landing page: big hero shape, headline, three cards
    g.grad(x0, y0, iw, 44, [c(0, 60, 30), c(30, 70, 50)]);
    g.circle(x0 + iw - 30, y0 + 22, 15, c(40, 90, 70));
    g.dens(x0, y0 + 30, iw, 14, c(-10, 50, 22), 0.7);
    g.r(x0 + 8, y0 + 12, 60, 6, '#fff7ea'); g.r(x0 + 8, y0 + 22, 40, 3, 'rgba(255,247,234,.7)');
    for (let i = 0; i < 3; i++) { g.r(x0 + i * (iw / 3) + 1, y0 + 50, iw / 3 - 4, 22, c(i * 30, 30, 85)); g.r(x0 + i * (iw / 3) + 5, y0 + 55, 20, 3, c(i * 30, 40, 40)); }
  } else if (k % 4 === 1) {
    // app: two phones on a tinted panel
    g.r(x0, y0, iw, 78, c(0, 30, 88));
    for (let i = 0; i < 2; i++) {
      const px = x0 + 34 + i * 62, py = y0 + 6 + i * 6;
      g.r(px, py, 38, 66, '#1c1418'); g.r(px + 2, py + 4, 34, 58, c(i * 20, 45, 94));
      g.r(px + 5, py + 8, 20, 4, c(0, 50, 35));
      for (let j = 0; j < 4; j++) g.r(px + 5, py + 16 + j * 11, 28, 8, c(j * 25, 55, 70 - j * 6));
    }
  } else if (k % 4 === 2) {
    // audio tool: timeline with waveforms and a playhead
    g.r(x0, y0, iw, 78, '#221a1e');
    for (let t = 0; t < 4; t++) {
      g.r(x0 + 2, y0 + 4 + t * 18, 18, 14, c(t * 35, 50, 45));
      for (let x = 0; x < iw - 26; x++) {
        const a = Math.abs(Math.sin(x * 0.2 + t) * Math.sin(x * 0.037 + t * 2)) * 6 + R() * 1.5;
        g.r(x0 + 24 + x, Math.round(y0 + 11 + t * 18 - a), 1, Math.max(1, Math.round(a * 2)), c(t * 35, 70, 62));
      }
    }
    g.r(x0 + 24 + Math.floor(iw * 0.45), y0, 1, 78, accent());
  } else {
    // brand: logo lockup plus a grid of applications
    g.r(x0, y0, iw, 78, c(0, 25, 90));
    g.circle(x0 + 26, y0 + 22, 13, c(0, 70, 45)); g.circle(x0 + 26, y0 + 22, 6, c(0, 25, 90));
    g.r(x0 + 46, y0 + 16, 50, 7, c(0, 50, 25)); g.r(x0 + 46, y0 + 26, 34, 3, c(0, 30, 45));
    for (let i = 0; i < 4; i++) g.r(x0 + 4 + i * (iw / 4), y0 + 46, iw / 4 - 6, 28, c(i * 18, 60, 40 + i * 10));
  }
  g.grain(0.05, k + 3);
  return g.canvas.toDataURL();
}

// A tileable 64x24 band that fades from dense to empty with ordered (Bayer
// 8x8) dithering, drawn as 1-bit pixels in the accent colour.
function ditherBand() {
  const W = 64, Hh = 24;
  const g = new Pix(W, Hh);
  const b8 = (x: number, y: number) => {
    // recursive Bayer index for an 8x8 matrix
    let v = 0;
    for (let bit = 0, m = 4; bit < 3; bit++, m >>= 1) {
      const xb = (x & m) ? 1 : 0, yb = (y & m) ? 1 : 0;
      v = v * 4 + ((xb ^ yb) | (yb << 1));
    }
    return (v + 0.5) / 64;
  };
  const c = accent();
  for (let y = 0; y < Hh; y++) {
    const density = 0.6 * (1 - y / Hh) ** 1.6;
    for (let x = 0; x < W; x++) if (b8(x % 8, y % 8) < density) g.p(x, y, c);
  }
  return g.canvas.toDataURL();
}

// Resolves once the element is on screen.
function whenVisible(el: Element) {
  return new Promise<void>((res) => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); res(); } }, { threshold: 0.25 });
    io.observe(el);
  });
}

// Animated dashed link between two cards, routed like Agentic's board.
function drawLink(board: HTMLElement, svg: SVGSVGElement, a: HTMLElement, b: HTMLElement) {
  const br = board.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  let d: string;
  if (rb.top > ra.bottom + 4) {
    // stacked: drop into the gutter between rows, cross, drop into the next card
    const x1 = ra.left + ra.width / 2 - br.left, x2 = rb.left + rb.width / 2 - br.left;
    const y1 = ra.bottom - br.top, y2 = rb.top - br.top, gy = (y1 + y2) / 2;
    const s = Math.sign(x2 - x1) || 1;
    d = Math.abs(x2 - x1) < 4 ? `M${x1} ${y1} V${y2}` : `M${x1} ${y1} V${gy - 4} Q${x1} ${gy} ${x1 + s * 4} ${gy} H${x2 - s * 4} Q${x2} ${gy} ${x2} ${gy + 4} V${y2}`;
  } else if (Math.abs(ra.left - rb.left) < 4) {
    const x = ra.left - br.left + 14;
    d = `M${x} ${ra.bottom - br.top} V${rb.top - br.top}`;
  } else {
    const x1 = ra.right - br.left, y1 = ra.top - br.top + ra.height / 2;
    const x2 = rb.left - br.left, y2 = rb.top - br.top + rb.height / 2;
    const mx = x1 + Math.max(10, (x2 - x1) / 2);
    const s = Math.sign(y2 - y1) || 1;
    d = y1 === y2 ? `M${x1} ${y1} H${x2}` : `M${x1} ${y1} H${mx - 4} Q${mx} ${y1} ${mx} ${y1 + s * 4} V${y2 - s * 4} Q${mx} ${y2} ${mx + 4} ${y2} H${x2 - 1}`;
    if (x2 < x1) d = `M${ra.left - br.left + ra.width / 2} ${ra.bottom - br.top} V${(ra.bottom + rb.top) / 2 - br.top} H${rb.left - br.left + rb.width / 2} V${rb.top - br.top}`;
  }
  svg.innerHTML = `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="2 3"><animate attributeName="stroke-dashoffset" from="10" to="0" dur=".6s" repeatCount="indefinite"/></path>`;
}

function card(o: { icon: IconId; title: string; sub: string; href?: string; cls?: string }) {
  const el = document.createElement(o.href ? 'a' : 'div');
  el.className = `kc ${o.cls ?? ''}`;
  if (o.href) (el as HTMLAnchorElement).href = o.href;
  el.innerHTML = `<span class="ic"><img class="px" src="${iconURL(o.icon)}" alt="" /></span><span class="tx"><b>${o.title}</b><small>${o.sub}</small></span><span class="go">${ARROW}</span>`;
  return el;
}

// Walk the highlight through the cards in order, forever, while visible.
async function play(board: HTMLElement, svg: SVGSVGElement, cards: HTMLElement[], onStep?: (i: number) => void) {
  for (;;) {
    cards.forEach((c, i) => { c.classList.toggle('dim', i > 0); c.classList.remove('cur'); });
    svg.innerHTML = '';
    onStep?.(0);
    await whenVisible(board);
    await sleep(700);
    for (let i = 1; i < cards.length; i++) {
      cards[i].classList.remove('dim');
      cards[i].classList.add('cur');
      drawLink(board, svg, cards[i - 1], cards[i]);
      onStep?.(i);
      await sleep(REDUCED ? 0 : 1400);
      cards[i].classList.remove('cur');
    }
    if (REDUCED) return;
    await sleep(3000);
  }
}

export function mountSections() {
  // pixel crosses where the body grid's major lines meet, in the accent
  const cross = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' shape-rendering='crispEdges'><path fill='${accent()}' fill-opacity='.28' d='M0 0h1v5H0zM0 115h1v5H0zM1 0h4v1H1zM115 0h5v1h-5z'/></svg>`;
  document.documentElement.style.setProperty('--grid-cross', `url("data:image/svg+xml,${encodeURIComponent(cross)}")`);
  document.documentElement.style.setProperty('--dither-band', `url(${ditherBand()})`);

  // ------------------------------------------------ work: stacked rows
  const workBoard = document.getElementById('workBoard')!;
  const workList = document.getElementById('workRows')!;
  const workVis = projects.map((p, k) => {
    const li = document.createElement('li');
    li.className = `work-row${k % 2 ? ' flip' : ''}`;
    li.innerHTML = `
      <a class="kc wr-vis" href="#top" data-open-work aria-label="Open ${p.title}">
        <img class="px" src="${workVisual(p.hue, k)}" alt="" />
      </a>
      <div class="wr-info">
        <p class="wr-idx"><span>${String(k + 1).padStart(2, '0')}</span> ${p.year} · ${p.role}</p>
        <h3>${p.title}</h3>
        <p class="wr-blurb">${p.blurb}</p>
        <ul class="wr-tags">${p.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
        <a class="wr-go" href="#top" data-open-work>View project ${ARROW}</a>
      </div>`;
    workList.appendChild(li);
    return li.querySelector('.wr-vis') as HTMLElement;
  });
  paperize(workBoard, { tone: 'board', seed: 29, depth: 3 });
  workVis.forEach((c, i) => paperize(c, { tone: 'card', seed: 300 + i * 17, depth: 2 }));
  void play(workBoard, workBoard.querySelector('svg')!, workVis);

  // ------------------------------------------------ services kanban
  const svBoard = document.getElementById('serviceBoard')!;
  const counts: HTMLElement[] = [];
  const svCards: HTMLElement[] = [];
  const colOf: number[] = [];
  services.forEach((s, k) => {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `<h4><span>${s.title}</span><span class="cnt">0/${s.items.length}</span></h4><p class="col-body">${s.body}</p>`;
    counts.push(col.querySelector('.cnt') as HTMLElement);
    s.items.forEach((it) => {
      const c = card({ icon: s.icon as IconId, title: it, sub: s.title });
      col.appendChild(c);
      svCards.push(c);
      colOf.push(k);
    });
    svBoard.appendChild(col);
  });
  paperize(svBoard, { tone: 'board', seed: 101, depth: 3 });
  svCards.forEach((c, i) => paperize(c, { tone: 'card', seed: 700 + i * 13, depth: 2 }));
  void play(svBoard, svBoard.querySelector('svg')!, svCards, (i) => {
    counts.forEach((el, k) => {
      const total = services[k].items.length;
      const done = svCards.filter((_, j) => colOf[j] === k && j <= i).length;
      el.textContent = `${Math.min(done, total)}/${total}`;
    });
  });

  // ------------------------------------------------ paper, ascii, text
  document.querySelectorAll<HTMLElement>('.card-paper').forEach((el, i) => paperize(el, { tone: 'card', seed: 50 + i, depth: 2, lines: [14, 16] }));

  const mail = document.getElementById('mailLink') as HTMLAnchorElement;
  mail.href = `mailto:${site.email}`;
  mail.innerHTML = `<img class="px" src="${iconURL('mail', 2)}" alt="" />${site.email} <span>↗</span>`;
  paperize(mail, { tone: 'card', seed: 7, depth: 2 });
  document.getElementById('socials')!.innerHTML = site.socials.map((s) => `<li><a href="${s.href}">${s.label}</a></li>`).join('');
  document.getElementById('year')!.textContent = String(new Date().getFullYear());
  document.getElementById('factLocation')!.textContent = site.location;
  document.querySelectorAll('[data-name]').forEach((el) => (el.textContent = site.name));
}
