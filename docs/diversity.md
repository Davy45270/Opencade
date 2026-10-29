# Level diversity audit — pass 48

Analysis updated for the Bubble Lab extension from revision `3a99fa4`. Other game entries retain the pass 46 measurements. Run from the repository root:

```sh
nice -n 19 ionice -c3 node scripts/diversity-report.js
```

The script prints one complete JSON object followed by a Markdown table. Level numbers in this report are one-based. Seed is fixed at 28. The existing TypeScript loader and installed TypeScript compiler are reused; nothing is installed. The JSON includes each requested level, raw and normalized parameters, parameter ranges, initial and midpoint snapshots, element inventories and first appearances, layout signatures, all 29 adjacent comparisons where available, clone pairs, configuration plateaus and pilot outcomes.

## Method and limits

For each game, use `difficulty(level)` and summaries of generated data: occupied layout size, room dimensions, terrain pad multiplier, platform/enemy/bonus counts, or track length, elevation range, boost, slalom and tree counts. Bulles has no `difficulty` function: use its actual colors, rows and ceiling interval. Generator geometry is retained separately as a layout signature. Names, identifiers, seeds, decoration colors and numeric object identities are excluded from the parameter vector. Pattern indices exposed by difficulty are retained as ordinal configuration parameters; changing an index is not itself a new mechanic. This is a transparent choice of descriptor, not a complete characterization of strategic variety.

For parameter k, normalize over existing levels: z(k,l) = (x(k,l) − min(k)) / (max(k) − min(k)); constant parameters become zero and are excluded from parameter distance. P is the mean absolute difference over varying parameters. Every game uses the same clone rule: D = (P + L) / 2, clone iff D < **0.08**. No threshold is tuned per game. These are near-clones under the chosen descriptors, not claims of identical play.

L is Jaccard distance, 1 − |A ∩ B| / |A ∪ B| (zero for two empty signatures), except Dérapage. Signatures are colored bubble cells; typed brick positions; occupied Empilo cells with tile value; Serpentin obstacle cells; Orbite row/column formation cells; Essaim home formation cells; Dédale walkable maze indices; typed walls/targets/boxes in Caisses; Ferraille solid terrain cells in world tile coordinates; and Traverse lane row/type/direction/phase/diver tuples. Alunir samples interpolated terrain every 12 screen pixels and quantizes height into fixed 12-pixel bins. Dérapage uses the existing `shapeSignature` and `signatureDistance` curvature histogram, divided by two to put its L1 distance in 0..1; the existing turn list is retained in JSON but is not part of that engine distance. Layouts are initial layouts, never pilot-damaged boards. Empty layouts are legitimate, not missing data. Jaccard can emphasize cell changes and ignore strategic equivalence; the curvature histogram can miss order differences.

The script reuses demo policy source in memory, transpiled with the existing compiler, replacing only the shared wrapper so it can load each requested level and run without attract-mode resets. Dérapage uses the same ordinary controller directly. Caisses uses its existing exact solver and replays the inputs through the engine. No state is injected and no rule is bypassed. Stop at the first terminal outcome or 1,800 policy iterations. Most iterations advance 1/15 second; Alunir advances four 1/60 steps, Traverse one flow quantum, and Caisses one input per 1/15 second. Thus the cap is a policy-step budget, not a common time limit. The midpoint is halfway through the **observed attempt**, replayed deterministically; it is not a claim to represent half of a victorious game.

Completion time is simulated requested time, at policy-step resolution, only for a win; otherwise it is null. Actions count ordinary API calls (including repeated hold/move calls and unsuccessful inputs), not physical button transitions, and should only be compared within a game. Failures count a terminal loss (0 or 1 per attempt); lives lost are separate where exposed. A still-playing outcome is censored, not a failure or a victory. These curves describe this seed and this policy, not human difficulty or optimal play. Full snapshots let another analysis use different descriptors.

Elements come from generated data and initial/midpoint snapshots: enemy/bonus/tile kinds, available Empilo shapes, multi-hit and solid bricks, and applicable mechanics such as wind, gusts, wrapping, diving logs, challenges, bosses and track hazards. Baseline rules are explicitly catalogued in each adapter. A new quantity, speed, hit-point count above the multi-hit threshold, palette color, decorative theme or arrangement is not a novelty. Novelty means **first observed new element type**: snapshots may miss transient bonuses, fragments or later waves, and policy/seed-dependent first sightings are not guaranteed design unlocks. JSON lists the exact element names and both inventories. Level 1 is baseline and does not count as a novelty-bearing level.

A configuration plateau is a maximal window of at least **3 levels**, every level without novelty, with range ≤ **0.08 in every normalized parameter across the entire window**. Overlapping maximal windows are possible. Layout change does not disqualify such a window. This is a configuration proxy: measured human difficulty plateaus are unavailable. To measure those, expose a representative successful pilot (or several), progress and terminal reason, with consistent action semantics; then repeat across seeds and report censored outcomes separately. The existing demo policies often cannot finish, so the report does not substitute their timeouts for completion times.

