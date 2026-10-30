/* global console */
// Offline calibration of the 30 crossings (pass 404): one ordinary winning game per crossing.
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { Engine, difficulty } = await import('../src/engines/traverse/engine.ts');
const { solve } = await import('../src/engines/traverse/solver.ts');
const traverse = [];
for (let level = 0; level < 30; level++) {
    const e = new Engine(level), paths = [];
    for (const target of e.board.shelters) {
        const proof = solve(level, 28, target, e.state.phase, e.state.rescued); assert(proof, `${level + 1} abri ${target}`); paths.push(proof.path);
        for (const action of proof.path) { if (action !== 'wait') e.input(action); e.advance(difficulty(level).flowFrames * 1000 / 60); }
    }
    assert.equal(e.status, 'won'); traverse.push(paths);
}
writeFileSync('tests/fixtures/traverse-campaign.json', JSON.stringify({ traverse }) + '\n');
console.log('Recorded 30 crossings');
