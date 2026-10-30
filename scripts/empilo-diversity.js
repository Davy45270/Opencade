// Pass 402: Empilo strata descriptors from the real generator (initial snapshots, no pilot).
import { measureDiversity } from './diversity-metrics.js';
const tileNames = { 1: 'crystal', 2: 'sealed', 3: 'gem', 4: 'padlock', 5: 'key' };
export function empiloFeatures(e, l) {
    const s = e.snapshot(), elements = new Set(['rotation', 'line-clear', 'hard-drop']), layout = [];
    for (let i = 0; i < l.shapes; i++) elements.add(`shape:${i}`);
    s.board.forEach((r, y) => r.forEach((v, x) => { if (v) { elements.add(`tile:${tileNames[v] ?? v}`); layout.push(`${x},${y}:${v}`); } }));
    if (l.bomb) elements.add('bomb');
    if (l.objective === 'gems') elements.add('dig-objective');
    if (l.conveyors.length) { elements.add('conveyor'); layout.push(...l.conveyors.map(c => `belt:${c.y}:${c.direction}`)); }
    if (l.rise) elements.add('rising-floor');
    if (l.preview < 3) elements.add('fog');
    if (l.timeMs) elements.add('countdown');
    return { elements: [...elements].sort(), layout, params: { gravity: l.gravity, goal: l.goal, rubble: l.rubble, holes: l.holes, bomb: l.bomb, rise: l.rise, preview: l.preview, timeMs: l.timeMs, layoutCells: layout.length } };
}
export function empiloDiversity(mod, levels = Array.from({ length: 30 }, (_, i) => i)) {
    return measureDiversity(levels.map((level, i) => {
        const f = empiloFeatures(new mod.Engine(level, 28), mod.stratum(level));
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
