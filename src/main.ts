import './fonts.css';
import './styles.css';
import { createHero } from './hero';
import { setupInteraction } from './ui/interact';
import { openBooks, openGallery, openMPC } from './ui/panels';
import { ambientOn, shutter, startAmbient, stopAmbient } from './audio';
import { mountSections } from './sections';

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
const hero = createHero(canvas, stage);
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
