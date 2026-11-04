/* global console, structuredClone, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replayCollierRecording } from './collier-finger-replay.js';
import { createScene } from './collier-scene-oracles.js';

// Unmodified game-only attachments from the mobile runs recorded with the élan
// (the near-empty necklace hurries in), which changed every trajectory.
// No policy or noise generator runs here: packets, transport receipts and advances are replayed.
for (const [level, fingerprint] of [[1, 2071298895], [5, 1861302993]]) {
    const recording = JSON.parse(readFileSync(new URL(`../tests/fixtures/collier-finger-${level}.json`, import.meta.url), 'utf8'));
    assert.equal(recording.level, level - 1);
    assert.equal(recording.fingerprint, fingerprint);
    assert.equal(recording.misses, 0);
    const replay = replayCollierRecording(recording);
    assert.equal(replay.fingerprint, fingerprint, `Real finger L${level}`);
    assert.deepEqual(replay.final, recording.final);
    assert.equal(replayCollierRecording({ ...recording, fingerprint: 0 }).fingerprint, fingerprint,
        'The expected checksum is never used to calculate the replay checksum');

    // The first possible numerical discrepancy already exists in the static
    // course, before any recorded game input or 150ms reaction delay.
    const { hook } = createScene('panda', false, undefined, recording.geometry.canvas);
    hook.loadLevel(recording.level, recording.seed);
    const samples = hook.read().paths[0].samples;
    const first = samples.findIndex((sample, index) => JSON.stringify(sample) !== JSON.stringify(recording.final.paths[0].samples[index]));
    console.log(`Collier fixture L${level}: ${fingerprint}; first course decimal difference: ${first}`);

    // Precision reconciliation must reject meaningful simulation differences,
    // even when the expected checksum is left untouched.
    for (const mutate of [
        r => { r.final.shots++; },
        r => { r.final.angle += 1e-10; },
        r => { r.final.paths[0].samples[88].x += 1e-8; },
        r => { r.geometry.input.scaleY *= .99; },
        r => { r.seed++; },
        r => { r.advances[2].ms++; },
        r => { r.transport[2].y += 10; },
    ]) {
        const changed = structuredClone(recording);
        mutate(changed);
        assert.throws(() => replayCollierRecording(changed), assert.AssertionError);
    }
}
