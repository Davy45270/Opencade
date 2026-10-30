import { test, expect } from 'vitest';
import { Engine } from '../src/engines/orbite/engine';
import { recordings } from './orbite-solutions';
import { replay } from './orbite-replay';
import { orbiteDiversity, verifyOrbiteDiversity } from '../scripts/orbite-diversity.js';
for (const record of recordings) test(`O-PILOT replay ${String(record.level + 1)}/${String(record.seed)}`, () => {
    expect(replay(record).signature).toBe(record.signature);
});
test('O-DIV-01 observed inventories backed by the O-PILOT replays', () => {
    expect(recordings).toHaveLength(60);
    const d = orbiteDiversity(Engine, recordings); verifyOrbiteDiversity(d);
    expect(d.noveltyCount).toBeGreaterThanOrEqual(7);
    expect(d.cloneShare).toBeLessThan(0.25);
});

test('O-DIV-01 rejects too few novelties independently of clones and cadence', () => {
    const d = orbiteDiversity(Engine, recordings);
    expect(() => { verifyOrbiteDiversity({ ...d, cloneShare: 0, noveltyCount: 6, noveltyLevels: [1, 4, 7, 10, 13, 16, 19, 22, 25] }); }).toThrow();
});
test('O-DIV-01 rejects intermediate and trailing gaps independently of novelty count', () => {
    const d = orbiteDiversity(Engine, recordings);
    for (const noveltyLevels of [[1, 2, 3, 4, 5, 6, 12, 17, 22, 25], [1, 2, 3, 4, 5, 10, 15, 19]]) {
        expect(() => { verifyOrbiteDiversity({ ...d, cloneShare: 0, noveltyCount: 8, noveltyLevels }); }).toThrow();
    }
    verifyOrbiteDiversity({ ...d, cloneShare: 0, noveltyCount: 7, noveltyLevels: [1, 5, 10, 15, 20, 25, 30] });
});
for (const r of recordings.filter(r => r.level === 29)) test(`O-FINAL ordinary-input victory retains all four special probe kinds/${String(r.seed)}`, () => {
    for (const kind of ['rotor', 'split', 'stealth', 'repair']) expect(r.layout.some(p => p.endsWith(':' + kind))).toBe(true);
    replay(r);
});

test('O-FINAL ordinary-input final victories witness all eight mechanics', () => {
    const events = new Set(recordings.filter(r => r.level === 29).flatMap(r => r.events));
    const defaultFinal = recordings.find(r => r.level === 29 && r.seed === 457);
    for (const event of ['rotor-block', 'split', 'stealth-hide', 'repair', 'deflect', 'gravity', 'satellite-threat', 'spiral']) {
        expect(events.has(event)).toBe(true);
        expect(defaultFinal?.events.includes(event)).toBe(true);
    }
});
