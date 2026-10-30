/* global console */
// Offline recording, never invoked by fast tests; only ordinary public input APIs.
import './ts-loader.js';
import { writeFileSync } from 'node:fs';
import { controller } from './briqueterie-pilot.js';
const { Engine: Runner } = await import('../src/engines/ferraille/engine.ts');
const { Engine: Bricks } = await import('../src/engines/briqueterie/engine.ts');
const { Engine: Fleet } = await import('../src/engines/essaim/engine.ts');
const { pilot: run } = await import('../src/engines/ferraille/pilot.ts');
const { pilot: fly } = await import('../src/engines/essaim/pilot.ts');
const records = {};
for (const game of ['ferraille', 'briqueterie', 'essaim']) {
    records[game] = [];
    for (let level = 0; level < 30; level++) for (const special of [false, true]) {
        let record;
        for (let variant = 0; variant < (game === 'briqueterie' ? 8 : 1); variant++) {
            const e = game === 'ferraille' ? new Runner() : game === 'briqueterie' ? new Bricks() : new Fleet();
            e.loadLevel(level, 28);
            const commands = []; let used = false, frames = 0;
            for (; frames < 36000 && e.status === 'playing'; frames++) {
                let trigger, input;
                if (game === 'ferraille') {
                    run(e); input = { ...e.state.input };
                    trigger = special && !used && (frames === 600 || e.state.enemies.some(enemy => Math.abs(enemy.x - e.state.hero.x) < 65));
                } else if (game === 'briqueterie') {
                    input = Math.round(controller(e, frames, variant) * 100) / 100; e.move(input); e.launch(); trigger = special && !used;
                } else { fly(e, frames); input = [e.state.target, e.state.firing]; trigger = special && !used && e.state.shots.some(p => p.owner === 'enemy' && p.y > 400); }
                if (special && !used && frames === 0 && game !== 'ferraille') trigger = true;
                if (trigger) { used = e.special(); }
                const previous = commands.at(-1);
                if (previous && !trigger && JSON.stringify(previous[1]) === JSON.stringify(input) && !previous[2]) previous[0]++;
                else commands.push([1, input, trigger]);
                e.step(1000 / 60);
            }
            if (e.status === 'won' && (!special || used)) { record = { level, special, frames, commands, score: e.state.score, lives: e.state.lives }; break; }
        }
        if (!record) throw new Error(`Missing ${game}/${level + 1}/${special}`);
        records[game].push(record); console.log(game, level + 1, special, record.score);
    }
}
writeFileSync('tests/fixtures/characters-campaigns-4.json', JSON.stringify(records) + '\n');
