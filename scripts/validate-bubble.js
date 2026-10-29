/* global console, URL, setTimeout, clearTimeout, process, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
const cases = await import('../tests/bubble-cases.ts');
const { levelDiversity } = await import('../tests/bubble-diversity.ts');
const { LEVELS } = await import('../src/engines/bubble/levels.ts');
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const { Engine } = await import('../src/engines/bubble/engine.ts');

// Independent literal oracle; no browser, test runner or emitted repository files.
function geometry(EngineClass) {
    for (const [grid, angle, row, col] of [
        [[{ row: 0, col: 4, color: 0 }], 0, 1, 3],
        [[{ row: 0, col: 4, color: 0 }], -0.05, 1, 3],
        [[{ row: 0, col: 4, color: 0 }], 0.05, 1, 4],
        [[{ row: 0, col: 4, color: 0 }], -0.5, 1, 3],
        [[{ row: 0, col: 4, color: 0 }], 0.5, 1, 4],
        [[{ row: 1, col: 3, color: 0 }, { row: 1, col: 5, color: 0 }], 0.04, 0, 5],
        [[], 0, 0, 4],
        [[{ row: 1, col: 4, color: 0 }], 0.04, 2, 4],
        [[{ row: 2, col: 4, color: 0 }], 0, 3, 3],
    ]) {
        const e = new EngineClass(); e.load(grid); e.aim(angle);
        assert.deepEqual(e.trace().target, { row, col, color: 0 });
        e.shoot(); e.advance(10000);
        assert.deepEqual(e.last.attached, { row, col, color: 0 });
    }
}
function reflection(EngineClass) {
    const e = new EngineClass(); e.load([]);
    for (const angle of [-0.8, 0.8]) {
        const [a, b] = e.trace(angle).segments;
        assert.deepEqual(a.to, b.from);
        assert.ok(Math.abs(Math.atan2(-b.direction.x, -b.direction.y) - angle) < 1e-9);
    }
}
function drop(EngineClass) {
    const e = new EngineClass();
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }, { row: 1, col: 5, color: 1 }, { row: 0, col: 0, color: 2 }, { row: 1, col: 0, color: 2 }]);
    e.shoot(); e.advance(10000);
    assert.equal(e.last.popped.length, 3);
    assert.deepEqual(e.last.fallen, [{ row: 1, col: 5, color: 1 }]);
    assert.deepEqual(e.grid, [{ row: 0, col: 0, color: 2 }, { row: 1, col: 0, color: 2 }]);
    assert.equal(e.score, 50);
}
geometry(Engine); reflection(Engine); drop(Engine);
const source = readFileSync(new URL('../src/engines/bubble/engine.ts', import.meta.url), 'utf8');
for (const [name, before, after, oracle] of [
    ['struck center', 'const contact = struck ?', 'const contact = struck ?? to; const unusedContact = struck ?', geometry],
    ['no drop', 'const fallen = popped.length ?', 'const fallen = false ?', drop],
    ['full radius', 'CONTACT_SCALE = 0.85', 'CONTACT_SCALE = 1', geometry],
    ['reflection × 1.05', 'direction = { x: -direction.x, y: direction.y };', 'const reflected = Math.atan2(-direction.x, -direction.y) * 1.05; direction = { x: Math.sin(reflected), y: -Math.cos(reflected) };', reflection],
]) {
    assert.ok(source.includes(before), `Mutation anchor: ${name}`);
    const mutated = source.replace(before, after).replace(/from '([^']+)'/g, (_, path) => `from '${new URL(`${path}.ts`, new URL('../src/engines/bubble/engine.ts', import.meta.url)).href}'`);
    const js = ts.transpile(mutated, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    const { Engine: Mutant } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
    assert.throws(() => oracle(Mutant), `Surviving mutation: ${name}`);
    console.log(`Rejected mutation: ${name}`);
}
console.log('B-HEX Node: nine literal geometries, reflection, drops and four mutations passed.');

for (const oracle of Object.values(cases)) oracle();
levelDiversity();
assert.throws(() => levelDiversity(LEVELS.map(() => LEVELS[0])));
for (const [name, before, after, oracle] of [
    ['bomb without blast', "if (bomb?.kind !== 'bomb') continue;", 'continue;', cases.bomb],
    ['stone matched by color', "c.color === target.color && c.kind !== 'stone'", 'c.color === target.color', cases.stone],
    ['ice opens on first burst', 'if (frozen.ice === 0)', 'if (frozen.ice <= 1)', cases.ice],
]) {
    assert.ok(source.includes(before), `Mutation anchor: ${name}`);
    const mutated = source.replace(before, after).replace(/from '([^']+)'/g, (_, path) => `from '${new URL(`${path}.ts`, new URL('../src/engines/bubble/engine.ts', import.meta.url)).href}'`);
    const js = ts.transpile(mutated, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    const { Engine: Mutant } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
    assert.throws(() => oracle(Mutant), `Surviving mutation: ${name}`);
    console.log(`Rejected mutation: ${name}`);
}
console.log('B-LVL-01–03: historical data, six mechanics, clone mutation and mechanical mutations passed.');
// Five recorded seeds keep the audit bounded; never infer unplayed outcomes.
const STAT_SEEDS = 5;
// Hard worker deadline per level/seed, including module loading and beam search.
const LEVEL_TIMEOUT_MS = 2000;
async function run(level, seed) {
    const worker = new Worker(new URL('./bubble-validation-worker.js', import.meta.url), {workerData:{level,seed}});
    return new Promise((resolve, reject) => {
        let partial = {won:false, shots:null};
        let settled = false;
        const finish = result => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            void worker.terminate();
            resolve(result);
        };
        const timer = setTimeout(() => finish({...partial, timedOut:true}), LEVEL_TIMEOUT_MS);
        worker.on('message', message => {
            if (message.partial) partial = message.result;
            else finish({...message.result, timedOut:false});
        });
        worker.on('error', error => { clearTimeout(timer); reject(error); });
        worker.on('exit', code => {
            if (!settled) { clearTimeout(timer); reject(new Error(`Worker exited before result: ${code}`)); }
        });
    });
}
// Same fast policy and representative levels as B-LVL-04; keep failures explicit.
const { greedyLevel } = await import('../src/engines/bubble/solver.ts');
const fixedLevels = [1,5,10,15,20,25,30];
const fixedStarted = performance.now();
const fixedResults = fixedLevels.map(level => ({level,...greedyLevel(level-1,28,160)}));
const fixedDurationMs = performance.now() - fixedStarted;
console.log(`B-LVL-04 (${fixedDurationMs.toFixed(0)} ms): ${JSON.stringify(fixedResults)}`);
const results = [];
for (let level = 0; level < 30; level++) {
    const runs = [];
    for (let seed = 0; seed < STAT_SEEDS; seed++) runs.push({seed,...await run(level,seed)});
    const measured = runs.filter(r=>r.shots !== null);
    const row = {level:level+1,name:LEVELS[level].name,mechanics:LEVELS[level].mechanics ?? [],
        fixed:fixedResults.find(r=>r.level===level+1) ?? null, runs,
        meanShots:measured.length === STAT_SEEDS ? measured.reduce((sum,r)=>sum+r.shots,0)/STAT_SEEDS : null,
        winRate:runs.filter(r=>r.won).length/STAT_SEEDS};
    results.push(row);
    console.log(JSON.stringify(row));
    // Preserve actual completed measurements even if an external runner stops the audit.
    writeFileSync(new URL('../docs/bubble-validation.json',import.meta.url),JSON.stringify({seed:28,seeds:STAT_SEEDS,shotCap:160,levelTimeoutMs:LEVEL_TIMEOUT_MS,fixedLevels,fixedDurationMs,fixedResults,results},null,2)+'\n');
}
const fixedPassed = fixedResults.every(r=>r.won) && fixedDurationMs < 10000;
console.log(`B-LVL-04: ${fixedPassed ? 'PASS' : 'FAIL'}; five-seed statistics recorded without extrapolation.`);
if (!fixedPassed) process.exitCode = 1;
