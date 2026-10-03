# portfoliov2

Tyler Caldwell's portfolio: a 3D hero, then case studies in the layout of
Daru Sim's site. The hero is a Three.js scene filling the whole
first screen behind the text: a desk standing in a black void on a floor
grid, with a beige CRT typing a dev log, a tower PC, a keyboard and mouse, a
cassette boombox with its reels turning, a mug, a cassette case and an office
chair pushed back. Layout after Daru Sim's site, colours after
pacomepertant.com.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Music (not in git)

The header's sound button (and clicking the boombox) plays Tyler's track on
a gapless loop, and every click on the page plays a mouse-click sound
(`src/clicks.ts`; mouse presses on the way down, taps on the tap, keyboard
silent). Like the fonts, the sound files are git-ignored; put them at:

```
public/audio/portfolio-track.mp3
public/audio/click.mp3
```

Without them the site simply stays silent.

It only downloads when someone presses play. While it plays, the scene
listens (`src/music.ts` reads the levels, `setMusic` in `src/scene/index.ts`
uses them): the boombox meters show the real left and right levels and its
reels turn, the speaker grilles and the box bump on each beat, the CRT glow
and the rim light swell with the bass, and the tower's disk light flickers
with the hi-hats. With reduced motion only the meters and reels move.

## Fonts (licensed, not in git)

The page uses NB International Pro (Regular for headings and body, Mono for
the clock and the CRT; Medium is registered but unused). The WOFF2 files are
licensed and this repo is public, so they are git-ignored. Copy them into
`public/fonts/` under these names before running or deploying:

```
public/fonts/nbinternationalpro-regular.woff2
public/fonts/nbinternationalpro-medium.woff2
public/fonts/nbinternationalpro-mono.woff2
```

Without them the page falls back to Helvetica/Arial and the system monospace.

## Where things live

| Path | What |
| --- | --- |
| `index.html` | All the copy: hero, the four case studies and the footer. The email address goes in `data-email` on both Email pills, the LinkedIn and resume links in the pills' `href` (`#` shows "coming soon"), the clock's time zone in `data-tz` |
| `public/work/<project>/` | The case-study screenshots (WebP) and screen recordings (AV1 WebM, H.264 MP4, and a WebP poster each) |
| `src/mark.ts` | Flips the header's TC round every 6–12 s (and when hovered) |
| `src/panels.ts` | The grid floor behind each case-study screen |
| `src/clips.ts` | Plays the screen recordings while they're on screen, and their play/pause buttons |
| `src/styles.css` | Tokens (`--bg`, `--panel`, `--text`, `--text-2`, `--muted`, `--mint`) and the layout |
| `src/main.ts` | Clock, day/night buttons, music button, email copy, toasts, mounting the scene |
| `src/music.ts` | The looping track and its live analysis (levels, bands, beats) |
| `src/clicks.ts` | The click sound on every click |
| `src/scene/index.ts` | Renderer, lights, camera drift and parallax, framing (view offset), render loop |
| `src/scene/grid.ts` | The floor-grid shader |
| `src/scene/intro.ts` | The intro: the scene traced in glowing lines over a hologram, then filled in |
| `src/scene/screen.ts` | The CRT's typing dev log (night) |
| `src/scene/mockups.ts` | The CRT's website mockups (day) |
| `src/scene/set.ts` | Where each prop sits on the desk, and the cables |
| `src/scene/props/` | The models: desk, CRT, tower, keyboard and mouse, boombox, mug and cassette case, chair |
| `src/scene/kit.ts` | Parts builder the models are made with (merged meshes, baked contact shading) |
| `src/scene/mats.ts` | Scene colours, materials, printed labels |

## The mark and the favicon

The header's mark is a flat TC, the T in the text colour and the C in the
accent, drawn as two SVG paths in `index.html` rather than set in the
font, so the favicon can be exactly the same letters. Every 6–12 seconds,
and when hovered, the letters flip round like cards, the C just after the
T (`src/mark.ts`); with reduced motion they stay put.

`public/favicon.svg` is those two paths, dark letters on a light browser
theme and light ones on a dark theme. `public/favicon-32.png` and
`public/apple-touch-icon.png` (180 px, a full square, as iOS rounds it) put
the night colours on a dark tile, for browsers and phones that don't use
SVG icons. If the letters change, change them in both `index.html` and
`public/favicon.svg`, then re-export the PNGs.

## Work sections

