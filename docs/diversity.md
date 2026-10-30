# Level diversity audit — pass 77 (action catalogue)

Pass 77 updates Ferraille, Briqueterie and Essaim with nine authored catalogue levels. Their scores remain 11.2, 18.1 and 16.4 respectively (0% adjacent clones); formulas and thresholds are unchanged. Geometry and two winning replays per catalogue level are checked by `validate-level-catalogue.js` and recorded in `level-catalogue-validation.json`. The added lift and conveyors are verified through actual collision and movement. Art, names and palettes do not count as diversity. Orbite retains pass 66, Dédale pass 58 and Bubble Lab pass 49. Other game implementations are unchanged. Run from the repository root:

```sh
nice -n 19 ionice -c3 node scripts/diversity-report.js
```

The script prints one complete JSON object followed by a Markdown table. Level numbers in this report are one-based. Seed is fixed at 28. The existing TypeScript loader and installed TypeScript compiler are reused; nothing is installed. The JSON includes each requested level, raw and normalized parameters, parameter ranges, initial and midpoint snapshots, element inventories and first appearances, layout signatures, all 29 adjacent comparisons where available, clone pairs, configuration plateaus and pilot outcomes.

## Method and limits

**Orbite passes 64–66 override:** full ordinary-input recordings replace midpoint sampling.
The validator first regenerates all 60 victories on seeds 457 (default) and 28,
then verifies every recording, including each first effect witness, against a
fresh engine. The report reads the 30 verified seed-28 inventories. Eight mechanic
types require actual block/split/deflection/curve/hide/heal/threat/swarm events;
guardian novelties require emitted shots, and phase two requires an observed
transition. No mechanic is counted from the declared level kit. Layouts are actual
initial (x,y,type) probe positions; numeric descriptors are generated probe count
and actual guardian presence, with no ordinal pattern/level feature. Blindage PV,
speed increases, colors and counts add no novelty. Replaying the degenerate
all-levels-equal-to-one generator measures exactly 100% clones and is rejected.
The script-only pilot integrates ordinary controls at 60 Hz, capped at 18,000
ticks; unit tests replay one recording each, never run a campaign search.
The unchanged shared thresholds and formula produce **18.1**, down from **78.4**,
with **0% clones** instead of **86.2%**. See [validation evidence](orbite-validation.json).

**Briqueterie pass 61 override:** full deterministic campaign replays replace
midpoint sampling. The adapter observes effect events at every fixed tick and
retains first-witness ticks, terminal outcomes and original typed layouts.
Its numeric descriptors use generated geometry (counts and spans), excluding
the ordinal level/pattern index. Detailed evidence and limitations are below.

**Essaim pass 54 override:** the adapter follows the ordinary pilot at every fixed tick until a terminal outcome, up to 18,000 ticks, on each of the 30 generated levels. Elements require observed motion, shot emissions, collisions, an actually present rescue ship, or measured guardian shot motifs and second-phase aimed fire. Each first witness records its frame and evidence. No declared formation or configured boss is counted; collected weapons are recorded separately and excluded from novelty counting. Initial typed home layouts and all metric thresholds are preserved. These Essaim rows contain full-attempt observations instead of initial/midpoint-only inventories. See [Essaim pass 54](essaim-pass54.md).

For each game, use `difficulty(level)` and summaries of generated data: occupied layout size, room dimensions, terrain pad multiplier, platform/enemy/bonus counts, or track length, elevation range, boost, slalom and tree counts. Bulles has no `difficulty` function: use its actual colors, rows and ceiling interval. Generator geometry is retained separately as a layout signature. Names, identifiers, seeds, decoration colors and numeric object identities are excluded from the parameter vector. Pattern indices exposed by difficulty are retained as ordinal configuration parameters; changing an index is not itself a new mechanic. This is a transparent choice of descriptor, not a complete characterization of strategic variety.

For parameter k, normalize over existing levels: z(k,l) = (x(k,l) − min(k)) / (max(k) − min(k)); constant parameters become zero and are excluded from parameter distance. P is the mean absolute difference over varying parameters. Every game uses the same clone rule: D = (P + L) / 2, clone iff D < **0.08**. No threshold is tuned per game. These are near-clones under the chosen descriptors, not claims of identical play.

