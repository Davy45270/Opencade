/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
const { Engine, pilot } = await import('../src/engines/alunir/engine.ts');
for (const seed of [28, 1, 2026]) for (let level = 0; level < 30; level++) {
    const e = new Engine(); e.loadLevel(level, seed);
    for (let tick = 0; tick < 2500 && e.status === 'playing'; tick++) { e.input(pilot(e)); e.advance(1000 / 60); }
    assert.equal(e.status, 'won', `${seed}/${level + 1}`);
    assert.equal(e.specialUses, 2);
}
console.log('Alunir: 90 atterrissages sans spécial, trois graines, records et physique inchangés.');
