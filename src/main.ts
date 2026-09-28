import './fonts.css';
import './styles.css';
import { createHero } from './hero';
import { loadWallArt } from './hero/room';
import { setupInteraction } from './ui/interact';
import { openGallery } from './ui/panels';
import { ambientOn, shutter, startAmbient, stopAmbient } from './audio';
import { mountSections } from './sections';
import { mountBitmaps } from './fx/bitmap';
import { pixelReveal, setMask } from './fx/pixelmask';

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

// Setting switcher: three concepts for the outdoor desk. The choice lives in
// the URL (?scene=) so each one can be linked to directly.
type SceneId = Parameters<typeof hero.setScene>[0];
const SCENES: SceneId[] = ['clearing', 'meadow', 'lake'];
const switchBtns = [...document.querySelectorAll<HTMLButtonElement>('.scene-switch [data-scene]')];
const pickScene = (id: SceneId) => {
  hero.setScene(id);
  switchBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.scene === id)));
  const u = new URL(location.href);
  u.searchParams.set('scene', id);
  history.replaceState(null, '', u);
};
switchBtns.forEach((b) => b.addEventListener('click', () => pickScene(b.dataset.scene as SceneId)));
const fromUrl = new URLSearchParams(location.search).get('scene') as SceneId | null;
pickScene(fromUrl && SCENES.includes(fromUrl) ? fromUrl : 'clearing');

// Render style: pixel art, or the same scene as a full-res poly render (?style=)
type Style = 'pixel' | 'poly';
const styleBtns = [...document.querySelectorAll<HTMLButtonElement>('.scene-switch [data-style]')];
const pickStyle = (s: Style) => {
  hero.setStyle(s);
  styleBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.style === s)));
  const u = new URL(location.href);
  u.searchParams.set('style', s);
  history.replaceState(null, '', u);
};
styleBtns.forEach((b) => b.addEventListener('click', () => pickStyle(b.dataset.style as Style)));
pickStyle(new URLSearchParams(location.search).get('style') === 'poly' ? 'poly' : 'pixel');
const ui = setupInteraction(hero, stage, {
  camera: () => {
    hero.flash();
    shutter();
    setTimeout(openGallery, 380);
  },
  lamp: () => hero.toggleLamp(),
});

mountSections();
mountBitmaps([...document.querySelectorAll<HTMLElement>('[data-bitmap]')]);
pixelReveal([...document.querySelectorAll<HTMLElement>('main .sec-head, main .bitmap, main .work-row, main .peg-kanban, main .about-body, main .contact-body, .foot-row')]);

// Scrolling out of the hero: the room dissolves upward from the bottom edge
// and the headline breaks up into pixels, as on the Agentic template.
const heroEl = document.getElementById('top')!;
const heroCopy = heroEl.querySelector<HTMLElement>('.hero-copy')!;
const heroBits = heroEl.querySelectorAll<HTMLElement>('.hero-hint, .scroll-cue, .scene-switch');
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