L is Jaccard distance, 1 − |A ∩ B| / |A ∪ B| (zero for two empty signatures), except Dérapage. Signatures are colored bubble cells; typed brick positions; occupied Empilo cells with tile value; Serpentin obstacle cells; Orbite typed initial probe coordinates; Essaim typed home formation cells; Dédale ordered played route positions and observed typed mechanism cells; typed walls/targets/boxes in Caisses; Ferraille solid terrain cells, platform and cage positions in world coordinates; and Traverse lane row/type/direction/phase/diver tuples. Alunir samples interpolated terrain every 12 screen pixels and quantizes height into fixed 12-pixel bins. Dérapage uses the existing `shapeSignature` and `signatureDistance` curvature histogram, divided by two to put its L1 distance in 0..1; the existing turn list is retained in JSON but is not part of that engine distance. Layouts are initial layouts, never pilot-damaged boards. Empty layouts are legitimate, not missing data. Jaccard can emphasize cell changes and ignore strategic equivalence; the curvature histogram can miss order differences.

Essaim and Ferraille observe controls at every fixed simulation tick, including inside their six-tick demo advances. The script reuses demo policy source in memory, transpiled with the existing compiler, replacing only the shared wrapper so it can load each requested level and run without attract-mode resets. Dérapage uses the same ordinary controller directly. Caisses uses its existing exact solver and replays the inputs through the engine. No state is injected and no rule is bypassed. Stop at the first terminal outcome or 1,800 policy iterations. Most iterations advance 1/15 second; Essaim and Ferraille advance six fixed ticks (1/10 second), Alunir advances four 1/60 steps, Traverse one flow quantum, and Caisses one input per 1/15 second. Thus the cap is a policy-step budget, not a common time limit. The midpoint is halfway through the **observed attempt**, replayed deterministically; it is not a claim to represent half of a victorious game.

Completion time is simulated requested time, at policy-step resolution, only for a win; otherwise it is null. Actions count ordinary API calls (including repeated hold/move calls and unsuccessful inputs), not physical button transitions, and should only be compared within a game. Failures count a terminal loss (0 or 1 per attempt); lives lost are separate where exposed. A still-playing outcome is censored, not a failure or a victory. These curves describe this seed and this policy, not human difficulty or optimal play. Full snapshots let another analysis use different descriptors.

Elements come from generated data and initial/midpoint snapshots: enemy/bonus/tile kinds, available Empilo shapes, multi-hit and solid bricks, and applicable mechanics such as wind, gusts, wrapping, diving logs, challenges, bosses and track hazards. Baseline rules are explicitly catalogued in each adapter. A new quantity, speed, hit-point count above the multi-hit threshold, palette color, decorative theme or arrangement is not a novelty. Novelty means **first observed new element type**: snapshots may miss transient bonuses, fragments or later waves, and policy/seed-dependent first sightings are not guaranteed design unlocks. JSON lists the exact element names and both inventories. Level 1 is baseline and does not count as a novelty-bearing level.

A configuration plateau is a maximal window of at least **3 levels**, every level without novelty, with range ≤ **0.08 in every normalized parameter across the entire window**. Overlapping maximal windows are possible. Layout change does not disqualify such a window. This is a configuration proxy: measured human difficulty plateaus are unavailable. To measure those, expose a representative successful pilot (or several), progress and terminal reason, with consistent action semantics; then repeat across seeds and report censored outcomes separately. The existing demo policies often cannot finish, so the report does not substitute their timeouts for completion times.

Let n be available levels, C the clone count divided by n−1, N the number of post-baseline novelty-bearing levels, and G the maximum consecutive run of levels without a first appearance after baseline (including the trailing run). Repetitiveness is **round-to-0.1[100 × (0.50C + 0.25(1 − N/(n−1)) + 0.25G/(n−1))]**. Several new elements at one level count once in N; their individual names remain in JSON. Scores measure pacing and descriptor repetition, not game quality. Ordering is descending score, then identifier for ties.

