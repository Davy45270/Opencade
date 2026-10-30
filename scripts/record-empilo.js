/* global console */
// Offline calibration of the 30 Empilo strata (pass 402): an ordinary placement
// policy, with and without the reserve, must win on one seed per stratum.
import './ts-loader.js';
import { writeFileSync } from 'node:fs';
const { Engine, STRATA } = await import('../src/engines/empilo/engine.ts');
const { empiloPlacement } = await import('../tests/e2e/character-policy-3.ts');
const records = [];
for (let level = 0; level < 30; level++) {
    for (let seed = 28; seed < 128; seed++) {
        const modes = [];
        for (const special of [false, true]) {
            const e = new Engine(level, seed), inputs = [];
            if (special) { e.special(); inputs.push('special'); }
            for (let piece = 0; piece < 400 && e.status === 'playing'; piece++) {
                // Timed strata: a human pace, 1.5 s of real gravity before acting on each piece.
                if (STRATA[level].timeMs) { e.step(1500); inputs.push('wait'); if (e.status !== 'playing') break; }
                const p = empiloPlacement(e.state, STRATA[level].conveyors); if (!p) break;
                for (let i = 0; i < p.rotations; i++) { e.input('clockwise'); inputs.push('clockwise'); }
                while (e.state.active.x !== p.x) { const action = e.state.active.x < p.x ? 'right' : 'left'; if (!e.input(action)) break; inputs.push(action); }
                e.input('drop'); inputs.push('drop');
            }
            if (e.status !== 'won') break;
            modes.push({ inputs, score: e.state.score, lines: e.state.lines, gems: e.state.gems, pieces: inputs.filter(a => a === 'drop').length, timeLeft: e.state.timeLeft });
        }
        if (modes.length === 2) { records.push({ level, seed, modes }); console.log('Empilo', level + 1, seed, modes.map(r => `${r.pieces} pièces`)); break; }
    }
    if (records.length !== level + 1) throw new Error(`No witness for ${level + 1}`);
}
writeFileSync('tests/fixtures/empilo-campaign.json', JSON.stringify({ empilo: records }) + '\n');
