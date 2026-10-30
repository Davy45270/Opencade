/* global console */
// Offline calibration only. Fast tests replay this output rather than searching again.
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { solve: crates } = await import('../src/engines/caisses/solver.ts');
const { parse, LEVELS } = await import('../src/engines/caisses/engine.ts');
const { Engine: Crossing, difficulty } = await import('../src/engines/traverse/engine.ts');
const { solve: crossing } = await import('../src/engines/traverse/solver.ts');
const { Engine: Lander, pilot } = await import('../src/engines/alunir/engine.ts');
const recordings = { caisses: [], traverse: [], alunir: [] };
for (let level = 0; level < 30; level++) {
    const board = parse(LEVELS[level].text), proofs = {};
    for (const mode of ['pushes', 'steps']) for (const pull of [false, true]) {
        const proof = pull ? crates(board, mode, true) : crates(board, mode); assert(proof);
        proofs[mode + (pull ? 'Special' : '')] = proof;
    }
    recordings.caisses.push(proofs);
    const e = new Crossing(level), paths = [];
    for (const target of e.board.shelters) {
        const proof = crossing(level, 28, target, e.state.phase); assert(proof); paths.push(proof.path);
        for (const action of proof.path) { if (action !== 'wait') e.input(action); e.advance(difficulty(level).flowFrames * 1000 / 60); }
    }
    assert.equal(e.status, 'won'); recordings.traverse.push(paths);
    const l = new Lander(), inputs = []; l.loadLevel(level);
    for (let tick = 0; tick < 2500 && l.status === 'playing'; tick++) {
        const control = pilot(l); inputs.push(Number(control.thrust) + Number(control.left) * 2 + Number(control.right) * 4);
        l.input(control); l.advance(1000 / 60);
    }
    assert.equal(l.status, 'won'); recordings.alunir.push({ inputs, score: l.state.score });
    console.log(`Recorded ${level + 1}/30`);
}
writeFileSync('tests/fixtures/characters-campaigns.json', JSON.stringify(recordings));
writeFileSync('src/engines/caisses/records.ts', '/** Exact optional-pull records; historical LEVELS records remain unchanged. */\nexport const pullRecords = ' + JSON.stringify(recordings.caisses.map(p => ({ pushes: p.pushesSpecial.pushes, steps: p.stepsSpecial.inputs.length })), null, 4) + ' as const;\n');
