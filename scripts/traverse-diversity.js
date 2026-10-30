// Pass 404: crossing descriptors from the real generator (initial boards, no pilot).
import { measureDiversity } from './diversity-metrics.js';
export function traverseFeatures(board, d, plan) {
    const elements = ['shelter', 'road', 'river', 'log', 'traffic'], layout = board.lanes.map(l => `${l.y}:${l.kind}:${l.direction}:${l.offset}:${l.diver}:${l.speed ?? 1}:${l.light ? 1 : 0}:${l.tide ?? 0}`);
    if (d.diveDuration && board.lanes.some(l => l.diver)) elements.push('diving-log');
    if (board.lanes.some(l => l.light)) elements.push('traffic-light');
    if (board.lanes.some(l => (l.speed ?? 1) > 1)) elements.push('rapids');
    if (board.lanes.some(l => l.tide)) elements.push('tide');
    if (board.rocks?.length) { elements.push('rock'); layout.push(...board.rocks.map(r => `rock:${r.x},${r.y}`)); }
    if (board.castaway) elements.push('castaway');
    if (board.ordered) elements.push('ordered-shelters');
    if (d.lives === 1) elements.push('one-life');
    return { elements: elements.sort(), layout, params: { flowFrames: d.flowFrames, spacing: d.spacing, logLength: d.logLength, diveDuration: d.diveDuration, timeMs: d.timeMs, shelters: d.shelters, lives: d.lives, rocks: plan?.rocks ?? 0 } };
}
export function traverseDiversity(mod, levels = Array.from({ length: 30 }, (_, i) => i)) {
    return measureDiversity(levels.map((level, i) => {
        const f = traverseFeatures(new mod.Engine(level, 28).board, mod.difficulty(level), mod.PLANS[level]);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
