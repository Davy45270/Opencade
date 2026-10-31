/* global console, structuredClone */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
import { encounters } from './alunir-encounters.js';
import { measureAlunir } from './alunir-diversity.js';
const { Engine, pilot, STEP, LEVELS } = await import('../src/engines/alunir/engine.ts');
const { migrationChecks, hudChecks, fingerChecks } = await import('../tests/alunir-regression-checks.ts');
const sceneSource = readFileSync('src/games/alunir/scene.ts', 'utf8');
hudChecks(sceneSource); fingerChecks();
const observedRows = [];
const { mechanicChecks, routeChecks, prerequisiteChecks } = await import('../tests/alunir-levels-checks.ts');
mechanicChecks(); routeChecks(); prerequisiteChecks();
await import('./validate-alunir-scene.js');
await import('./validate-alunir-107.js');
// A-niv-02: 180 exact recorded flights, including complete service stops/takeoffs.
const recordings = JSON.parse(readFileSync('tests/fixtures/alunir-campaigns.json', 'utf8'));
assert.equal(recordings.length, 180);
for (const proof of recordings) {
    const observed = new Set();
    const e = new Engine(); e.loadLevel(proof.level, proof.seed); if (proof.special) assert(e.special());
    for (const [bits, count] of proof.controls) {
        e.input({ thrust: Boolean(bits & 1), left: Boolean(bits & 2), right: Boolean(bits & 4) });
        for (let t = 0; t < count; t++) {
            const c = pilot(e); assert.equal(Number(c.thrust) + 2 * Number(c.left) + 4 * Number(c.right), bits, 'live pilot matches recording'); for (const mechanic of encounters(e)) observed.add(mechanic); e.step(STEP);
        }
    }
    assert.equal(e.status, 'won', `${proof.seed}/${proof.level + 1}/${proof.special}`);
    assert.equal(e.state.score, proof.score); assert.equal(e.state.ticks, proof.ticks); assert.deepEqual(e.events, proof.events);
    assert.equal(e.specialUses, proof.special ? 1 : 2);
    if (proof.seed === 28 && !proof.special) observedRows.push({ name: LEVELS[proof.level].name, star: LEVELS[proof.level].star, mechanics: [...new Set([...observed, ...encounters(e)])], actions: e.events, controls: proof.controls });
}
// A-niv-03: recompute from replays, never trust authored labels alone.
const rows = observedRows;
const diversity = measureAlunir(rows);
for (const row of rows) assert.deepEqual([...row.mechanics].sort(), [...LEVELS[rows.indexOf(row)].mechanics].sort());
const base = Array.from({ length: 10 }, (_, i) => ({ star: String(i), mechanics: [String(i)], actions: [String(i)] }));
assert(measureAlunir(base).valid);
const sixty = structuredClone(base); sixty[0].mechanics = ['a', 'b', 'c', 'd']; sixty[1].mechanics = ['a', 'b', 'c', 'e'];
assert.equal(measureAlunir(sixty).maxSimilarity, 0.6); assert.equal(measureAlunir(sixty).valid, false);
assert.equal(measureAlunir(base.slice(0, 9)).valid, false);
const repeated = structuredClone(base); repeated[2].star = repeated[0].star; assert.deepEqual(measureAlunir(repeated).repeatedStars, [3]); assert.equal(measureAlunir(repeated).valid, false);
const disguised = structuredClone(base); for (const row of disguised) row.controls = [[1, 100]];
assert.equal(measureAlunir(disguised).valid, false); assert.equal(measureAlunir(disguised).maxSimilarity, 1);
const exact = structuredClone(base); exact[0].controls = [[1, 5], [0, 5]]; exact[1].controls = [[1, 5], [2, 5]];
assert.equal(measureAlunir(exact).maxSimilarity, 0.5); assert.equal(measureAlunir(exact).valid, true);
exact[1].controls = [[1, 6], [2, 4]]; exact[0].controls = [[1, 6], [0, 4]];
assert.equal(measureAlunir(exact).maxSimilarity, 0.6); assert.equal(measureAlunir(exact).valid, false);
// A-niv-04: real old state produced by record-alunir-head.js / git show HEAD.
const old = JSON.parse(readFileSync('tests/fixtures/alunir-head.json', 'utf8'));
migrationChecks(old);
const gust = JSON.parse(readFileSync('tests/fixtures/alunir-legacy-gust.json', 'utf8')); migrationChecks(gust);
const restored = new Engine(); restored.loadState(old.saved); restored.step(STEP * 40);
const snapshot = restored.snapshot(); for (const key of Object.keys(old.after)) assert.deepEqual(snapshot[key], old.after[key], `legacy ${key}`);
const copy = new Engine(); copy.loadLevel(restored.level, restored.seed); copy.loadState(snapshot); copy.step(STEP * 5); restored.step(STEP * 5); assert.deepEqual(copy.snapshot(), restored.snapshot());
// Historical U06/U07, extracted without altering their test bodies.
const source = readFileSync('tests/alunir.test.ts', 'utf8');
const { difficulty, generate, windAt, polygon, landingScore, required } = await import('../src/engines/alunir/engine.ts');
const expect = value => ({ toBe: expected => assert.equal(value, expected) });
const prefix = source.slice(source.indexOf('const idle'), source.indexOf("test('U01"));
for (const id of ['U06', 'U07']) {
    const body = source.slice(source.indexOf(`test('${id}`), source.indexOf("\ntest('", source.indexOf(`test('${id}`) + 1));
    new Function('Engine', 'STEP', 'difficulty', 'generate', 'windAt', 'polygon', 'pilot', 'landingScore', 'required', 'expect', 'test', prefix + body.replace('] as const', ']'))(Engine, STEP, difficulty, generate, windAt, polygon, pilot, landingScore, required, expect, (_name, run) => run());
}
const mutations = [
    ['p.x = next;', 'p.x = required(LEVELS[this.level]).x;'],
    ['s.fuel = 1800;', 's.fuel = s.fuel;'],
    ["contact = time; this.status = 'lost';", "contact = time; this.status = 'playing';"],
    ['y <= 440', 'y < 440'],
    ['y <= 380', 'y < 380'],
    ['x <= 230', 'x < 230'],
    ['Math.hypot(s.x - l.beacon[0], s.y - l.beacon[1]) <= 38', 'Math.hypot(s.x - l.beacon[0], s.y - l.beacon[1]) < 38'],
    ['Math.hypot(s.x - l.rescue[0], s.y - l.rescue[1]) <= 28', 'Math.hypot(s.x - l.rescue[0], s.y - l.rescue[1]) < 28'],
    ["|| (this.has('secours') && !this.mission.rescued)) this.status = 'lost';", "|| false) this.status = 'lost';"],
];
for (const [before, after] of mutations) {
    const { module } = await mutationModule('../src/engines/alunir/engine.ts', before, after);
    assert.throws(() => mechanicChecks(module.Engine), undefined, before);
}
const prerequisites = [
    ["(!this.terrain.pads.some(p => p.role === 'service') || this.mission.serviced) &&", 'true &&'],
    ["(!this.has('balise') || this.mission.beacon) && (!this.has('secours') || this.mission.rescued)) {", "true && (!this.has('secours') || this.mission.rescued)) {"],
    ["(!this.has('secours') || this.mission.rescued)) {", 'true) {'],
];
for (const [before, after] of prerequisites) {
    const { module } = await mutationModule('../src/engines/alunir/engine.ts', before, after);
    assert.throws(() => prerequisiteChecks(module.Engine), undefined, before);
}
const gustMutation = await mutationModule('../src/engines/alunir/engine.ts',
    'const t = level / 29, gust = level >= 14 ? 0.001 * (level - 13) / 16 : 0;', 'const t = level / 29, gust = 0;');
