/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const { Engine, DT } = await import('../src/engines/ferraille/engine.ts');
const { witness } = await import('../tests/level-catalogue-ferraille-replay.ts');
const { pilot } = await import('../src/engines/ferraille/pilot.ts');
const { levelCatalogue } = await import('../src/content/level-catalogue.ts');
const records = [];
for (const entry of levelCatalogue.filter(e => e.game === 'ferraille')) for (const seed of [28, 460]) {
    const e = new Engine(), inputs = [], checkpoints = [];
    e.loadLevel(entry.index, seed);
    let frame = 0, last = '';
    for (; frame < 24000 && e.status === 'playing'; frame++) {
        if (frame % 240 === 0) checkpoints.push([frame, witness(e)]);
        pilot(e);
        const input = { ...e.state.input }, signature = JSON.stringify(input);
        if (signature !== last) { inputs.push([frame, input]); last = signature; }
        e.step(DT);
    }
    assert.equal(e.status, 'won', `${entry.code}/${seed}`);
    const result = witness(e);
    records.push({ code: entry.code, level: entry.index, seed, frames: frame, inputs, checkpoints, result });
    console.log(`${entry.code}/${seed}: won, ${frame} frames`);
}
writeFileSync('tests/level-catalogue-ferraille-recordings.ts', `// Ordinary controls; regenerate with nice -n 19 ionice -c3 node scripts/record-level-catalogue.js\nimport type { Recording } from './level-catalogue-ferraille-replay';\nexport const records: Recording[] = [\n${records.map(r => JSON.stringify(r)).join(',\n')}\n];\n`);
