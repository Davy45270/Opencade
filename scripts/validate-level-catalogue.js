/* global console, performance, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const { catalogue } = await import('../tests/level-catalogue-checks.ts');
const { levelCatalogue } = await import('../src/content/level-catalogue.ts');
const cases = [];
for (const entry of levelCatalogue) {
    const start = performance.now();
    let kartCases = 0;
    catalogue(entry.code, (name, check) => {
        // Kart entries run exactly three bounded cases: two complete winning replays and one mechanic.
        if (entry.game === 'derapage') assert(++kartCases <= 3, 'kart catalogue case budget: three cases');
        const began = performance.now(); check(); console.log(`${name}: ${(performance.now() - began).toFixed(1)} ms`);
    });
    const ms = performance.now() - start;
    if (entry.game === 'derapage') assert.equal(kartCases, 3, 'two bounded replays and one mechanic');
    // No wall-clock oracle: the replays are deterministic and already bounded by their recorded inputs;
    // the duration is logged for information only (a busy host must not fail the check).
    cases.push({ ...entry, passed: true, ms }); console.log(`${entry.code}: geometry, mechanic, two winning replays (${ms.toFixed(1)} ms)`);
}
const before = { ferraille: 11.2, briqueterie: 18.1, essaim: 16.4 };
for (const [game, score] of Object.entries(before)) {
    const report = JSON.parse(readFileSync(`docs/${game}-validation.json`, 'utf8'));
    assert(report.diversity.score <= score, `${game} diversity score increased`);
}
if (!process.argv.includes('--checks-only')) writeFileSync('docs/level-catalogue-validation.json', JSON.stringify({ browserRun: false, cases, before }, null, 2) + '\n');
