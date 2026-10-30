/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { Engine } = await import('../src/engines/serpentin/engine.ts');
const { snakePlan } = await import('../tests/e2e/character-snake-policy.ts');
const source = readFileSync('tests/e2e/character-finger-2.spec.ts', 'utf8');
assert.doesNotMatch(source, /__SERPENTIN_TEST__(?:\?\.|\.)advance/, 'snake finger E2E never controls scene time');
const results = [];
// Pass 401: room 14 (prey, portals, torus) replaces room 10, which now holds gates.
for (const level of [0, 13]) for (const cadence of [150, 155, 160, 170, 180]) {
    const start = performance.now(), e = new Engine(level); e.special(); e.advance(350);
    let elapsed = 350;
    while (e.status === 'playing' && elapsed < 90000) {
        for (const d of snakePlan(e.snapshot())) e.input(d);
        e.advance(cadence); elapsed += cadence;
    }
    assert.equal(e.status, 'won', `level ${level + 1}, observation ${cadence} ms`);
    // Clock-free (pass 401): the simulated game time is the budget; wall time is only reported.
    assert(elapsed < 90000);
    results.push({ level: level + 1, cadence, elapsed, wallMs: Math.round(performance.now() - start) });
}
console.log(JSON.stringify({ snakeObservationChecks: results }));
