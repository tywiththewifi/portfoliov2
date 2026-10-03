// The hero's text arrives in two beats. The heading types itself out
// behind a mint caret; a beat after its last letter lands, the bio's
// paragraphs and then the buttons fade up, one after another. The whole
// heading is in the page from the start (the letters still to come are
// transparent), so its lines never re-wrap as it types and screen readers
// get all of it.
//
// It starts once the scene has drawn its first frames (the first compiles
// its shaders, which can hold the page up), and the typing keeps its pace
// through any later hitch rather than jumping ahead: at most two letters
// land in one frame, and the rest follow at the same rhythm.
//
// The head script in index.html hides the text before the first paint
// (class "intro" on <html>) only when motion is welcome; with reduced motion
// none of this runs. If the page opens scrolled past the hero, the text is
// simply shown.

const WAIT = 420; // ms the caret blinks before the first letter
const GAP = 140; // ms from the last letter to the first fade-up
const RISE = 900; // ms for each fade-up
const STAGGER = 80; // ms between them
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const frame = () => new Promise((r) => requestAnimationFrame(r));

export async function heroIntro(h1: HTMLElement, items: HTMLElement[]) {
  const root = document.documentElement;
  if (!root.classList.contains('intro')) return;
  await frame();
  await frame();
  if (h1.getBoundingClientRect().bottom < 0) return root.classList.remove('intro');

  // when each letter lands (ms from the start): quick and a little uneven,
  // with a breath before each new word
  const text = (h1.textContent ?? '').replace(/\s+/g, ' ').trim();
  const at: number[] = [];
  let t = WAIT;
  for (let i = 0; i < text.length; i++) {
    t += 18 + Math.random() * 16 + (text[i - 1] === ' ' ? 40 : 0);
    at.push(t);
  }

  const typed = document.createElement('span');
  const caret = document.createElement('span');
  const rest = document.createElement('span');
  caret.className = 'caret';
  rest.className = 'untyped';
  rest.textContent = text;
  h1.replaceChildren(typed, caret, rest);
  // the heading shows (just its caret, so far); the rest stays hidden
  root.classList.replace('intro', 'intro-run');

  const t0 = performance.now();
  let n = 0, late = 0;
  const step = (now: number) => {
    const e = now - t0 - late;
    let k = n;
    while (k < at.length && at[k] <= e) k++;
    if (k > n + 2) {
      // a hitch: two letters now, and the rest at the same pace from here
      k = n + 2;
      late += e - at[k - 1];
    }
    if (k !== n) {
      if (n === 0) caret.classList.add('busy'); // solid while typing
      n = k;
      typed.textContent = text.slice(0, n);
      rest.textContent = text.slice(n);
    }
    if (n < at.length) return void requestAnimationFrame(step);

    // the last letter: the bio and buttons fade up after it (holding hidden
    // until their turn, so the page's own hiding can go now)...
    items.forEach((el, i) =>
      el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], {
        duration: RISE,
        delay: GAP + i * STAGGER,
        easing: EASE,
        fill: 'backwards',
      }),
    );
    root.classList.remove('intro-run');
    // ...and the caret blinks twice more and goes (in its off beat), leaving
    // the heading as plain text
    caret.classList.remove('busy');
    setTimeout(() => { h1.textContent = text; }, 1850);
  };
  requestAnimationFrame(step);
}
