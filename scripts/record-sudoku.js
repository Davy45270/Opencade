/* global console, process */
// node --import ./scripts/ts-loader.js scripts/record-sudoku.js
// Offline search of the 30 written grids (G: a tool, not a test). For each slot of the progression, the first seed whose
// grid has the wanted size, symmetry, clue count and hardest technique; prints the rows pasted into
// src/engines/sudoku/levels.ts (titles are written by hand). validate-sudoku.js re-proves every pasted grid.
import { Random } from '../src/engines/shared/random.ts';
import { fullGrid, dig } from '../src/engines/sudoku/generator.ts';
import { geometry, gridText } from '../src/engines/sudoku/grid.ts';
import { rate } from '../src/engines/sudoku/logic.ts';
import { provedUnique } from '../src/engines/sudoku/solver.ts';
// [size, symmetry, min clues, max clues, tier, min fine steps]
const slots = [
    [4, 'point', 12, 12, 1, 0], [4, 'mirror', 10, 10, 1, 0], [4, 'diagonal', 8, 8, 1, 0], [4, 'point', 6, 6, 1, 0], [4, 'none', 4, 5, 1, 0],
    [6, 'point', 22, 22, 1, 0], [6, 'mirror', 18, 18, 1, 0], [6, 'diagonal', 15, 16, 1, 0], [6, 'point', 13, 14, 2, 0], [6, 'none', 11, 13, 2, 0], [6, 'point', 10, 13, 3, 1],
    [9, 'point', 40, 40, 1, 0], [9, 'mirror', 36, 36, 1, 0], [9, 'diagonal', 32, 33, 1, 0], [9, 'point', 28, 30, 1, 0],
    [9, 'point', 30, 32, 2, 0], [9, 'mirror', 28, 30, 2, 0], [9, 'none', 26, 28, 2, 0], [9, 'diagonal', 26, 28, 2, 0],
    [9, 'point', 28, 32, 3, 1], [9, 'mirror', 26, 30, 3, 1], [9, 'diagonal', 26, 28, 3, 2], [9, 'point', 24, 27, 3, 3], [9, 'none', 24, 27, 3, 3],
    [9, 'point', 26, 30, 4, 1], [9, 'mirror', 24, 28, 4, 1], [9, 'diagonal', 24, 28, 4, 2], [9, 'point', 22, 26, 4, 3],
    [9, 'point', 22, 28, 5, 1], [9, 'mirror', 22, 28, 5, 1],
];
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',').map(Number);
const fine = r => r.uses['locked-candidates'] + r.uses.pair + r.uses['x-wing'];
for (const [k, [size, symmetry, low, high, tier, minFine]] of slots.entries()) {
    if (only && !only.includes(k + 1)) continue;
    const g = geometry(size);
    let found = false;
    for (let seed = 1000 * (k + 1); seed < 1000 * (k + 1) + 400_000 && !found; seed++) {
        const random = new Random(seed), solution = fullGrid(size, random), givens = dig(size, solution, random, low, symmetry);
        const clues = givens.filter(Boolean).length;
        if (clues < low || clues > high) continue;
        const r = rate(g, givens);
        if (!r.solved || r.tier !== tier || fine(r) < minFine || !provedUnique({ ...g, givens })) continue;
        console.log(JSON.stringify({ level: k + 1, seed, size, symmetry, clues, tier, hardest: r.hardest, fine: fine(r), score: r.score, grid: gridText(g, givens) }));
        found = true;
    }
    if (!found) console.log(JSON.stringify({ level: k + 1, missing: true }));
}
