# Changelog

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.1] - 2026-10-29

### Changed

- Dérapage simulation-step race/lap timers, best lap and crossing deltas in the reserved
  mobile HUD; per-circuit historical records in the existing save, record announcements
  and race results with total time, best lap, circuit record and ranking.
- Z28 deterministic timing and Z29 persistence tests, plus a mobile input/advance/reload journey.

- Replace Dérapage's shared deformed loop with 30 hand-drawn spline layouts, cup themes,
  urban collision scenery, forest routes and reserved slalom/BMX feature data.
- Draw a full-width finish checker from the engine's lap gate geometry, with a starting grid,
  lap messages and mini-map marker; add Z26 shape diversity, Z27 finish checks and overview captures.

- Dérapage, after play-testing: continuous thumb steering with a dead zone and steering indicator,
  an 88 px held Drift button and a 56 px Bonus button above it. The old touch
  arrows are removed; keyboard, optional mouse steering and tilt remain available.
- Seeded acceleration strips from level 3 (32 units/s for 900 ms) and roadside
  trees with swept circle collisions, exposed in world coordinates for future views.
- Grass speed capped at 45% or less of road speed, with immediate slowdown,
  visual traces and a light sound; AI grass-time and tree-collision measurements.
- Z17–Z25 coverage and an expanded 30-track validation table.

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
