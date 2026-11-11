// Démineur: grid descriptors read from the real levels and the real solver proof (theme, drawing, techniques needed).
import { measureDiversity } from './diversity-metrics.js';
import { proveBoard } from '../src/engines/demineur/solver.ts';
/** Elements: the board theme, the drawing made by the mines, and each solver technique the grid needs. */
export function demineurFeatures(level) {
    const proof = proveBoard(level), r = proof.rounds;
    const elements = new Set(['dig', 'flag', 'chord', `theme:${level.theme}`]);
    if (level.drawing) elements.add(`drawing:${level.drawing}`);
    for (const k of ['simple', 'pair', 'enumeration', 'count']) if (r[k] > 0) elements.add(`technique:${k}`);
    const layout = level.layout.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' ? [] : [`${x},${y}`]));
    return { elements: [...elements].sort(), layout, params: { width: level.width, height: level.height, mines: level.mineCount, density: Math.round(100 * level.mineCount / (level.width * level.height)), simple: r.simple, pair: r.pair, enumeration: r.enumeration, count: r.count } };
}
export function demineurDiversity(levels, indices = levels.map((_, i) => i)) {
    return measureDiversity(indices.map((index, i) => {
        const f = demineurFeatures(levels[index]);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
