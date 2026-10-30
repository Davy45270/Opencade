/* global console */
// Offline calibration of the 30 workshops (pass 403): four exact proofs per room
// (fewest pushes / steps, without and with the optional pull). Fast checks replay them.
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { solve } = await import('../src/engines/caisses/solver.ts');
const { parse, LEVELS } = await import('../src/engines/caisses/engine.ts');
const caisses = [];
for (const [level, data] of LEVELS.entries()) {
    const board = parse(data.text), proofs = {};
    for (const mode of ['pushes', 'steps']) for (const pull of [false, true]) {
        const proof = pull ? solve(board, mode, true) : solve(board, mode); assert(proof, `${level + 1} ${mode} ${pull}`);
        proofs[mode + (pull ? 'Special' : '')] = proof;
    }
    caisses.push(proofs); console.log(`Recorded ${level + 1}/30`);
}
writeFileSync('tests/fixtures/caisses-campaign.json', JSON.stringify({ caisses }) + '\n');
writeFileSync('src/engines/caisses/records.ts', '/** Exact optional-pull records of the 30 workshops (pass 403). */\nexport const pullRecords = ' + JSON.stringify(caisses.map(p => ({ pushes: p.pushesSpecial.pushes, steps: p.stepsSpecial.inputs.length })), null, 4) + ' as const;\n');
