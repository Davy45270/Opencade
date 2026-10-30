/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
const ids = ['gourmandises', 'collier', 'derapage','traverse','caisses','alunir','ferraille','dedale','essaim','orbite','empilo','briqueterie','bubble','serpentin'];
let total = 0;
for (const id of ids) {
    const { createThumbnail, createDemo } = await import(`../src/games/${id}/thumbnail.ts`);
    const sample = createDemo(28);
    for (let i = 0; i < 200; i++) sample.step();
    const measured = performance.now();
    for (let i = 0; i < 2000; i++) sample.step();
    const elapsed = performance.now() - measured;
    console.log(`${id} demo: ${(elapsed / 2000).toFixed(6)} ms/step (${elapsed.toFixed(2)} ms / 2000)`);
    const started = performance.now();
    for (const status of ['won','lost']) {
        const demo = createDemo(28); demo.engine.status = status; demo.step();
        assert.equal(demo.restarts, 1); assert.equal(demo.engine.status, 'playing');
    }
    const thumbnail = createThumbnail(28), initial = thumbnail.read();
    const thumbnailStarted = performance.now();
    thumbnail.step(); assert.notDeepEqual(thumbnail.read(), initial);
    for (let i = 1; i < 2000; i++) thumbnail.step();
    const thumbnailMs = performance.now() - thumbnailStarted;
    assert.ok(thumbnail.restarts > 0, id);
    // The same fresh 2,000-step thumbnail run supplies the measurement and V02.
    // No assertion needs the former separate warm-up/benchmark duplicate.
    console.log(`${id} thumbnail: ${(thumbnailMs / 2000).toFixed(6)} ms/step (${thumbnailMs.toFixed(2)} ms / 2000)`);
    const caseTime = performance.now() - started;
    console.log(`V02 ${id}: ${caseTime.toFixed(2)} ms`);
    total += caseTime;
}
console.log(`V02: ${total.toFixed(2)} ms`);
// Durations are diagnostic; V02 correctness is asserted through state changes and restarts.
