/* global console, URL, process, performance */
import './bubble-input-check.js';
import './ts-loader.js';
import { setTimeout as pause } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { collectStatistics, readStatistics, writeStatistics, fingerprint } from './bubble-statistics.js';
const cases = await import('../tests/bubble-cases.ts');
const { levelDiversity, cloneDetection } = await import('../tests/bubble-diversity.ts');
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
levelDiversity(); cloneDetection();
assert.throws(() => levelDiversity(Array.from({length:30},()=>0)));
for (const [name, before, after, oracle] of [
    ['bomb without blast', "if (bomb?.kind !== 'bomb') continue;", 'continue;', cases.bomb],
    ['stone matched by color', "c.color === target.color && c.kind !== 'stone'", 'c.color === target.color', cases.stone],
    ['ice opens on first burst', 'if (frozen.ice === 0)', 'if (frozen.ice <= 1)', cases.ice],
    ['bomb skips second bomb', "victim.kind !== 'star' && !popped.includes(victim)", "victim.kind !== 'star' && victim.kind !== 'bomb' && !popped.includes(victim)", cases.bomb],
    ['bomb destroys stone', "victim && victim.kind !== 'stone' && victim.kind !== 'ice'", "victim && victim.kind !== 'ice'", cases.bomb],
    ['distant ice damaged', 'if (popped.some(c => neighbors(frozen).some(n => key(n) === key(c)))) {', 'if (popped.length > 0) {', cases.ice],
    ['rainbow every shot', 'this.shots % 3 === 0', 'this.shots % 1 === 0', cases.rainbow],
    ['one star remains', "!this.grid.some(c => c.kind === 'star')", "this.grid.filter(c => c.kind === 'star').length < 2", cases.stars],
    ['right bumper moved', '{ x: 260, top: 290, bottom: 380 }', '{ x: 280, top: 290, bottom: 380 }', cases.bumpers],
]) {
    assert.ok(source.includes(before), `Mutation anchor: ${name}`);
    const mutated = source.replace(before, after).replace(/from '([^']+)'/g, (_, path) => `from '${new URL(`${path}.ts`, new URL('../src/engines/bubble/engine.ts', import.meta.url)).href}'`);
    const js = ts.transpile(mutated, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    const { Engine: Mutant } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
    assert.throws(() => oracle(Mutant), `Surviving mutation: ${name}`);
    console.log(`Rejected mutation: ${name}`);
}
const levelSource = readFileSync(new URL('../src/engines/bubble/levels.ts',import.meta.url),'utf8');
for (const [name,before,after,oracle] of [
    ['historical L2 mask', 'if (row === 0 || masks[index]) {', 'if (row === 0 || (index === 1 ? true : masks[index])) {', generator=>cases.historicalLevels(generator)],
    ['generated ice missing', "if (level.mechanics?.includes('ice') && row === 2 && col === 6)", 'if (false)', generator=>levelDiversity(undefined,generator)],
]) {
    assert.ok(levelSource.includes(before),`Mutation anchor: ${name}`);
    const mutated = levelSource.replace(before,after).replace(/from '([^']+)'/g,(_,path)=>`from '${new URL(`${path}.ts`,new URL('../src/engines/bubble/levels.ts',import.meta.url)).href}'`);
    const js = ts.transpile(mutated,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});
    const {generateLevel} = await import(`data:text/javascript,${encodeURIComponent(js)}`);
    assert.throws(()=>oracle(generateLevel),`Surviving mutation: ${name}`);
    console.log(`Rejected mutation: ${name}`);
}
console.log('B-LVL-01–03: historical data, six mechanics, clone mutation and mechanical mutations passed.');
const { solveLevel } = await import('../src/engines/bubble/solver.ts');
const { campaign, difficulty } = await import('../tests/bubble-campaign.ts');
const fixedStarted = performance.now();
const fixedResults = campaign(solveLevel);
const fixedDurationMs = performance.now() - fixedStarted;
const bands = difficulty(fixedResults);
console.log(`B-LVL-04 (${fixedDurationMs.toFixed(0)} ms): ${JSON.stringify(fixedResults)}`);
console.log(`B-LVL-05: ${JSON.stringify(bands)}`);
if (process.argv.includes('--checks-only')) {
    assert.ok(fixedDurationMs < 10000);
    process.exit(0);
}
async function completedStatistics() {
    const started=Date.now();
    for (;;) {
        try {
            const report=readStatistics();
            if(report.results.length === 30 && report.results.every(row=>row.runs.length === 20)) return report;
        } catch(error) { if(!(error instanceof SyntaxError)) throw error; }
        assert.ok(Date.now()-started < 1200000,'Statistics did not finish');
        await pause(1000);
    }
}
const report = process.argv.includes('--reuse-statistics') ? await completedStatistics() : await collectStatistics();
assert.equal(report.fingerprint,fingerprint());
assert.equal(report.seeds,20);
assert.equal(report.results.length,30);
assert.ok(report.durationMs < 1200000);
for (const row of report.results) {
    assert.deepEqual(row.runs.map(r=>r.seed),Array.from({length:20},(_,i)=>i));
    row.fixed=fixedResults.find(r=>r.level===row.level);
}
writeStatistics({...report,fixedResults,fixedDurationMs,bands});
assert.ok(fixedDurationMs < 10000);
console.log('B-LVL-04–05: PASS; 600 attempts recorded without extrapolation.');
