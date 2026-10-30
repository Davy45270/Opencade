/* global console, process, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';
import { mutationModule } from './mutation-module.js';
const { Engine } = await import('../src/engines/briqueterie/engine.ts');
const { mechanicCases } = await import('../tests/briqueterie-mechanics.ts');
const { replay } = await import('../tests/briqueterie-replay.ts');
const { statistics } = await import('./briqueterie-statistics.js');
import { attempt } from './briqueterie-pilot.js';
import { briqueterieDiversity } from './briqueterie-diversity.js';
for (const run of Object.values(mechanicCases)) run();
statistics();
const checksOnly = process.argv.includes('--checks-only') && !process.argv.includes('--record');
const recorded = checksOnly ? (await import('../tests/briqueterie-solutions.ts')).solutions : null;
const records = recorded ?? [];
if (!checksOnly) for (const seed of [28, 455]) for (let level = 0; level < 30; level++) {
    let record;
    for (let variant = 0; variant < 8; variant++) { record = attempt(Engine, level, seed, variant); if (record.status === 'won') break; }
    assert.equal(record.status, 'won', `${level + 1}/${seed}`); records.push(record);
}
if (process.argv.includes('--record')) writeFileSync('tests/briqueterie-solutions.ts', `// Ordinary-input recordings. Regenerate: nice -n 19 ionice -c3 node scripts/validate-briqueterie.js --record\nimport type { Recording } from './briqueterie-replay';\nexport const solutions: Recording[] = [\n${records.map(r => JSON.stringify(r)).join(',\n')}\n];\n`);
const solutions = recorded ?? (await import('../tests/briqueterie-solutions.ts')).solutions;
assert.equal(solutions.length, 60);
assert.deepEqual(solutions.map(r => [r.level, r.seed]), [28, 455].flatMap(seed => Array.from({ length: 30 }, (_, level) => [level + 1, seed])));
const start = performance.now();
for (let i = 0; i < records.length; i++) {
    if (!checksOnly) assert.deepEqual(solutions[i], records[i], 'recordings match fresh pilot');
    replay(solutions[i]);
}
const replayMs = performance.now() - start;
const diversity = briqueterieDiversity(Engine, solutions, replay);
function verifyDiversity(result) {
    assert.ok(result.noveltyCount >= 7, 'seven observed introductions');
    assert.ok(result.cloneShare < 0.25, 'clone share');
    let last = 1;
    for (const n of result.noveltyLevels.filter(n => n <= 25)) { assert.ok(n - last <= 5, 'introduction cadence'); last = n; }
    assert.ok(25 - last <= 5, 'cadence through 25');
    assert.ok(result.levels.every(r => r.curve.status === 'won'));
}
verifyDiversity(diversity);
const mutations = [];
for (const [name, id, before, after] of [
    ['explosion sans voisinage', 'K-MEC-02', 'this.damage(neighbor);', 'void neighbor;'],
    ['portail sans téléportation', 'K-MEC-04', 'ball.x = partner.x + partner.w / 2;', 'ball.x = ball.x;'],
    ['angle ignoré', 'K-MEC-06', "hit.brick?.kind === 'angle'", 'false'],
    ['repousse désactivée', 'K-MEC-03', 'brick.hp = 2; delete brick.healAt;', 'brick.hp = 1; delete brick.healAt;'],
    ['clé sans effet', 'K-MEC-07', "b.solid = false; b.kind = 'plain';", "b.solid = true; b.kind = 'plain';"],
    ['gravité sans plafond', 'K-MEC-11', 'if (length > cap)', 'if (false)'],
    ['portail sans délai', 'K-MEC-12', 'this.ticks >= (ball.portalUntil ?? 0)', 'true'],
    ['dixième balle autorisée', 'K-MEC-13', 'if (s.balls.length < 9)', 'if (s.balls.length < 10)'],
    ['explosion trop large', 'K-MEC-14', 'Math.abs(neighbor.x - brick.x) <= 38', 'Math.abs(neighbor.x - brick.x) <= 60'],
    ['explosion trop haute', 'K-MEC-14', 'Math.abs(neighbor.y - brick.y) <= 32', 'Math.abs(neighbor.y - brick.y) <= 40'],
    ['explosion exclut la borne horizontale', 'K-MEC-14', 'Math.abs(neighbor.x - brick.x) <= 38', 'Math.abs(neighbor.x - brick.x) < 38'],
    ['explosion exclut la borne verticale', 'K-MEC-14', 'Math.abs(neighbor.y - brick.y) <= 32', 'Math.abs(neighbor.y - brick.y) < 32'],
    ['gravité inclut les bords horizontaux', 'K-MEC-15', 'Math.abs(ball.x - b.x - b.w / 2) < 52', 'Math.abs(ball.x - b.x - b.w / 2) <= 52'],
    ['gravité inclut le bord inférieur', 'K-MEC-15', 'ball.y > b.y && ball.y < b.y + 160', 'ball.y > b.y && ball.y <= b.y + 160'],
    ['gravité inclut le bord supérieur', 'K-MEC-15', 'ball.y > b.y && ball.y < b.y + 160', 'ball.y >= b.y && ball.y < b.y + 160'],
    ['angles multi-balle réduits', 'K-MEC-16', '[-0.4, 0.4]', '[-0.3, 0.3]'],
    ['sortie du portail décalée', 'K-MEC-17', 'partner.y + partner.h + RADIUS + 1', 'partner.y + partner.h + RADIUS + 2'],
    ['tous les niveaux égaux au premier', 'K-DIV-01', 'const design = designs[level];', 'const design = designs[0];'],
]) {
    const file = 'src/engines/briqueterie/engine.ts', source = readFileSync(file, 'utf8');
    // The generator occurrence is the last occurrence (difficulty also reads the design).
    const anchor = id === 'K-DIV-01' ? 'difficulty(level);\n    const design = designs[level];' : before;
    const replacement = id === 'K-DIV-01' ? 'difficulty(level);\n    const design = designs[0];' : after;
    const { module } = await mutationModule('../' + file, anchor, replacement);
    let equal;
    if (id === 'K-DIV-01') {
            const equalRecords = Array.from({ length: 30 }, (_, level) => attempt(module.Engine, level, 28));
            equal = briqueterieDiversity(module.Engine, equalRecords, replay);
            assert.equal(equal.cloneShare, 1, 'same generated wall must measure 100% clones');
    }
    let rejected = false, reason;
    try {
        if (equal) verifyDiversity(equal);
        else Object.entries(mechanicCases).find(([key]) => key.startsWith(id))[1](module.Engine);
    } catch (error) { rejected = true; reason = error.message; }
    assert.ok(rejected, name);
    mutations.push({ name, oracle: id, file, line: source.slice(0, source.indexOf(anchor) + (id === 'K-DIV-01' ? 'difficulty(level);\n'.length : 0)).split('\n').length, rejected, reason, ...(equal ? { cloneShare: equal.cloneShare } : {}) });
}
const { cases } = await import('./node-test-assertions.js');
// The full legacy suite is executed with a local assertion adapter, never with the test runner.
const { module: suite } = await mutationModule('../tests/briqueterie.test.ts', "from 'vitest'", "from 'vitest'", { vitest: new URL('./briqueterie-assertions.js', import.meta.url).href, '../scripts/briqueterie-diversity.js': new URL('./briqueterie-diversity.js', import.meta.url).href });
void suite;
const testTimings = [];
for (const [name, run] of cases) { const t = performance.now(); run(); const ms = performance.now() - t; testTimings.push({ name, ms }); }
if (!process.argv.includes('--checks-only')) writeFileSync('docs/briqueterie-validation.json', JSON.stringify({ pass: 63, cpuCount: availableParallelism(), victories: records.length, replayMs, testTimings, diversity: { score: diversity.score, noveltyLevels: diversity.noveltyLevels, cloneShare: diversity.cloneShare }, mutations, campaigns: records.map(r => ({ level: r.level, seed: r.seed, frames: r.frames, lives: r.lives, score: r.score, witnesses: r.witnesses })) }, null, 2) + '\n');
console.log(`K-MEC-01…17, K-DIV-01, K-PILOT: ${records.length} victories; replay ${replayMs.toFixed(1)} ms; score ${diversity.score}; clones ${diversity.cloneShare}; ${mutations.length} mutations rejected`);
