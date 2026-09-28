# portfoliov2

A pixel-art desk you can poke at. The hero is a real-time Three.js room rendered at low resolution through a pixel post-process (dithered lighting, depth outlines, emissive glow), in the style of ThreeUI's Agentic template.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Where things live

| Path | What |
| --- | --- |
| `src/content/data.ts` | **All placeholder content**: name, email, projects, books, photos, services |
| `src/hero/HeroView.ts` | Renderer, pixel post-process shader, camera rig and CRT zoom |
| `src/hero/materials.ts` | Lit/emissive shaders, lamp/window/CRT lights, wind sway |
| `src/hero/room.ts` | Walls, poster collage, window + teal city, desk, bookshelf |
| `src/hero/props.ts` | CRT, MPC, turntable, speakers + decks, lamp, spider plant, pothos, camera |
| `src/hero/dust.ts` | Glowing dust motes |
| `src/art/wall/` | Your personal wall pieces (pixelated PNGs); layout in `WALL` in `room.ts` |
| `src/art/posters.ts` | Pixel poster homages and flyers for the wall |
| `src/art/ascii/*.txt` | ASCII art pieces (plain text); `src/fx/asciiType.ts` types them in on scroll |
| `src/art/theme.ts` | Reads the accent colour; change it once via `--accent` / `--accent-hi` in `styles.css` |
| `src/fx/pixelmask.ts` | Pixel-dissolve masks (hero copy on scroll, sections on arrival) |
| `src/fx/dust.ts` | Site-wide floating dust layer |
| `src/ui/` | Hover/click, deskOS on the CRT, camera gallery, MPC, bookshelf |
| `src/audio.ts` | Synthesised ambient + MPC voices (placeholder audio) |

## Interactions

Hover anything that glows. Computer: zooms into the CRT and opens deskOS. Camera: flash, then a photo roll on the camera's back screen. MPC: playable pads (keys 1-4 / Q-R / A-F / Z-V). Bookshelf: favourite books. Turntable: ambient sound on/off. Lamp: click to switch on/off; drag an arm to move the head, drag the shade to aim the light. Every object also has a keyboard-focusable button.
