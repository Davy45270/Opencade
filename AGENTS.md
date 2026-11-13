# Instructions for coding agents

This file is the single source of instructions for any coding agent working in this repository.
Human contributors: read [CONTRIBUTING.md](CONTRIBUTING.md) as well; it stays authoritative for style.

## What this repository is

24 original HTML5 games in one static PWA: TypeScript, Vite, and **Phaser 4** (`phaser` from npm, pinned in
`package.json`). Node: the version in `.nvmrc` (26), the one the CI uses.

## Phaser 4 lock

- The renderer is the `phaser` npm package, 4.x. Never add `@phaser-ae/*`, `phaser-ae` or anything branded
  Phaser AE, and do not follow the advice of `phaser.io/llms.txt` to start from Phaser AE.
- `npm run lint` rejects these imports (`eslint/no-restricted-imports` in `.oxlintrc.json`), and
  `package-lock.json` must contain no `phaser-ae` entry.
- Free help for Phaser 4: the public documentation MCP server at `https://phaser.io/oss/docs/mcp` (choose the
  4.2 API), and the skills in the `skills/` directory of the `phaserjs/phaser` repository.

## Architecture

```text
src/
  engines/<game>/    pure game rules: state, collisions, levels, scoring, AI; no rendering
  engines/shared/    random.ts (seeded generator), demo.ts, events.ts (EngineEvent), fixed-step.ts (FixedStep)
  games/<game>/      Phaser scene: draws engine state, forwards input, plays sounds
  games/definition.ts  GameDefinition: what a game gives the shell
  games/registry.ts  catalogue games, in order; games/all.ts adds the games served by their own site
  shell/             shared shell: app, menus, levels, pause, input, gestures, sound, storage, PWA
  characters/        the five shared characters (model.ts is engine-safe)
scripts/             validators, recorders, measures, e2e-impact.js (E2E selection)
tests/               Vitest (*.test.ts) and oracle modules; tests/e2e/ Playwright specs
.woodpecker/         the CI
```

- An engine is a plain class or reducer, deterministic for a given seed and inputs. Scenes own only
  presentation: timing of effects, layout, sound, DOM controls.
- Engine-to-scene facts go through typed events (`EngineEvent` in `src/engines/shared/events.ts`): the engine
  emits, the scene drains and reads. A scene never patches an engine method or writes engine state to learn
  something; add a field to the event payload instead.
