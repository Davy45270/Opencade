import { test, expect } from 'vitest';
import * as empilo from '../src/engines/empilo/engine';
import { empiloDiversity } from '../scripts/empilo-diversity.js';
// Pass 402: measured on the real generator, same method as docs/diversity.md.
test('E11 diversité mesurée : score <= 22, aucun clone, et des strates identiques seraient détectées', () => {
    const r = empiloDiversity(empilo);
    expect(r.score).toBeLessThanOrEqual(22); expect(r.cloneShare).toBe(0); expect(r.maxGapWithoutNovelty).toBeLessThanOrEqual(5);
    const clones = empiloDiversity(empilo, Array<number>(30).fill(6)); expect(clones.cloneShare).toBe(1); expect(clones.score).toBeGreaterThan(90);
});
