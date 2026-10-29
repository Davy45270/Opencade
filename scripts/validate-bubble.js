/* global console, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Engine } from '../src/engines/bubble/engine.ts';

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
