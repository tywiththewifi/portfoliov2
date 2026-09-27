import { Pix } from './art/pix';
import { rng } from './art/posters';
import { iconURL, type IconId } from './art/icons';
import { paperize } from './art/paper';
import { mountAscii } from './art/ascii';
import { projectIcons, projects, services, site } from './content/data';

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ARROW = '<svg viewBox="0 0 9 9" aria-hidden="true"><path d="M1.5 4.5h6M5 2l2.5 2.5L5 7" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';

function workThumb(hue: number, k: number) {
  const g = new Pix(96, 56);
  const R = rng(900 + k);
  g.grad(0, 0, 96, 56, [hsl(hue, 45, 16), hsl(hue + 25, 55, 30), hsl(hue + 40, 60, 44)]);
  for (let i = 0; i < 6; i++) {
    const w = 10 + Math.floor(R() * 30), h = 6 + Math.floor(R() * 18);
    g.r(Math.floor(R() * (96 - w)), Math.floor(R() * (56 - h)), w, h, hsl(hue + i * 28, 70, 50 + i * 5));
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
  if (Math.abs(ra.left - rb.left) < 4) {
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
  // ------------------------------------------------ work pegboard
  const workBoard = document.getElementById('workBoard')!;
  const workGrid = document.getElementById('workCards')!;
  const workCards = projects.map((p, k) => {
    const el = card({ icon: projectIcons[k % projectIcons.length], title: p.title, sub: `${p.year} · ${p.role}`, href: '#top', cls: 'kc-work' });
    el.setAttribute('data-open-work', '');
    el.insertAdjacentHTML('afterbegin', `<img class="kc-thumb px" src="${workThumb(p.hue, k)}" alt="" />`);
    el.insertAdjacentHTML('beforeend', `<span class="kc-tags">${p.tags.join(' · ')}</span>`);
    workGrid.appendChild(el);
    return el as HTMLElement;
  });
  paperize(workBoard, { tone: 'board', seed: 29, depth: 3 });
  workCards.forEach((c, i) => paperize(c, { tone: 'card', seed: 300 + i * 17, depth: 2 }));
  void play(workBoard, workBoard.querySelector('svg')!, workCards);

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
  document.querySelectorAll<HTMLElement>('[data-ascii]').forEach(mountAscii);

  const mail = document.getElementById('mailLink') as HTMLAnchorElement;
  mail.href = `mailto:${site.email}`;
  mail.innerHTML = `<img class="px" src="${iconURL('mail', 2)}" alt="" />${site.email} <span>↗</span>`;
  paperize(mail, { tone: 'card', seed: 7, depth: 2 });
  document.getElementById('socials')!.innerHTML = site.socials.map((s) => `<li><a href="${s.href}">${s.label}</a></li>`).join('');
  document.getElementById('year')!.textContent = String(new Date().getFullYear());
  document.getElementById('factLocation')!.textContent = site.location;
  document.querySelectorAll('[data-name]').forEach((el) => (el.textContent = site.name));
}