After the hero, the page follows Daru Sim's layout: each case study has a
title, a short paragraph and the role and years, then a gallery of rounded
panels in rows. Rows are full width, `c21` (two thirds and a third), `c12`
or `c11` (halves). A panel pads its screenshot by default; `bleed-b` and
`bleed-r` let it run off the bottom or right edge; `clip` gives the panel a
fixed shape and crops what runs past the bottom. `w60`–`w90` set how wide
the screenshot sits. Phone screens go in a `.phones` group (`n2`, `n4`,
`n5`, optional `stagger`). A `clip fill` panel takes its height from the
panel beside it, for a tall page that should crop to the row.

Behind each screen is a grid floor like the hero's, running back to a
horizon behind the screenshot, with a mint centre line and a glow under the
screen (`src/panels.ts` draws it to the panel's size; its colours are
`--floor`, `--glow` and `--axis` in `src/styles.css`).

Each gallery opens with its screen recordings, then the screenshots. The
recordings are silent loops (`<video data-clip>`): nothing downloads until
one scrolls into view, it plays only while on screen, and each has a
play/pause button (with reduced motion they start paused). Each is an AV1
WebM, which Chrome, Edge and Firefox play, with an H.264 MP4 fallback for
Safari, plus a WebP poster of the first frame.

How the media was prepared from the originals:

- Phone screenshots and recordings keep the whole screen, so they have a
  phone's proportions, but the status bar (the top 177 px of a 1179 × 2556
  screen: time, timer, battery, recording dot) is filled with the page's own
  colour at its corner, frame by frame for the recordings. Then they're
  scaled to 720 px wide (screenshots) or 640 px wide (recordings)
- Desktop screenshots are 2000 px wide; desktop recordings 1600 px wide at
  30 fps, with a few pixels of window edge trimmed
- Recordings are trimmed to clean loops: no static tails, page-load flashes,
  cookie banners or Wayback Machine toolbar
- The TSIA article, announcement and home-section images are the top of
  full-page captures; the membership image is the top of that page

The models are built in code from bevelled primitives, lathes and extrusions
rather than loaded from files, so there is nothing to download before the
scene appears.

## Scene notes

- Framing: the set's bounding box is fitted into the space right of the copy
  on wide screens (a view offset of roughly −24% of the width) and below it
  under 980px.
- Camera: azimuth −38° ± 7° and elevation 17° ± 2°, drifting slowly, plus a
  little pointer parallax. With `prefers-reduced-motion` the scene is a still
  frame and the CRT shows the whole log.
- Rendering stops while the hero is off screen or the tab is hidden.
- The intro, the first time the desk is on screen (about four seconds), in
  two steps. Trace: out of the black, the floor grid powers on from the
  desk outward and a glow pools round it; then the set is drawn in glowing
  lines from the floor up, each object a beat after the one before, with
  the surfaces appearing behind the lines as a hologram (a monochrome
  render with a 4 cm grid and scanlines). Fill, the moment
  the trace finishes: a bright plane sweeps quickly through the hologram
  on a diagonal (bottom left to top right on screen), the real materials,
  colours and shadows take over behind it, and the lines fade.
  Mint by night, the darker mint by day. Timings are at the bottom of
  `mountIntro`. It doesn't react to the music, and there's none with
  reduced motion.
- X-ray: after the intro, a mouse over the desk gets a lens (a ringed
  circle round the pointer that opens out of a dot and closes back into
  one) that shows the set inside it as the hologram it was built from,
  lines and grid, and turns the floor grid under it to the line colour.
  Not on touch screens.

## Day and night

The sun and moon buttons switch the whole page. Night (the default) is the
black void: mint rim light and CRT glow, the dev log typing, the boombox
playing. Day is a white void in daylight: the CRT cycles through website
mockups (a cursor selects an element, design-tool style, then the page
scrolls on to the next), and the boombox stops. The page colours and the
scene blend between the two over most of a second. The visitor's choice is
kept in `localStorage` and applied before the first paint by a small script
in `index.html`. Night and day colours for the page are the tokens in
`src/styles.css`; for the scene, `LOOKS` in `src/scene/index.ts`.

## Still to come

- The X-ray ASCII lens (drawn in NB Mono)
- Real email, LinkedIn and resume links

The previous pixel-art desk (`src/hero`, `src/ui`, `src/art`, `src/fx`,
`src/audio.ts`, `src/sections.ts`, `src/content`, `src/fonts`) is no longer
used by the page but is still in the tree.
