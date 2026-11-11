/* global console, process */
// node --import ./scripts/ts-loader.js scripts/record-sudoku.js
// Offline search of the 30 written grids (G: a tool, not a test). For each slot of the progression, the first seed whose
// grid has the wanted symmetry, clue count and hardest technique; prints the rows pasted into
// src/engines/sudoku/levels.ts (titles are written by hand). validate-sudoku.js re-proves every pasted grid.
import { Random } from '../src/engines/shared/random.ts';
import { fullGrid, dig } from '../src/engines/sudoku/generator.ts';
import { geometry, gridText } from '../src/engines/sudoku/grid.ts';
import { rate } from '../src/engines/sudoku/logic.ts';
import { provedUnique } from '../src/engines/sudoku/solver.ts';
// Opencade (adults) plays classic 9 × 9 only; the 4 × 4 and 6 × 6 engine stays for the kid edition.
// [symmetry, min clues, max clues, tier, min fine steps, intro]: an intro slot uses its new technique alone (once,
// twice at most for the naked single), on a grid otherwise made of earlier steps.
const slots = [
    ['point', 46, 46, 1, 0], ['mirror', 44, 44, 1, 0], ['diagonal', 42, 42, 1, 0], ['point', 40, 40, 1, 0],
    ['none', 38, 39, 1, 0], ['mirror', 36, 36, 1, 0], ['diagonal', 33, 34, 1, 0], ['point', 30, 31, 1, 0],
    ['point', 34, 36, 2, 0, true], ['mirror', 32, 34, 2, 0], ['none', 30, 32, 2, 0], ['diagonal', 28, 30, 2, 0], ['point', 26, 28, 2, 0], ['mirror', 26, 28, 2, 0],
    ['point', 30, 32, 3, 1, true], ['mirror', 28, 30, 3, 1], ['diagonal', 26, 28, 3, 2], ['none', 25, 27, 3, 2], ['point', 24, 27, 3, 3], ['mirror', 24, 27, 3, 3],
    ['point', 28, 30, 4, 1, true], ['diagonal', 26, 28, 4, 1], ['mirror', 24, 28, 4, 2], ['none', 24, 27, 4, 2], ['point', 22, 26, 4, 3], ['diagonal', 22, 26, 4, 3],
    ['point', 22, 28, 5, 1, true], ['mirror', 22, 28, 5, 1], ['diagonal', 22, 28, 5, 2], ['point', 22, 28, 5, 3],
].map(([symmetry, low, high, tier, minFine, intro = false]) => [9, symmetry, low, high, tier, minFine, intro]);
const NEW = { 2: 'naked-single', 3: 'locked-candidates', 4: 'pair', 5: 'x-wing' };
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',').map(Number);
const fine = r => r.uses['locked-candidates'] + r.uses.pair + r.uses['x-wing'];
for (const [k, [size, symmetry, low, high, tier, minFine, intro]] of slots.entries()) {
    if (only && !only.includes(k + 1)) continue;
    const g = geometry(size);
    let found = false;
    for (let seed = 1000 * (k + 1); seed < 1000 * (k + 1) + 400_000 && !found; seed++) {
        const random = new Random(seed), solution = fullGrid(size, random), givens = dig(size, solution, random, low, symmetry);
        const clues = givens.filter(Boolean).length;
        if (clues < low || clues > high) continue;
        const r = rate(g, givens);
        if (!r.solved || r.tier !== tier || fine(r) < minFine) continue;
        if (intro && r.uses[NEW[tier]] > (tier === 2 ? 2 : 1)) continue;
        if (!provedUnique({ ...g, givens })) continue;
        console.log(JSON.stringify({ level: k + 1, seed, size, symmetry, clues, tier, hardest: r.hardest, fine: fine(r), score: r.score, grid: gridText(g, givens) }));
        found = true;
    }
    if (!found) console.log(JSON.stringify({ level: k + 1, missing: true }));
}
