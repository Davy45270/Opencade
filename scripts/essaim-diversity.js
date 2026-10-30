import { measureDiversity } from './diversity-metrics.js';
export function essaimFeatures(engine) {
    const s = engine.snapshot(), c = engine.config;
    const elements = new Set(['shoot']);
    for (const e of s.enemies) elements.add(`enemy:${e.type}`);
    for (const f of c.formations) elements.add(`behavior:${f}`);
    for (const pickup of [...s.pickups, ...s.weapons]) elements.add(`weapon:${pickup.kind}`);
    if (c.rest) elements.add('respite');
    if (c.boss) elements.add(`guardian:${c.boss}`);
    if (c.boss === 6) elements.add('command-two-phases');
    const layout = s.enemies.map(e => `${e.homeX},${e.homeY}:${e.type}`);
    return { elements: [...elements].sort(), layout, params: { layoutCells: layout.length } };
}
export function essaimDiversity(Engine, difficulty) {
    return measureDiversity(Array.from({ length: 30 }, (_, level) => {
        const e = new Engine(level, 28), f = essaimFeatures(e);
        return { level: level+1, parameters: { ...difficulty(level), ...f.params }, elements: f.elements, layout: f.layout };
    }));
}
