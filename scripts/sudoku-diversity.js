// Sudoku grid descriptors for the shared diversity measure: size, symmetry and every technique the logical solution
// uses are elements (novelty); clue positions are the layout; size, clues, hardest tier and fine steps are parameters.
import { measureDiversity } from './diversity-metrics.js';
export function sudokuFeatures(mod, index) {
    const level = mod.levelRecord(index), grid = mod.GRIDS[index], rating = mod.rate(level, level.givens);
    const elements = [`size-${String(level.size)}`, `symmetry-${grid.symmetry}`, ...Object.entries(rating.uses).filter(([, n]) => n > 0).map(([t]) => `technique-${t}`)].sort();
    const layout = level.givens.flatMap((v, i) => v ? [`${String(Math.floor(i / level.size))},${String(i % level.size)}/${String(level.size)}`] : []);
    const fine = rating.uses['locked-candidates'] + rating.uses.pair + rating.uses['x-wing'];
    return { elements, layout, params: { size: level.size, clues: level.givens.filter(Boolean).length, tier: rating.tier, fine, score: rating.score } };
}
/** `mod` gathers GRIDS and levelRecord (levels.ts) and rate (logic.ts). */
export function sudokuDiversity(mod, levels = mod.GRIDS.map((_, i) => i)) {
    return measureDiversity(levels.map((level, i) => {
        const f = sudokuFeatures(mod, level);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
