/* global console, URL */
import assert from 'node:assert/strict';
import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Engine, FIXED, LEVELS } from '../src/engines/petits-pompiers/engine.ts';
import { Pilot, MAX_PILOT_SECONDS } from '../src/engines/petits-pompiers/pilot.ts';
import { ids } from '../src/characters/model.ts';
import { oracles, createOracles } from '../tests/petits-pompiers-oracles.ts';
import { mutationModule } from './mutation-module.js';
for (const [id, run] of oracles) { try { run(); } catch (error) { console.error(id); throw error; } console.log(id); }
const record = process.argv.includes('--record') || process.env.PP_RECORD === '1';
const fixture = new URL('../tests/fixtures/petits-pompiers-inputs.json', import.meta.url);
const recordings = record ? [] : JSON.parse(readFileSync(fixture, 'utf8'));
const digest = e => createHash('sha256').update(JSON.stringify(e.snapshot())).digest('hex');
const campaign = [];
for (let level = 0; level < LEVELS.length; level++) for (const character of ids) for (const mode of ['detente', 'defi']) {
    const e = new Engine(character); e.loadLevel(level, 28, mode);
    let row, cursor = 0, last = '', spreads = 0;
    if (record) {
        const pilot = new Pilot(); row = { level, character, mode, seed: 28, inputs: [] };
        while (e.status === 'playing' && e.time < MAX_PILOT_SECONDS * 1000) {
            const intent = pilot.readAction(e), key = JSON.stringify(intent);
            if (key !== last) { row.inputs.push([e.ticks, intent.dx, intent.dy, Number(intent.action), Number(intent.tool)]); last = key; }
            e.input(intent); e.step(FIXED); spreads += e.events.filter(ev => ev.type === 'spread').length;
        }
        row.ticks = e.ticks; row.digest = digest(e); recordings.push(row);
    } else {
        row = recordings.find(r => r.level === level && r.character === character && r.mode === mode);
        assert.ok(row, `Bande absente ${level}/${character}/${mode}`); assert.equal(row.seed, 28);
        while (e.status === 'playing' && e.ticks < row.ticks) {
            const entry = row.inputs[cursor];
            if (entry && entry[0] === e.ticks) { e.input({ dx: entry[1], dy: entry[2], action: Boolean(entry[3]), tool: Boolean(entry[4]) }); cursor++; }
            e.step(FIXED); spreads += e.events.filter(ev => ev.type === 'spread').length;
        }
        assert.equal(cursor, row.inputs.length, 'Bande entièrement consommée'); assert.equal(e.ticks, row.ticks); assert.equal(digest(e), row.digest, 'Empreinte finale');
    }
    assert.equal(e.status, 'won', `${level + 1}/${character}/${mode} ${e.time} ms: ${JSON.stringify(e.nextObjective())} joueur ${e.at} job ${JSON.stringify(e.job)} fires ${JSON.stringify(e.fires)} water ${e.player.water}`);
    if (level === 0 && mode === 'detente') assert.ok(e.time < 90000);
    campaign.push({ level: level + 1, character, mode, seconds: Number((e.time / 1000).toFixed(2)), ticks: e.ticks, spreads, outcome: createHash('sha256').update(JSON.stringify({ ticks: e.ticks, burned: e.burned, tiles: e.tiles, heartsLost: e.heartsLost, progress: e.progress, water: e.player.water })).digest('hex') });
    console.log(`Victoire ${level + 1} ${character} ${mode}: ${(e.time / 1000).toFixed(2)} s`);
}
assert.equal(recordings.length, 150);
// Introductions can be shorter; the final combined rescue must cost more play time.
for (const character of ids) for (const mode of ['detente', 'defi']) {
    const first = campaign.find(r => r.level === 1 && r.character === character && r.mode === mode);
    const final = campaign.find(r => r.level === 15 && r.character === character && r.mode === mode);
    assert.ok(final.seconds > first.seconds * 2, `Progression ${character}/${mode}`);
}
const average = rows => rows.reduce((sum, row) => sum + row.seconds, 0) / rows.length;
assert.ok(average(campaign.filter(r => r.level >= 11)) > average(campaign.filter(r => r.level <= 5)) * 1.5, 'Progression des cinq derniers niveaux');
// Hamming compares all 126 cells, including decor and structures, without alignment.
const pairs = LEVELS.flatMap((a, i) => LEVELS.slice(0, i).map((b, j) => ({ a: j + 1, b: i + 1, distance: [...a.map.join('')].filter((c, at) => c !== b.map.join('')[at]).length / 126 }))).sort((a, b) => a.distance - b.distance);
const calibration = LEVELS.map((level, i) => {
    const longest = Math.max(...campaign.filter(row => row.level === i + 1 && row.mode === 'defi').map(row => row.ticks / 60));
    const expected = Math.max(60, Math.ceil(3 * longest / 10) * 10);
    return { level: i + 1, longest, expected, actual: level.seconds };
});
for (const row of calibration) assert.equal(row.actual, row.expected, `PP-41 délai calibré niveau ${row.level}`);
const differentLevels = LEVELS.map((_, i) => i + 1).filter(level => ids.some(character => {
    const a = campaign.find(r => r.level === level && r.character === character && r.mode === 'detente');
    const b = campaign.find(r => r.level === level && r.character === character && r.mode === 'defi');
    return a.outcome !== b.outcome || a.spreads !== b.spreads;
}));
assert.ok(differentLevels.length >= 10, 'PP-42 au moins dix niveaux diffèrent entre modes');
const enginePath = '../src/engines/petits-pompiers/engine.ts', levelsPath = '../src/engines/petits-pompiers/levels.ts';
const mutations = [
    [levelsPath, 'validation des paramètres supprimée', "errors.push('parameters')", 'void 0', 'PP-32'],
    [levelsPath, 'objectifs impossibles acceptés', 'errors.push(`objective ${kind}`)', 'void 0', 'PP-33'],
    [levelsPath, 'trousse manquante acceptée', "if (c === 'I' && !tools.has('kit'))", 'if (false)', 'PP-34'],
    [levelsPath, 'mégaphone manquant accepté', "if (c === '?' && !tools.has('megaphone'))", 'if (false)', 'PP-34'],
    [levelsPath, 'unicité des services supprimée', 'errors.push(`unique ${c}`)', 'void 0', 'PP-33'],
    [levelsPath, 'pied de fenêtre inaccessible accepté', "!seen.has(at + WIDTH) || !'g.s'.includes(cells[at + WIDTH] ?? 'W')", 'false', 'PP-34'],
    [enginePath, 'jet traversant les obstacles', 'if (this.solid(at) && n > 0) break;', '', 'PP-35'],
    [enginePath, 'planches et portes ininflammables', "'gHXbBT'.includes", "'gHXT'.includes", 'PP-35'],
    [enginePath, 'accès diagonal à travers angle', 'return distance(this.at, at) <= 1;', 'const p = tileCenter(at); return Math.hypot(p.x - this.player.x, p.y - this.player.y) <= TILE * 1.22;', 'PP-31'],
    [levelsPath, 'cartes clonées', "novelty: novelties[i] ?? '', map,", "novelty: novelties[i] ?? '', map: maps[0],", 'PP-36'],
    [enginePath, 'croissance défi supprimée', "if (this.mode === 'defi') {", 'if (false) {', 'PP-38'],
    [enginePath, 'collision mur', "'W~TXbB#U'.includes", "'~TXbB#U'.includes", 'PP-03'],
    [enginePath, 'coût intensité', 'f.units += units;', 'f.units += units * 2;', 'PP-07'],
    [enginePath, 'plafond détente', 'this.initialFires + RELAXED_MARGIN', 'this.initialFires + 10000', 'PP-06'],
    [enginePath, 'échelle obligatoire', "upper && this.has('ladder')", 'upper', 'PP-15'],
    [enginePath, 'blessure avant évacuation', '!v.injured && this.near(v.at)', 'this.near(v.at)', 'PP-13'],
    [enginePath, 'fumée sans dégât détente', "this.mode === 'defi' && this.smoky(this.at)", 'this.smoky(this.at)', 'PP-19'],
];
const mutationResults = [];
for (const [path, name, before, after, id] of mutations) {
    const { module } = await mutationModule(path, before, after);
    const suite = path === levelsPath ? createOracles(Engine, module.validateLevel, module.LEVELS) : createOracles(module.Engine);
    const run = suite.find(([label]) => label.startsWith(id))?.[1]; assert.ok(run, id);
    assert.throws(run, undefined, `Mutation survivante : ${name}`);
    mutationResults.push({ name, id, killed: true }); console.log(`Mutation tuée ${name} ${id}`);
}
if (record) {
    writeFileSync(fixture, JSON.stringify(recordings) + '\n');
    writeFileSync(new URL('../docs/petits-pompiers-validation.json', import.meta.url), JSON.stringify({ oracles: oracles.length, campaignOracles: ['PP-41', 'PP-42'], victories: campaign.length, mutations: mutationResults, diversity: { metric: 'Hamming / 126', closest: pairs[0], pairs }, calibration, differentLevels, campaign }, null, 2) + '\n');
}
console.log(`Petits Pompiers : ${oracles.length} oracles + PP-41/42, 150 victoires, ${mutations.length} mutations tuées.`);
