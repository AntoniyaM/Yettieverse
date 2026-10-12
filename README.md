# Yettie in the Yettieverse 🌱

A cozy top-down explorer pixel-art adventure starring Yettie. Help them collect snacks, swim the lake, climb Frosty Peak and ring the Wishing Bells.

```sh
pnpm install
pnpm dev
pnpm build && node .output/server/index.mjs
```

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App shell | **Nuxt 4** | Title page is SSR'd; `/play` is client-only (`routeRules`), since a canvas gains nothing from SSR |
| Game | **Phaser 4.2** (WebGL, Arcade physics, tilemaps) | Lazy-loaded only on `/play` |
| HUD / dialogs | **Vue** components over the canvas | They read the same reactive state the game writes |
| Saves | `localStorage` autosave + **Nitro** `/api/saves/:code` | Cloud backup by a shareable code like `ABCD-2345`, no accounts |
| Fonts | Jersey 10 (UI) and Pixelify Sans (logo), self-hosted in `public/fonts` | Both OFL-licensed |
| Art | PNGs in `public/sprites/` and `public/tiles/` | One file per sprite, plus one tileset; edit them in any pixel-art editor |
| Audio | Generated in code | Chiptune SFX and music via WebAudio, no audio files |

## Where things live

```
app/game/
  data.ts            quests, dialog, items, wearables  ← start here to add content
  story.ts           what talking/poking does (quest state machine)
  state.ts           reactive save + UI state, persistence, event bus (no Phaser import)
  world/world.ts     seeded island builder: zones, roads, gates, pickup spots
  assets.ts          every image the game loads: texture key → file, frame sizes
  entities/Yettie.ts hero + Pip: animation, blink, hats, floatie
  scenes/            Boot (texture prep), World (gameplay), Ambience (day/night lighting, particles)
  audio.ts           WebAudio chiptune
app/components/hud/  dialog box, quest log, wardrobe, menus, touch controls
server/api/saves/    GET/PUT cloud saves (Nitro storage, fs driver by default)
scripts/             world reachability check
```

## Art

```
public/sprites/
  characters/  yettie (+ -blink, -mama, -mama-blink, -pip, -pip-blink), broc, avo, drip, pear, shelly
  items/       carrot, berry, dewdrop
  wearables/   chef-hat, crown, bow, shades, floatie
  props/       sign, lamp, bell, fountain, house-*, house-glow
  fx/          spark, heart, note, butterfly, dust, glow, firefly, shadow, ripple, pixel
  ui/          marker-*, arrow
public/tiles/tileset.png
```

- **Adding or renaming a sprite:** register it in `app/game/assets.ts`. That's where every file gets its texture key, and where multi-frame sprites (strips of equal frames) declare their frame size.
- **Tileset:** a strip of 16×16 tiles. A tile's position from the left is its index in `T` in `world/world.ts`. Append new tiles at the end so existing indices stay put.
- **Yettie:** a 5×4 sheet of 32×32 frames, with 1 front, 2 right, 2 left and 15 back views. Walking down mirrors the front frame to fake a waddle. At boot the game measures every frame (head top, eye position) to place hats and shades, so edits to the sheet still line up.
- **Keep the Yettie sheets in sync:** the blink sheets and the Mama (lilac) and Pip (pink) sheets are separate files with the same layout. If you redraw `yettie.png`, update those five too.

## Adding a quest

1. Add an entry to `QUESTS` in `app/game/data.ts`. Objectives: `collect` (item × n), `steps`, or `flags`.
2. Put pickups in `world.ts` (`spawns`) and wire them into `syncPickups()` in `WorldScene.ts`, or set flags from `story.ts`.
3. `pnpm check:world` checks that everything is reachable with the abilities you have at that point in the story, and writes `scripts/minimap.png`.

## Night lighting

Day/night uses Phaser 4 lighting. Everything in the world is `setLighting(true)` (see `WorldScene.applyLighting`). The ambient colour follows the clock: white by day, so the art looks exactly as drawn, and deep blue at night.

Light sources are point lights added via `Ambience.addGlow()`: windows, street lamps, Yettie's glow, fireflies, the fountain, rung bells and dewdrops. They scale with "night", so they're invisible by day. To keep something bright at night (UI-ish markers, sparkles), wrap it in `unlit()`. `render.maxLights` (32) caps how many lights can shine in view at once.

## Dev tips

- Press `N` (or the dashed ☀️/🌙 button) in dev to jump between day and night. It lives in `app/game/dev.ts` and isn't in production builds.
- `__yettie` is on `window` in dev: `__yettie.save`, `__yettie.ui`, `__yettie.world().player.body.setPosition(x, y)`.
- After changing the Phaser version, clear Vite's pre-bundle cache (`rm -rf node_modules/.cache/vite`). Otherwise dev keeps serving the old copy.
- Wipe progress: `localStorage.removeItem('yettieverse:save')`.
- Deploying: change the `saves` storage driver in `nuxt.config.ts` (Redis, Cloudflare KV, Vercel KV…). The fs driver writes to `.data/saves`.
