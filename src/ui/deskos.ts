import { Pix } from '../art/pix';
import { rng } from '../art/posters';
import { projects, site, type Project } from '../content/data';

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

function thumb(p: Project, k: number) {
  const g = new Pix(64, 40);
  const R = rng(500 + k);
  g.grad(0, 0, 64, 40, [hsl(p.hue, 50, 18), hsl(p.hue + 25, 60, 36)]);
  for (let i = 0; i < 5; i++) {
    const w = 8 + Math.floor(R() * 20), h = 5 + Math.floor(R() * 12);
    g.r(Math.floor(R() * (64 - w)), Math.floor(R() * (40 - h)), w, h, hsl(p.hue + i * 30, 70, 55 + i * 5));
  }
  g.r(4, 30, 30, 3, '#f6e7da');
  g.r(4, 35, 20, 2, 'rgba(246,231,218,.5)');
  return g.canvas.toDataURL();
}

// The OS that lives on the CRT. Mounted inside #screenOverlay, which main.ts
// keeps aligned with the monitor glass while the camera is zoomed in.
export function mountDeskOS(root: HTMLElement, onExit: () => void) {
  root.innerHTML = `
    <div class="os">
      <header class="os-bar">
        <span class="os-logo">■ ${site.handle.toUpperCase()}.OS</span>
        <span class="os-path">~/work</span>
        <span class="os-clock"></span>
        <button class="os-exit" aria-label="Leave the computer">ESC ⏏</button>
      </header>
      <div class="os-view os-list" role="list"></div>
      <div class="os-view os-detail" hidden></div>
      <footer class="os-foot"><span>${projects.length} projects</span><span>↑↓←→ move · ↵ open · esc back</span></footer>
    </div>`;
  const list = root.querySelector('.os-list') as HTMLElement;
  const detail = root.querySelector('.os-detail') as HTMLElement;
  const path = root.querySelector('.os-path') as HTMLElement;
  const clock = root.querySelector('.os-clock') as HTMLElement;
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
  tick();
  const clockTimer = window.setInterval(tick, 20000);

  projects.forEach((p, k) => {
    const b = document.createElement('button');
    b.className = 'os-card';
    b.setAttribute('role', 'listitem');
    b.innerHTML = `<img class="px" src="${thumb(p, k)}" alt="" /><span class="os-card-t">${p.title}</span><span class="os-card-m">${p.year} · ${p.tags.join(' / ')}</span>`;
    b.onclick = () => open(k);
    list.appendChild(b);
  });

  const open = (k: number) => {
    const p = projects[k];
    path.textContent = `~/work/${p.slug}`;
    detail.innerHTML = `
      <button class="os-back">← back</button>
      <div class="os-hero"><img class="px" src="${thumb(p, k)}" alt="" /></div>
      <h3>${p.title}</h3>
      <p class="os-meta">${p.year} · ${p.role} · ${p.tags.join(' / ')}</p>
      <p>${p.blurb}</p>
      <p class="os-dim">Case study coming soon. Replace this with screenshots, video and the story behind the project.</p>
      ${p.url ? `<a class="os-link" href="${p.url}" target="_blank" rel="noopener">visit ↗</a>` : ''}`;
    list.hidden = true;
    detail.hidden = false;
    (detail.querySelector('.os-back') as HTMLElement).onclick = back;
    (detail.querySelector('.os-back') as HTMLElement).focus();
  };
  const back = () => {
    path.textContent = '~/work';
    detail.hidden = true;
    list.hidden = false;
    (list.querySelector('.os-card') as HTMLElement)?.focus();
  };

  (root.querySelector('.os-exit') as HTMLElement).onclick = onExit;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); if (!detail.hidden) back(); else onExit(); return; }
    if (list.hidden) return;
    const cards = [...list.querySelectorAll<HTMLElement>('.os-card')];
    const i = cards.indexOf(document.activeElement as HTMLElement);
    const cols = 3;
    const go = (j: number) => cards[Math.max(0, Math.min(cards.length - 1, j))]?.focus();
    if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
    if (e.key === 'ArrowDown') { go(i < 0 ? 0 : i + cols); e.preventDefault(); }
    if (e.key === 'ArrowUp') { go(i - cols); e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey);
  requestAnimationFrame(() => (list.querySelector('.os-card') as HTMLElement)?.focus());

  return () => {
    window.removeEventListener('keydown', onKey);
    window.clearInterval(clockTimer);
    root.innerHTML = '';
  };
}
