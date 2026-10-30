/* global console, performance, URL, process */
import './ts-loader.js';
import { registerHooks } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const baseline = new Map();
if (process.argv.includes('--baseline')) for (const path of ['tests/essaim.test.ts','tests/thumbnails.test.ts','tests/essaim-behavior.ts','tests/essaim-generated.ts','src/engines/essaim/pilot.ts']) {
    baseline.set(new URL('../'+path, import.meta.url).href, execFileSync('git',['show','HEAD:'+path],{ encoding: 'utf8' }));
}
// Import the actual test bodies without starting Vitest or a browser.
registerHooks({
    load(url, context, next) {
        if (baseline.has(url)) return { format: 'module', source: ts.transpile(baseline.get(url), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }), shortCircuit: true };
        return next(url, context);
    },
    resolve(name, context, next) {
        if (name === 'vitest') return { url: new URL('./node-test-assertions.js', import.meta.url).href, shortCircuit: true };
        if (name === 'phaser') return { url: 'data:text/javascript,export default {Scene:class {}}', shortCircuit: true };
        return next(name, context);
    },
});
const { cases } = await import('./node-test-assertions.js');
await import('../tests/essaim.test.ts');
await import('../tests/thumbnails.test.ts');
let total = 0, max = 0;
for (const [name, run] of cases) {
    if (!/^(E-GEN-03|E-DIV-01|E-PILOT|V02)/.test(name)) continue;
    const started = performance.now();
    run();
    const elapsed = performance.now()-started;
    total += elapsed; max = Math.max(max, elapsed);
    console.log(`${name}: ${elapsed.toFixed(2)} ms`);
}
console.log(`Total: ${total.toFixed(2)} ms; maximum: ${max.toFixed(2)} ms`);
