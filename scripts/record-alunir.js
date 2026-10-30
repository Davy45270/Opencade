/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const { Engine, pilot, STEP, LEVELS } = await import('../src/engines/alunir/engine.ts');
import { encounters } from './alunir-encounters.js';
import { measureAlunir } from './alunir-diversity.js';
const records = [], rows = [], historic = JSON.parse(readFileSync('tests/fixtures/characters-campaigns.json', 'utf8'));
for (const seed of [28, 1, 2026]) for (const special of [false, true]) for (let level = 0; level < 30; level++) {
    const e = new Engine(); e.loadLevel(level, seed); if (special) assert(e.special());
    const controls = [], inputs = [], observed = new Set();
    for (let tick = 0; tick < 4000 && e.status === 'playing'; tick++) {
        const c = pilot(e), bits = Number(c.thrust) + 2 * Number(c.left) + 4 * Number(c.right);
        const previous = controls.at(-1); if (previous?.[0] === bits) previous[1]++; else controls.push([bits, 1]);
        for (const mechanic of encounters(e)) observed.add(mechanic);
        inputs.push(bits); e.input(c); e.step(STEP);
    }
    assert.equal(e.status, 'won', `${seed}/${level + 1}/${special}`);
    records.push({ seed, level, special, controls, score: e.state.score, ticks: e.state.ticks, events: e.events });
    if (seed === 28 && !special) {
        historic.alunir[level] = { inputs, score: e.state.score };
        rows.push({ name: LEVELS[level].name, star: LEVELS[level].star, mechanics: [...new Set([...observed, ...encounters(e)])], actions: e.events, controls });
    }
}
const after = measureAlunir(rows);
// Measured from the unmodified eecddb7 recordings (pass 107), not the older label-only campaign.
const before = { revision: 'eecddb7', rejectedPairs: 64, maxSimilarity: 0.9511677282377919, maxControlPair: [4, 5], mechanicCount: 12 };
const controlMaximum = after.pairs.reduce((a, b) => a.controls > b.controls ? a : b);
// Preserve exact commands, including coast, thrust and turn durations.
writeFileSync('tests/fixtures/alunir-campaigns.json', JSON.stringify(records) + '\n');
writeFileSync('tests/fixtures/characters-campaigns.json', JSON.stringify(historic) + '\n');
const report = { before, after: { ...after, rejectedPairs: after.pairs.filter(p => p.similarity > 0.5).length, maxControlSimilarity: controlMaximum.controls, maxControlPair: [controlMaximum.a, controlMaximum.b], levels: after.levels.map((row, index) => ({ ...row, controls: undefined, controlRecording: index })) }, controlRecordings: 'alunir-campaigns.json: seed=28, special=false, ordered by level' };
writeFileSync('tests/fixtures/alunir-diversity.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Alunir : ${records.length} vols, similarité maximale ${after.maxSimilarity}, ${after.mechanicCount} mécaniques.`);
