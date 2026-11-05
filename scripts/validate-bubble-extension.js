/* global console */
// B-EXT: levels 31-130 of Bubble — format, recorded proofs on the real deal (and with a ceiling 20 %
// faster), and the difficulty curve by tiers of ten. Imported by validate-bubble.js (test:node).
import './ts-loader.js';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
const { extensionFormat, extensionWinnable, extensionCurve, extensionControls } = await import('../tests/bubble-extension.ts');
const started = performance.now();
extensionFormat();
const results = extensionWinnable();
const tiers = extensionCurve(results);
extensionControls();
const elapsed = performance.now() - started;
assert.ok(elapsed < 60000, 'B-EXT within a minute');
const reserve = results.map(r => 1 - r.marginInterval / r.interval);
console.log(`B-EXT-01–03 (${elapsed.toFixed(0)} ms): 100 niveaux, gagnés sur leur donne réelle (${String(results.reduce((s, r) => s + r.shots, 0))} tirs rejoués) et avec un plafond ${String(Math.round(Math.min(...reserve) * 100))} à ${String(Math.round(Math.max(...reserve) * 100))} % plus rapide ; paliers ${JSON.stringify(tiers.map(t => [t.tier, Math.round(t.breather), Math.round(t.shots * 10) / 10]))}`);
