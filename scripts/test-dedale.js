/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
const { mechanicCases } = await import('../tests/dedale-mechanics.ts');
const { campaignCases } = await import('../tests/dedale-campaign.ts');
const start = performance.now();
for (const [id, run] of Object.entries({ ...mechanicCases, ...campaignCases })) {
    const before = performance.now(); run();
    const ms = performance.now() - before;
    assert.ok(ms < 2000, `${id}: ${ms} ms`);
    console.log(`${id}: ${ms.toFixed(1)} ms`);
}
const ms = performance.now() - start;
assert.ok(ms < 2000, `complete fast suite: ${ms} ms`);
console.log(`Dédale fast suite: ${ms.toFixed(1)} ms`);
