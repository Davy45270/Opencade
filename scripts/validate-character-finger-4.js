/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { controller } from './briqueterie-pilot.js';
const { Engine: Runner } = await import('../src/engines/ferraille/engine.ts');
const { Engine: Bricks } = await import('../src/engines/briqueterie/engine.ts');
const { Engine: Fleet } = await import('../src/engines/essaim/engine.ts');
const { pilot: run } = await import('../src/engines/ferraille/pilot.ts');
const { pilot: fly } = await import('../src/engines/essaim/pilot.ts');
const records = JSON.parse(readFileSync('tests/fixtures/characters-finger-4.json', 'utf8'));
assert.equal(records.length, 6);
for (const { game, level, commands, score, lives } of records) {
    const E = game === 'ferraille' ? Runner : game === 'briqueterie' ? Bricks : Fleet;
    const e = new E(); e.loadLevel(level, 28); let uses = 0;
    const model = new E(); model.loadLevel(level, 28); model.loadState(e.state); model.step(150);
    if (game === 'ferraille') { run(model); assert.equal(model.state.input.fire, true); }
    else if (game === 'essaim') { fly(model, model.state.ticks); assert(Number.isFinite(model.state.target)); }
    else assert(Number.isFinite(controller(model, 0, 0)));
    for (const { input, special } of commands) {
        e.step(150);
        if (game === 'ferraille') e.input(input);
        else if (game === 'briqueterie') { e.move(input); e.launch(); }
        else { e.moveTo(input[0]); e.holdFire(input[1]); }
        if (special) { assert(e.special()); uses++; }
    }
    assert.equal(e.status, 'won'); assert.equal(e.state.score, score); assert.equal(e.state.lives, lives); assert(uses > 0);
}
console.log('Six 150ms latency rehearsals won; noisy paddle/left thumb, recorded commands replayed under 2s per case. CDP E2E still requires host execution.');