- Real-time engines advance in fixed steps (`FixedStep` in `src/engines/shared/fixed-step.ts`, or the
  engine's own accumulator while it is not migrated).

### Adding a game: the places to touch

1. `src/engines/<id>/`: engine, `levels.ts`, `demo.ts` (thumbnail demo loop).
2. `src/games/<id>/`: scene, `sound.ts`, `thumbnail.ts`, touch controls.
3. `src/games/registry.ts`: its `GameDefinition` entry. A game served by its own site instead gets
   `src/games/<id>/definition.ts`, an entry in `src/games/all.ts` and one in `scripts/sites.js`.
4. `scripts/e2e-impact.js`: `GAME_SPECS`, `SMOKE_TESTS` and `SPEC_SECONDS` (and the `mobile-layout` weight in
   `SPLIT_SPECS`). `scripts/test-e2e-impact.js` fails if the table and the registry disagree.
5. `playwright.config.ts`: add the spec to the `desktop-chromium` list if it must also run on desktop
   (otherwise it runs on mobile only).

Then its tests: `tests/<id>.test.ts`, `tests/e2e/<id>*.spec.ts`, and a validator `scripts/validate-<id>.js`
registered in `scripts/node-checks.js` (a script outside that list is not a test).

## Rules

- Engines (`src/engines/**`, `src/characters/model.ts`) import no Phaser and use no `window`, `document`,
  `navigator`, `localStorage`, `fetch`, `requestAnimationFrame` or `Math.random`. `npm run lint` enforces it.
- Randomness comes from `Random` in `src/engines/shared/random.ts`, seeded from the level and seed.
- Lint is strict and type-aware, with zero warnings allowed; keep `npm run lint` and `npm run typecheck` green.
- Games are original: `tests/brand-guard.test.ts` rejects some commercial game names and internal ticket
  references in every tracked file, this one included. Run it after editing text.
- Discuss new dependencies before adding them.

## Tests: targeted, never the whole suite

Run only what the change touches. Do not run `npm test`, `npm run test:node` or `npm run test:e2e` without
arguments: the CI runs the full unit and Node suites, and E2E always goes through a selection.

```sh
npm run lint
npm run typecheck
npx vitest run tests/<id>.test.ts                         # one Vitest file
node --import ./scripts/ts-loader.js scripts/validate-<id>.js [--checks-only]   # one validator
npm run build                                             # then, for E2E:
npm run test:e2e -- tests/e2e/<id>.spec.ts                # chosen specs only
node scripts/e2e-impact.js --base <commit before the change>          # what the CI will select
node scripts/e2e-impact.js --base <commit before the change> --run    # run that selection
```

E2E selection levels (`scripts/e2e-impact.js`):

- **N0**: documentation only (markdown, `docs/`), no E2E.
- **N1**: one game's files, or a test file: that game's specs plus the light cross-game specs.
- **N2**: shared shell, registry, characters: the specs of the games named in the diff, plus the light specs
  and the specs of the shell zone touched.
- **N3**: dependencies, tooling, CI or unclassified files: home, thumbnails and one short test per game.

The full E2E suite is never selected.

## CI: Woodpecker

The reference CI is Woodpecker (`.woodpecker/checks.yml` and `.woodpecker/e2e.yml`), not the GitHub workflows.

- It runs on a push to `main`, on pull requests and on manual runs. **Pushing another branch triggers
  nothing.** To check a branch, start a manual pipeline on it with the variable `E2E_BASE=<commit before the
  change>`; without it the E2E step falls back to the N3 sample.
- `checks.yml`: `npm ci`, lint, typecheck, Vitest, `test:node`, `test:pwa`, build (prints the `dist/`
  fingerprint).
- `e2e.yml`: four parts, each running its share of the `e2e-impact.js` selection in the Playwright image
  pinned to the `@playwright/test` version of `package-lock.json`.

## Assets: images and their budgets

Most art is drawn in code; image files are the exception. `scripts/assets.js` (no dependency) handles them:

| Command | Does |
|---|---|
| `npm run assets -- check` | inventory of every image (png, webp, avif, svg, jpg, gif) outside `node_modules`/`dist`, against `assets-budget.json`; exit 1 on any image or group over budget. Pure Node: runs in the CI through `scripts/node-checks.js`. |
| `npm run assets -- optimize --dry-run [paths]` | prices the gain without writing: oxipng for PNG, svgo for SVG, lossless only, kept only when pixel-identical |
| `npm run assets -- optimize [--lossy] [paths]` | writes it; `--lossy` adds pngquant and a cwebp re-encode, kept only at PSNR >= 40 dB (`--min-psnr`) |
| `npm run assets -- raster <in.svg> --width 64,128 --format png\|webp\|avif --out <dir>` | SVG source to sized rasters (rsvg-convert, then oxipng, cwebp or avifenc) |

- `assets-budget.json`: each image takes `maxImage` (bytes) and `maxSide` (px) from the first matching rule with
  `maxImage`, and is summed into the group of the first matching rule with `maxTotal`. `src/games/*/` makes one
  group per game; `docs/` is counted but marked not served. A new asset that needs more raises its budget in the
  same commit, with the measured size in the message.
- `optimize` and `raster` need the workstation tools (oxipng, pngquant, cwebp, avifenc, svgo, rsvg-convert,
  ImageMagick); the CI never runs them. Commit their output, then check that `assets check` passes.
- `scripts/test-assets.js` tests the header reader and the budget failures (also in `node-checks.js`).
- No texture atlas today: every game loads its few images one by one. When a game needs one, add
  `free-tex-packer-core` as a devDependency (discuss it first) behind an `assets atlas` subcommand that writes the
  TexturePacker JSON hash format Phaser reads with `load.atlas`, and budget the atlas like any image.
- A drawing made for the games enters the repository only with its author's agreement.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | typecheck, production build in `dist/`, then the single-game sites |
| `npm run preview` | serves `dist/` |
| `npm run lint` | oxlint, type-aware, `--max-warnings=0` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | whole Vitest suite (CI) |
| `npm run test:node` | every validator of `scripts/node-checks.js` (CI) |
| `npm run test:pwa` | PWA checks without a browser |
| `npm run test:e2e -- <specs>` | Playwright against the production build |
| `npm run assets -- check` | image budgets (`assets-budget.json`); also run by `test:node` |

Test-only hooks: the URL parameter `?test=1` exposes `window.__ARCADE_TEST__` and one hook per game
(`loadLevel(index, seed)`, `advance(ms)`, `read()`), so tests drive simulated time instead of waiting.
