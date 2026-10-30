/* global console, process, URL, Buffer */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const { Engine } = await import('../src/engines/dedale/engine.ts');
const { mechanicCases } = await import('../tests/dedale-mechanics.ts');
for (const run of Object.values(mechanicCases)) run();
const { route } = await import('../src/engines/dedale/solver.ts');

export function solve(level, seed) {
    const e = new Engine(level, seed), inputs = [], witnesses = {};
    while (e.status === 'playing' && inputs.length < 1500) {
        const leg = route(e);
        assert.ok(leg?.length, `BFS blocked: level ${level + 1}, seed ${seed}`);
        for (const d of leg) {
            if (e.status !== 'playing') break;
            e.input(d); e.step(1000 / 6); inputs.push(d);
            for (const event of e.events) witnesses[event] ??= inputs.length;
        }
    }
    assert.equal(e.status, 'won', `level ${level + 1}, seed ${seed}, moves ${inputs.length}`);
    return { level: level + 1, seed, shape: e.state.journey.shape, inputs, witnesses, lives: e.state.lives };
}
const { index, cell, neighbor, PRIORITY } = await import('../src/engines/dedale/engine.ts');
for (let level = 0; level < 30; level++) for (const seed of [28, 459, 1, 17, 99, 2026]) {
    const e = new Engine(level, seed), seen = new Set([index(e.state.hero)]), queue = [...seen];
    for (let i = 0; i < queue.length; i++) for (const d of PRIORITY) {
        const p = neighbor(e.state.maze, cell(queue[i]), d);
        if (p && !seen.has(index(p))) { seen.add(index(p)); queue.push(index(p)); }
    }
    assert.equal(seen.size, e.state.maze.filter(Boolean).length, `connected ${level + 1}/${seed}`);
}
const records = [];
for (const seed of [28, 459]) for (let level = 0; level < 30; level++) records.push(solve(level, seed));
const start = performance.now();
for (const record of records) {
    const e = new Engine(record.level - 1, record.seed);
    for (const d of record.inputs) { e.input(d); e.step(1000 / 6); }
    assert.equal(e.status, 'won');
}
const replayMs = performance.now() - start;
assert.ok(replayMs < 2000);
if (process.argv.includes('--record')) writeFileSync('tests/dedale-solutions.ts', `// BFS recordings; regenerate with the Node validator --record.\nimport type { Direction } from '../src/engines/dedale/engine';\nexport const solutions: { level: number; seed: number; shape: string; inputs: Direction[]; witnesses: Record<string, number>; lives: number }[] = ${JSON.stringify(records.filter(r => r.seed === 28), null, 2)};\n`);
writeFileSync('dedale-validation.json', JSON.stringify({ replayMs, records }, null, 2) + '\n');
console.log(`D-SOLVE: ${records.length} victories; replay ${replayMs.toFixed(1)} ms`);
console.log(records.filter(r => r.seed === 28).map(r => `${r.level} ${r.shape} ${r.inputs.length} moves ${r.lives} lives: ${Object.keys(r.witnesses).join(', ')}`).join('\n'));
const { campaignCases } = await import('../tests/dedale-campaign.ts');
for (const [id, run] of Object.entries(campaignCases)) {
    const start = performance.now(); run(); assert.ok(performance.now() - start < 2000, id + ' under 2 s');
}
const { dedaleDiversity } = await import('./dedale-diversity.js');
const diversity = dedaleDiversity(Engine, records.filter(r => r.seed === 28));
function verifyDiversity(result) {
    assert.ok(result.cloneShare < 0.25, 'clone share');
    const baseline = new Set(result.levels[0].elements);
    assert.ok(new Set(result.levels.flatMap(r => r.elements).filter(v => !baseline.has(v))).size >= 7, 'seven observed discoveries');
    let last = 1;
    for (const level of result.noveltyLevels.filter(n => n <= 25)) { assert.ok(level - last <= 5, 'discovery gap'); last = level; }
    assert.ok(25 - last <= 5);
    assert.ok(result.levels.every(r => r.curve.status === 'won'), 'complete real attempts');
}
verifyDiversity(diversity);
const ts = (await import('typescript')).default;
const mutations = [];
async function mutated(file, before, after) {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.split(before).length, 2, `unique mutation: ${before}`);
    const line = source.slice(0, source.indexOf(before)).split('\n').length;
    const replaced = source.replace(before, after).replace(/from '(\.\.?\/[^']+)'/g, (_, path) => `from '${new URL(path + '.ts', new URL('../' + file, import.meta.url)).href}'`);
    const code = ts.transpile(replaced, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    return { mod, line };
}
for (const [name, id, before, after] of [
    ['porte sans clé', 'D-MEC-01', 'if (door && !(next.held & (1 << door.color))) return false;', 'if (door && false) return false;'],
    ['sens unique inversé', 'D-MEC-02', 'if (j.arrows.some(a => (a.at === dest || a.at === pos) && a.direction !== d)) return false;', 'if (false) return false;'],
    ['portail inerte', 'D-MEC-03', 'if (pair) {', 'if (false && pair) {'],
    ['interrupteur inerte', 'D-MEC-04', 'next.toggled = 1 - next.toggled;', 'next.toggled = next.toggled;'],
    ['glace sans glisse', 'D-MEC-06', 'if (j.ice.includes(next.pos)) while (allowed(next.pos, direction))', 'if (false) while (false)'],
]) {
    const file = 'src/engines/dedale/labyrinth.ts', { mod, line } = await mutated(file, before, after);
    const run = Object.entries(mechanicCases).find(([key]) => key.startsWith(id))[1];
    assert.throws(() => run(mod.walk), undefined, name);
    mutations.push({ name, file, line, rejectedBy: id });
}
{
    const file = 'src/engines/dedale/engine.ts', { mod, line } = await mutated(file, 'createLabyrinth(level, seed);', 'createLabyrinth(0, seed);');
    assert.throws(() => verifyDiversity(dedaleDiversity(mod.Engine, records.filter(r => r.seed === 28))));
    mutations.push({ name: 'tous les niveaux égaux au premier', file, line, rejectedBy: 'D-DIV-01' });
}
writeFileSync('dedale-validation.json', JSON.stringify({ replayMs, score: diversity.score, noveltyLevels: diversity.noveltyLevels, cloneShare: diversity.cloneShare, mutations, records }, null, 2) + '\n');
console.log(`D-DIV-01: ${diversity.score}/100, ${diversity.cloneShare * 100}% clones; ${mutations.length} mutations rejected`);
