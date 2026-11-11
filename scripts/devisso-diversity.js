// Dévisso: assembly descriptors read from the real parser (plates, layers, specials, theme), no pilot.
import { measureDiversity } from './diversity-metrics.js';
import { parse } from '../src/engines/devisso/rules.ts';
const KINDS = ['key', 'lock', 'tnt', 'rainbow', 'gold', 'ice', 'gear', 'portal', 'chain'];
/** Mechanisms on the board: the lock brings its key, the reinforced plates are the metal ones. */
export function devissoFeatures(level) {
    const board = parse(level), layers = 1 + Math.max(...board.plates.map(p => p.z));
    const elements = new Set(['screw', 'box', 'buffer', `layers:${layers}`, `theme:${level.theme}`]);
    if (board.plates.some(p => p.material === 'metal')) elements.add('reinforced');
    if (board.crates.length) elements.add('crate');
    for (const special of Object.values(level.specials ?? {})) {
        const kind = typeof special === 'string' ? special : KINDS.find(k => k in special);
        if (kind && kind !== 'key') elements.add(kind);
    }
    const layout = [...board.plates.map(p => `${p.shape}@${p.x},${p.y},${p.z}`), ...Object.keys(level.specials ?? {}).map(k => `special@${k}`), ...board.crates.map(c => `crate@${c.x},${c.y}`)];
    const colours = new Set(board.screws.map(s => s.color)).size;
    return { elements: [...elements].sort(), layout, params: { screws: board.screws.length, plates: board.plates.length, layers, colours, crates: board.crates.length, trap: level.trap } };
}
export function devissoDiversity(levels, indices = levels.map((_, i) => i)) {
    return measureDiversity(indices.map((index, i) => {
        const f = devissoFeatures(levels[index]);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