**Bubble Lab coverage:** 30/30 levels. The six mechanics arrive at 11, 14, 17, 20, 23 and 26; cell mechanics are extracted from generated cells, and rainbow/bumpers from the active engine. The complete campaign scores 25.9 with 0.0% adjacent clones. The historical novelty gap (3–10) remains. B-LVL-03 injects repeated indices through the real generator, checks one unique board and exactly 100% clones, then rejects this campaign using the original clone threshold. The report was rerun after the 600-attempt validation. Shared metric thresholds and formulas are unchanged.

## Ranked results

| Game | Score | Novelties (count; levels) | Clone share | Longest flat plateau | What actually varies |
| --- | ---: | --- | ---: | ---: | --- |
| Serpentin | 62.1 | 3; 2, 5, 6 | 37.9% | 3 | Obstacle placement and patterns, boundary wrapping, speed and apple target. |
| Empilo | 59.5 | 5; 6, 9, 11, 16, 21 | 62.1% | 3 | Piece vocabulary, initial rubble and sealed tiles, gravity and line target. |
| Alunir | 56.9 | 2; 2, 15 | 41.4% | 3 | Terrain relief, landing width, wind, gusts, fuel and initial offset. |
| Caisses | 56.9 | 0; none | 13.8% | 5 | Authored room topology, box/target positions and solution length; the rules stay fixed. |
| Traverse | 41.4 | 1; 10 | 0.0% | 3 | Lane placement, direction and phase, diving logs, shelters and flow speed. |
| Dérapage | 38.8 | 4; 3, 24, 29, 30 | 0.0% | 0 | Authored track geometry, slalom, snow, berms, jumps, boosts, width and opponent tuning. |
| Bulles | 25.9 | 7; 2, 11, 14, 17, 20, 23, 26 | 0.0% | 0 | Thirty seeded layouts with increasing density and pressure; stone, bomb chains, rainbow shots, two-hit ice, star rescues and internal bumpers. |
| Dédale | 22.4 | 8; 4, 5, 9, 13, 16, 19, 22, 25 | 0.0% | 3 | Five seeded topologies; observed colored doors, one-way passages, paired portals, switches, cyclic walls, sliding ice, reduced sight and distinct wisp behaviors. |
| Briqueterie | 18.1 | 10; 4, 5, 7, 10, 13, 16, 19, 22, 25, 28 | 0.0% | 0 | Thirty authored silhouettes; observed sliding rows, chicanes, neighbor explosions, regrowth, portals, inclined reflections, keys, brick multiball, inverse-gravity zones and falling suspensions. |
| Orbite | 18.1 | 12; 4, 5, 7, 10, 13, 15, 16, 19, 20, 22, 25, 30 | 0.0% | 3 | Six authored formations; observed rotating shields, split fragments, asteroid deflections, gravity curves, stealth, local repair, satellite defense and coordinated swarms; six guardians and a two-phase finale. |
| Essaim | 16.4 | 14; 2, 3, 4, 5, 7, 10, 13, 15, 16, 19, 20, 22, 25, 30 | 0.0% | 3 | Six tactical pickups, shields, mines, split swarms, spirals, carried turrets, rescue, mirrors, armored columns and six guardians including a two-phase command ship. |
| Ferraille | 11.2 | 19; 2, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 20, 21, 24, 25, 26, 30 | 0.0% | 0 | Authored ascent/descent, wagon rides, hostage rescues, six enemy behaviors, three special weapons and five guardian patterns plus a three-phase reactor. |

“Flat” in the table refers to the configuration proxy above. A zero means no qualifying window, not proof of continuous experiential difficulty growth. The JSON carries the exact ranges and pairs.

### Pilot coverage

