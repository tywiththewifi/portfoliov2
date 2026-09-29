# portfoliov2

Tyler Caldwell's portfolio. The hero is a Three.js scene filling the whole
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
| `index.html` | All the copy: heading, bio (placeholder), pills. The email address goes in `data-email`, the LinkedIn and resume links in the pills' `href` (`#` shows "coming soon"), the clock's time zone in `data-tz` |
| `src/styles.css` | Tokens (`--bg`, `--panel`, `--text`, `--text-2`, `--muted`, `--mint`) and the layout |
| `src/main.ts` | Clock, day/night buttons, email copy, toasts, mounting the scene |
| `src/scene/index.ts` | Renderer, lights, camera drift and parallax, framing (view offset), render loop |
| `src/scene/grid.ts` | The floor-grid shader |
| `src/scene/screen.ts` | The CRT's typing dev log |
| `src/scene/set.ts` | Where each prop sits on the desk, and the cables |
| `src/scene/props/` | The models: desk, CRT, tower, keyboard and mouse, boombox, mug and cassette case, chair |
| `src/scene/kit.ts` | Parts builder the models are made with (merged meshes, baked contact shading) |
| `src/scene/mats.ts` | Scene colours, materials, printed labels |

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

## Still to come

- The X-ray ASCII lens (drawn in NB Mono)
- Day mode: websites by day, music by night
- Real email, LinkedIn and resume links, and the final bio

The previous pixel-art desk (`src/hero`, `src/ui`, `src/art`, `src/fx`,
`src/audio.ts`, `src/sections.ts`, `src/content`, `src/fonts`) is no longer
used by the page but is still in the tree.
