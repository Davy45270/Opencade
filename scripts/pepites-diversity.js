// Pépites: mine descriptors from the real parser (initial grids), same method as docs/diversity.md.
import { measureDiversity } from './diversity-metrics.js';
const names = { '.': 'soil', '#': 'bedrock', '=': 'brick', o: 'boulder', '*': 'nugget', E: 'exit', m: 'sorting-wall', a: 'moss', w: 'water', x: 'dynamite', g: 'big-nugget', f: 'firefly', b: 'moth' };
export function pepitesFeatures(m) {
    const elements = new Set(['dig', 'gravity', 'roll']), layout = [];
    m.rows.forEach((r, y) => Array.from(r).forEach((c, x) => { if (names[c]) { elements.add(names[c]); if (c !== '.' && c !== '#') layout.push(`${x},${y}:${c}`); } }));
    if (m.seconds < 130) elements.add('countdown');
    return { elements: [...elements].sort(), layout, params: { goal: m.goal, seconds: m.seconds, turnFrames: m.turnFrames, layoutCells: layout.length } };
}
export function pepitesDiversity(mines) {
    return measureDiversity(mines.map((m, i) => { const f = pepitesFeatures(m); return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout }; }));
}
