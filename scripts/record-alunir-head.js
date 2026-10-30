/* global URL, console, process */
import './ts-loader.js';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { transpile } from './transpile.js';
// Pin the actual pre-catalogue implementation, including future regenerations.
const gust = process.argv.includes('--gust'), revision = 'e1f09c8';
const source = execFileSync('git', ['show', `${revision}:src/engines/alunir/engine.ts`], { encoding: 'utf8' });
const code = transpile(source.replace("'../shared/random'", JSON.stringify(new URL('../src/engines/shared/random.ts', import.meta.url).href)));
const { Engine, STEP } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const e = new Engine(); e.loadLevel(gust ? 20 : 9, 2026);
if (gust) e.step(STEP * 100);
else {
    e.input({ thrust: false, left: false, right: true }); e.step(STEP * 5);
    e.input({ thrust: true, left: true, right: false }); e.step(STEP * 3);
    e.input({ thrust: false, left: false, right: false }); e.step(STEP * 112);
}
const saved = e.snapshot(); e.step(STEP * 40);
writeFileSync(gust ? 'tests/fixtures/alunir-legacy-gust.json' : 'tests/fixtures/alunir-head.json', JSON.stringify({ origin: `git show ${revision}:src/engines/alunir/engine.ts`, saved, after: e.snapshot() }, null, 2) + '\n');
console.log(`État historique ${revision}, niveau ${gust ? 21 : 10}, graine 2026 ; continuation de 40 ticks.`);