Let n be available levels, C the clone count divided by n−1, N the number of post-baseline novelty-bearing levels, and G the maximum consecutive run of levels without a first appearance after baseline (including the trailing run). Repetitiveness is **round-to-0.1[100 × (0.50C + 0.25(1 − N/(n−1)) + 0.25G/(n−1))]**. Several new elements at one level count once in N; their individual names remain in JSON. Scores measure pacing and descriptor repetition, not game quality. Ordering is descending score, then identifier for ties.

**Bubble Lab coverage:** 30/30 levels, including six added engine mechanics at 11, 14, 17, 20, 23 and 26. Its previous provisional ten-level score was 44.4; the complete campaign scores 25.9 with 0% adjacent clones. The eight-level historical novelty gap (3–10) is retained to preserve the first ten levels; the extension has no introduction gap above five. The score is not directly comparable at constant coverage. The full report was rerun successfully after the five-seed validation during this resumption. `scripts/diversity-metrics.js` is shared with B-LVL-03; its thresholds and formula are unchanged.

## Ranked results

| Game | Score | Novelties (count; levels) | Clone share | Longest flat plateau | What actually varies |
| --- | ---: | --- | ---: | ---: | --- |
| Dédale | 100 | 0; none | 100.0% | 3 | Seeded maze loops and corridors, pursuit timing and vulnerability duration. |
| Ferraille | 84.5 | 4; 2, 4, 5, 7 | 86.2% | 3 | Course length, block composition, enemy mixture, bonuses and every-fifth-level boss. |
| Essaim | 81.9 | 6; 2, 3, 4, 5, 6, 8 | 86.2% | 3 | Enemy mixture, formation size, wave count, dive cadence and every-fifth-level challenge. |
| Briqueterie | 79.3 | 3; 8, 11, 14 | 86.2% | 3 | Brick masks, density, solid bricks, hit points, ball speed and paddle width. |
| Orbite | 78.4 | 3; 6, 10, 15 | 86.2% | 3 | Formation dimensions, armor, movement tier, fire cadence and shot allowance. |
| Serpentin | 62.1 | 3; 2, 5, 6 | 37.9% | 3 | Obstacle placement and patterns, boundary wrapping, speed and apple target. |
| Empilo | 59.5 | 5; 6, 9, 11, 16, 21 | 62.1% | 3 | Piece vocabulary, initial rubble and sealed tiles, gravity and line target. |
| Alunir | 56.9 | 2; 2, 15 | 41.4% | 3 | Terrain relief, landing width, wind, gusts, fuel and initial offset. |
| Caisses | 56.9 | 0; none | 13.8% | 5 | Authored room topology, box/target positions and solution length; the rules stay fixed. |
| Traverse | 41.4 | 1; 10 | 0.0% | 3 | Lane placement, direction and phase, diving logs, shelters and flow speed. |
| Dérapage | 38.8 | 4; 3, 24, 29, 30 | 0.0% | 0 | Authored track geometry, slalom, snow, berms, jumps, boosts, width and opponent tuning. |
| Bulles | 25.9 | 7; 2, 11, 14, 17, 20, 23, 26 | 0.0% | 0 | Thirty sculpted layouts; stone, bomb chains, rainbow shots, two-hit ice, star rescues and internal bumpers. |

“Flat” in the table refers to the configuration proxy above. A zero means no qualifying window, not proof of continuous experiential difficulty growth. The JSON carries the exact ranges and pairs.

### Pilot coverage

| Game | Wins | Terminal losses | Censored attempts |
| --- | ---: | ---: | ---: |
| Dédale | 10 | 20 | 0 |
| Ferraille | 19 | 7 | 4 |
| Essaim | 10 | 20 | 0 |
| Briqueterie | 2 | 1 | 27 |
| Orbite | 0 | 30 | 0 |
| Serpentin | 12 | 10 | 8 |
| Empilo | 0 | 30 | 0 |
| Alunir | 30 | 0 | 0 |
| Caisses | 30 | 0 | 0 |
| Bulles | 27 | 3 | 0 |
| Traverse | 1 | 29 | 0 |
| Dérapage | 23 | 7 | 0 |

For Orbite and Empilo no completion time is measured at any level. Briqueterie is mostly censored. Those curves require a stronger ordinary-input policy before completion-time comparisons become useful. Caisses times reflect the chosen replay cadence, not puzzle-solving time. Dédale scores 100 under this descriptor because all adjacent layouts remain near enough to the fixed threshold and no new element type is observed; this does not mean its mazes are identical.

## Campaign plans and Bubble Lab implementation

The remaining proposals introduce something every 3–5 levels, include recovery levels, a challenge or boss every five levels, and a distinctive final level. Bubble Lab below describes its implemented extension; the other entries remain design suggestions.

### Bulles

