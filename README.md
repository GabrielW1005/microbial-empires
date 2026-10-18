# Microbial Empires · v0.2.0

A small, deliberate single-player RTS inspired by pond microbes and classic 1990s strategy games. Begin with **one home colony and three workers**. Gather resources, construct habitats, queue units, and expand at your own pace.

**Play:** https://gabrielw1005.github.io/microbial-empires/

This is the independent `GabrielW1005/microbial-empires` project. Do not deploy it to any other game or the account's root Pages repository.

## Opening and objective

1. Select workers and right-click a brown food patch or gray mineral deposit. Workers collect a load, return it to a colony or grazing pool, and repeat.
2. Select the home colony to queue workers. Build an algal bed for +8 population space and a small food income.
3. Construct a grazing pool, then grow ciliates. Mature the home colony to unlock amoebae.
4. Destroy the rival home colony to win. Losing yours ends the match. The AI gathers, builds, and produces under the same resource costs; it launches no raids during the first five minutes.

The top bar shows only resources, population, clock, pause, and menu. Detailed commands appear only when a unit or habitat is selected. The opening hint can be dismissed and the minimap is optional.

## Controls

| Action | Input |
| --- | --- |
| Select | Left click; drag a box for a group |
| Add/remove selection | Shift + click |
| Select matching visible units | Double-click a unit |
| Contextual order | Right-click resources to gather, a foundation to build, a target to attack, or terrain to move |
| Move | M, then click |
| Gather | G, then click a resource patch |
| Attack move | A, then click; predators engage compatible prey and habitats |
| Stop | S |
| Queue orders | Shift + order, up to 12 |
| Home colony | H or Home |
| Next idle worker | . or Idle |
| Assign / recall group | Ctrl + 1–9 / 1–9 |
| Pan | Arrow keys, Alt + drag, middle drag, or optional minimap |
| Zoom | Mouse wheel / touchpad scroll |
| Pause | Space or Pause |
| Clear selection / mode | Escape |
| Cancel active placement | Right-click |

Touchpad alternative: choose a visible command button, then left-click the destination. Commands remain available while paused. Browsers may reserve some keyboard shortcuts.

## Units and habitats

| Item | Cost: food / minerals | Purpose |
| --- | --- | --- |
| Worker bacterium | 40 / 0 | Gathers, returns resources, constructs habitats; cannot fight |
| Ciliate | 70 / 20 | Fast bacterial grazer; attacks workers and habitats |
| Amoeba | 130 / 45 | Slow predator; attacks bacteria, ciliates, and habitats; requires maturation |
| Algal bed | 70 / 25 | +8 population space and 0.5 food per second |
| Grazing pool | 100 / 60 | Produces predators and receives gathered resources |
| Colony maturation | 160 / 100 | Unlocks amoebae after 45 seconds; requires a completed grazing pool |

Starting capacity is 10; maximum is 48 units per side. Production reserves population slots and supports five queued tasks per building. Cancelling the last queued task refunds its cost. Equal-sized predators cannot engulf one another. These restrictions are readable diet roles, not exact species-level ecology.

## Art, biology, and performance

Pale gray and cream cells reflect the near-colorless appearance of many unstained microbes. Algae have green chloroplasts. Blue and red markers identify ownership, not biological pigmentation. The interface uses opaque cream panels and slate text.

The terrain is generated once. Organism frames and directions are cached in 99 small sprite canvases. Visible cells use image blits rather than regenerated detailed anatomy. The default renderer uses 80% internal resolution, crisp pixel scaling, and a 30 FPS cap. Motion interpolates between fixed 10 Hz simulation steps. Display options offer 65%, 80%, or full resolution; 30 or 60 FPS; and still sprites. Background tabs stop simulation work and do not catch up on return.

Bacteria are rods, ciliates have short surface hairs, and amoebae have changing pseudopodia and visible vacuoles. Sizes and times are compressed. Worker hauling, bases, production queues, factions, attacks, and maturation are **RTS abstractions**, not calibrated biology. This version does not simulate conserved matter, chemical fields, a fluid solver, or full ecosystem metabolism.

Microscopy references: [colorless freshwater organisms](https://www.microscopy-uk.org.uk/mag/art98/sdurr.html), [freshwater algae](https://www.microscopy-uk.org.uk/pond/algae.html).

## Saves and offline play

Menu provides save/load and JSON import/export. Matches automatically save on leaving after five seconds of play. Browser storage may be restricted; export a save if needed. Version 2 uses `microbial-empires.v2.match` and `microbial-empires.v2.settings`. Old version 1 saves remain separate and are not compatible with the redesigned rules.

`npm run build` creates `dist/PLAY_OFFLINE.html`, a self-contained file that can be opened without a server or network. The hosted game has no third-party runtime assets or backend, but is not a PWA and is not guaranteed to reload offline. No analytics, advertising, accounts, or student data collection.

## Development and deployment

Use Node 22.18+:

```sh
npm ci
npm test
npm run build
npm run simulate
```

For local development, `npm run dev` starts Vite. Static hosting should serve all files in `dist/`; relative asset paths support a repository subpath. GitHub Actions tests and builds each push to main, then publishes this repository's Pages site.

| File | Responsibility |
| --- | --- |
| `src/rts/model.ts` | Types, costs, roles, limits, and diet rules |
| `src/rts/Engine.ts` | Economy, construction, queues, combat, rival AI, and validated saves |
| `src/rts/Renderer.ts` | Cached pixel sprites, static pond, viewport culling, and minimap |
| `src/rts/Input.ts` | Selection, contextual orders, placement, groups, and camera controls |
| `src/ai/Pathfinding.ts` | Cached coarse A* navigation around rocks |
| `src/main.ts`, `index.html`, `src/style.css` | Selection-based HUD, settings, dialogs, and render scheduling |
| `tests/` | Behavior tests and CPU simulations |
| `scripts/offline-build.mjs` | Single-file offline packaging |

See VALIDATION.md for checks and limits. One map, one AI opponent, no fog of war or multiplayer. Human balance and actual low-end device FPS remain to be tested. Original source and pixel artwork are MIT licensed. No commercial game assets are used.
