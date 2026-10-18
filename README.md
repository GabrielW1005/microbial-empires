# Microbial Empires · v0.1.0

An independent, single-player ecological RTS. Command a mixed Sunlit community against an autonomous Sediment community across five freshwater habitats. It is a playable first vertical slice, not the complete long-term design.

This project is separate from Microcosm, Cell Command, Newton Studio and every other existing game. No existing repository was changed. Storage keys begin with `microbial-empires.v1.`; no other app's storage is read or modified.

## Play

- GitHub Pages: https://GabrielW1005.github.io/microbial-empires/
- **No installation:** extract the ZIP and open `PLAY_OFFLINE.html` in Chrome. This contains the compiled game, styling and icon in one file. File opening and JSON download permissions can depend on school policy. Export saves if local browser storage is restricted.
- **Static hosting:** upload the contents of `dist/` together. Its `index.html` uses relative asset paths. It can be served at a repository subpath.
- The hosted version does not need third-party runtime websites or online APIs. The standalone build works without a network connection. The hosted version is not a PWA and is not guaranteed to reopen offline after a reload.

Start with a mixed group near the left side of the pond. Send it to Lily Reach. Keep some producers and recyclers alive, then expand to Fallen Leaf and Sunwell. Population growth happens through feeding and division, not a purchase button.

## Objective

Capture a habitat by maintaining dominant presence for 32 seconds. At least 1 influence point and 1.5 times the opposing influence is needed to progress capture. Amoebae count 2.5, ciliates 1.6, algae 0.6 and bacteria 0.2. This influence is an explicit strategy abstraction.

Win by holding three habitats continuously for 90 seconds or eliminating all opposing living cells. A balanced contest or stronger invading force interrupts the hold timer. A weak intrusion does not indefinitely cancel control by a dominant garrison. Ownership persists until another community captures a site. Economic resources are local field pools; ownership does not create bonus resources.

A 10–20 minute match is the design target, not a guaranteed duration. Check VALIDATION.md for measured automated match outcomes. Human balance and classroom playtesting remain necessary.

## Controls

| Action | Input |
| --- | --- |
| Select | Left click; drag a marquee for a group |
| Add/remove selection | Shift + click |
| Select a species | Double-click a cell, or click its selected-species chip |
| Move | Right click terrain, or Move then left click; M activates Move |
| Attack/forage move | A then click; uses only biologically compatible prey |
| Contextual predation | Right click an enemy/wild cell; only eligible selected predators receive the order |
| Settle | G or Settle, then click a patch; travel and hold for local feeding |
| Queue | Shift + right click or Shift + command click; up to 16 orders |
| Hold | H |
| Toggle selected division | R |
| Inspect a cell | I or Inspect; pauses the match |
| Assign / recall group | Ctrl + 1–9 / 1–9; recall also focuses the camera |
| Pan | Arrows, Alt + drag, middle drag, or click minimap |
| Optional WASD pan | Enable in Settings; attack-move becomes F to avoid the A conflict |
| Zoom | Wheel or + / − buttons |
| Latest alert | Space |
| Cancel / clear | Escape |
| Pause / speed | Top-bar controls; 1× or 2× |

A Chromebook two-finger click normally supplies right click. Every primary map order also has a visible button followed by an ordinary click. Native browser shortcuts may take precedence over some control-group keys; pointer controls remain available.

## Implemented

