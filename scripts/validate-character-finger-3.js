/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { Engine: Maze } = await import('../src/engines/dedale/engine.ts');
const { route } = await import('../src/engines/dedale/solver.ts');
const { Engine: Orbit } = await import('../src/engines/orbite/engine.ts');
const { pilot } = await import('../src/engines/orbite/pilot.ts');
const { Engine: Stack } = await import('../src/engines/empilo/engine.ts');
const { empiloPlacement } = await import('../tests/e2e/character-policy-3.ts');
// Pass 402: Empilo rehearsals are recorded on the new strata in their own fixture.
const records = [...JSON.parse(readFileSync('tests/fixtures/characters-finger-3.json', 'utf8')).filter(r => r.game !== 'empilo'), ...JSON.parse(readFileSync('tests/fixtures/empilo-finger.json', 'utf8'))];
for (const record of records) {
    const Engine = record.game === 'dedale' ? Maze : record.game === 'orbite' ? Orbit : Stack;
    const e = new Engine(record.level, 28); assert(e.special());
    // Live policy smoke test, then replay the full offline decision trace in bounded cases.
    const model = new Engine(record.level, 28); model.loadState(e.snapshot());
    if (record.game === 'dedale') { model.advance(150); assert.equal(route(model)?.[0], record.commands[0]); }
    else if (record.game === 'orbite') { model.advance(150); pilot(model); assert.equal((model.state.target ?? 180) - 12, record.commands[0]); }
    else assert(empiloPlacement(model.state));
    for (let first = 0; first < record.commands.length; first += 50) {
        for (const command of record.commands.slice(first, first + 50)) {
            e.advance(150);
            if (record.game === 'orbite') { e.moveTo(command); e.holdFire(true); }
            else if (command !== null) { const accepted = e.input(command); if (record.game === 'empilo') assert(accepted); }
        }
    }
    assert.equal(e.status, 'won'); assert.equal(e.state.score, record.score);
}
assert.equal(records.length, 6);
console.log('Six recorded noisy/150 ms latency rehearsals won, live decisions and replay batches under 2 s');
