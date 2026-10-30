/* global console, Buffer, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
const model = await import('../src/characters/model.ts');
const checks = await import('../tests/character-checks.ts');
const { panelLifecycle } = await import('../tests/character-panel-checks.ts');
const timings = [];
{ const start = performance.now(); panelLifecycle(); panelLifecycle(undefined, true); const ms = performance.now() - start; assert.ok(ms < 2000); timings.push({ test: 'panelLifecycle', ms: Math.round(ms) }); }
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
    ['special without effects', 'src/characters/model.ts', "if (!reduce && (anim === 'special' || anim === 'celebration')) {", "if (!reduce && anim === 'celebration') {", m => { checks.moving('dragon', m.drawList); }],
    ['walking without steps', 'src/characters/model.ts', 'Math.sin(phase + i * Math.PI) * 9 : 0', 'Math.sin(phase + i * Math.PI) * 0 : 0', m => { checks.moving('panda', m.drawList); }],
    ['tiny jump', 'src/characters/model.ts', '-26 * Math.abs(Math.sin(time / 480))', '-2 * Math.abs(Math.sin(time / 480))', m => { checks.moving('panda', m.drawList); }],
    ['Canvas ignores rotation', 'src/characters/canvas.ts', 'p.rx, p.ry, p.rotation, 0', 'p.rx, p.ry, 0, 0', m => { checks.renderers(m.renderCharacter); }],
    ['Phaser half size', 'src/characters/phaser.ts', 'const scale = height / 240;', 'const scale = height / 480;', m => { checks.renderers(undefined, m.renderCharacter); }],
    ['Phaser ignores cubic controls', 'src/characters/phaser.ts', 'const t = i / segments, s = 1 - t;', 'const t = i / segments, s = 0;', m => { checks.renderers(undefined, m.renderCharacter); }],
    ['monochrome mane', 'src/characters/model.ts', "const rainbow = ['#f18cbd', '#f4a153', '#f5d65d', '#72c88b', '#75bce4', '#ac87db'];", "const rainbow = Array(6).fill('#f18cbd');", m => { checks.distinct(undefined, m.drawList); }],
    ['dark mane strokes', 'src/characters/model.ts', 'rainbow[i] ?? cream, 12, false, rainbow[i]', 'rainbow[i] ?? cream, 12, false', m => { checks.distinct(undefined, m.drawList); }],
    ['hover and touch without special', 'src/characters/panel.ts', 'if (item) item.special = value;', 'if (item) item.special = value && false;', m => { panelLifecycle(m.setupCharacters); }],
    ['monkey oscillates', 'src/characters/model.ts', "time / specialCycleMs[id] * Math.PI * 2", "Math.sin(time / 300) * 0.15", m => { checks.moving('singe', m.drawList); }],
    ['red panda remains standing', 'src/characters/model.ts', 'if (rolling) {', 'if (false) {', m => { checks.moving('pandaroux', m.drawList); }],
]) {
    const { mod, line } = await mutate(file, before, after);
    const start = performance.now();
    assert.throws(() => verify(mod), undefined, name);
    assert.ok(performance.now() - start < 2000, name + ' exceeds test budget');
    mutations.push({ name, file, line, rejected: true });
}
console.log(JSON.stringify({ timings, mutations, checks: 'C01–C07 passed; no browser or Vitest launched' }, null, 2));
