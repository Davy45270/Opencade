/* global console */
// node --import ./scripts/ts-loader.js scripts/validate-devisso.js
// Dévisso: every assembly reads cleanly, is won without boost (solver, and the recorded line replayed by the real
// engine in exactly `moves` taps), and hides a real dead end ("Aucun coup possible !") replayed by the engine.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Engine, LEVELS } from '../src/engines/devisso/engine.ts';
import { parse, initial, stuck, legal } from '../src/engines/devisso/rules.ts';
import { layoutProblems } from '../src/engines/devisso/check.ts';
import { solve } from '../src/engines/devisso/solver.ts';
import { greedy } from '../src/engines/devisso/metrics.ts';
import { devissoDiversity } from './devisso-diversity.js';
const { devisso: records } = JSON.parse(readFileSync('tests/fixtures/devisso-campaign.json', 'utf8'));
assert.equal(records.length, 30);
let greedyLosses = 0;
console.log('| Niveau | Vis | Plaques | Couches | Couleurs | Coups | Solveur (positions) | Impasse (coups) | Glouton |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [i, level] of LEVELS.entries()) {
    const board = parse(level), start = initial(board), record = records[i];
    assert.deepEqual(layoutProblems(board), [], `lisibilité ${i + 1}`);
    // Solver: won without boost within a bounded search.
    const proof = solve(board, start, 200000);
    assert(proof && proof.moves.length > 0 && proof.visited <= 200000, `solveur ${i + 1}`);
    // Recorded line: the real engine wins in exactly `moves` taps, three stars, no help.
    const e = new Engine(); e.loadLevel(i);
    for (const s of record.win) assert(e.tap(s), `rejeu ${i + 1} : vis ${s}`);
    assert.equal(e.status, 'won', `victoire ${i + 1}`); assert.equal(e.helps, 0); assert.equal(e.stars, 3);
    assert.equal(record.win.length, level.moves, `borne de coups ${i + 1}`);
    // Dead end: ordinary taps, then nothing fits anywhere (not even with a free box colour).
    const d = new Engine(); d.loadLevel(i);
    for (const s of record.trap) assert(d.tap(s), `impasse ${i + 1} : vis ${s}`);
    assert(d.stuck && stuck(d.board, d.state) && legal(d.board, d.state).length === 0, `impasse réelle ${i + 1}`);
    assert.equal(record.trap.length, level.trap, `longueur d’impasse ${i + 1}`);
    assert(record.trap.length < level.moves, `l’impasse tombe avant la fin ${i + 1}`);
    const naive = greedy(board); if (!naive.won) greedyLosses++;
    const layers = 1 + Math.max(...board.plates.map(p => p.z)), colours = new Set(board.screws.map(s => s.color)).size;
    console.log(`| ${i + 1} ${level.name} | ${board.screws.length} | ${board.plates.length} | ${layers} | ${colours} | ${level.moves} | ${proof.visited} | ${level.trap} | ${naive.won ? 'gagne' : 'perd'} |`);
}
const report = devissoDiversity(LEVELS);
assert(report.score <= 22 && report.cloneShare === 0 && report.maxGapWithoutNovelty <= 5, `diversité ${report.score}`);
// The naive player (any free screw whose box is open, else the buffer) loses most of the campaign.
assert(greedyLosses >= 15, `glouton : ${greedyLosses} défaites seulement`);
console.log(`Diversité ${report.score} (clones ${report.cloneShare}, écart max ${report.maxGapWithoutNovelty}, nouveautés ${report.noveltyLevels.join(' ')}) · glouton perd ${greedyLosses}/30`);