assert.throws(() => migrationChecks(gust, gustMutation.module.Engine));
assert.throws(() => hudChecks(sceneSource.replace("s.ticks < 120 ? `\\n${l.idea}` : ''", "''")));
const duplicateModule = await mutationModule('../src/engines/alunir/levels.ts', '\n];', '\n];\n(LEVELS as Level[])[1] = LEVELS[0] as Level;');
assert.equal(measureAlunir(LEVELS.map(l => ({ star: l.star, mechanics: l.mechanics, actions: [] }))).valid, true);
const mutatedCatalogue = duplicateModule.module.LEVELS.map(l => ({ star: l.star, mechanics: l.mechanics, actions: l.mechanics }));
assert.equal(measureAlunir(mutatedCatalogue).valid, false); assert.equal(measureAlunir(mutatedCatalogue).maxSimilarity, 1);
const duplicate = structuredClone(rows); duplicate[1] = structuredClone(duplicate[0]); assert.equal(measureAlunir(duplicate).valid, false);
console.log(`A-niv-01/02/03/04 et U06/U07 : 180 vols, 12 mécaniques, similarité maximale ${diversity.maxSimilarity * 100} %, vingt mutations rejetées.`);

assert(diversity.valid, `Campaign repetition gate: ${JSON.stringify({ maxSimilarity: diversity.maxSimilarity, rejectedPairs: diversity.pairs.filter(p => p.similarity > 0.5).length, pair4and5: diversity.pairs.find(p => p.a === 4 && p.b === 5) })}`);

const { sceneMeasurements } = await import('./validate-briqueterie-scene.js');
await sceneMeasurements('alunir');
