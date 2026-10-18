# Validation — 2026-10-18

## What was actually run

- TypeScript strict typecheck and Vite production build succeeded.
- 16 Node automated tests passed, including carbon/mineral growth accounting, bacterial decomposition, resource partition on division, diet/size/reserve eligibility, predation overflow accounting, conservative diffusion, the continuous 90-second objective, stone routing, queued orders, biofilm accounting, deterministic save continuation, corrupt-save rejection, a five-minute bounded ecosystem, local idle behavior, dominant garrison control and obstacle-edge navigation.
- Full-match **headless simulation** scenarios and 150/300/500 initial-cell CPU scenarios ran. Their raw outputs are included under `validation/`.
- The actual Canvas terrain and organism renderer was executed using a native server-side Canvas implementation. Pond and all five species rendered without exceptions and were visually inspected. This is a rendering check, not a browser screenshot or browser playtest.
- The compiled HTML asset references were checked. The normal build resolves its local CSS, JS and favicon. The standalone `PLAY_OFFLINE.html` has no external runtime asset references. HTML IDs are unique.

## Measured release scenarios

| Scenario | Simulated duration | Outcome |
| --- | --- | --- |
| AI mirror, seed 81731 | 20:00 | Still contested at cutoff |
| AI mirror, seed 20261018 | 16:47 | Sediment victory |
| AI mirror, seed 42 | 20:00 | Still contested at cutoff |
| Idle human vs AI, seed 81731 | 7:32 | Sediment victory |
| Scripted one-time mixed-group opening | 20:00 | Still contested at cutoff |

Modeled matter drift in the three mirror simulations was less than 0.00000001 abstract units. The idle scenario's raw output lists a placeholder zero for drift; it was not measured separately there.

| Initial cells | Cells at end | Mean simulation step | 95th percentile |
| --- | --- | --- | --- |
| 150 | 127 | 0.50 ms | 1.36 ms |
| 300 | 237 | 1.15 ms | 2.59 ms |
| 500 | 379 | 2.25 ms | 4.51 ms |

These are Node/server CPU timings, not browser frame times.

## What was not verified

No interactive Chrome/browser-control tool or Chromebook hardware was available. Browser UI layout, pointer interactions, native dialogs, fullscreen, local file execution and real display FPS therefore remain unverified interactively. CSS contains layouts for desktop and small displays, but no claim of a visual 1366×768 or 1024×600 browser pass is made. Browser-local import/export code is implemented; save serialization and validation were tested in Node.

## Balance and gameplay limits

The CPU opponent uses heuristics, not a deep tactical planner. It expands, obeys ecological costs, seeks compatible prey, redirects around strong garrisons and reacts to an opponent's winning hold. It is not equivalent to the full requested layered RTS AI.

An idle-human scenario reaches an AI victory in approximately 7.5 minutes. An early prototype let automatic wandering win for an inactive human; the release tethers idle foraging locally and includes a regression test. An early 2:37 scripted rush prompted the addition of an AI reaction to the player's victory timer. That unchanged single-order opening now remains contested at 20 minutes instead of winning automatically.

**The 10–20 minute pacing target is not yet achieved reliably.** Some automated mirror matches remain contested after 20 minutes, and good human tactics may produce shorter matches. There is no forced draw or time limit. Equal-sized amoebae cannot eat one another; bypassing their site, outnumbering their influence with a larger mixed garrison, or starving their food supply is necessary. This is a deliberate diet rule that currently makes stalemates more likely. Better tactical retreats, coordinated assaults, species counters and classroom balance are priority follow-ups.

Friendly predation can reduce starting producer numbers under the default reserve policy. Use Conservation if you want producers completely protected. Opposing/wild prey are preferred, but the model is not a guarantee of indefinite sustainability.

## Performance interpretation

The benchmark runs 600 simulation steps with 150, 300 and 500 cells initially present. Predation/death reduce the number during each run; the ending populations are included. Timings cover server-side simulation only, not rendering, DOM, GPU work, ChromeOS or student hardware. They cannot be converted into a guaranteed Chromebook FPS.

The renderer uses Canvas 2D, viewport culling, cached terrain and reduced detail in Performance mode. It does not yet use sprite atlases, GPU batching, pooled cells, workers or frame interpolation. The 300/500 caps are experimental.

## Reproduce

```sh
npm ci
npm test
npm run build
npm run simulate
```

Native renderer inspection used an environment-supplied Canvas library and is not a required project dependency. A follow-up browser playtest should cover selection/add-remove, all commands, queued movement around every stone, groups, policy edits, pop targets, pause/speed, fullscreen, save/export/import, game end/restart and the two target viewport sizes.
