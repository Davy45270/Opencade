/* global console */
// Offline calibration only: fast validators replay the resulting ordinary inputs.
import './ts-loader.js';
import { writeFileSync } from 'node:fs';
const { Engine } = await import('../src/engines/empilo/engine.ts');
const { empiloPlacement } = await import('../tests/e2e/character-policy-3.ts');
const records = [];
for (let level = 0; level < 30; level++) {
    for (let seed = 28; seed < 528; seed++) {
        const modes = [];
        for (const special of [false, true]) {
            const e = new Engine(level, seed), inputs = [];
            if (special) { e.special(); inputs.push('special'); }
            for (let piece = 0; piece < 2000 && e.status === 'playing'; piece++) {
                const p = empiloPlacement(e.state); if (!p) break;
                for (let i = 0; i < p.rotations; i++) { e.input('clockwise'); inputs.push('clockwise'); }
                while (e.state.active.x !== p.x) { const action = e.state.active.x < p.x ? 'right' : 'left'; if (!e.input(action)) break; inputs.push(action); }
                e.input('drop'); inputs.push('drop');
            }
            if (e.status !== 'won') break;
            modes.push({ inputs, score: e.state.score, lines: e.state.lines });
        }
        if (modes.length === 2) { records.push({ level, seed, modes }); console.log('Empilo', level + 1, seed, modes.map(r => r.score)); break; }
    }
    if (records.length !== level + 1) throw new Error(`No witness for ${level + 1}`);
    writeFileSync('tests/fixtures/characters-campaigns-3.json', JSON.stringify({ empilo: records }) + '\n');
}
const { Engine: Orbit } = await import('../src/engines/orbite/engine.ts');
const { pilot } = await import('../src/engines/orbite/pilot.ts');
const orbite = [];
for (let level = 0; level < 30; level++) {
    const e = new Orbit(level, 28), commands = []; e.special();
    for (let frame = 0; frame < 18000 && e.status === 'playing'; frame++) {
        pilot(e); const target = e.state.target, previous = commands.at(-1);
        if (previous?.[0] === target) previous[1]++; else commands.push([target, 1]);
        e.advance(1000 / 60);
    }
    console.log('Orbite', level + 1, e.status, e.state.score);
    if (e.status !== 'won') throw new Error('Special pilot lost');
    orbite.push({ level, seed: 28, commands, score: e.state.score, ticks: e.state.ticks });
}
writeFileSync('tests/fixtures/characters-campaigns-3.json', JSON.stringify({ empilo: records, orbite }) + '\n');
