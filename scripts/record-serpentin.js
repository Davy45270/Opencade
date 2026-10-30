/* global console */
// Offline calibration of the 30 Serpentin rooms (pass 401). Fast checks replay this output.
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { Engine, difficulty, currentAt } = await import('../src/engines/serpentin/engine.ts');
const { pilot } = await import('../src/engines/serpentin/pilot.ts');
const orders = [['up', 'right', 'down', 'left'], ['right', 'down', 'left', 'up'], ['down', 'left', 'up', 'right'], ['left', 'up', 'right', 'down']];
const serpentin = [];
for (let level = 0; level < 30; level++) {
    let proof;
    for (let attempt = 0; !proof && attempt < 80; attempt++) {
        const s = new Engine(level), inputs = [], seen = new Set(); let policySeed = attempt + 1, order = orders[attempt % 4];
        for (let moves = 0; moves < 10000 && s.status === 'playing'; moves++) {
            const signature = JSON.stringify([s.state.segments, s.state.apple, s.state.direction, s.snapshot().ticks % 600]);
            if (seen.has(signature)) break; seen.add(signature);
            if (attempt >= 4) { policySeed = policySeed * 16807 % 2147483647; order = orders[policySeed % 4]; }
            // An arrow under the head imposes the move: record no input (null) for it.
            const d = pilot(s, order), forced = currentAt(level, s.state.segments[0]);
            if (!forced) s.input(d); inputs.push(forced ? null : d);
            s.advance(Math.ceil((60 - s.snapshot().movement - 0.00000001) / difficulty(level).speed) * 1000 / 60);
        }
        if (s.status === 'won') proof = { inputs, score: s.state.score, timeLeft: s.state.timeLeft };
    }
    assert(proof, `serpentin ${level}`); serpentin.push(proof);
    console.log(`Recorded ${level + 1}/30`);
}
writeFileSync('tests/fixtures/serpentin-campaign.json', JSON.stringify({ serpentin }) + '\n');
