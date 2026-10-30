import { measureDiversity } from './diversity-metrics.js';
const observed = ['moving', 'solid', 'explosive', 'regen', 'portal', 'angle', 'key', 'multi', 'gravity', 'falling'];
/** Same generator and transition metric as the report; only observed effects enter novelty. */
export function briqueterieDiversity(Engine, records, replay) {
    const rows = records.filter(r => r.seed === 28).map(record => {
        const e = new Engine(record.level - 1, record.seed), bricks = e.state.bricks;
        const { engine, witnesses } = replay(record, Engine);
        return { level: record.level,
            parameters: { bricks: bricks.filter(b => !b.solid).length, solids: bricks.filter(b => b.solid).length, spanX: Math.max(...bricks.map(b => b.x)) - Math.min(...bricks.map(b => b.x)), spanY: Math.max(...bricks.map(b => b.y)) - Math.min(...bricks.map(b => b.y)) },
            elements: ['ball', 'paddle', 'breakable-brick', ...observed.filter(k => witnesses[k] !== undefined)],
            layout: bricks.map(b => `${b.x},${b.y}:${b.kind}:${b.solid}`), witnesses,
            curve: { status: engine.status, completionMs: record.frames * 1000 / 60, frames: record.frames, livesLost: 3 - engine.state.lives, censored: false } };
    });
    return measureDiversity(rows);
}