- Fixed 10 Hz simulation, render loop, seeded world and procedural original art.
- Five species classes with morphology and locomotion differences: motile alga, recycler bacterium, matrix builder, bacterivorous ciliate and amoeba.
- Five habitats, six navigable stone obstacles, pan/zoom, minimap, selection/groups, queued movement, attack-move, hold and division controls.
- Photosynthesis, substrate consumption, decomposition, prey eligibility, hunger, death, matter recycling, bounded oxygen and conservative diffusion.
- Conservation, sustainable harvest and unrestricted feeding policies; prey reserves and per-species division ceilings.
- Gradual biomass-funded extracellular matrix, access delay and enemy movement penalty.
- Deforming amoeba outlines, engulfment arms and digestion vacuoles; cilia/flagella; division cues and daughter separation; high-zoom detail and low-zoom simplification.
- Heuristic enemy expansion, mixed populations, compatible prey targeting, hunger response and selection of less-defended expansion sites. Both sides obey the same ecological rules.
- Capture and victory conditions; pause, 2×, restart/rematch, notifications, tutorial, scientific overlays, optional inspection, sound/reduced motion and three graphics modes.
- Browser-local settings and saves; JSON import/export with version and structure validation.

## Biology model and deliberate compromises

The organisms are functional analogues, not calibrated species. The alga references Chlamydomonas-like morphology; the ciliate references a bacterial-grazing Tetrahymena-like role. Real microbes do not recognize allies, choose targeted mutations or capture map circles. Cooperative factions, player policies, influence scores and population targets are management/game abstractions.

Matter units are conserved after initialization:

- Algal biomass consumes 0.8 inorganic-carbon and 0.2 mineral units per mass unit. Light supplies its energy index; small exudation transfers biomass to dissolved organics.
- Recycler breakdown transfers detritus into 75% dissolved organic matter and 25% inorganic pools. Bacterial assimilation retains up to 60% of consumed dissolved matter; the remainder is remineralized.
- Predators retain up to 65% of prey biomass, limited by growth capacity; all unretained prey matter enters detritus.
- Starvation catabolism returns mass to 80% inorganic carbon / 20% minerals. Natural deaths deposit remaining biomass as detritus.
- Matrix production transfers cellular biomass into matrix. Matrix decay returns it to dissolved organic matter.
- Division splits existing biomass and stored energy between daughters. It does not duplicate either. A daughter must grow again before dividing.

These coefficients are bookkeeping, not actual elemental stoichiometry. The energy index is uncalibrated and does not explicitly resolve ATP, heat or growth-associated energy expenditure. Maintenance consumes it; photosynthesis and substrate oxidation/feeding replenish it. Oxygen is a separate 0–1 index with atmospheric exchange; it is excluded from the closed abstract matter ledger. Light and oxygen are not conserved. The two selected bacterial analogues tolerate low oxygen; protists are oxygen-sensitive. All organisms must maintain structural mass.

Spatial and time units are stylized. Bacteria are physically smaller than protists but the ratios are compressed for selection and readability. Amoebae represent crawling on a submerged interface. Motion is drag-dominated steering and separation, not CFD. Chloroplasts are limited to algae. Invisible fields are drawn only under labeled scientific overlays.

Conservation completely forbids friendly predation in this version. Sustainable harvest permits it only above reserves, with algae reserve = ceil(0.65 × selected reserve), ciliate reserve = ceil(0.25 × reserve), and bacterial reserve = selected reserve. Unrestricted removes allegiance protections, not prey-size or diet restrictions. These policies cannot make all populations indefinitely sustainable.

## Local development

Node 22.18+ is recommended (the tests use native TypeScript stripping). Install dependencies once:

```sh
npm ci
npm test
npm run dev
```

Open the Vite URL printed by the development server. To build:

```sh
npm run build
npm run simulate
```

`build` runs TypeScript checking, creates `dist/` and generates `dist/PLAY_OFFLINE.html`. `simulate` runs seeded full-match checks and CPU benchmarks. No framework or runtime asset CDN is required. Vite's relative `base: './'` supports isolated GitHub Pages repository paths.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/entities/` | Species definitions, organism state and faction appearance |
| `src/game/World.ts` | Match state, orchestration, commands, capture and ecological interactions |
| `src/game/Camera.ts`, `Controls.ts`, `SpatialHash.ts` | RTS input, viewport and local neighborhood queries |
| `src/simulation/` | Metabolism, fields, feeding eligibility, division and victory rules |
| `src/ai/` | Cached coarse A* navigation and strategic decision rules |
| `src/graphics/` | Procedural cell animation, cached terrain, LOD, overlays and minimap |
| `src/save/` | Versioned validated save serialization |
| `src/main.ts`, `index.html`, `src/style.css` | HUD, dialogs, settings and application lifecycle |
| `tests/` | Invariants, regression checks, matches and performance scenarios |
| `scripts/offline-build.mjs` | Standalone compiled HTML packaging |
| `.github/workflows/pages.yml` | Test, build and deployment to this repository's Pages site |

