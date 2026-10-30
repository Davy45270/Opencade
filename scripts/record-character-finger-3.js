/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { Engine: Maze } = await import('../src/engines/dedale/engine.ts');
const { route } = await import('../src/engines/dedale/solver.ts');
const { Engine: Orbit } = await import('../src/engines/orbite/engine.ts');
const { pilot } = await import('../src/engines/orbite/pilot.ts');
const { Engine: Stack } = await import('../src/engines/empilo/engine.ts');
const { empiloPlacement } = await import('../tests/e2e/character-policy-3.ts');
const timings = [];
for (const level of [0, 9]) for (const [game, Engine] of [['dedale', Maze], ['orbite', Orbit], ['empilo', Stack]]) {
    const start = performance.now(), e = new Engine(level, 28), model = new Engine(level, 28); let ms = 0, entries = 0; const commands = [];
    assert(e.special());
    const input = action => { e.advance(150); ms += 150; entries++; commands.push(action); assert(e.input(action)); };
    while (e.status === 'playing' && ms < 120000) {
        if (game === 'dedale') {
            model.loadState(e.snapshot()); model.advance(150); if (model.status === 'won') { e.advance(150); ms += 150; commands.push(null); break; } const direction = route(model)?.[0]; assert(direction);
            e.advance(150); ms += 150; e.input(direction); entries++; commands.push(direction);
        } else if (game === 'orbite') {
            model.loadState(e.snapshot()); model.advance(150); pilot(model);
            e.advance(150); ms += 150;
            const target = (model.state.target ?? 180) + (entries * 7 % 25 - 12); commands.push(target); e.moveTo(target); e.holdFire(true); entries++;
        } else {
            const p = empiloPlacement(e.state); assert(p);
            for (let rotation = 0; rotation < p.rotations; rotation++) input('clockwise');
            for (let step = 0; step < 9 && e.state.active.x !== p.x; step++) input(e.state.active.x < p.x ? 'right' : 'left');
            input('drop');
        }
    }
    assert.equal(e.status, 'won', `${game} level ${level + 1}, ${ms} ms`);
    const elapsed = performance.now() - start;
    timings.push({ game, level, ms, entries, elapsed, commands, score: e.state.score });
}
// Pass 402: Empilo rehearsals go to their own fixture (its strata changed).
writeFileSync('tests/fixtures/characters-finger-3.json', JSON.stringify(timings.filter(t => t.game !== 'empilo')) + '\n');
writeFileSync('tests/fixtures/empilo-finger.json', JSON.stringify(timings.filter(t => t.game === 'empilo')) + '\n');
console.log('Recorded six latency rehearsals');
