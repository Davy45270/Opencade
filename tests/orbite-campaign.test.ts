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
