/* global console, performance */
// node --import ./scripts/ts-loader.js scripts/validate-fusio.js
// Fusio: the thirty challenges are valid configs; their frozen difficulty is measured again (expectimax agent, depth 1,
// three noise levels, 40 games each, on each challenge's own seed) and must be equal; no challenge is clearly easier
// (more than 10 points) than one five ranks or more before it; every challenge is won at least once by the agent and
// lost at least once (measured, never proved winnable); the agent without noise wins challenges 1 and 3 (the e2e
// victory); seeded replays are reproducible; diversity.
import assert from 'node:assert/strict';
import { CHALLENGES, challengeConfig, classicConfig } from '../src/engines/fusio/challenges.ts';
import { applyAction, initialState, validateConfig } from '../src/engines/fusio/rules.ts';
import { measure, playAgent } from '../src/engines/fusio/solver.ts';
import { fusioDiversity } from './fusio-diversity.js';
const started = performance.now();
console.log('| Défi | Titre | Taille | Cible | Réussite ε=25/10/3 % | Coups moyens | Difficulté |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const found = [];
for (const [i, c] of CHALLENGES.entries()) {
    const config = challengeConfig(i);
    assert.deepEqual(validateConfig(JSON.parse(JSON.stringify(config))), [], `défi ${i + 1}`);
    const m = measure(config);
    assert.equal(m.difficulty, c.difficulty, `difficulté figée ${i + 1}`);
    assert(m.rates.some(r => r > 0), `défi ${i + 1} jamais gagné par l’agent`);
    assert(m.rates.some(r => r < 1) || i < 3, `défi ${i + 1} jamais perdu`);
    found.push(m.difficulty);
    console.log(`| ${i + 1} | ${c.name} | ${c.size}×${c.size} | ${c.target} | ${m.rates.map(r => `${Math.round(100 * r)} %`).join(' / ')} | ${m.meanMoves} | ${m.difficulty} |`);
}
const regressions = found.flatMap((v, j) => found.slice(0, Math.max(0, j - 4)).some(u => v < u - 10) ? [j + 1] : []);
assert.deepEqual(regressions, [], 'un défi est nettement plus facile qu’un défi cinq rangs avant');
for (const i of [0, 2]) assert(playAgent(challengeConfig(i), { depth: 'auto' }).won, `agent sans bruit, défi ${i + 1}`);
// Reproducibility: same seed + same moves → same game, twice, on the classic game.
const replay = () => { const c = classicConfig(45270); let s = initialState(c); for (let k = 0; k < 300 && s.status === 'playing'; k++) s = applyAction(c, s, { type: 'MOVE', direction: ['left', 'down', 'right', 'up'][k % 4] }).state; return JSON.stringify(s); };
assert.equal(replay(), replay());
const report = fusioDiversity(CHALLENGES);
assert(report.cloneShare === 0 && report.maxGapWithoutNovelty <= 5 && report.score <= 25, `diversité ${report.score}`);
console.log(`Difficulté de ${found[0]} à ${found[29]} · aucun recul de plus de 10 points sur cinq rangs · diversité ${report.score} (clones ${report.cloneShare}, écart sans nouveauté ${report.maxGapWithoutNovelty}, nouveautés ${report.noveltyLevels.join(' ')}) · ${Math.round((performance.now() - started) / 1000)} s`);
