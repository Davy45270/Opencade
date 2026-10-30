// Pass 401: Serpentin campaign descriptors from the real generator (initial snapshots, no pilot).
import { measureDiversity } from './diversity-metrics.js';
export function serpentinFeatures(e, d, layoutOf) {
    const s = e.snapshot(), elements = ['apple', 'growth', d.walls ? 'boundary-wall' : 'wrap'];
    if (s.obstacles.length) elements.push('obstacle');
    if (d.portals) elements.push('portal');
    if (d.gates) elements.push('gate');
    if (d.currents) elements.push('current');
    if (d.patrols) elements.push('sentry');
    if (d.prey) elements.push('fleeing-prey');
    if (d.scissors) elements.push('scissors');
    if (d.timeMs) elements.push('countdown');
    const l = layoutOf ? layoutOf(e.level) : null;
    const layout = [...s.obstacles.map(c => `obstacle:${c.x},${c.y}`)];
    if (l) {
        layout.push(...l.portals.flatMap(p => [`portal:${p.a.x},${p.a.y}`, `portal:${p.b.x},${p.b.y}`]), ...l.gates.map(g => `gate:${g.cell.x},${g.cell.y}`), ...l.currents.map(k => `current:${k.cell.x},${k.cell.y}:${k.direction}`), ...l.patrols.flatMap(p => p.path.map(c => `sentry:${c.x},${c.y}`)));
    }
    return { elements: elements.sort(), layout, params: { speed: d.speed, goal: d.goal, obstacles: d.obstacles, walls: Number(d.walls), prey: d.prey, timeMs: d.timeMs, layoutCells: layout.length } };
}
export function serpentinDiversity(mod, levels = Array.from({ length: 30 }, (_, i) => i)) {
    const rows = levels.map((level, i) => {
        const e = new mod.Engine(level, 28), d = mod.difficulty(level), f = serpentinFeatures(e, d, mod.layout);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    });
    return measureDiversity(rows);
}