| Game | Wins | Terminal losses | Censored attempts |
| --- | ---: | ---: | ---: |
| Dédale | 30 | 0 | 0 |
| Ferraille | 30 | 0 | 0 |
| Essaim | 30 | 0 | 0 |
| Briqueterie | 30 | 0 | 0 |
| Orbite | 30 | 0 | 0 |
| Serpentin | 12 | 10 | 8 |
| Empilo | 0 | 30 | 0 |
| Alunir | 30 | 0 | 0 |
| Caisses | 30 | 0 | 0 |
| Bulles | 24 | 6 | 0 |
| Traverse | 1 | 29 | 0 |
| Dérapage | 23 | 7 | 0 |

For Empilo no completion time is measured at any level. Orbite now has 30 measured seed-28 wins; its separate validation also wins all 30 default-seed levels. These describe one deterministic pilot, not human difficulty. Caisses times reflect the chosen replay cadence, not puzzle-solving time. Dédale moves from 100/100, zero novelties and 100% clones to 22.4/100, eight novelty-bearing levels and 0% clones. These remain descriptor measurements, not a claim about human difficulty.

## Campaign plans and implementations

The remaining proposals introduce something every 3–5 levels, include recovery levels, a challenge or boss every five levels, and a distinctive final level. Bubble Lab, Briqueterie, Orbite, Dédale, Essaim and Ferraille below describe their implemented extensions; the other entries remain design suggestions.

### Bulles

Pass 49 preserves every historical cell in levels 1–10. The extension has 7–11 rows, five then six colors, staggered groups, ceiling intervals of 16/15/14/13 resolved shots and seeded palette/seam variants. Recovery levels remain 13/16/19/22/28. The new mechanics still arrive at 11/14/17/20/23/26.

The complete solver wins all thirty levels at seed 28; 9 and 10 need beam search and take 70 and 56 shots. B-LVL-05 means are 13.6, 17.8, 18.8 and 37.4 shots across the final four five-level bands; the first band is 14.8. The full campaign takes 203.75 seconds on this host, exceeding the unchanged ten-second B-LVL-04 limit. The validator therefore exits 1; the suite is not claimed green.

Statistics cover seeds 0–19: 489 wins in 600 bounded attempts, collected in 1104.60 seconds. Two persistent workers avoid counting module imports against a shot attempt. Each attempt has 2,000 ms of wall time, or 30,000 ms for the historical 9/10 search; interruptions remain visible as non-wins. A missing completed greedy attempt yields an unavailable mean rather than an invented shot count. The short deadlines particularly censor the longer final levels. Full per-seed records and fixed-seed results are in `bubble-validation.json`; `GAME_SPEC.md` contains the thirty-level table. The diversity report uses the ordinary demo policy, so its win counts are distinct from the complete beam solver's counts.

The review's eight surviving mutations are now rejected by shared Node/unit oracles. Historical fixtures cover every cell; real cells establish novelty; combined bomb/stone and bomb/bomb scenarios, distant ice, ordinary shots between rainbow shots, two captive stars and both bumpers have literal expectations. B-HEX-14 now constructs native touch contacts with page coordinates; direct Node checks execute the installed coordinate conversion on three layouts. Vitest and Playwright were not launched.

### Briqueterie

Implemented in pass 61: **79.3 → 18.1**, **3 → 10** novelty-bearing levels
(**4/5/7/10/13/16/19/22/25/28**), **86.2% → 0.0%** adjacent clones,
no flat configuration plateau. Lower is better; metric and clone threshold
**0.08** are unchanged.

Thirty explicit ten-column drawings replace ranked filling: wings, arches,
perforated checkerboards, an open spiral, twin rings, a crown, a locked chest,
a citadel, braided paths and hanging bridges. Every drawing has a distinct
geometric signature. Recovery stages 6/11/17/23/27 widen the paddle to 108 px;
5/10/15/20/25 test compositions and 30 combines the mechanics in a suspended
fortress. See the complete table in `GAME_SPEC.md`.

`scripts/briqueterie-diversity.js` replays the entire seed-28 campaign through
the real generator. Novelty requires an emitted effect after actual row motion,
solid impact, neighbor blast, healing, teleportation, inclined reflection,
unlocking, brick multiball, upward zone acceleration or suspended-brick fall.
Each first witness has its fixed tick. Static symbols, names, pattern indices,
colors, counts, PV and speed do not introduce mechanics. Initial signatures
are typed brick coordinates plus solid status; parameters are actual destructible
and solid counts and horizontal/vertical spans. No formula or threshold is
changed. Literal mechanic oracles check the effects behind the event labels.

