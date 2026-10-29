English | [Français](README.fr.md)

The detailed game specification, [GAME_SPEC.md](GAME_SPEC.md), is in French.

# Opencade

[![CI](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml)
[![Pages](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Twelve original games, one browser arcade. Opencade runs on phones and desktops,
with touch, mouse and keyboard controls and no account or backend. It is built
with strict TypeScript, Phaser 3 and Vite. **The interface is in French.**

**[Play the demo](https://davy45270.github.io/Opencade/)**

The home screen features twelve animated Canvas previews driven by the games'
pure engines. Previews pause off screen, in the background and during play;
reduced-motion preferences switch them to still images. Phones use a two-column grid.

## Games and controls

Bubble Lab has 10 levels; every other game has 30. The table lists each game's
keyboard and touch controls. Mouse controls are listed where supported; you can
also click the on-screen controls. P or Escape pauses real-time games. Each game
includes its own help, and the mobile ☰ menu opens status, help, levels and restart
while pausing play.

| Game | How to play | Controls |
|---|---|---|
| **Bubble Lab** | Match groups of at least three bubbles of the same color before the ceiling comes down. | Mouse or touch: aim and fire; arrows: aim; Space: fire; touch buttons: adjust and fire. |
| **Serpentin** | Grow a glowing trail by collecting sparks and crystals, avoiding walls or wrapping around the board. | Arrows, ZQSD or WASD; touch: swipe or direction pad. |
| **Briqueterie** | Break bricks with a ball and paddle, collecting bonuses and wearing down tougher bricks. | Mouse: guide the paddle; Left/Right or A/D: move; Space: launch; touch: drag along the bottom, tap or use Launch. |
| **Empilo** | Fit crystal pieces into a 9 × 16 well and complete rows, including sealed ones. | Left/Right/Down: move; X/W/Up and Z/C: rotate; Space: drop; touch: drag, tap to rotate, swipe down quickly to drop. |
| **Orbite** | Defend four erodible shields against an accelerating fleet of probes. | Mouse: guide; Left/Right or A/D: move; Space: fire; touch: drag along the bottom and hold Fire, or enable auto-fire. |
| **Essaim** | Fight patterned waves with diving, armored and splitting enemies and a twin-cannon pod. | Mouse: guide and fire; Left/Right or A/D: move; Space: hold to fire; touch: drag below the line to guide and fire. |
| **Dédale** | Gather maze seeds while evading four wisps, then turn the tables by collecting a sun. | Arrows or ZQSD; touch: swipe or direction pad. |
| **Ferraille** | Run, jump and shoot through workshops, facing a multi-phase guardian every five levels. | Left/Right or A/D: run; Up/W and Down/S: aim or crouch; Space/Z: jump; X/J: fire; touch: joystick, hold Jump and Fire. |
| **Alunir** | Land a lunar module gently while managing rotation, thrust and fuel over rough terrain and gusts. | Up/W: thrust; Left/Right or A/D: rotate; touch: hold the rotation and Thrust buttons. |
| **Caisses** | Push one to six crates onto targets, with unlimited undo and solver-proven records to beat. | Arrows or Q/S/D and Shift+Z: move; Z/Backspace: undo; R: restart; touch: swipe or direction pad, Undo button. |
| **Traverse** | Reach shelters across traffic, moving logs and diving floats. | Arrows or ZQSD: step; mouse click or touch tap: up; swipe or direction pad: step. |
| **Dérapage** | Steer a kart, charge drifts and race for the podium across seven original cups. | Left/Right: steer; Space/Shift: drift; X/Ctrl: bonus; touch: hold steering and Drift, tap Bonus; optional tilt and mouse steering. |

Names, rules, levels, artwork and sounds are original. Graphics and synthesized
sounds are generated in code, with no external game assets, fonts or audio files.
The original PWA icons are also generated in code. Best scores, unlocked levels
and preferences use `localStorage` when available; play still works without it.
Existing `arcade-lab:*` and `bubble-lab:*` storage keys preserve earlier progress.

## Install on your phone and play offline

Open [the demo](https://davy45270.github.io/Opencade/) online and let the home
screen finish loading so all twelve games can be cached.

- **Android / Chrome:** open the ⋮ menu and choose “Install app” or “Add to Home screen”.
- **iOS / Safari:** open Share, choose “Add to Home Screen” and confirm.

Launch Opencade from the new icon. Menu wording varies by browser version.
After the initial cache is ready, the home screen and all twelve games work
offline. Scores, unlocked levels and settings stay in the browser or installed
app's local storage. Clearing that storage removes progress and may require
another online visit.

Updates are announced without interrupting a game. Close every Opencade window
and reopen to apply an available update. The service worker waits for the next
launch rather than forcing activation during play. All build HTML, JavaScript,
CSS and icons, including Phaser, are precached; there are no remote fonts,
third-party servers or external data caches.

## Phone comfort

Where supported, Opencade keeps the screen awake during active play and releases
it on pause, in the background or at the end of a level. Vibrations mark lost
lives, wins and defeats when global sound is enabled. The mobile menu offers
optional fullscreen and attempts portrait orientation. Unsupported or declined
features are silently skipped. See the device section of [GAME_SPEC.md](GAME_SPEC.md).

## Development

Use **Node 22.12 or later** (see `.nvmrc`).

```sh
npm ci
npm run dev        # development server
npm run lint       # ESLint, no warnings allowed
npm run typecheck  # TypeScript without emitting files
npm test           # Vitest engine and shell tests
npm run build      # static site in dist/
npx playwright install --with-deps chromium
npm run test:e2e   # Playwright against the production build
npm run preview    # preview dist/ over HTTP
```

The build is a standalone static site. Relative paths (`base: './'`) support
hosting at a domain root or under a subdirectory such as `/Opencade/`. Serve it
over HTTP, rather than opening files directly. The manifest and service worker
also use relative paths. The three shipped icons (192, 512 and 512 maskable) have
opaque backgrounds and a central design within the maskable safe area; building
requires no graphics tools.

Vitest checks game rules against fixed boards and seeds, using the rule IDs in
[GAME_SPEC.md](GAME_SPEC.md). Playwright covers desktop and touch-enabled mobile
Chromium, uses real inputs, and fails on page or console errors. The test-only
URL parameter `?test=1` exposes `window.__ARCADE_TEST__` and per-game hooks for
state inspection, levels, scenarios and `advance(ms)`. Advancing simulation time
keeps gameplay assertions independent of rendering speed. Hooks are absent
without the parameter. They are deliberately included in the published build so
E2E tests exercise the shipped product; changing a local game's state is not a
security boundary.

GitHub Actions runs lint, typecheck, unit tests, build and E2E checks on pushes
and pull requests, and attaches a Playwright report on failure.

## Architecture

```text
src/
  engines/<game>/    pure rules, collisions, levels and scoring
  engines/shared/    seeded random number generator
  games/<game>/      Phaser scene, animation, input and synthesized sound
  games/registry.ts game list, help and declared controls
  shell/            shared input, pause, menus, levels, sound and storage
tests/              engine and shell unit tests
tests/e2e/          desktop and mobile browser journeys
```

Engines are pure TypeScript with no Phaser or DOM dependencies. ESLint forbids
browser globals and `Math.random` there. A seeded random number generator makes
the same inputs and seed produce the same game. Phaser scenes render engine
state and pass inputs to it. The shared shell recreates Phaser when switching
games and releases listeners on exit. To add a game, implement an original engine
and scene, then register it in `src/games/registry.ts`.

## Known limitations

- No online leaderboard or saving of an unfinished game.
- Canvas gameplay has no complete screen-reader representation; scores, status and buttons use HTML.
- Automated browser tests cover Chromium only.
- Vite reports a large Phaser bundle; this warning is expected.

## Credits

Code written by Codex (OpenAI), reviewed and checked by Claude (Anthropic),
under the direction of David Sevin.

## Contributing

Bug reports and pull requests are welcome in English or French. Read
[CONTRIBUTING.md](CONTRIBUTING.md), the [code of conduct](CODE_OF_CONDUCT.md)
and the [security policy](SECURITY.md) before contributing.

## License

[MIT](LICENSE) © 2026 David Sevin. Phaser is also MIT licensed.
