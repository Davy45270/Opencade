<h1 align="center"><a href="https://davy45270.github.io/Opencade/">▶ Play / Jouer</a></h1>

<p align="center"><a href="https://davy45270.github.io/Opencade/"><img src="docs/screenshots/home-desktop.webp" alt="Opencade home screen on a desktop browser: twelve game cards" width="100%"></a></p>

English | [Français](README.fr.md)

Alunir now has 30 authored situations and 12 mechanics, from cargo runs to caves and moving pads, verified by 180 deterministic flights (pass 106).

Ferraille now has 30 authored courses and 16 physical terrain modules, with ordered gameplay repetition checks and 900 winning character replays (pass 103).

Pass 101 gives Essaim five mechanically distinct character signatures, larger procedural ships, seven enemy silhouettes and three space themes, preserving historical replays.

Pass 84 adds character specials to Ferraille, Briqueterie and Essaim, with two-thumb controls and remembered default autofire in Essaim.

Pass 82: the selected companion explores Dédale, pilots Orbite and guides Empilo, with Light, Burst and Hold specials and deterministic Node replay coverage.

The detailed game specification, [GAME_SPEC.md](GAME_SPEC.md), is in French.

# Opencade

The selected companion now plays in Caisses, Traverse, Alunir, Dérapage, Bubble Lab and Serpentin, with shared procedural art, reactions and equally balanced tactical specials.

Ferraille now spans 30 authored stages with six enemy behaviors, flame/ricochet/grenade pickups, wagon rides, hostage rescues and vulnerable multi-phase guardians.

