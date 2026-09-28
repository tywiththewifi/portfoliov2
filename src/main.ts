import './fonts.css';
import './styles.css';
import { createHero } from './hero';
import { loadWallArt } from './hero/room';
import { setupInteraction } from './ui/interact';
import { openBooks, openGallery, openMPC } from './ui/panels';
import { ambientOn, shutter, startAmbient, stopAmbient } from './audio';
import { mountSections } from './sections';
import { mountDust } from './fx/dust';
import { pixelReveal, setMask } from './fx/pixelmask';
import { mountAsciiType } from './fx/asciiType';

const stage = document.getElementById('stage')!;
const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement;

// ---------------------------------------------------------------- sound toggle
const soundBtn = document.getElementById('soundToggle') as HTMLButtonElement;
function setSound(on: boolean) {
  if (on) startAmbient(); else stopAmbient();
  hero.soundState.on = on;
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('.snd-label')!.textContent = on ? 'sound on' : 'sound off';
}
soundBtn.addEventListener('click', () => setSound(!ambientOn()));

// ---------------------------------------------------------------- hero
const hero = createHero(canvas, stage, await loadWallArt());
const ui = setupInteraction(hero, stage, {
  bookshelf: openBooks,
  mpc: openMPC,
  camera: () => {
    hero.flash();
    shutter();
    setTimeout(openGallery, 380);
  },
  lamp: () => hero.toggleLamp(),
  turntable: () => setSound(!ambientOn()),
});

mountSections();
mountDust();
mountAsciiType([...document.querySelectorAll<HTMLElement>('pre[data-art]')]);
pixelReveal([...document.querySelectorAll<HTMLElement>('main .sec-head, main .work-row, main .peg-kanban, main .about-body, main .contact-body, .foot-row')]);

// Scrolling out of the hero: the room dissolves upward from the bottom edge
// and the headline breaks up into pixels, as on the Agentic template.
const heroEl = document.getElementById('top')!;
const heroCopy = heroEl.querySelector<HTMLElement>('.hero-copy')!;
const heroBits = heroEl.querySelectorAll<HTMLElement>('.hero-hint, .scroll-cue');
const onScroll = () => {
  const p = Math.min(1, scrollY / heroEl.offsetHeight);
  hero.view.setScroll(p);
  setMask(heroCopy, 1 - Math.min(1, p / 0.45));
  heroBits.forEach((el) => setMask(el, 1 - Math.min(1, p / 0.2)));
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

document.querySelectorAll('[data-open-work]').forEach((el) =>
  el.addEventListener('click', (e) => {
    e.preventDefault();
    ui.openComputer();
  }),
);

// Only render while the hero is on screen and the tab is visible.
let heroVisible = true;
const sync = () => (heroVisible && !document.hidden ? hero.view.start() : hero.view.stop());
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; sync(); }, { rootMargin: '60px' }).observe(stage);
document.addEventListener('visibilitychange', sync);
sync();

(window as unknown as { __hero: unknown }).__hero = hero;
document.body.dataset.ready = '1';
