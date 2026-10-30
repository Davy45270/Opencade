/* global URL, console */
// Run the actual Vitest test callbacks without loading Vitest or a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { harness, settle } from './pwa-harness.js';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/shell/pwa.ts', import.meta.url), 'utf8');
const testSource = readFileSync(new URL('../tests/pwa-runtime.test.js', import.meta.url), 'utf8');
const mutations = [
    ['initial check', '            void check();', '            void Promise.resolve();'],
    ['five-hour interval', '30 * 60 * 1000', '300 * 60 * 1000'],
    ['background check', "document.visibilityState === 'visible'", "document.visibilityState === 'hidden'"],
    ['HTTP cache', "{ cache: 'no-store' }", "{ cache: 'default' }"],
    ['missing cleanup', 'await clearAppWorker(registration, caches);', 'await Promise.resolve(clearAppWorker);'],
    ['missing focus', 'target?.focus();', 'void target;'],
    ['footer only', "document.querySelectorAll('[data-build]')", "document.querySelectorAll('#home footer > [data-build]')"],
    ['broken dismissal', 'if (notice) notice.hidden = true;', 'if (notice) notice.hidden = false;'],
];
async function runTests(text, overrides = {}) {
    const tests = [];
    const execute = new Function('exports', 'require', ts.transpile(text, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }));
    execute({}, name => name === 'vitest' ? { it: (name, fn) => tests.push({ name, fn }), test: (name, fn) => tests.push({ name, fn }) } : name in overrides ? overrides[name] : require(name));
    assert.ok(tests.length > 0, 'No tests discovered');
    const failures = [];
    for (const test of tests) {
        try { await test.fn(); } catch (error) {
            // Harness/runtime errors are not evidence that an assertion killed a mutation.
            if (error.code !== 'ERR_ASSERTION') throw error;
            failures.push({ test: test.name, message: error.message });
        }
    }
    return failures;
}
async function runPwa(text) {
    return runTests(testSource, { '../scripts/pwa-harness.js': { harness: options => harness(options, text), settle } });
}
assert.deepEqual(await runPwa(source), [], 'Unmutated PWA must pass');
console.log('PASS baseline: actual Vitest callbacks');
for (const [name, before, after] of mutations) {
    assert.equal(source.split(before).length, 2, `Mutation must match exactly once: ${name}`);
    const failures = await runPwa(source.replace(before, after));
    assert.ok(failures.length > 0, `SURVIVED: ${name}`);
    console.log(`KILLED ${name}: ${failures.map(f => f.test).join('; ')} (${failures.length} assertion failure(s))`);
}
assert.deepEqual(await runPwa(source), [], 'Unmutated PWA must still pass after all replays');
console.log('PASS baseline after all 8 mutations');

// Also execute the new text/brand assertions, with no Vitest runtime.
const model = { exports: {} };
new Function('exports', ts.transpile(readFileSync(new URL('../src/characters/model.ts', import.meta.url), 'utf8'), { module: ts.ModuleKind.CommonJS }))(model.exports);
for (const file of ['character-names', 'brand-guard']) {
    const failures = await runTests(readFileSync(new URL(`../tests/${file}.test.ts`, import.meta.url), 'utf8'), { '../src/characters/model': model.exports });
    assert.deepEqual(failures, [], file);
    console.log(`PASS ${file}`);
}