For balance changes, start in `Species.ts`, `Metabolism.ts`, `World.ts` and `StrategicAI.ts`. Keep simulation changes independent of animation. Add a save migration and increment its schema version if saved state becomes incompatible. Never reuse another game's keys.

## Performance approach and limits

Spatial hashing avoids all-cell pair comparisons for neighbors and feeding. A coarse-grid route cache and staggered individual decisions limit navigation work. Static terrain is drawn once; organisms are culled outside the viewport. Rendering quality changes animation detail and pixel density. The fixed timestep is independent of refresh rate.

This first version uses Canvas 2D rather than Phaser/WebGL: it keeps the initial runtime small and makes procedural amoeba outlines straightforward. It does not yet have GPU atlases, pooled organisms, worker simulation, interpolated positions, adaptive resolution or fully hierarchical tactical squads. Large caps remain experimental. Avoid claiming Chromebook FPS from the included server-side benchmark.

## GitHub Pages deployment

This source is maintained in the standalone `GabrielW1005/microbial-empires` repository. Its Settings → Pages source is **GitHub Actions**. Every push to `main` runs the test suite, builds the static game, and deploys `dist/` with `.github/workflows/pages.yml`.

The expected Pages URL is `https://GabrielW1005.github.io/microbial-empires/`. The workflow run reports the deployed URL and status. An offline copy is generated at `dist/PLAY_OFFLINE.html` by `npm run build`.

**Keep this project in its own repository. Never push it to `GabrielW1005/GabrielW1005.github.io` or any other existing game.**

## Roadmap

1. Classroom hardware and human balance pass: Chrome/ChromeOS pointer behavior, 1366×768 and 1024×600 layout, real FPS, stuck-unit observation, match pacing and learnability.
2. Tactical depth: persistent squads, reliable retreats/escorts, rally points, richer site-resource dynamics, selective fog of war and clearer early-game goals.
3. Biology/art: explicit growth energy budgets, more accurate taxon-specific anatomy/engulfment, size scaling, species-specific oxygen responses and visual damage cues.
4. Renderer scale: GPU sprite atlas, pooled render data, interpolated positions, adaptive resolution and 300/500-cell classroom profiling.
5. Heredity and development: distinguish acclimation, descendant traits and community structures; add trade-offs rather than instant targeted mutations.
6. New habitats and lineages, then deterministic replay and carefully designed multiplayer. Multiplayer needs a separate networking design; this build has no backend.

## Scientific reading and licenses

- OpenStax, *Biology 2e*, [Characteristics of protists](https://openstax.org/books/biology-2e/pages/23-2-characteristics-of-protists) and [Groups of protists](https://openstax.org/books/biology-2e/pages/23-3-groups-of-protists).
- [Microbial Primer: An introduction to biofilms](https://pmc.ncbi.nlm.nih.gov/articles/PMC7615007/).
- [Extracellular Metabolism Sets the Table for Microbial Cross-Feeding](https://pmc.ncbi.nlm.nih.gov/articles/PMC7849352/).

Original source and procedural art are supplied under MIT (LICENSE). TypeScript is Apache-2.0; Vite is MIT; build-tool transitive license files remain in their npm packages. @types/node is MIT. No artwork, audio, code or interface assets from other games are included. All audio is optional procedural synthesis. See VALIDATION.md for testing evidence and limitations.
