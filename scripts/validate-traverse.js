/* global console, performance */
import { Engine, difficulty } from '../src/engines/traverse/engine.ts';
import { solve } from '../src/engines/traverse/solver.ts';
const layouts = new Set(), divers = new Set();
console.log('| Niveau | Quanta min. (abri médian) | Pas immobiles du témoin | Max ms / abri |');
console.log('| --- | --- | --- | --- |');
for (let level = 0; level < 30; level++) {
    const e = new Engine(level, 28); let maxMs = 0; let central;
    layouts.add(JSON.stringify(e.board.lanes.map(l => [l.y, l.kind])));
    divers.add(JSON.stringify(e.board.lanes.filter(l => l.diver).map(l => l.y)));
    for (const target of e.board.shelters) {
        const start = performance.now(), proof = solve(level, 28, target);
        const elapsed = performance.now() - start; maxMs = Math.max(maxMs, elapsed);
        if (!proof || elapsed >= 1000) throw new Error(`R10 niveau ${String(level + 1)}`);
        const replay = new Engine(level, 28);
        for (const action of proof.path) { if (action !== 'wait') replay.input(action); replay.step(difficulty(level).flowFrames * 1000 / 60); }
        if (!replay.state.occupied.includes(target) || replay.state.lives !== 3) throw new Error('Témoin invalide');
        if (target === e.board.shelters[Math.floor(e.board.shelters.length / 2)]) central = proof;
    }
    const full = new Engine(level, 28);
    for (const target of full.board.shelters) {
        const proof = solve(level, 28, target, full.state.phase);
        if (!proof) throw new Error('Partie complète insoluble');
        for (const action of proof.path) { if (action !== 'wait') full.input(action); full.step(difficulty(level).flowFrames * 1000 / 60); }
    }
    if (full.status !== 'won' || full.state.lives !== 3) throw new Error('Victoire complète invalide');
    const expected = [[16,0],[18,1],[20,2],[22,3],[24,4],[26,5]][Math.floor(level / 5)];
    if (central.path.length !== expected[0] || central.waits !== expected[1]) throw new Error('Progression R10 invalide');
    console.log(`| ${String(level + 1)} | ${String(central.path.length)} | ${String(central.waits)} | ${maxMs.toFixed(1)} |`);
}

if (layouts.size <= 20 || divers.size <= 10) throw new Error('Diversité insuffisante');
