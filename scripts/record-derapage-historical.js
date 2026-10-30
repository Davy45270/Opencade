/* global console, process, URL */
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
if (!process.argv.includes('--record')) throw new Error('Explicit --record required to replace the historical oracle');
// Remaining dependencies were unchanged at pass 73; refuse a mixed-version oracle.
execFileSync('git', ['diff', '--exit-code', '038a0c1', '--',
    ...['ai', 'track', 'race', 'items', 'circuits', 'access'].map(name => `src/engines/derapage/${name}.ts`),
    'src/engines/shared/random.ts']);
const root = process.cwd();
await import(root + '/scripts/ts-loader.js');
async function historical(path, imports = {}) {
    const text = execFileSync('git', ['show', '038a0c1:' + path], { encoding: 'utf8' })
        .replace(/from '([^']+)'/g, (_, name) => `from ${JSON.stringify(imports[name] ?? new URL(name + '.ts', 'file://' + root + '/' + path).href)}`);
    const url = 'data:text/javascript,' + encodeURIComponent(ts.transpile(text, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }));
    return { url, module: await import(url) };
}
const physics = await historical('src/engines/derapage/physics.ts');
const { module: { Engine } } = await historical('src/engines/derapage/engine.ts', { './physics': physics.url });
const { ranking } = await import(root + '/src/engines/derapage/race.ts');
const { controller } = await import(root + '/src/engines/derapage/ai.ts');
const { recordings } = await import(root + '/tests/derapage-recordings-038a0c1.ts');
const data = { commit: '038a0c1', tapes: [], campaign: [] };
function dynamic(engine) {
    const e = engine, player = e.karts[0];
    // Read only dynamic state, avoiding a deep copy of the immutable whole track per step.
    const s = { level: e.level, seed: e.seed, status: e.status, score: e.score, time: e.time,
        timing: { raceMs: e.time + (player.penaltyMs ?? 0), currentLapMs: player.finishMs === null ? (e.frames - e.lapStartFrame) * (1000 / 60) + (player.penaltyMs ?? 0) - e.lapPenaltyStartMs : 0,
            lapTimesMs: e.lapTimesMs, bestLapMs: e.bestLapMs, lastLapDeltaMs: e.lastLapDeltaMs },
        frames: e.frames, remainder: e.remainder, random: e.random.state, controls: e.controls,
        karts: e.karts, crates: e.crates, puddles: e.puddles,
        order: ranking(e.karts, e.track), cup: { races: e.cup.races, scores: e.cup.scores, order: e.cup.standings() } };
    return JSON.stringify(s).replaceAll(',"specialMs":0', '');
}
for (const tape of recordings) {
    const e = new Engine(tape.level, 28), hash = createHash('sha256'), steps = [];
    for (let frame = 0; frame < tape.frames; frame++) {
        e.input({ steer: 0, drift: false, bonus: false, mode: 'joystick', heading: tape.events[Math.floor(frame / 9)], assist: true });
        e.step(1000 / 60); hash.update(dynamic(e));
        if (e.frames % 600 === 0) steps.push({ frame: e.frames, digest: hash.copy().digest('hex') });
    }
    data.tapes.push({ level: tape.level, frames: e.frames, digest: hash.digest('hex'), steps });
}
for (let level = 0; level < 30; level++) {
    const e = new Engine(level, 28), hash = createHash('sha256'), steps = [];
    while (e.status === 'playing' && e.frames < 10800) {
        e.input(controller(e.karts[0], e.track)); e.step(1000 / 60); hash.update(dynamic(e));
        if (e.frames % 600 === 0) steps.push({ frame: e.frames, digest: hash.copy().digest('hex') });
    }
    data.campaign.push({ level, frames: e.frames, status: e.status, digest: hash.digest('hex'), steps });
}
writeFileSync('tests/fixtures/derapage-038a0c1.json', JSON.stringify(data, null, 2) + '\n');
console.log('Recorded 038a0c1: four original tapes and 30 races, one digest over every step.');
