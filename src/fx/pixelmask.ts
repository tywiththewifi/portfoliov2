// Chunky pixel-dissolve masks, as on the Agentic template: a tiling noise
// grid thresholded into N frames. Frame 0 hides everything, the last frame
// shows everything. Used to dissolve the hero copy out on scroll and to
// dissolve sections in as they arrive.

const N = 12, GRID = 24, CELL = 6;
const TILE = GRID * CELL;

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const frames: string[] = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const g = c.getContext('2d')!;
  // coarse clumps plus fine grain so it breaks up in blocks, not salt
  const v: number[] = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    v.push(hash(Math.floor(x / 4), Math.floor(y / 4)) * 0.55 + hash(x, y) * 0.45);
  }
  return Array.from({ length: N }, (_, i) => {
    const k = i / (N - 1);
    g.clearRect(0, 0, TILE, TILE);
    g.fillStyle = '#000';
    v.forEach((n, j) => { if (n < k * 1.001) g.fillRect((j % GRID) * CELL, Math.floor(j / GRID) * CELL, CELL, CELL); });
    return `url(${c.toDataURL()})`;
  });
})();

// Show `k` (0..1) of an element through the dissolve mask.
export function setMask(el: HTMLElement, k: number) {
  if (k >= 1) { el.style.maskImage = el.style.webkitMaskImage = ''; return; }
  const img = frames[Math.max(0, Math.min(N - 1, Math.floor(k * (N - 1))))];
  el.style.maskImage = el.style.webkitMaskImage = img;
  el.style.maskSize = el.style.webkitMaskSize = `${TILE}px ${TILE}px`;
}

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Dissolve elements in the first time they scroll into view.
export function pixelReveal(els: HTMLElement[]) {
  if (REDUCED) return;
  const play = (el: HTMLElement, delay: number) => {
    const t0 = performance.now() + delay;
    const step = (now: number) => {
      const k = Math.max(0, (now - t0) / 650);
      setMask(el, k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((ents) => {
    let n = 0;
    for (const e of ents) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      play(e.target as HTMLElement, n++ * 110);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  for (const el of els) {
    setMask(el, 0);
    io.observe(el);
  }
}
