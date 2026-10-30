/* global console, performance, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { mutationModule } from './mutation-module.js';
import { cases } from './node-test-assertions.js';
const { Engine } = await import('../src/engines/empilo/engine.ts');
await mutationModule('../tests/empilo.test.ts', "from 'vitest'", "from 'vitest'", { vitest: new URL('./orbite-assertions.js', import.meta.url).href });
// Clock-free budget (pass 402, like f1bd630): count simulated fixed ticks per case,
// not wall time, so a loaded machine cannot fail the oracle. Durations stay informative.
let ticks = 0;
const step = Engine.prototype.step;
Engine.prototype.step = function (ms) { ticks += Math.ceil(ms * 60 / 1000); return step.call(this, ms); };
const report = [];
for (const [name, run] of cases) {
    ticks = 0; const start = performance.now(); await run();
    assert(ticks <= 20000, `${name}: ${ticks} simulated ticks`);
    report.push(`${name.slice(0, 4)} ${String(ticks)} ticks ${(performance.now() - start).toFixed(0)} ms`);
}
console.log(`Empilo: ${cases.length} historical Node checks (tick budget 20 000)\n${report.join('\n')}`);
