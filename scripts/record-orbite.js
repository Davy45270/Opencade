import './ts-loader.js';
import { writeFileSync } from 'node:fs';
const { Engine, TICK } = await import('../src/engines/orbite/engine.ts');
const { pilot } = await import('../src/engines/orbite/pilot.ts');
const { signature, layout, observe } = await import('../tests/orbite-replay.ts');
export function attempt(E, level, seed) {
    const e = new E(level, seed), initialLayout = layout(e), commands = [], seen = new Set(), witnesses = {};
    let frames = 0;
    for (; frames < 18000 && e.status === 'playing'; frames++) {
        pilot(e); const target = e.state.target, previous = commands.at(-1);
        if (previous?.[0] === target) previous[1]++; else commands.push([target, 1]);
        e.step(TICK);
        observe(e, frames + 1, seen, witnesses);
    }
    if (e.status !== 'won') throw new Error(`Pilot ${level+1}/${seed}: ${e.status}, boss ${e.state.boss?.hp}`);
    return { level, seed, commands, frames, signature: signature(e), events: [...seen].sort(), layout: initialLayout, witnesses };
}
export function recordOrbite() {
    const records = [457, 28].flatMap(seed => Array.from({ length: 30 }, (_, level) => attempt(Engine, level, seed)));
    writeFileSync('tests/orbite-solutions.ts', "// Ordinary-input recordings; regenerate with scripts/validate-orbite.js --record.\nimport type { Recording } from './orbite-replay';\nexport const recordings: Recording[] = [\n" + records.map(r => JSON.stringify(r)).join(',\n') + '\n];\n');
    return records;
}