The ordinary-input pilot wins all 30 levels on both default seed 455 and seed 28
(60/60), without state injection. `tests/briqueterie-solutions.ts` records paddle
inputs; replays check victory, score, lives and exact first-effect ticks.
The long pilot search and the 8,000-destruction bonus statistics run only in
`scripts/validate-briqueterie.js`; Vitest cases contain short replays. On two CPU,
the 60 replays take approximately one second. The validator also runs all unit
oracles through a Node assertion adapter, enforcing **2,000 ms per case**, and
rejects six source mutations. Repeated level-1 walls measure **100% clones**
under the same adapter before rejection. Full results, timings, witnesses and
exact mutation file/lines are in `briqueterie-validation.json`.

```sh
nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-briqueterie.js
nice -n 19 ionice -c3 node scripts/diversity-report.js
```

Add `--record` to regenerate recordings. Saves keep their v1 progression schema;
legacy literal engine states without brick kinds are accepted. The scene draws
distinct mechanic symbols and inverse-gravity zones. E2E captures
`briqueterie-level04`, `-level12`, `-level20` and `-level30` are written for desktop
and mobile, but neither a browser nor Vitest was launched on this machine.

### Empilo

Introduce a bomb piece at 4, movable rubble at 8, keys for sealed cells at 12, conveyor rows at 16, temporary frozen cells at 20, a piece reserve at 24 and paired lock objectives at 28. Use 6/11/17/22/27 for slower gravity and clean wells. Every 5 levels test a specific excavation objective; level 30 is a multi-stage excavation with a final core to unlock.

### Serpentin

Introduce switches at 4, paired portals at 8, moving gates at 12, poison fruit at 16, ice corridors at 20, tail-cut tokens at 24 and synchronized gates at 28. Use open wrapping arenas at 6/11/17/22/27. At 5/10/15/20/25 require a fruit route under a timer; at 30 cross four connected biomes and escape with the final fruit.

### Orbite

