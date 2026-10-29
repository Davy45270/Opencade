/* global console, performance */
// node --import ./scripts/ts-loader.js scripts/validate-caisses.js
import assert from 'node:assert/strict';
import { Engine, LEVELS, parse } from '../src/engines/caisses/engine.ts';
import { solve } from '../src/engines/caisses/solver.ts';
import { solutionMetrics } from '../src/engines/caisses/metrics.ts';
const efforts = [];
console.log('| Niveau | Caisses | Pas min. | Poussées min. | visited | Durée ms¹ | Virages | Détours |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [i, level] of LEVELS.entries()) {
    const board = parse(level.text), start = performance.now();
    const solution = solve(board), steps = solve(board, 'steps');
    const duration = performance.now() - start;
    assert(solution && steps, `C08 niveau ${i + 1}`);
    assert.equal(solution.pushes, level.minimumPushes, `C09 poussées ${i + 1}`);
    assert.equal(steps.inputs.length, level.minimumSteps, `C09 pas ${i + 1}`);
    assert(duration < 1000, `Budget ${i + 1}: ${duration} ms`);
    assert(board.width <= 10 && board.height <= 10);
    for (const witness of [solution, steps]) {
        const e = new Engine(); e.loadLevel(i);
        for (const d of witness.inputs) e.input(d);
        assert.equal(e.status, 'won');
    }
    const m = solutionMetrics(board, solution.inputs);
    if (i >= 3) assert(m.turns > 0 && m.detours > 0, `C10b ${i + 1}`);
    if (i > 0) {
        assert(board.boxes.length >= parse(LEVELS[i - 1].text).boxes.length);
        assert(level.minimumPushes >= LEVELS[i - 1].minimumPushes);
    }
    efforts.push(solution.visited);
    console.log(`| ${i + 1} | ${board.boxes.length} | ${steps.inputs.length} | ${solution.pushes} | ${solution.visited} | ${duration.toFixed(1)} | ${m.turns} | ${m.detours} |`);
}
const means = Array.from({ length: 6 }, (_, i) => efforts.slice(i * 5, i * 5 + 5).reduce((a, b) => a + b, 0) / 5);
for (let i = 1; i < means.length; i++) assert(means[i] >= means[i - 1], 'C10c');
console.log(`\nMoyennes visited : ${means.join(' → ')}.\n¹ Deux recherches exactes (poussées puis pas), hors chargement TS.`);
