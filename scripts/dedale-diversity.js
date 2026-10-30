// Observations come from complete input replays on the real generator.
import { measureDiversity } from './diversity-metrics.js';
export function dedaleDiversity(Engine, records) {
    const rows = records.map(record => {
        const e = new Engine(record.level - 1, record.seed), initial = e.snapshot(), witnesses = {};
        const baseline = ['maze', 'seed', 'sun'];
        const observable = ['key', 'door', 'one-way', 'portal', 'switch', 'gate', 'wall-wait', 'moving-wall', 'slide', 'darkness', 'patrol', 'light-flee'];
        record.inputs.forEach((d, i) => {
            e.input(d); e.step(1000 / 6);
            for (const event of e.events) if (observable.includes(event)) witnesses[event] ??= { move: i + 1, hero: { ...e.state.hero } };
        });
        const j = initial.journey;
        // Occupancy and typed actual cells; no shape name or level ID in the signature.
        const layout = initial.maze.flatMap((v, i) => v ? [`floor:${i % 19},${Math.floor(i / 19)}`] : []);
        for (const k of ['keys', 'doors', 'arrows']) for (const tile of j[k]) layout.push(`${k}:${tile.at}:${tile.color ?? tile.direction}`);
        for (const k of ['portals', 'switches', 'gates', 'moving', 'ice', 'dark']) for (const tile of j[k]) layout.push(`${k}:${tile}`);
        return { level: record.level, elements: [...baseline, ...Object.keys(witnesses)].sort(), parameters: { floorCells: initial.maze.filter(Boolean).length }, layout, witnesses,
            curve: { status: e.status, actions: record.inputs.length, completionMs: record.inputs.length * 1000 / 6, livesLost: 3 - e.state.lives, censored: e.status === 'playing' } };
    });
    return measureDiversity(rows);
}
