/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const { Engine, DT } = await import('../src/engines/ferraille/engine.ts');
const { pilot } = await import('../src/engines/ferraille/pilot.ts');
const { witness } = await import('../tests/level-catalogue-ferraille-replay.ts');
const records = [];
for (const seed of [28, 1, 2026]) for (let level = 0; level < 30; level++) for (const special of [false, true]) {
    const e = new Engine(); e.loadLevel(level, seed); const commands = []; let used = false;
    for (let frame = 0; frame < 18000 && e.status === 'playing'; frame++) {
        pilot(e); const input = { ...e.state.input };
        const trigger = special && !used && frame >= 120;
        if (trigger) used = e.special();
        const previous = commands.at(-1);
        if (previous && !trigger && !previous[2] && JSON.stringify(previous[1]) === JSON.stringify(input)) previous[0]++;
        else commands.push([1, input, trigger]);
        e.step(DT);
    }
    assert.equal(e.status, 'won', `${level + 1}/${seed}/${special}`);
    records.push({ level, seed, special, commands, result: witness(e), actions: e.state.actionTrace, modules: e.state.moduleTrace });
}
writeFileSync('tests/fixtures/ferraille-levels-103.json', JSON.stringify(records) + '\n');
// Refresh only the affected game's existing ordinary/special witnesses.
const old = JSON.parse(readFileSync('tests/fixtures/characters-campaigns-4.json', 'utf8'));
old.ferraille = records.filter(r => r.seed === 28).map(r => {
    const e = new Engine(); e.loadLevel(r.level, 28);
    for (const [count, input, trigger] of r.commands) for (let i = 0; i < count; i++) { e.input(input); if (trigger && i === 0) e.special(); e.step(DT); }
    return { level: r.level, special: r.special, frames: r.commands.reduce((n, c) => n + c[0], 0), commands: r.commands, score: e.state.score, lives: e.state.lives };
});
writeFileSync('tests/fixtures/characters-campaigns-4.json', JSON.stringify(old) + '\n');
console.log(`${records.length} winning replays, shared physics for five characters`);
