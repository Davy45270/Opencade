# Changelog

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

- Briqueterie (pass 61): thirty authored silhouettes with holes, arches, a spiral and falling suspensions; progressively introduce sliding rows, neighboring blasts, regrowth, portals, solid chicanes, inclined normals, keys/locks, brick multiball and inverse-gravity zones.
- Add recovery stages, five-level challenges, a combined fortress finale and distinct mechanic marks; preserve v1 progression saves and deterministic simulation.
- Record 60 ordinary-input victories on seeds 455/28; add ten literal mechanic oracles, short campaign replays, six rejected source mutations and four written E2E captures. Repetition score improves from 79.3 to 18.1, with ten observed introductions and 0% adjacent clones. No browser or Vitest execution.

- Pass 59: add five original recurring companions, deterministic vector pose/expression/animation lists, shared direct Canvas and Phaser Graphics adapters, and reduced-motion support.
- Add the accessible home character picker with idle/special previews, persistent isolated selection and a stable companion API; game integration follows in a later pass.
- Add C01–C06 checks, three rejected Node source mutations and desktop/mobile E2E review sheets; browser and Vitest execution is deferred to the test host.

- Dédale (pass 57): five seeded maze topologies; progressively introduce colored keys/doors, one-way passages, paired portals, toggle walls, cyclic walls, sliding ice, reduced sight and distinct pursuit/patrol/light-flee behaviors.
- Add recovery stages, timed challenges every five levels and an all-mechanic finale; preserve progression saves and legacy engine states.
- Record thirty BFS solutions, validate both default/report campaigns and six source mutations; diversity improves from 100 to 22.4 with 0% adjacent clones. Write four E2E captures without running a browser or Vitest.

- Essaim (pass 55): rounded shaded ships, animated engines and distinct enemy silhouettes, directional shield arcs, white impact flashes and multipart bosses with a changed second phase; retain all engine rules and controls.
- Draw six weapon signatures, pooled explosions (96 particles, at most 4 rings with reduced motion), subtle large-impact shake, three star layers, cached procedural nebula textures and six distant planet palettes. Expose rendering counters in the test hook.
- Add pure particle/texture tests and a Node check; write four art capture scenarios and a mobile 5-second requestAnimationFrame check at CPU ×4 with a literal 30 fps threshold for execution by the test host.

- Essaim: add six finite tactical pickups (overheating beam, side ricochets, intercepting drones, slow field, magnetic returns and release-to-fire charge), with two simultaneous weapons and visible gauges.
- Author thirty Essaim stages with shield escorts, mines, splitting swarms, spiral kamikazes, carried guided turrets, rescues, movement mirrors, armored columns, five guardians and a two-phase command ship; retain progression saves and touch target sizes.
- Add shared Node/unit weapon, formation, boss, diversity and deterministic replay checks, a normal-input two-seed campaign pilot and seven rejected source mutations. Write weapon and level-30 capture scenarios for execution on the test host.

- Ferraille: author 30 stages with six distinct enemy behaviors, finite flame/ricochet/grenade pickups, ascending/descending routes, wagon rides and hostage rescues; retain progression saves and mobile controls.
- Add four procedural parallax themes, recovery discoveries, five guardian patterns with exposed cores and a three-phase final reactor.
- Fix frozen boss attack thresholds; verify 30 normal-input victories on both default seed 460 and seed 28, with thirteen rejected engine mutations.
- Give all six Ferraille bosses distinct silhouettes, names, palettes and exposed cores, plus three reactor appearances and reduced-motion support.
- Cover grenade boundaries, cages, floor relief and scene presentation; remove local browser capture scripts. Screenshots run through E2E on the test host.

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