Implemented in pass 64, corrected in pass 66. The eight tactical mechanics first appear every three
levels: rotating shields **4**, split probes **7**, asteroids **10**, gravity
**13**, stealth **16**, repairers **19**, satellite defense **22**, coordinated
swarms **25**. Actual first witnesses match these dates on seed 28. Six
guardian shot patterns at 5/10/15/20/25/30 and the final phase transition produce
twelve novelty-bearing levels in total. The longest trailing novelty gap is
four levels, and adjacent clone share is zero. The six geometric formations,
mixed kits and recovery levels 6/11/17/21/26 vary the defense without treating
enemy count, PV or speed as novelties. The final carrier combines all eight
mechanics; clearing its escort evacuates the ally before a two-phase core duel.
[GAME_SPEC.md](../GAME_SPEC.md#orbite) contains the complete 30-level table.

`scripts/validate-orbite.js` verifies 60 fresh ordinary-input victories and
their recorded replays, literal O-MEC-01…08 behavior checks, O-BOSS, O-SAVE and
O-DIV-01. Every unit test is timed separately under an affinity of two CPUs
(the host may enforce a lower CPU quota), with a literal 2000 ms bound.
On a one-CPU quota, run `taskset -c 0,1 node --single-threaded scripts/validate-orbite.js`
to avoid competition with V8 background work; runtime flags are recorded in the evidence.
The long 400-seed comet audit stays in Node; eight fixed spawn recordings replace
it in the short test. Twenty-three isolated source mutations are rejected, with
file/oracle locations in [orbite-validation.json](orbite-validation.json).
Pass 66 guarantees all four special probe kinds even with only twelve final
escorts. The default-seed final victory alone must witness all eight effects,
including neighbor healing. Both recorded final victories retain all four special
probe kinds. Contacts use swept motion and a global time order; simultaneous
contacts use canonical projectile geometry and stable target IDs. Tests cover both
satellite/interception race outcomes, six projectile permutations and simultaneous
probe targets. A headless graphics spy executes the real scene, checks all thirty
HUD instructions against generated entities, and verifies stealth disappearance
and reappearance through actual draw calls and `renderedProbeIds()` in the test
hook. Independent counterexamples lock novelty count and intermediate/trailing
cadence limits. Literal oracles also lock both gravity saturation signs, fragment
height, phase-two aimed fire and 72-tick cadence, and the HP-scaled ally bonus.

Four desktop/mobile capture scenarios are written for levels 04/12/20/30;
neither a browser nor Vitest was executed. Progression keys remain compatible.

### Essaim

Implemented in pass 53, part 1, corrected in pass 54. Before pass 53:
**81.9**, six novelty-bearing levels (2/3/4/5/6/8), **86.2%** adjacent clones.
Pass 54 observes
**14** novelty-bearing levels (2/3/4/5/7/10/13/15/16/19/20/22/25/30),
score **16.4** and **0.0%** adjacent clones in pass 54. There is no discovery
gap longer than five levels through 25. Recovery stages remain 6/11/17/24;
recovery declarations alone no longer count as observed novelty.

The shared adapter in `scripts/essaim-diversity.js` retains typed initial home
layouts, but derives novelty from full generated attempts under the ordinary
pilot. It observes fast/spiral/mirror displacement, shield blocking, emitted
burst fans, mines and explosions, fragments, actual guiding corrections,
rescue presence and rescue outcomes. Guardians count only when their actual
shot motifs appear; the command's second phase requires observed aimed fire.
Every first witness has a frame and measurements. Configuration formations,
scheduled boss indices and collected weapon labels do not count as novelties.
Clone threshold 0.08 and the score formula are unchanged.

The pilot wins all thirty levels on seeds 458 and 28 within 18000 fixed ticks
per level. The report now follows the complete seed-28 attempt for Essaim;
its rows contain witnesses and outcomes instead of midpoint-only snapshots.
Save keys and touch target sizes are unchanged.

Run `node scripts/validate-essaim.js` for E-WPN-01…08, E-GEN-01…08,
E-P2, E-SHIELD, E-BOSS, E-WAVE, E-PICKUP, E-DET, E-DIV-01, both campaigns
and 21 in-memory source mutations. `essaim-validation.json` records concrete
mutation lines, all 60 outcomes and six E-WPN-07 comparisons against generated
formations with literal threshold 1.3. The original three-escort test and
threshold 1.5 are preserved. See [the pass-54 report](essaim-pass54.md) for
all six raw measurements and the zero-baseline defense ratios.

Weapon captures `essaim-weapon-1` through `essaim-weapon-6` (one active weapon)
and `essaim-level30` (command phase 2), including mobile charge hold/release,
are written in `tests/e2e/essaim.spec.ts` for the orchestrator on the test host.
No browser or Vitest is launched during this pass. Presentation beyond the
functional weapon and boss markers remains part 2.

### Dédale

Corrected in pass 58: **22.4/100**, **8** novelty-bearing levels
(**4/5/9/13/16/19/22/25**), **0%** adjacent clones. The shared formula is
unchanged (lower is better). Nine new mechanics are observed; paired key/door,
switch/gate and closed/open cyclic-wall events each count once.

The fixed gallery is removed. Objectives and mechanics occupy a seeded principal
path inside the generated corridors, rooms, ring, spiral or mirrored maze.
Spiral solutions reach the interior. Signatures contain ordered played positions
and observed typed mechanism positions, excluding unused floor. Numeric parameters
are replay move count and distinct visited positions. The 435 pairs
of seed-28 solution routes have LCS / shorter length at most **29.333…%**;
D-ROUTE enforces the literal **30%** cap. This concerns the recorded campaign,
not every possible seed or every possible player route.

Five-level mean moves: **30.4, 45, 58.4, 70.8, 79.6, 92**; late/early
ratio **3.026**. These are real solver replay actions, not human difficulty.

`node scripts/test-dedale.js` runs shared Node assertions under two seconds,
including intermediate slide contacts (active/vulnerable), exact challenge timers,
death persistence, both sight axes, recomputed final witnesses, actual solver
calls, mechanic grouping and geometric ring/spiral/mirror properties.
`node scripts/validate-dedale.js --record` checks 180 connected generated maps,
60 victories (seeds 28/459), fast replays, the same campaign assertions and six
rejected mutations. The thirty seed-28 recordings are in
`tests/dedale-solutions.ts`. No browser or Vitest was run.


### Caisses

Introduce ice floors at 4, one-way tiles at 8, pressure doors at 12, conveyors at 16, paired transport pads at 20, heavy boxes at 24 and linked switches at 28. Use small single-concept recovery rooms at 6/11/17/22/27. Add warehouse challenges at 5/10/15/20/25 with explicit move budgets and solver-verified solutions. Level 30 is a three-room loading sequence combining the introduced tiles.

### Alunir

Introduce optional fuel depots at 4, moving pads at 8, crosswind corridors at 12, fragile landing shelves at 16, thermal updrafts at 20, low-ceiling caverns at 24 and two-stop delivery at 28. Use wide sheltered pads at 6/11/17/22/27. At 5/10/15/20/25 add a precision delivery challenge with a safe alternate landing. Level 30 is a crater descent, refuel and final narrow-pad delivery.

### Ferraille

Implemented in pass 51. Before: 84.5, four novelty-bearing levels (2/4/5/7),
86.2% adjacent clones. After: 11.2, nineteen novelty-bearing levels,
0.0% clones and at most three consecutive levels without a discovery.
The shared clone threshold and score formula are unchanged. Decoration,
level names and discovery labels do not enter the inventory. The adapter
reads generated enemy and pickup kinds, actual high platforms/descending
floor cells, moving vehicle state, cages and implemented guardian patterns.
Each enemy behavior and special weapon has a literal simulation oracle.
Sweep attacks fire sequentially across angles; crossfire converges from
both flanks, rather than changing only a spread count or angle.

The normal-input fixed-step pilot completes all thirty generated levels at
both seed 460 (the game default) and seed 28 with an 18,000-tick cap per level. The report uses the same policy,
observing each fixed tick within its six-tick advances. Recovery stages
6/11/16/21/26 have one enemy and introduce ascent, ricochets, flyers, grenades
and shields respectively. Five mini-bosses expose their cores after attacking;
the final reactor changes from fan to ground waves to overhead bombs.
See the thirty-level table in `GAME_SPEC.md` and measured checks, pilot
frames/lives by seed and thirteen rejected source mutations in `ferraille-validation.json`.

Run `nice -n 19 ionice -c3 node scripts/validate-ferraille.js` for behavioral,
structural, replay, save-default, diversity and campaign checks. No browser is
launched on the development machine. The orchestrator runs `tests/e2e/` on the
test host for screenshots of the four palettes, six bosses, reactor phases,
wagon and hostage scenes. The former local capture scripts are removed.
Pass 52 also locks boss departure cadence, grenade/core protection, guardian
15 bombs, actual floor relief, cage explosions and the exact 64 px blast
boundary. Scene assertions cover relative parallax motion and ammunition text.
Each guardian has a unique silhouette/name/palette; the reactor changes shape
and colors in each phase. Reduced motion keeps the exposed core steady.

### Traverse

Introduce traffic lights at 4, ferry stops at 8, switch-controlled barriers at 12, temporary rafts at 16, alternating-current lanes at 20, rescue passengers at 24 and linked shelter locks at 28. Give wide banks and slower flow at 6/11/17/22/27. At 5/10/15/20/25 add a timed rescue challenge. Level 30 is a three-section river evacuation with a final convoy crossing.

### Dérapage

Introduce switchable route forks at 4, timed tunnel shutters at 8, ferry shortcuts at 12, crosswind bridges at 16, breakaway ice at 20, moving slalom gates at 24 and linked boost choices at 28. Use forgiving wide circuits at 6/11/17/22/27. Add distinct time-trial/rival challenges at 5/10/15/20/25. Level 30 is a summit-to-port circuit combining the new route decisions with a final rival sprint.
