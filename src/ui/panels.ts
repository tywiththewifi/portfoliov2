import { Pix } from '../art/pix';
import { rng } from '../art/posters';
import { books, photos } from '../content/data';
import { PAD_NAMES, playPad, shutter } from '../audio';
import { openModal } from './modal';

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

// Placeholder "photos": little pixel landscapes, one per entry.
function placeholderPhoto(i: number, hue: number) {
  const g = new Pix(160, 120);
  const R = rng(100 + i);
  g.grad(0, 0, 160, 80, [hsl(hue, 45, 22), hsl(hue + 20, 55, 42), hsl(hue + 40, 70, 68)]);
  g.circle(40 + Math.floor(R() * 80), 30 + Math.floor(R() * 25), 10 + Math.floor(R() * 8), hsl(hue + 50, 90, 85));
  for (let layer = 0; layer < 3; layer++) {
    let y = 60 + layer * 12;
    const c = hsl(hue - 20 + layer * 10, 30 + layer * 5, 30 - layer * 8);
    for (let x = 0; x < 160; x++) {
      y += Math.floor((R() - 0.5) * 3);
      y = Math.max(50 + layer * 10, Math.min(95 + layer * 6, y));
      g.r(x, y, 1, 120 - y, c);
    }
  }
  if (i % 2) for (let x = 10; x < 150; x += 7 + Math.floor(R() * 6)) { const h = 8 + Math.floor(R() * 24); g.r(x, 100 - h, 5, h, hsl(hue + 180, 20, 12)); if (R() < 0.6) g.p(x + 2, 100 - h + 3, '#ffe0a0'); }
  g.dens(0, 0, 160, 120, '#000000', 0.06);
  return g.canvas.toDataURL();
}

// ------------------------------------------------------------------ camera
export function openGallery() {
  let i = 0;
  const shots = photos.map((p, k) => ({ ...p, src: placeholderPhoto(k, p.hue) }));
  openModal({
    title: 'Photo roll',
    className: 'm-camera',
    build: (body) => {
      body.innerHTML = `
        <div class="cam-back">
          <div class="cam-top"><span class="cam-brand">CYBERSNAP <i>S-500</i></span><span class="cam-mode">▣ PLAY</span></div>
          <div class="cam-main">
            <div class="cam-lcd">
              <img class="cam-photo px" alt="" />
              <div class="cam-osd cam-osd-t"><span class="osd-folder"></span><span>▮▮▮</span></div>
              <div class="cam-osd cam-osd-b"><span class="osd-date"></span><span>1/60 · F2.8 · ISO 200</span></div>
              <div class="cam-flash"></div>
            </div>
            <div class="cam-ctrls">
              <button class="cam-btn" data-act="shoot" aria-label="Shutter">●</button>
              <div class="cam-dpad">
                <button class="cam-btn up" data-act="prev" aria-label="Previous photo">▲</button>
                <button class="cam-btn lf" data-act="prev" aria-label="Previous photo" data-autofocus>◀</button>
                <button class="cam-btn ok" data-act="shoot" aria-label="Zoom">OK</button>
                <button class="cam-btn rt" data-act="next" aria-label="Next photo">▶</button>
                <button class="cam-btn dn" data-act="next" aria-label="Next photo">▼</button>
              </div>
              <div class="cam-small"><span>MENU</span><span>DISP</span><span>▶</span></div>
            </div>
          </div>
          <p class="cam-caption"></p>
          <div class="cam-strip"></div>
        </div>`;
      const img = body.querySelector('.cam-photo') as HTMLImageElement;
      const folder = body.querySelector('.osd-folder') as HTMLElement;
      const date = body.querySelector('.osd-date') as HTMLElement;
      const cap = body.querySelector('.cam-caption') as HTMLElement;
      const strip = body.querySelector('.cam-strip') as HTMLElement;
      const flash = body.querySelector('.cam-flash') as HTMLElement;
      shots.forEach((s, k) => {
        const b = document.createElement('button');
        b.className = 'cam-thumb';
        b.setAttribute('aria-label', s.caption);
        b.innerHTML = `<img class="px" src="${s.src}" alt="" />`;
        b.onclick = () => show(k);
        strip.appendChild(b);
      });
      const show = (k: number) => {
        i = (k + shots.length) % shots.length;
        const s = shots[i];
        img.src = s.src;
        img.alt = s.caption;
        folder.textContent = `100-${String(i + 1).padStart(4, '0')}`;
        date.textContent = s.date;
        cap.textContent = `${s.caption} · ${i + 1} / ${shots.length}`;
        strip.querySelectorAll('.cam-thumb').forEach((t, j) => t.classList.toggle('on', j === i));
      };
      body.addEventListener('click', (e) => {
        const act = (e.target as HTMLElement).closest('[data-act]')?.getAttribute('data-act');
        if (act === 'prev') show(i - 1);
        if (act === 'next') show(i + 1);
        if (act === 'shoot') { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); shutter(); }
      });
      body.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { show(i - 1); e.preventDefault(); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { show(i + 1); e.preventDefault(); }
      });
      show(0);
    },
  });
}

