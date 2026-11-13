/* global console */
// node --import ./scripts/ts-loader.js scripts/validate-demineur.js
// Démineur: at least 130 progression grids with unique ids and layouts; every one is valid, proven without guessing from its opening (frozen difficulty recomputed),
// and won by the real engine following only its hints; difficulty rises (no grid 5 ranks or more from its place);
// each technique arrives alone; diversity; seven daily challenges proven; classic boards never mined at the first click.
import assert from 'node:assert/strict';
import { Engine, LEVELS } from '../src/engines/demineur/engine.ts';
import { initialState, validateLevel, applyAction } from '../src/engines/demineur/rules.ts';
import { difficulty, proveBoard } from '../src/engines/demineur/solver.ts';
import { classicLevel, dailyLevel } from '../src/engines/demineur/levels.ts';
import { demineurDiversity } from './demineur-diversity.js';
import { readFileSync } from 'node:fs';
/** The received level contract (tests/fixtures/demineur-level.schema.json, copied from the specification folder), checked
 * without a dependency: the JSON Schema keywords it uses (type, required, properties, additionalProperties, enum,
 * minimum, maximum, minLength). Opencade's curated boards carry documented extensions (layout, start; and the title,
 * theme, drawing, difficulty of a progression grid): they are listed, then the contract part is checked strictly. */
const SCHEMA = JSON.parse(readFileSync(new URL('../tests/fixtures/demineur-level.schema.json', import.meta.url), 'utf8'));
const EXTENSIONS = ['layout', 'start', 'name', 'en', 'theme', 'drawing', 'difficulty'];
function schemaErrors(value, schema, path = '') {
    const errors = [], types = { object: v => typeof v === 'object' && v !== null && !Array.isArray(v), string: v => typeof v === 'string', integer: Number.isInteger, boolean: v => typeof v === 'boolean' };
    if (schema.type && !types[schema.type](value)) return [`${path} type`];
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} enum`);
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} maximum`);
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} minLength`);
    if (schema.type === 'object') {
        for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path}.${k} requis`);
        for (const [k, v] of Object.entries(value)) {
            if (schema.properties?.[k]) errors.push(...schemaErrors(v, schema.properties[k], `${path}.${k}`));
            else if (schema.additionalProperties === false) errors.push(`${path}.${k} en trop`);
        }
    }
    return errors;
}
const contract = level => Object.fromEntries(Object.entries(level).filter(([k]) => !EXTENSIONS.includes(k)));
// The check bites: a board 101 wide, a missing generation, an unknown mode, an extra field are all refused.
for (const broken of [{ width: 101 }, { generation: undefined }, { mode: 'facile' }, { extra: 1 }]) {
    const level = { ...contract(LEVELS[0]), ...broken };
    if (broken.generation === undefined && 'generation' in broken) delete level.generation;
    assert.notDeepEqual(schemaErrors(level, SCHEMA), [], `contre-épreuve schéma ${JSON.stringify(broken)}`);
}
console.log('| Grille | Taille | Mines | Dessin | Ouverture | Simple | Paire | Énumération | Compte | Difficulté | Indices |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const scores = [];
for (const [i, level] of LEVELS.entries()) {
    assert.deepEqual(validateLevel(level), [], `grille ${i + 1}`);
    assert.deepEqual(schemaErrors(contract(level), SCHEMA), [], `schéma ${i + 1}`);
    assert.deepEqual(Object.keys(level).filter(k => !(k in SCHEMA.properties)).sort(), [...EXTENSIONS].sort(), `extensions ${i + 1}`);
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
assert(LEVELS.length >= 130, `grilles ${LEVELS.length}`);
assert.equal(new Set(LEVELS.map(l => l.id)).size, LEVELS.length, 'ids uniques');
assert.equal(new Set(LEVELS.map(l => l.layout.join('/'))).size, LEVELS.length, 'dispositions uniques');
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
console.log(`${LEVELS.length} grilles conformes au schéma (ids et dispositions uniques) · écart de rang max ${worst} · diversité ${report.score} (clones ${report.cloneShare}, écart sans nouveauté ${report.maxGapWithoutNovelty}, nouveautés ${report.noveltyLevels.join(' ')}) · 7 défis prouvés · 900 premiers clics classiques sûrs`);
