# Validation — v0.2.0

Checked on 2026-10-18.

- `npm test`: **14 behavioral tests pass**, covering the three-worker opening, absence of automatic growth, gather/return cycles, finite patches, mixed-resource carrying, production costs and time, cancellation refunds, reserved population, construction, maturation, obstacle navigation, diet restrictions, victory, rival grace period and expansion, save continuation, and malformed saves.
- `npm run build`: TypeScript strict checking, Vite build, and standalone offline HTML generation pass. Compiled game JavaScript is about 43 kB before gzip; no framework or remote runtime assets.
- `npm run simulate`: the resource-constrained rival wins against a completely idle player at 345.2 simulated seconds; no invalid unit coordinates. This is a basic match-completion check, not a human balance result.
- CPU sample: simulation p95 was 0.024 ms at 6 cells, 0.416 ms at 48, and 0.398 ms at 96 on this server. One simulation tick represents 100 ms. See raw evidence in `validation/`.
- The actual Canvas renderer was executed through a native Canvas implementation and its opening image visually inspected. It generated 99 sprite canvases. At the default resolution, the 1366×712 CSS viewport used a 1093×570 backing canvas. Mean native draw time was 4.4 ms, p95 8.9 ms, over 120 opening frames.

The timings above are server measurements, not browser or Chromebook FPS. The default 30 FPS cap is a rendering target, not a measured hardware guarantee. Human match balance, school Chromebook performance, and extensive accessibility testing remain open.

GitHub Actions runs the same tests and production build before publishing. Public browser checks are performed after deployment for the opening screen, selection-only commands, gathering, and layout.