// ------------------------------------------------------------------ books
export function openBooks() {
  openModal({
    title: 'Bookshelf',
    className: 'm-books',
    build: (body) => {
      body.innerHTML = `<p class="m-eyebrow">▸ bookshelf</p><h2 class="m-title">Books I keep coming back to</h2>
        <div class="shelf" role="list"></div><div class="shelf-board"></div><p class="book-detail" aria-live="polite">Hover or tap a spine.</p>`;
      const shelf = body.querySelector('.shelf') as HTMLElement;
      const detail = body.querySelector('.book-detail') as HTMLElement;
      books.forEach((b, k) => {
        const s = document.createElement('button');
        s.className = 'spine';
        s.setAttribute('role', 'listitem');
        s.style.setProperty('--c', b.color);
        s.style.setProperty('--h', `${150 + ((k * 37) % 50)}px`);
        s.innerHTML = `<span>${b.title}</span>`;
        const show = () => { detail.innerHTML = `<b>${b.title}</b> — ${b.author}`; shelf.querySelectorAll('.spine').forEach((x) => x.classList.toggle('on', x === s)); };
        s.addEventListener('mouseenter', show);
        s.addEventListener('focus', show);
        s.addEventListener('click', show);
        if (k === 0) s.setAttribute('data-autofocus', '');
        shelf.appendChild(s);
      });
    },
  });
}

// ------------------------------------------------------------------ MPC
const KEYS = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'];

export function openMPC() {
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  openModal({
    title: 'MPC',
    className: 'm-mpc',
    onClose: () => { if (onKey) window.removeEventListener('keydown', onKey); },
    build: (body) => {
      body.innerHTML = `
        <div class="mpc">
          <div class="mpc-head">
            <div class="mpc-lcd"><span class="mpc-prog">PROGRAM 01 · DESK KIT</span><span class="mpc-last">READY</span></div>
            <div class="mpc-brand">MPC <i>2000-ish</i></div>
          </div>
          <div class="mpc-pads"></div>
          <p class="mpc-help">Click the pads or use your keyboard: <kbd>1–4</kbd> <kbd>Q–R</kbd> <kbd>A–F</kbd> <kbd>Z–V</kbd></p>
        </div>`;
      const pads = body.querySelector('.mpc-pads') as HTMLElement;
      const last = body.querySelector('.mpc-last') as HTMLElement;
      // lay pads out like the hardware: pad 1 bottom-left
      const order = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];
      const hit = (i: number) => {
        playPad(i);
        last.textContent = `PAD ${String(i + 1).padStart(2, '0')} · ${PAD_NAMES[i]}`;
        const el = pads.querySelector(`[data-pad="${i}"]`);
        el?.classList.remove('hit'); void (el as HTMLElement)?.offsetWidth; el?.classList.add('hit');
      };
      order.forEach((i) => {
        const b = document.createElement('button');
        b.className = 'pad';
        b.dataset.pad = String(i);
        b.innerHTML = `<small>${KEYS[i].toUpperCase()}</small><span>${PAD_NAMES[i]}</span>`;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(i); });
        b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(i); } });
        if (i === 0) b.setAttribute('data-autofocus', '');
        pads.appendChild(b);
      });
      onKey = (e: KeyboardEvent) => {
        if (e.repeat || e.metaKey || e.ctrlKey) return;
        const i = KEYS.indexOf(e.key.toLowerCase());
        if (i >= 0) hit(i);
      };
      window.addEventListener('keydown', onKey);
    },
  });
}
