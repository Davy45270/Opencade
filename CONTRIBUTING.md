# Contributing to Opencade

Bug reports and pull requests are welcome in English or French.

## Before you start

- Small fixes can go straight into a pull request.
- Open an issue before adding a game or changing its rules so we can discuss the approach.
- Games must be **original**: do not reuse names, characters, artwork, sounds or levels from existing games, or assets with licenses incompatible with MIT. Shapes and sounds are generated in code.

## Set up

Use Node 22.12 or later (see `.nvmrc`).

```sh
npm ci
npx playwright install --with-deps chromium
npm run dev
```

## Code guidelines

- Put game rules in `src/engines/<game>/`, without Phaser, the DOM or `Math.random`. Use the seeded generator in `src/engines/shared/random.ts`. ESLint enforces these boundaries.
- Phaser scenes in `src/games/<game>/` render state and forward input. Release their listeners on exit.
- Cover new rules with Vitest tests and visible user journeys with Playwright tests using real inputs. For real-time gameplay assertions, advance the engine with `advance(ms)` rather than waiting for rendering to move a character.
- Discuss new dependencies before adding them.
- Keep the English and French READMEs in sync. The detailed game specification remains in French.

## Before submitting

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Use [Conventional Commits](https://www.conventionalcommits.org/en/)
(`feat:`, `fix:`, `docs:`, `test:`, `chore:`, etc.). Document user-visible changes
in `CHANGELOG.md`.

By contributing, you agree to release your contribution under the
[MIT license](LICENSE) and follow the [code of conduct](CODE_OF_CONDUCT.md).
