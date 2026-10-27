# Validation — v0.2.1

Checked on 2026-10-27.

The visual update preserves the v0.2 rules, controls, opening population, and save schema.

- `npm test`: **14 behavioral tests pass**, covering the three-worker opening, gather/return cycles, production, construction, maturation, navigation, diet restrictions, victory, AI expansion, saves, and malformed saves.
- Renderer QA uses the actual Canvas drawing code, renders both the opening and all organism/habitat types, and compares native draw cost with the preceding pixel renderer on the same server. These are native Canvas timings, not measured browser or Chromebook FPS.
- Detailed anatomy, shading, resource art, rock art, and pond textures are created only during initialization. The frame loop uses cached images, transforms, culling, and simple selection indicators. No runtime asset downloads or real-time lighting are introduced.
- Native Canvas results: opening mean 2.79 ms / p95 4.43 ms; crowded 96-cell scene mean 5.03 ms / p95 7.15 ms; startup generation 48.77 ms once. The 45 cached surfaces occupy about 10.59 MiB. The previous pixel renderer was faster (crowded mean 2.56 ms / p95 3.87 ms); the smoother version remains below the 33.3 ms frame budget in this test. See `validation/render-comparison.json`.
- `npm run build` passes strict TypeScript checking, static production bundling, and offline HTML generation.
- The default remains 80% internal resolution and a 30 FPS render cap, with fixed 10 Hz simulation and movement interpolation. Hidden tabs pause work. Maximum population remains 48 units per side.

The v0.2 gameplay and economy were verified in the public browser, including food and mineral return, completed worker production, and selection-only commands. The visual update receives a fresh public browser check after deployment. Physical Chromebook frame rates, small-screen layout checks, and classroom balance remain unverified.