Pass 48 preserves levels 1–10 and adds stone at 11, bombs at 14, rainbow shots at 17, ice at 20, star rescues at 23 and internal bumpers at 26. Recovery boards are 13/16/19/22/28; 15/20/25 and the three-chamber finale at 30 use a six-shot ceiling cadence. The historical 10 remains intact. Solver validation now records five seeds (0–4), with a hard 2,000 ms deadline per level/seed and a 160-shot cap. Actual failures and timeouts remain visible in `bubble-validation.json` and the table in `GAME_SPEC.md`; no unplayed result is inferred. B-LVL-04 uses checkpoints 1/5/10/15/20/25/30 at seed 28 and requires completion within ten seconds. A nonzero validator exit reports a failed checkpoint even after the statistics have been saved. This run records 140 wins in 150 attempts: levels 9 and 10 time out on every seed, with no completed shot count available; all twenty added levels win 5/5. B-LVL-04 takes 1.63 seconds and wins six of seven checkpoints, failing level 10 after 24 shots; its validator exit code is 1.

### Briqueterie

Introduce switch bricks at 4, moving rows at 8, split-path gates at 12, linked armor at 16, magnet bumpers at 20, regenerating barriers at 24 and synchronized switches at 28. Give wider paddles and safe catch lanes at 6/11/17/22/27. Put a target-core challenge at 5/10/15/20/25, then a transforming brick fortress at 30.

### Empilo

Introduce a bomb piece at 4, movable rubble at 8, keys for sealed cells at 12, conveyor rows at 16, temporary frozen cells at 20, a piece reserve at 24 and paired lock objectives at 28. Use 6/11/17/22/27 for slower gravity and clean wells. Every 5 levels test a specific excavation objective; level 30 is a multi-stage excavation with a final core to unlock.

### Serpentin

Introduce switches at 4, paired portals at 8, moving gates at 12, poison fruit at 16, ice corridors at 20, tail-cut tokens at 24 and synchronized gates at 28. Use open wrapping arenas at 6/11/17/22/27. At 5/10/15/20/25 require a fruit route under a timer; at 30 cross four connected biomes and escape with the final fruit.

### Orbite

Introduce shield-repair pickups at 4, shield-piercing scouts at 8, lateral laser warnings at 12, reflector probes at 16, orbiting escorts at 20, polarity shields at 24 and linked commanders at 28. At 6/11/17/22/27 restore shields and lower fire pressure. Add commander challenges at 5/10/15/20/25; at 30 fight a carrier whose exposed core changes the formation.

### Essaim

Introduce rescue tethers at 4, shield escorts at 8, mine layers at 12, linked diving pairs at 16, decoy swarms at 20, rotating armor at 24 and a capturable command ship at 28. Use 6/11/17/22/27 as sparse rescue waves. Keep the every-five challenge rhythm, give each a distinct target, and make 30 a command-ship battle with rescue and dive phases.

### Dédale

Introduce keyed doors at 4, one-way corridors at 8, paired portals at 12, pressure switches at 16, rotating junctions at 20, temporary shadow zones at 24 and linked doors at 28. Put short mazes with long sun effects at 6/11/17/22/27. At 5/10/15/20/25 add a timed exit challenge; at 30 escape a changing central maze while all four wisp roles coordinate.

### Caisses

Introduce ice floors at 4, one-way tiles at 8, pressure doors at 12, conveyors at 16, paired transport pads at 20, heavy boxes at 24 and linked switches at 28. Use small single-concept recovery rooms at 6/11/17/22/27. Add warehouse challenges at 5/10/15/20/25 with explicit move budgets and solver-verified solutions. Level 30 is a three-room loading sequence combining the introduced tiles.

### Alunir

Introduce optional fuel depots at 4, moving pads at 8, crosswind corridors at 12, fragile landing shelves at 16, thermal updrafts at 20, low-ceiling caverns at 24 and two-stop delivery at 28. Use wide sheltered pads at 6/11/17/22/27. At 5/10/15/20/25 add a precision delivery challenge with a safe alternate landing. Level 30 is a crater descent, refuel and final narrow-pad delivery.

### Ferraille

Introduce shielded turrets at 4, retracting bridges at 8, wall switches at 12, rail drones at 16, coolant jets at 20, magnetic lifts at 24 and linked power cores at 28. Use short stocked corridors at 6/11/17/22/27. Keep bosses at 5/10/15/20/25 but assign each a distinct attack to counter. Level 30 is a factory shutdown with a chase and a multi-phase reactor boss.

### Traverse

Introduce traffic lights at 4, ferry stops at 8, switch-controlled barriers at 12, temporary rafts at 16, alternating-current lanes at 20, rescue passengers at 24 and linked shelter locks at 28. Give wide banks and slower flow at 6/11/17/22/27. At 5/10/15/20/25 add a timed rescue challenge. Level 30 is a three-section river evacuation with a final convoy crossing.

### Dérapage

Introduce switchable route forks at 4, timed tunnel shutters at 8, ferry shortcuts at 12, crosswind bridges at 16, breakaway ice at 20, moving slalom gates at 24 and linked boost choices at 28. Use forgiving wide circuits at 6/11/17/22/27. Add distinct time-trial/rival challenges at 5/10/15/20/25. Level 30 is a summit-to-port circuit combining the new route decisions with a final rival sprint.
