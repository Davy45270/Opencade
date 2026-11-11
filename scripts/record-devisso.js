/* global console */
// Offline record of the 30 Dévisso assemblies: one winning line found by the solver (no boost) and one
// dead end ("Aucun coup possible !" with screws still on the board), the shortest the bounded search finds.
// Writes tests/fixtures/devisso-campaign.json and freezes `moves` and `trap` in levels.ts; fast checks replay both.
//   node --import ./scripts/ts-loader.js scripts/record-devisso.js
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { LEVELS } from '../src/engines/devisso/levels.ts';
import { parse, initial, unscrew, stuck } from '../src/engines/devisso/rules.ts';
import { solve, shortestTrap, trap } from '../src/engines/devisso/solver.ts';
let text = readFileSync('src/engines/devisso/levels.ts', 'utf8');
const fields = [...text.matchAll(/moves: \d+, trap: \d+/g)];
assert.equal(fields.length, LEVELS.length);
const devisso = LEVELS.map((level, i) => {
    const board = parse(level), start = initial(board);
    const win = solve(board, start, 200000), dead = shortestTrap(board, start, 40000) ?? trap(board, start, 20000);
    assert(win && win.moves.length && dead, `niveau ${i + 1}`);
    let s = start; for (const k of dead) s = unscrew(board, s, k).state;
    assert(stuck(board, s) && s.present.some(Boolean), `impasse ${i + 1}`);
    console.log(`Enregistré ${i + 1}/30 : ${win.moves.length} coups, impasse en ${dead.length}`);
    return { win: win.moves, trap: dead };
});
// From the end: replacements keep the earlier offsets valid.
for (let i = fields.length - 1; i >= 0; i--) {
    const f = fields[i], record = devisso[i];
    text = text.slice(0, f.index) + `moves: ${record.win.length}, trap: ${record.trap.length}` + text.slice(f.index + f[0].length);
}
writeFileSync('src/engines/devisso/levels.ts', text);
writeFileSync('tests/fixtures/devisso-campaign.json', JSON.stringify({ devisso }) + '\n');
