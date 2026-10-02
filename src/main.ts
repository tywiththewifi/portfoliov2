import './fonts.css';
import './styles.css';
import { createMusic } from './music';
import { mountScene, type Mode } from './scene';

// ---------------------------------------------------------------- toast
const toastEl = document.getElementById('toast')!;
let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------- clock
// Tyler's local time, as "TUE 15:50 PDT", in the zone set on the element.
const clock = document.querySelector<HTMLTimeElement>('[data-clock]')!;
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: clock.dataset.tz || undefined,
  weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
});
function tick() {
  const now = new Date();
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  clock.textContent = `${p.weekday} ${p.hour}:${p.minute} ${p.timeZoneName ?? ''}`.trim().toUpperCase();
  clock.dateTime = now.toISOString();
  // next update on the minute
  setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 50);
}
tick();

// ---------------------------------------------------------------- day / night
// Websites by day, music by night. Night is the default; the visitor's
// choice is remembered (a small script in index.html applies it before the
// first paint).
const root = document.documentElement;
const modeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
let mode: Mode = root.dataset.mode === 'day' ? 'day' : 'night';
let setSceneMode: (m: Mode) => void = () => {};
function applyMode(next: Mode, remember: boolean) {
  mode = next;
  if (next === 'day') root.dataset.mode = 'day'; else delete root.dataset.mode;
  if (themeColor) themeColor.content = next === 'day' ? '#fafafa' : '#0a0a0a';
  modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
  setSceneMode(next);
  if (remember) try { localStorage.setItem('tc-mode', next); } catch { /* storage blocked: the choice lasts this visit */ }
}
modeButtons.forEach((b) => b.addEventListener('click', () => applyMode(b.dataset.mode as Mode, true)));
applyMode(mode, false);

// ---------------------------------------------------------------- music
// The site's track, looped. It only downloads on the first play. The button
// in the header plays and pauses it, and so does clicking the boombox.
const musicBtn = document.querySelector<HTMLButtonElement>('[data-music]')!;
const music = createMusic(new URL(musicBtn.dataset.music!, document.baseURI).href);
let onMusic = () => {};
music.onChange((s) => {
  const on = s === 'playing';
  musicBtn.setAttribute('aria-pressed', String(on));
  musicBtn.dataset.state = s;
  const label = on ? 'Pause music' : s === 'loading' ? 'Loading music' : 'Play music';
  musicBtn.setAttribute('aria-label', label);
  musicBtn.title = label;
  if (s === 'error') toast('The music couldn’t load. Try again in a moment.');
  onMusic();
});
musicBtn.addEventListener('click', () => music.toggle());

// ---------------------------------------------------------------- pills
// Email pills (hero and footer) copy the address in their data-email.
document.querySelectorAll<HTMLButtonElement>('[data-email]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    const address = btn.dataset.email?.trim();
    if (!address) return toast('Email address coming soon.');
    try {
      await navigator.clipboard.writeText(address);
      toast(`Copied ${address}`);
    } catch {
      location.href = `mailto:${address}`;
    }
  }),
);
document.querySelectorAll<HTMLAnchorElement>('a.pill').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (a.getAttribute('href') !== '#') return;
    e.preventDefault();
    toast(`${a.dataset.name ?? 'This'} link coming soon.`);
  }),
);

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));

// ---------------------------------------------------------------- scene
// Wait (briefly) for the NB faces so the text drawn into the scene's
// textures (the CRT log, badges, the tape labels) uses them.
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const hero = document.getElementById('top')!;
const copy = document.getElementById('copy')!;
const fontsIn = Promise.all([
  document.fonts.load('20px "NB International Pro Mono"'),
  document.fonts.load('20px "NB International Pro"'),
]);
await Promise.race([fontsIn, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
const scene = mountScene(canvas, hero, copy, mode);
if (scene) {
  setSceneMode = (m) => scene.setMode(m);
  scene.setMusic(music);
  onMusic = () => scene.musicChanged();
  // the boombox in the scene is a play button too (the header button is the
  // keyboard-reachable one)
  const onScenery = (e: PointerEvent) => !(e.target as Element).closest('a, button, .copy') && scene.overBoombox(e.clientX, e.clientY);
  hero.addEventListener('click', (e) => { if (onScenery(e)) music.toggle(); });
  hero.addEventListener('pointermove', (e) => { hero.style.cursor = onScenery(e) ? 'pointer' : ''; }, { passive: true });
} else canvas.hidden = true;
