// Fusio: challenge descriptors read from the real challenge list (size, target, spawn weights, walls, move limit,
// written start, undo, theme), for the shared diversity measure.
import { measureDiversity } from './diversity-metrics.js';
import { themeOf } from '../src/engines/fusio/challenges.ts';
/** Elements: each rule a challenge changes; layout: its blocked cells and written tiles; parameters: the numbers. */
export function fusioFeatures(c, index) {
    const elements = new Set([`size:${String(c.size)}`, `target:${String(c.target)}`, `theme:${themeOf(index)}`]);
    if (c.p2 !== undefined) elements.add(`spawn:${String(c.p2)}`);
    if (c.walls) elements.add(`walls:${String(c.walls.length)}`);
    if (c.moveLimit) elements.add('move-limit');
    if (c.start) elements.add('written-start');
    if (c.undo === false) elements.add('no-undo');
    const layout = [...(c.walls ?? []).map(i => `w${String(i)}/${String(c.size)}`), ...(c.start ?? []).flatMap((v, i) => v ? [`t${String(i)}:${String(v)}`] : [])];
    return { elements: [...elements].sort(), layout, params: { size: c.size, target: Math.log2(c.target), p2: c.p2 ?? 90, walls: c.walls?.length ?? 0, limit: c.moveLimit ?? 0, start: c.start?.filter(Boolean).length ?? 0, difficulty: c.difficulty } };
}
export function fusioDiversity(challenges, indices = challenges.map((_, i) => i)) {
    return measureDiversity(indices.map((index, i) => {
        const f = fusioFeatures(challenges[index], index);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
