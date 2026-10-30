/* global console, performance */
// Pass 404: every crossing is won by the exact space-time BFS (rules of the engine), clock-free.
import { Engine, difficulty, PLANS } from '../src/engines/traverse/engine.ts';
import { solve, solveWithBond } from '../src/engines/traverse/solver.ts';
const layouts = new Set(), divers = new Set();
const fail = message => { throw new Error(message); };
console.log('| Niveau | Règles | Quanta par abri | Positions visitées (max) | ms¹ |');
console.log('| --- | --- | --- | --- | --- |');
for (let level = 0; level < 30; level++) {
    const e = new Engine(level, 28), plan = PLANS[level], start = performance.now(); let visited = 0;
    layouts.add(JSON.stringify(e.board.lanes.map(l => [l.y, l.kind])));
    divers.add(JSON.stringify(e.board.lanes.filter(l => l.diver).map(l => l.y)));
    if ((e.board.rocks?.length ?? 0) !== (plan.rocks ?? 0)) fail(`R16 rochers ${level + 1}`);
    if (Boolean(plan.rescue) !== Boolean(e.board.castaway)) fail(`R17 naufragé ${level + 1}`);
    // Unordered crossings: each shelter is reachable alone from the start.
    if (!e.board.ordered) for (const target of e.board.shelters) {
        const proof = solve(level, 28, target); if (!proof) fail(`R10 niveau ${level + 1} abri ${target}`);
        visited = Math.max(visited, proof.visited);
        const replay = new Engine(level, 28);
        for (const action of proof.path) { if (action !== 'wait') replay.input(action); replay.step(difficulty(level).flowFrames * 1000 / 60); }
        if (!replay.state.occupied.includes(target) || replay.state.lives !== difficulty(level).lives) fail(`Témoin invalide ${level + 1}`);
    }
    const full = new Engine(level, 28), lengths = [];
    for (const target of full.board.shelters) {
        const proof = solve(level, 28, target, full.state.phase, full.state.rescued);
        if (!proof) fail(`Partie complète insoluble ${level + 1}`);
        visited = Math.max(visited, proof.visited); lengths.push(proof.path.length);
        for (const action of proof.path) { if (action !== 'wait') full.input(action); full.step(difficulty(level).flowFrames * 1000 / 60); }
    }
    if (full.status !== 'won' || full.state.lives !== difficulty(level).lives) fail(`Victoire complète invalide ${level + 1}`);
    if (visited > 200000) fail(`Budget de recherche ${level + 1}: ${visited}`);
    const rules = Object.keys(plan).filter(k => k !== 'name' && k !== 'slower').join(', ') || '—';
    console.log(`| ${level + 1} | ${rules} | ${lengths.join(', ')} | ${visited} | ${(performance.now() - start).toFixed(0)} |`);
}
if (layouts.size <= 20 || divers.size <= 10) fail('Diversité insuffisante');
console.log('\n¹ Informatif : aucune assertion ne dépend du temps.');
console.log('\n| Niveau | Quanta premier abri sans/avec bond |');
console.log('| --- | --- |');
for (let level = 0; level < 30; level++) {
    const e = new Engine(level), target = e.board.ordered ? e.board.shelters[0] : e.board.shelters[Math.floor(e.board.shelters.length / 2)];
    const ordinary = solve(level, 28, target), bond = solveWithBond(level, 28, target);
    if (!ordinary || !bond) fail(`Preuve avec bond absente ${level + 1}`);
    for (const action of bond.path) {
        if (action === 'bond') { if (!e.special()) fail('Bond refusé'); }
        else if (action !== 'wait') e.input(action);
        e.advance(difficulty(level).flowFrames * 1000 / 60);
    }
    if (!e.state.occupied.includes(target) || e.state.lives !== difficulty(level).lives || e.specialUses !== 0) fail(`Bond invalide ${level + 1}`);
    console.log(`| ${level + 1} | ${ordinary.path.length}/${Math.min(ordinary.path.length, bond.path.length)} |`);
}
