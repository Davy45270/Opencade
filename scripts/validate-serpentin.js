/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { Engine, difficulty, reachable } = await import('../src/engines/serpentin/engine.ts');
const { serpentinEffect } = await import('../tests/character-games-2-checks.ts');
const fixtures = JSON.parse(readFileSync('tests/fixtures/serpentin-campaign.json', 'utf8'));
serpentinEffect();
for (let level = 0; level < 30; level++) {
    const start = performance.now(), e = new Engine(level), d = difficulty(level);
    assert.equal(reachable(e.state.segments[0], e.state.obstacles, d.walls).length, 315 - d.obstacles);
    for (const input of fixtures.serpentin[level].inputs) {
        if (input) e.input(input); const ticks = Math.ceil((60 - e.snapshot().movement - 0.00000001) / d.speed); e.advance(ticks * 1000 / 60);
    }
    assert.equal(e.status, 'won'); assert.equal(e.specialUses, 1); assert.equal(e.state.score, fixtures.serpentin[level].score);
    // Clock-free bound (pass 401): simulated ticks, never wall time.
    const ms = performance.now() - start; assert(e.snapshot().ticks <= 60 * 120, `L${level + 1}: ${e.snapshot().ticks} ticks`);
    console.log(`N/P-serpentin-04 L${level + 1}: victoire sans esquive, ${Math.round(ms)} ms`);
}
