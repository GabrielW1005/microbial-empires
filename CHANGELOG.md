# Changelog

## 0.2.2 — 2026-10-27

- Add a richer natural palette: blue pond backdrop, golden sediment, copper/russet detritus, varied mineral tones, and stronger greens in algal beds.
- Bake sparse green algae, golden-brown diatom-like forms, and muted blue-green films into the static background. These decorations do not add units or resource nodes.
- Keep most microbes pale, with contrasting warm/cool shading and separate ownership markers.
- Explain biological pigments versus artistic water/lighting colors in the field notes, with NatureScot references.
- Retain the pre-rendered-style sprite cache, simple opening, and selection-only interface.

## 0.2.1 — 2026-10-27

- Replace blocky pixel art with smoothly shaded, pre-rendered-style cell sprites, organic habitats, resource patches, and pond terrain.
- Cache anatomical details, shading, and textures once; reuse the images during play. Retain the 30 FPS default and existing population limit.
- Use smooth image scaling and soften the opaque interface edges.
- Preserve the three-worker opening, economy, controls, and v2 save compatibility.

## 0.2.0 — 2026-10-18

- Replace the crowded automatic ecosystem opening with one home colony and three workers.
- Add gather/return resource cycles, construction, unit production queues, rally points, population expansion, and colony maturation.
- Allow five minutes before the rival sends its first raid; the rival obeys resource and production costs.
- Replace the persistent ecology dashboard with selection-only commands, a slim resource bar, dismissible guidance, and an optional minimap.
- Use an opaque cream/slate interface; replace dark translucent panels.
- Use cached 1990s-style pixel sprites, pale microbes, green algae, brown organic matter, and gray minerals with separate blue/red team markers.
- Default to 30 FPS and 80% internal resolution. Cache terrain and sprites, interpolate movement, stop work in hidden tabs, and cap armies at 48 units per side.
- Replace legacy simulation source and its tests; retain v0.1 in Git history. Preserve old local save keys separately.

## 0.1.0 — 2026-10-18

First published ecosystem prototype with automated growth, feeding, habitat capture, and a persistent ecology dashboard.
