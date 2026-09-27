// Animated ASCII sprites for decorating the page body. `{...}` marks
// accent-coloured runs; frames advance on a shared ticker.

type Sprite = { frames: string[]; fps: number };

const cassette = (r: string) => String.raw`
 .--------------------------.
 |  .--------------------.  |
 |  | {SIDE A}   C-90 {///}  |  |
 |  |  .--.  ____  .--.  |  |
 |  | ( ${r}${r} )|____|( ${r}${r} ) |  |
 |  |  '--'        '--'  |  |
 |  '--------------------'  |
 |     ______________       |
 '----/ o  o    o  o \------'`;

const plant = (a: string, b: string) => String.raw`
      ${a}   ${b}
   ${b}\  |  /${a}
 ${a}--\ \ | / /--${b}
    '-\\|//-'
   ${b}--\\|//--${a}
       \|/
    .-------.
    |{#######}|
     \-----/
      '---'`;

const mug = (s: string) => String.raw`
     ${s}
    .-------.
    |  {~~}   |--.
    |  {~~~}  |  |
    |       |--'
    '-------'
 ~~~~~~~~~~~~~~~`;

const crt = (c: string) => String.raw`
  .----------------------.
  | .------------------. |
  | | {> hello world}    | |
  | | > portfolio v2   | |
  | | > ${c}              | |
  | '------------------' |
  |  [___]      {o}  ooo   |
  '----------------------'
      _|__________|_
     [______________]`;

const cat = (z: string) => String.raw`
          ${z}
     /\_/\
    ( -.- )____
     > ^ <     )~
    (___(__)___)`;

const vinyl = (r: string) => String.raw`
     .-""""""""-.
   .'  .----.  '.
  /   /      \   \
  |   | {(${r}${r})} |   |
  \   \      /   /
   '.  '----'  .'
     '-........-'`;

export const SPRITES: Record<string, Sprite> = {
  cassette: { fps: 6, frames: ['|', '/', '-', '\\'].map(cassette) },
  plant: { fps: 2, frames: [plant('\\', '/'), plant('|', '\\'), plant('/', '|')] },
  mug: { fps: 3, frames: ['  ) ( )', ' ( ) (', '  ( ) )'].map((s) => mug(`{${s}}`)) },
  crt: { fps: 2, frames: ['_', ' '].map(crt) },
  cat: { fps: 1.5, frames: ['{z}', '{zZ}', '{zZz}', ''].map(cat) },
  vinyl: { fps: 6, frames: ['|', '/', '-', '\\'].map(vinyl) },
};

export type SpriteId = keyof typeof SPRITES;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (frame: string) => esc(frame.replace(/^\n/, '')).replace(/\{([^}]*)\}/g, '<b>$1</b>');

const live: { el: HTMLElement; s: Sprite; last: number; i: number }[] = [];
let raf = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function tick(now: number) {
  for (const l of live) {
    if (!l.el.isConnected || !l.el.dataset.visible) continue;
    if (now - l.last < 1000 / l.s.fps) continue;
    l.last = now;
    l.i = (l.i + 1) % l.s.frames.length;
    l.el.innerHTML = html(l.s.frames[l.i]);
  }
  raf = requestAnimationFrame(tick);
}

const io = new IntersectionObserver((ents) => ents.forEach((e) => {
  const el = e.target as HTMLElement;
  if (e.isIntersecting) el.dataset.visible = '1'; else delete el.dataset.visible;
}));

export function mountAscii(el: HTMLElement) {
  const s = SPRITES[el.dataset.ascii as SpriteId];
  if (!s) return;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = html(s.frames[0]);
  if (reduced) return;
  live.push({ el, s, last: 0, i: 0 });
  io.observe(el);
  if (!raf) raf = requestAnimationFrame(tick);
}
