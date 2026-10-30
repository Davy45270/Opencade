/* global console */
import './ts-loader.js';
import { writeFileSync } from 'node:fs';
const records = [];
import { controller } from './briqueterie-pilot.js';
const { Engine: Runner } = await import('../src/engines/ferraille/engine.ts');
const { Engine: Bricks } = await import('../src/engines/briqueterie/engine.ts');
const { Engine: Fleet } = await import('../src/engines/essaim/engine.ts');
const { pilot: run } = await import('../src/engines/ferraille/pilot.ts');
const { pilot: fly } = await import('../src/engines/essaim/pilot.ts');
for (const game of ['ferraille', 'briqueterie', 'essaim']) for (const level of [0, 9]) {
    const E = game === 'ferraille' ? Runner : game === 'briqueterie' ? Bricks : Fleet;
    const e = new E(); e.loadLevel(level, 28); let used = false, seed = 84;
    const commands = [];
    for (let decision = 0; decision < 1000 && e.status === 'playing'; decision++) {
        const model = new E(); model.loadLevel(level, 28); model.loadState(e.state); model.step(150);
        let input;
        if (game === 'ferraille') { run(model); input = { ...model.state.input }; }
        else if (game === 'essaim') { fly(model, model.state.ticks); input = model.state.target ?? e.state.cannon; }
        else { seed = seed * 16807 % 2147483647; input = controller(model, decision * 9, 0) + seed % 25 - 12; }
        e.step(150);
        if (game === 'ferraille') e.input(input);
        else if (game === 'briqueterie') { e.move(input); e.launch(); }
        else { seed = seed * 16807 % 2147483647; e.moveTo(e.state.cannon + Math.max(-43, Math.min(43, input - e.state.cannon)) + seed % 25 - 12); e.holdFire(!e.has('charge') || e.state.ticks % 100 < 90); }
        let trigger = false;
        if ((!used || game === 'essaim' && !e.state.specialUsed) && (game !== 'ferraille' || decision >= 14 || e.state.enemies.some(enemy => Math.abs(enemy.x - e.state.hero.x) < 65))) { trigger = e.special(); used ||= trigger; }
        commands.push({ input: game === 'ferraille' ? { ...e.state.input } : game === 'briqueterie' ? input : [e.state.target, e.state.firing], special: trigger });
    }
    console.log(game, level + 1, e.status, e.state.lives, e.state.score, used);
    if (e.status !== 'won' || !used) throw new Error('Missing latency proof');
    records.push({ game, level, commands, score: e.state.score, lives: e.state.lives });
}
writeFileSync('tests/fixtures/characters-finger-4.json', JSON.stringify(records) + '\n');
