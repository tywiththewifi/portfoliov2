// The header's mark: the T and the C flip round, one just after the other,
// like cards, every 6–12 s and when hovered. With reduced motion they stay
// put. The letters themselves are paths in index.html (the same as the
// favicon's), so the mark is there before any script runs.

const FLIP = 900; // ms for one letter's turn
const STAGGER = 110; // ms between the letters
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

export function mountMark(el: HTMLElement) {
  const letters = [...el.querySelectorAll<SVGElement>('svg')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false, timer = 0;

  const flip = () => {
    if (busy || reduce.matches || document.hidden) return;
    busy = true;
    const runs = letters.map((l, i) =>
      l.animate([{ transform: 'perspective(160px) rotateY(0deg)' }, { transform: 'perspective(160px) rotateY(360deg)' }], {
        duration: FLIP,
        delay: i * STAGGER,
        easing: EASE,
      }).finished,
    );
    Promise.allSettled(runs).then(() => { busy = false; });
  };
  // the next flip on its own: 6–12 s after the last (the first a few
  // seconds after the page opens)
  const schedule = (wait: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => { flip(); schedule(6000 + Math.random() * 6000); }, wait);
  };
  el.addEventListener('pointerenter', () => { flip(); schedule(6000 + Math.random() * 6000); });
  schedule(2500 + Math.random() * 3000);
}
