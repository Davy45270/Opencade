/* global console, Buffer, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
const model = await import('../src/characters/model.ts');
const checks = await import('../tests/character-checks.ts');
const timings = [];
for (const id of model.ids) for (const name of ['deterministic', 'moving']) {
    const start = performance.now(); checks[name](id); const ms = performance.now() - start;
    assert.ok(ms < 2000); timings.push({ test: name + '/' + id, ms: Math.round(ms) });
}
for (const name of ['distinct', 'persistence', 'renderers']) {
    const start = performance.now(); checks[name](); const ms = performance.now() - start;
    assert.ok(ms < 2000); timings.push({ test: name, ms: Math.round(ms) });
}
const source = readFileSync('src/characters/model.ts', 'utf8');
assert.doesNotMatch(source, /window|document|phaser|canvas/i);
async function mutate(file, before, after) {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.split(before).length, 2, 'unique mutation site');
    const line = source.slice(0, source.indexOf(before)).split('\n').length;
    const replaced = source.replace(before, after).replace(/from '(\.\.?\/[^']+)'/g, (_, path) => `from '${new URL(path + '.ts', new URL('../' + file, import.meta.url)).href}'`);
    const code = ts.transpile(replaced, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    return { mod: await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64')), line };
}
const mutations = [];
for (const [name, file, before, after, verify] of [
    ['time ignored', 'src/characters/model.ts', 'const time = reduce || !Number.isFinite(t) ? 0 : t;', 'const time = 0;', m => { for (const id of model.ids) checks.moving(id, m.drawList); }],
    ['duplicate accent', 'src/characters/model.ts', `accent: '${model.characters.pandaroux.accent}'`, `accent: '${model.characters.panda.accent}'`, m => { checks.distinct(m.characters); }],
    ['storage key changed', 'src/characters/selection.ts', "'arcade-lab:character:v1'", "'arcade-lab:character:v2'", m => { checks.persistence(m.selectedCharacter, m.selectCharacter); }],
]) {
    const { mod, line } = await mutate(file, before, after);
    assert.throws(() => verify(mod), undefined, name);
    mutations.push({ name, file, line, rejected: true });
}
console.log(JSON.stringify({ timings, mutations, checks: 'C01–C06 passed; no browser or Vitest launched' }, null, 2));
