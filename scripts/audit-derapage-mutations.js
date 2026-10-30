/* global console, process */
// Explicit, offline mutation audit. Every mutant invokes the unchanged CI checks.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
for (const file of ['validate-derapage.js', 'check-derapage-3d.js', 'check-derapage-cadence.js', 'check-level-catalogue-kart-mutations.js']) {
    const result = spawnSync(process.execPath, ['--import', './scripts/ts-loader.js', `scripts/${file}`, '--checks-only', '--audit-mutations'], { stdio: 'inherit', env: process.env });
    assert.equal(result.status, 0, `mutation audit: ${file}`);
    console.log(`PASS mutation audit: ${file}`);
}
