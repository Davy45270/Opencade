/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
const { Engine: Snake, difficulty } = await import('../src/engines/serpentin/engine.ts');
const { pilot } = await import('../src/engines/serpentin/pilot.ts');
const { Engine: Race } = await import('../src/engines/derapage/engine.ts');
const { controller } = await import('../src/engines/derapage/ai.ts');
const path = 'tests/fixtures/characters-campaigns-2.json';
const recordings = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { serpentin: [], derapage: [] };
for (let level = 0; level < 30; level++) {
    if (recordings.derapage[level]) continue;
    let snakeProof;
    const orders = [['up','right','down','left'], ['right','down','left','up'], ['down','left','up','right'], ['left','up','right','down']];
    if (recordings.serpentin[level]) snakeProof = recordings.serpentin[level];
    for (let attempt = 0; !snakeProof && attempt < 80; attempt++) {
        const s = new Snake(level), inputs = [], seen = new Set(); let policySeed = attempt + 1;
        let order = orders[attempt % 4];
        for (let moves = 0; moves < 10000 && s.status === 'playing'; moves++) {
            const signature = JSON.stringify([s.state.segments, s.state.apple, s.state.direction]);
            if (seen.has(signature)) break; seen.add(signature);
            if (attempt >= 4) { policySeed = policySeed * 16807 % 2147483647; order = orders[policySeed % 4]; }
            const d = pilot(s, order); s.input(d); inputs.push(d);
            const ticks = Math.ceil((60 - s.snapshot().movement - 0.00000001) / difficulty(level).speed);
            s.advance(ticks * 1000 / 60);
        }
        if (s.status === 'won') { snakeProof = { inputs, score: s.state.score }; break; }
    }
    assert(snakeProof, `serpentin ${level}`); recordings.serpentin[level] = snakeProof;
    // Store controls, not a long solver run, in the fast verification path.
    const race = [];
    for (const special of [false, true]) {
        let proof;
        for (const gain of [1, 0.8, 1.2, 1.5, 0.6, 2]) {
        const e = new Race(level), inputs = [], activations = [];
        for (let frame = 0; frame < 10800 && e.status === 'playing'; frame++) {
            const input = controller(e.karts[0], e.track); input.steer = Math.max(-1, Math.min(1, input.steer * gain));
            if (special && e.karts[0].passed >= 35 && e.special()) activations.push(frame);
            inputs.push([input.steer, Number(input.bonus)]); e.input(input); e.advance(1000 / 60);
        }
        if (e.status === 'won') { proof = { inputs, activations, score: e.score, time: e.time, bestLapMs: e.bestLapMs }; break; }
        }
        assert(proof, `derapage ${level} special ${special}`); race.push(proof);
    }
    recordings.derapage[level] = race;
    writeFileSync(path, JSON.stringify(recordings) + '\n');
    console.log(`Recorded ${level + 1}/30`);
}
writeFileSync('tests/fixtures/characters-campaigns-2.json', JSON.stringify(recordings) + '\n');