[![CI](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/ci.yml)
[![Pages](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml/badge.svg)](https://github.com/Davy45270/Opencade/actions/workflows/pages.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Thirteen original games, one browser arcade. Opencade runs on phones and desktops,
with touch, mouse and keyboard controls and no account or backend. It is built
with strict TypeScript, Phaser 3 and Vite. **The interface is in French.**

**[Play the demo](https://davy45270.github.io/Opencade/)**

The home screen features thirteen animated Canvas previews driven by the games'
pure engines. Previews pause off screen, in the background and during play;
reduced-motion preferences switch them to still images. Phones use a two-column grid.

## Screenshots

Phone portrait captures taken during play (`node scripts/screenshots.js` regenerates them after `npm run build`).

<table>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-bubble.webp" alt="Bubble Lab" width="240"><br><b>Bubble Lab</b><br>Pop groups of three matching bubbles before the ceiling drops.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-serpentin.webp" alt="Serpentin" width="240"><br><b>Serpentin</b><br>Grow a glowing trail by collecting sparks and crystals.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-briqueterie.webp" alt="Briqueterie" width="240"><br><b>Briqueterie</b><br>Break 30 authored walls with portals, keys and multiball.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-empilo.webp" alt="Empilo" width="240"><br><b>Empilo</b><br>Fit crystal pieces into the well and clear rows.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-orbite.webp" alt="Orbite" width="240"><br><b>Orbite</b><br>Hold off thirty formations and six guardians from orbit.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-essaim.webp" alt="Essaim" width="240"><br><b>Essaim</b><br>Fly through tactical stages with six weapons and rescue ships.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-dedale.webp" alt="Dédale" width="240"><br><b>Dédale</b><br>Gather seeds in a maze, then turn the tables on the wisps.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-ferraille.webp" alt="Ferraille" width="240"><br><b>Ferraille</b><br>Run, jump and shoot through workshops and their guardians.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-alunir.webp" alt="Alunir" width="240"><br><b>Alunir</b><br>Land the module gently, against gusts and with little fuel.</td>
</tr>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/game-caisses.webp" alt="Caisses" width="240"><br><b>Caisses</b><br>Push crates onto their targets, with unlimited undo.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-traverse.webp" alt="Traverse" width="240"><br><b>Traverse</b><br>Hop across traffic, logs and diving floats to the shelters.</td>
<td align="center" width="33%"><img src="docs/screenshots/game-derapage.webp" alt="Dérapage" width="240"><br><b>Dérapage</b><br>Drift a kart around 30 tracks and race for the podium.</td>
</tr>
</table>

## Games and controls

Bubble Lab now has precise hex snapping, gap shots, falling bonuses, and drag-to-aim/release-to-fire touch controls; ⇄ or X swaps the next bubble.

Bubble Lab now has 30 sculpted levels with stones, bombs, rainbow shots, ice, star rescues and internal bumpers. The table lists each game's
keyboard and touch controls. Mouse controls are listed where supported; you can
also click the on-screen controls. P or Escape pauses real-time games. Each game
includes its own help, and the mobile ☰ menu opens status, help, levels and restart
while pausing play.

| Game | How to play | Controls |
|---|---|---|
| **Le Collier du Singe** | 30 stages of moving pearl chains, magnetic retreats and combos. | Aim anywhere and release; tap shooter or ⇄/X: swap; arrows/Space: aim/fire; P/Escape: pause. |
| **Bombercade** | Thirty solo bomb mazes with breakable blocks, four arenas and the selected companion. | Arrows / ZQSD: move; Space: bomb; X: special; touch: directional pad, Bomb and power. |
| **Bubble Lab** | Match groups of at least three bubbles of the same color before the ceiling comes down. | Mouse: aim and fire; touch: drag and release; arrows: aim; Space: fire; touch buttons: adjust and fire. |
| **Serpentin** | Grow a glowing trail by collecting sparks and crystals, avoiding walls or wrapping around the board. | Arrows, ZQSD or WASD; touch: swipe or direction pad. |
| **Briqueterie** | 30 authored walls: sliding rows, blasts, regrowth, portals, chicanes, deflectors, keys, multiball, inverse gravity and hanging structures. | Mouse: guide the paddle; Left/Right or A/D: move; Space: launch; touch: drag along the bottom, tap or use Launch. |
| **Empilo** | Fit crystal pieces into a 9 × 16 well and complete rows, including sealed ones. | Left/Right/Down: move; X/W/Up and Z/C: rotate; Space: drop; touch: drag, tap to rotate, swipe down quickly to drop. |
| **Orbite** | Thirty formations with rotating shields, split probes, asteroids, gravity, stealth, repairers, satellite defense and coordinated swarms; six guardians and a two-phase finale. | Mouse: guide; Left/Right or A/D: move; Space: fire; touch: drag along the bottom and hold Fire, or enable auto-fire. |
| **Essaim** | Thirty tactical stages, six collectible weapons, rescue ships and six bosses. | Mouse: guide and fire; Left/Right or A/D: move; hold Space or Fire, release for a charged shot; touch: drag below the line. |
| **Dédale** | Gather maze seeds while evading four wisps, then turn the tables by collecting a sun. | Arrows or ZQSD; touch: swipe or direction pad. |
| **Ferraille** | Run, jump and shoot through workshops, facing a multi-phase guardian every five levels. | Left/Right or A/D: run; Up/W and Down/S: aim or crouch; Space/Z: jump; X/J: fire; touch: joystick, hold Jump and Fire. |
| **Alunir** | Land a lunar module gently while managing rotation, thrust and fuel over rough terrain and gusts. | Up/W: thrust; Left/Right or A/D: rotate; touch: hold the rotation and Thrust buttons. |
| **Caisses** | Push one to six crates onto targets, with unlimited undo and solver-proven records to beat. | Arrows or Q/S/D and Shift+Z: move; Z/Backspace: undo; R: restart; touch: swipe or direction pad, Undo button. |
| **Traverse** | Reach shelters across traffic, moving logs and diving floats. | Arrows or ZQSD: step; mouse click or touch tap: up; swipe or direction pad: step. |
| **Dérapage** | Steer a kart, charge drifts and race for the podium across seven original cups. | Arrows: absolute direction, including diagonals; Space/Shift: drift; X/Ctrl: bonus; touch: place a 360° joystick anywhere on the road view (10 px dead zone), point where to go, release to hold heading; Drift 88 px and Bonus 56 px; rotating camera and relative steering remain in ☰. |

Dérapage now has 30 hand-drawn layouts with cup themes, a full-width finish checker and geometry-based diversity checks.

Dérapage includes simulation-time race/lap clocks, best laps, coloured crossing deltas and per-circuit records retained across reloads. The mobile HUD stays above the road; race results include times and ranking. Z28/Z29 cover replay timing and resilient persistence.

Names, rules, levels, artwork and sounds are original. Graphics and synthesized
sounds are generated in code, with no external game assets, fonts or audio files.
The original PWA icons are also generated in code. Best scores, unlocked levels
and preferences use `localStorage` when available; play still works without it.
Existing `arcade-lab:*` and `bubble-lab:*` storage keys preserve earlier progress.

## Install on your phone and play offline

<img src="docs/screenshots/home-phone.webp" alt="Opencade home screen on a phone" width="240" align="right">

Open [the demo](https://davy45270.github.io/Opencade/) online and let the home
screen finish loading so all thirteen games can be cached.

- **Android / Chrome:** open the ⋮ menu and choose “Install app” or “Add to Home screen”.
- **iOS / Safari:** open Share, choose “Add to Home Screen” and confirm.

Launch Opencade from the new icon. Menu wording varies by browser version.
After the initial cache is ready, the home screen and all thirteen games work
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
node scripts/check-pwa-mutations.js # assertions PWA + huit mutations, sans navigateur ni Vitest
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

Finger playthroughs use stepped game time (fixed seed, noisy CDP touches and 150 ms game-time latency); performance is measured separately over five real seconds per game, with an advisory 30 FPS threshold enforced only by `PERF=1`.

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

Dérapage adds alternating slalom gates with time penalties, snow and downhill acceleration, banked BMX turns and jumps, and continuous urban rails.

Essaim validation (weapons, diversity, 60 campaign wins and mutations): `nice -n 19 ionice -c3 node scripts/validate-essaim.js`. E2E captures run on the test host.

Dédale pass 57 adds colored keys/doors, one-way passages, portals, switches, cyclic walls, ice and darkness across five seeded maze shapes. Thirty recorded solver routes and six mutation checks run with `nice -n 19 ionice -c3 node scripts/validate-dedale.js`; diversity drops from 100 to 22.4 (0% adjacent clones). See [the level table](GAME_SPEC.md#dédale).

Briqueterie (pass 61): recorded winning campaigns on seeds 455 and 28; browser-free validation with `nice -n 19 ionice -c3 node scripts/validate-briqueterie.js`. See `GAME_SPEC.md` for all thirty layouts and `docs/diversity.md` for measurements.

Orbite (pass 64): regenerate/check the 60 ordinary-input victories with
`nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-orbite.js`
(`--record` to regenerate). Each unit test replays one short recording; long campaigns run only in Node.

Dérapage (pass 67) defaults to a north-up thumb joystick with visible heading, optional light assistance, non-sticky rails and a wide introductory circuit; records migrate by circuit name.

The home footer and ☰ menu show the running build; use “Forcer la mise à jour” to refresh the PWA without deleting game saves.

The companion selected at home now plays Caisses, Traverse and Alunir, with a tactical special and procedural character animation.

### Personnages

| Identifiant | Nom et sous-titre | Devise |
| --- | --- | --- |
| `panda` | **Boubou** — Panda glouton | « Manger, foncer, recommencer ! » |
| `pandaroux` | **CaliRoux** — Panda roux joueur et câlin | « Des câlins et des dérapages ! » |
| `dragon` | **Pestouille** — Dragon assidu | « Toujours plus loin, toujours plus fort ! » |
| `singe` | **Tutu** — Singe en tutu | « Des pirouettes plein la piste ! » |
| `licorne` | **Lumi** — Licorne joueuse | « La magie au service de la victoire ! » |

Le choix du personnage affiche son nom, son sous-titre et sa devise.

**Le Collier du Singe** (`collier`), the thirteenth game: 30 original chain-pearl stages; aim anywhere and release to shoot, tap the shooter or ⇄/X to swap. Node validation: `npm run test:node -- --only=validate-collier.js`.

**Pépites** (`pepites`), the fourteenth game: 30 original turn-based mines; dig soil, dodge falling and rolling boulders, push them aside, gather nuggets and reach the exit; directions on both thumbs, Étai freezes the rocks for twelve turns. Node validation: `npm run test:node -- --only=validate-pepites.js`.

Gourmandises adds 180 seeded match-three levels, two modes, cascading specials, golden cargo, double ice, spreading chocolate, trapped flowers and looping conveyors; five-seed balance, unchanged states for levels 1–120 and 45 in-memory mutation checks.

**Les Artificiers** (`artificiers`): thirty original turn-based terrain duels,
training targets and survival/structure missions across a green archipelago,
autumn cliffs and a volcanic basin. Drag from the active companion to aim and
release to fire. Short walks, jumps, a grappling line, six limited-ammunition
weapons, visible wind and rising water; solo against three AI skills or two
players sharing one phone. Node validation replays thirty recorded victories
and noisy touch victories on levels 1 and 10. All visuals and sounds are code.
