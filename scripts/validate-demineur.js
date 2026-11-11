/* global console */
// node --import ./scripts/ts-loader.js scripts/validate-demineur.js
// Démineur: every progression grid is valid, proven without guessing from its opening (frozen difficulty recomputed),
// and won by the real engine following only its hints; difficulty rises (no grid 5 ranks or more from its place);
// each technique arrives alone; diversity; seven daily challenges proven; classic boards never mined at the first click.
import assert from 'node:assert/strict';
import { Engine, LEVELS } from '../src/engines/demineur/engine.ts';
import { initialState, validateLevel, applyAction } from '../src/engines/demineur/rules.ts';
import { difficulty, proveBoard } from '../src/engines/demineur/solver.ts';
import { classicLevel, dailyLevel } from '../src/engines/demineur/levels.ts';
import { demineurDiversity } from './demineur-diversity.js';
console.log('| Grille | Taille | Mines | Dessin | Ouverture | Simple | Paire | Énumération | Compte | Difficulté | Indices |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const scores = [];
for (const [i, level] of LEVELS.entries()) {
    assert.deepEqual(validateLevel(level), [], `grille ${i + 1}`);
    const proof = proveBoard(level), score = difficulty(proof, level.width * level.height);
    assert.equal(proof.status, 'solvable', `sans devinette ${i + 1}`);
    assert.equal(score, level.difficulty, `difficulté figée ${i + 1}`);
    scores.push(score);
    // The real engine, guided by its own hints only, wins without a single refused touch.
    const e = new Engine(); e.loadLevel(i);
    let hints = 0;
    while (e.status === 'playing' && hints < 2000) {
        const h = e.hint(); hints++;
        assert.notEqual(h.status, 'unknown', `indice ${i + 1}`);
        if (h.status === 'safe_move') assert(e.press(h.x, h.y, 'dig'), `creuser ${i + 1}`);
        else for (const c of h.cells) if (e.state.cells[c].mark !== 'flag') assert(e.press(c % e.width, Math.floor(c / e.width), 'flag'));
    }
    assert.equal(e.status, 'won', `victoire ${i + 1}`);
    const r = proof.rounds, opened = initialState(level).revealedSafeCount;
    console.log(`| ${i + 1} ${level.name} | ${level.width}×${level.height} | ${level.mineCount} | ${level.drawing ?? '—'} | ${opened} | ${r.simple} | ${r.pair} | ${r.enumeration} | ${r.count} | ${score} | ${hints} |`);
}
const ranks = scores.map(v => scores.filter(u => u < v).length), worst = Math.max(...ranks.map((r, i) => Math.abs(r - i)));
assert(worst < 5, `écart de rang ${worst}`);
const first = k => LEVELS.findIndex(l => proveBoard(l).rounds[k] > 0) + 1;
assert.deepEqual([first('pair'), first('enumeration'), first('count')], [3, 14, 19]);
const report = demineurDiversity(LEVELS);
assert(report.cloneShare === 0 && report.maxGapWithoutNovelty <= 5 && report.score <= 25, `diversité ${report.score}`);
for (let d = 0; d < 7; d++) assert.equal(proveBoard(dailyLevel(20261111 + d)).status, 'solvable', `défi ${d}`);
let mined = 0;
for (const kind of ['beginner', 'intermediate', 'expert']) for (let seed = 0; seed < 300; seed++) {
    const level = classicLevel(kind, seed), x = seed % level.width, y = (seed * 7) % level.height;
    if (applyAction(level, initialState(level), { type: 'REVEAL', x, y }).state.status === 'lost') mined++;
}
assert.equal(mined, 0);
console.log(`Écart de rang max ${worst} · diversité ${report.score} (clones ${report.cloneShare}, écart sans nouveauté ${report.maxGapWithoutNovelty}, nouveautés ${report.noveltyLevels.join(' ')}) · 7 défis prouvés · 900 premiers clics classiques sûrs`);
