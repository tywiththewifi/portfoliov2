import './fonts.css';
import './styles.css';
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
if (scene) setSceneMode = (m) => scene.setMode(m);
else canvas.hidden = true;
