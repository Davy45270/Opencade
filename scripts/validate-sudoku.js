/* global console, performance, process */
// node --import ./scripts/ts-loader.js scripts/validate-sudoku.js [--checks-only]
// The thirty written grids re-proved without Vitest: strict record, unique solution (solver), announced technique,
// solved to the end by the game's own explained hints; diversity; three in-memory mutations must be caught.
import assert from 'node:assert/strict';
import * as levels from '../src/engines/sudoku/levels.ts';
import { GRIDS, levelRecord } from '../src/engines/sudoku/levels.ts';
import { applyAction, createState, hintFor, prepare } from '../src/engines/sudoku/engine.ts';
import { geometry, validateLevel } from '../src/engines/sudoku/grid.ts';
import { rate } from '../src/engines/sudoku/logic.ts';
import { solve } from '../src/engines/sudoku/solver.ts';
import { generate } from '../src/engines/sudoku/generator.ts';
import { sudokuDiversity } from './sudoku-diversity.js';
import { mutationModule } from './mutation-module.js';
const quiet = process.argv.includes('--checks-only');
const log = (...a) => { if (!quiet) console.log(...a); };
log('| Niveau | Titre | Taille | Indices donnés | Technique | Score | Nœuds solveur | Indices joués | ms¹ |');
log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
let previous = [];
for (const [i, grid] of GRIDS.entries()) {
    const start = performance.now(), record = validateLevel(JSON.parse(JSON.stringify(levelRecord(i))));
    const proof = solve(record);
    assert.equal(proof.status, 'solved', `S-LVL-01 ${i + 1}`); assert.equal(proof.solutionCount, 1, `S-LVL-01 unicité ${i + 1}`);
    const r = rate(record, record.givens);
    assert.ok(r.solved, `S-LVL-01 logique ${i + 1}`); assert.equal(r.hardest, grid.technique, `S-LVL-01 technique ${i + 1}`);
    if (i >= 5) assert.ok(r.score >= previous[i - 5], `S-LVL-02 ${i + 1}`);
    previous.push(r.score);
    const p = prepare(record);
    let s = createState(p), hints = 0;
    while (s.status === 'playing') {
        const h = hintFor(p, s.values);
        assert.equal(h?.kind, 'logic', `AC07 ${i + 1}`); assert.equal(h.value, p.solution[h.index], `AC07 valeur ${i + 1}`);
        const out = applyAction(p, s, { type: 'SET_VALUE', index: h.index, value: h.value });
        assert.ok(out.accepted); s = out.state; hints++;
    }
    log(`| ${i + 1} | ${grid.title.fr} / ${grid.title.en} | ${record.size}×${record.size} | ${record.givens.filter(Boolean).length} | ${grid.technique} | ${r.score} | ${proof.nodes} | ${hints} | ${(performance.now() - start).toFixed(1)} |`);
}
log('\n¹ Informatif : aucune assertion ne dépend du temps.');
const diversity = sudokuDiversity({ ...levels, rate });
assert.equal(diversity.cloneShare, 0, 'S-LVL-03 clones'); assert.ok(diversity.score <= 30, `S-LVL-03 score ${diversity.score}`);
log(`\nDiversité : score ${diversity.score} (0 = idéal), nouveautés aux niveaux ${diversity.noveltyLevels.join(', ')}, plus long écart sans nouveauté ${diversity.maxGapWithoutNovelty}, clones ${diversity.cloneShare}.`);
// Mutations: each broken rule must be caught by the same checks as above.
const p0 = prepare(levelRecord(11)), given = p0.givens.findIndex(v => v > 0);
const engine = await mutationModule('../src/engines/sudoku/engine.ts', "if (puzzle.givens[i]) return refuse(state, 'given');", '');
assert.equal(applyAction(p0, createState(p0), { type: 'SET_VALUE', index: given, value: 1 }).accepted, false);
assert.equal(engine.module.applyAction(p0, engine.module.createState(p0), { type: 'SET_VALUE', index: given, value: 1 }).accepted, true, 'mutation AC01 non détectée');
const solver = await mutationModule('../src/engines/sudoku/solver.ts', 'solutionCount: solutions.length >= 2 ? 2 : 1', 'solutionCount: 1');
const empty = { ...geometry(9), givens: Array(81).fill(0) };
assert.equal(solve(empty).solutionCount, 2);
assert.equal(solver.module.solve(empty).solutionCount, 1, 'mutation AC08 non détectée');
// The uniqueness gate replaced by "has a solution": generated grids must then come out ambiguous.
const generator = await mutationModule('../src/engines/sudoku/generator.ts', "import { provedUnique, solve } from './solver';",
    "import { solve } from './solver';\nconst provedUnique = p => { const r = solve(p, { countLimit: 2 }); return r.status === 'solved' ? r.solution : null; };");
const thin = { size: 9, minTier: 1, maxTier: 6, minGivens: 17, difficulty: 'easy' };
assert.equal(solve(generate(thin, 5, 'M', 1).level).solutionCount, 1);
assert.notEqual(solve(generator.module.generate(thin, 5, 'M', 1).level).solutionCount, 1, 'mutation AC09 non détectée');
console.log(`validate-sudoku : 30 grilles prouvées uniques et résolues par indices, diversité ${diversity.score}, 3 mutations rejetées.`);
