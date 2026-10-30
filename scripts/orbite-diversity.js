import { measureDiversity } from './diversity-metrics.js';
/** Inventories are collision/motion witnesses from full ordinary-input recordings.
 * No element is inferred from the campaign's declared mechanic list. */
export function orbiteDiversity(Engine, recordings) {
    return measureDiversity(recordings.filter(r => r.seed === 28).map(r => {
        const engine = new Engine(r.level, r.seed), s = engine.state;
        const layout = s.probes.map(p => `${p.x},${p.y}:${p.kind ?? 'probe'}`);
        if (JSON.stringify(layout) !== JSON.stringify(r.layout)) throw new Error('Changed formation');
        return { level: r.level + 1, parameters: { probes: s.probes.length, boss: Number(Boolean(s.boss)) }, layout,
            elements: Object.keys(r.witnesses).sort(), observation: r.witnesses,
            curve: { status: 'won', completionMs: r.frames * 1000 / 60, frames: r.frames, failures: 0, censored: false } };
    }));
}
export function verifyOrbiteDiversity(d) {
    if (d.noveltyCount < 7 || d.cloneShare >= 0.25) throw new Error('O-DIV-01 novelty / clones');
    let last = 1;
    for (const level of d.noveltyLevels.filter(n => n <= 25)) {
        if (level - last > 5) throw new Error('O-DIV-01 cadence'); last = level;
    }
    if (25 - last > 5) throw new Error('O-DIV-01 trailing cadence');
}
