import './fonts.css';
import './styles.css';
import { mountScene } from './scene';

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
// Night is the only mode for now; day mode (websites by day) comes later.
document.querySelector('[data-mode="day"]')!.addEventListener('click', () => toast('Day mode is on its way: websites by day, music by night.'));

// ---------------------------------------------------------------- pills
const email = document.querySelector<HTMLButtonElement>('[data-email]')!;
email.addEventListener('click', async () => {
  const address = email.dataset.email?.trim();
  if (!address) return toast('Email address coming soon.');
  try {
    await navigator.clipboard.writeText(address);
    toast(`Copied ${address}`);
  } catch {
    location.href = `mailto:${address}`;
  }
});
document.querySelectorAll<HTMLAnchorElement>('a.pill').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (a.getAttribute('href') !== '#') return;
    e.preventDefault();
    toast(`${a.dataset.name ?? 'This'} link coming soon.`);
  }),
);

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
if (!mountScene(canvas, hero, copy)) canvas.hidden = true;
