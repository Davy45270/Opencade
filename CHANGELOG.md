# Changelog

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.2] - 2026-10-30

### Dérapage: playable by touch

- New default touch control: an absolute 360° thumb joystick with a fixed, north-up camera.
  Put your thumb anywhere and the kart turns towards where it points, with a visible ring,
  thumb dot and heading arrow. The rotating camera with relative steering stays available in
  the ☰ menu and is remembered.
- Gentle, switchable line assist; kerbs and rails push the kart back onto the track instead
  of trapping it; an easy, wide first track (the seaside street circuit moves to track 5).
  Per-track records follow their track, and old saves are migrated.

### App updates

- Version and build date on the home screen and in the ☰ menu; an active update check at launch,
  every 30 minutes and when the app returns to the foreground; a "New version" banner and a
  "Force update" button that keeps every save.

### Less repetitive games

A measured repetitiveness score (`docs/diversity.md`, lower is more varied):

- Ferraille 84.5 → 11.2: six enemy behaviours, flamethrower, ricochet and grenade pickups,
  wagons, hostages, a guardian every five stages, a three-phase reactor and four themes.
- Essaim 81.9 → 15.5: six weapons (overheating beam, bouncing shots, drones, slow-down wave,
  magnet, charged shot), directional shields, typed waves, guardians, a two-phase command ship,
  and new rounded ships, particles and parallax.
- Dédale 100 → 22.4: keys and doors, one-way passages, portals, switches, cycling walls, ice,
  darkness and three wisp behaviours, woven into corridor, room, ring, spiral and mirror mazes.
- Briqueterie 79.3 → 18.1: moving, explosive, regrowing, portal, angled and key bricks,
  multi-ball and gravity zones on drawn layouts.
- Orbite 78.4 → 18.1: new probe behaviours, hazards, an ally to protect, guardians and a
  two-phase finale.

### Characters (first part)

- Five recurring characters drawn in code: a greedy panda, a playful red panda, a studious
  dragon, a monkey in a tutu and a playful unicorn. Each has three poses, five expressions,
  animations and a special move. A picker on the home screen remembers your choice. Their
  integration into the games comes next.

## [0.3.1] - 2026-10-30

### Dérapage

- Thirty hand-drawn tracks instead of one deformed loop: urban, fast, technical, banked and
  nature families, with cup themes. Among them a slow seaside street circuit, a circuit
  around a Paris esplanade, a fast forest hill circuit, a downhill slalom and a BMX track.
  A scale- and rotation-invariant shape signature proves the tracks differ (Z26).
- Full-width chequered finish line drawn from the engine's lap gate (Z27), a starting grid,
  lap messages and a mini-map marker.
- Race and lap timers (mm:ss.cc) on simulation time, best lap, gap at the line, and a
  per-track record kept in the existing save (Z28, Z29).
- Slalom gates with a 2 s time penalty, snow with reduced grip, downhill gravity, BMX
  berms and speed-dependent jumps with a shadow, and continuous urban kerbs and rails with
  collision (Z30–Z35).
- After play-testing: continuous thumb steering with a dead zone, a held Drift button,
  grass capped at 45% of road speed, seeded boost strips from level 3, and roadside trees
  with collisions.
- The home preview finishes real races; faster track lookup (about 2.5× per step).

### Bubble Lab

- Strict hex grid, snapping to the free socket nearest the contact point, a slightly
  reduced collision radius so gap shots pass, exact wall reflections, falling detached
  groups with a bonus, drag-and-release aiming with a one-bounce guide, optional tap
  firing and next-bubble swapping (B-HEX tests).
- Thirty levels instead of ten. The first ten are unchanged. New mechanics arrive every
  few levels: stone, bomb, rainbow, ice, star rescue and bumpers, with breathing levels,
  challenges every five levels and a final level that combines them.
- The difficulty curve rises, and recorded winning solutions for all 30 levels are
  replayed in the tests (B-LVL tests).

### Other

- A measured level-diversity report for the twelve games (`docs/diversity.md`,
  `scripts/diversity-report.js`).

## [0.3.0] - 2026-10-29

### Added

- Twelve animated, deterministic Canvas previews on the home screen, driven by
  pure game engines. Previews pause off screen, in the background and during
  play. Reduced-motion preferences show still images; mobile uses two columns.
  Previews cover all twelve games.
- Alunir, the ninth game: 30 seeded landscapes, thrust, rotation, wind, fuel and
  continuous collision detection; held controls, animated preview, progression
  and synthesized sounds. U01–U12 rule tests and desktop/mobile journeys.
- Caisses, the tenth game: 30 original workshops, crate pushing, unlimited undo,
  solver-proven records, touch controls and an animated preview.
- Traverse, the eleventh game: 30 seeded crossings, three to five shelters,
  traffic, a river and diving floats. Pure engine, replayed BFS solutions,
  touch controls, demo, sounds and R01–R12 tests; no shared shell changes.
- Dérapage, the twelfth game: a pure racing engine in world coordinates,
  30 tracks, seven cups, five AI opponents, drifting and four original bonuses.
  Rotating camera, minimap, a single row of 64 px controls, synthesized sounds,
  preview and demo; Z01–Z16 tests and Node validation. No shared shell changes,
  new dependencies or binary assets.
- English primary README and matching French README, with language links,
  current game controls, offline installation and development guidance.

### Changed

- Alunir uses explicit landing thresholds, a larger module and an unobstructed
  HUD. Caisses has compact puzzles with exact minimum move/push counts; turns,
  detours and required effort are checked by a Node script.
- Contribution and security guidance, changelog, issue forms and pull request
  template are now in English. Game names and the French interface are unchanged.

### Fixed

- Guidance assertions in Essaim, Orbite, Briqueterie and Ferraille E2E tests now
  advance engine time after real input, avoiding dependence on rendering speed
  without loosening position tolerances.

## [0.2.0] - 2026-10-29

### Added

- Phone installation as a PWA, with a manifest and original icons. All eight
  games and their local progress remain available offline after loading.
- Updates announced without interrupting play and applied on the next launch
  after all windows have closed.
- Phone comfort features: screen wake lock during active play, vibrations tied
  to global sound and optional fullscreen from the mobile menu.

### Changed

- Visible title changed to “Opencade”; historical storage keys preserved to
  retain existing progress.

## [0.1.0] - 2026-10-29

### Added

- Eight original games: Bubble Lab (10 levels), Serpentin, Briqueterie, Empilo,
  Orbite, Essaim, Dédale and Ferraille (30 levels each).
- Shared shell: home screen, pause, result panels, level selection, optional
  local storage and global synthesized sound.
- Touch, mouse and keyboard controls; fullscreen layout on phones.
- Pure seeded engines tested with Vitest; desktop and mobile Playwright E2E journeys.
- GitHub Actions CI and GitHub Pages deployment.

[Unreleased]: https://github.com/Davy45270/Opencade/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/Davy45270/Opencade/releases/tag/v0.3.1
[0.3.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.3.0
[0.2.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.2.0
[0.1.0]: https://github.com/Davy45270/Opencade/releases/tag/v0.1.0
