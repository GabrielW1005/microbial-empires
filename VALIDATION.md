# Validation — v0.2.2

Checked on 2026-10-27.

This is a palette and static-art update. The engine, input controls, opening population, resource rules, and v2 save schema are unchanged.

- NatureScot's freshwater algae, cyanobacteria, and diatom references informed the green, blue-green, and golden-brown background palette. The biology notes distinguish photosynthetic pigments from artistic water/lighting colors and decorative background growth from resource nodes.
- The shaded artwork, texture, and decorative background growth are rendered into the existing cached surfaces during initialization. Per-frame code continues to use image draws, transforms, culling, and selection indicators.
- A native Canvas preview checks the opening, all three organism types, all three habitats, and a crowded 96-cell scene. This measures native drawing on a server, not browser or Chromebook FPS.
- Final native Canvas sample: opening mean 2.20 ms / p95 2.83 ms; crowded scene mean 4.71 ms / p95 8.19 ms. Cache remains 45 surfaces / 10.59 MiB. Timings fluctuate with server load; these are not device FPS guarantees. See `validation/color-render-cost.json`.
- The default remains 80% internal resolution and a 30 FPS cap; simulation remains 10 Hz with interpolation. Population remains capped at 48 per side.

The existing 14 gameplay tests and production build run in GitHub Actions before publication. Public browser verification checks the deployed version, appearance, and selection. Physical Chromebook frame rates remain unverified.
