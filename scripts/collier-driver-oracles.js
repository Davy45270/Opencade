/* global console, structuredClone */
import assert from 'node:assert/strict';
import { replayCollier, replayCollierRecording } from './collier-finger-replay.js';
import { createScene } from './collier-scene-oracles.js';

// The same targets drive painted pearls, input hit regions and the public hook.
for (const level of [0, 4, 29]) {
    const { scene, hook, handlers, engine, images } = createScene();
    hook.loadLevel(level, 300);
    const { canvas, view, targets } = hook.geometry();
    assert.equal(canvas.height, 736, 'Pass 307 full-height canvas');
    assert.notEqual(view.scale, 1, 'Exercise a scaled course');
    engine.current = 0;
    engine.next = 1;
    scene.draw();
    const reserve = images.find(image => image.visible && image.key.startsWith('collier-pearl-')
        && Math.abs(image.x - (targets.next.x * view.scale + view.x)) < 1e-6
        && Math.abs(image.y - (targets.next.y * view.scale + view.y)) < 1e-6);
    assert.ok(reserve, 'The hook target is the drawn reserve');
    for (const target of [targets.next, engine.config.shooter]) for (const noise of [-12, 0, 12]) {
        const current = engine.current, next = engine.next, shots = engine.shots;
        // CSS viewport -> Phaser canvas -> actual registered listeners.
        const box = { x: 16, y: 44, width: 350, height: 350 * canvas.height / canvas.width };
        const screen = { x: box.x + (target.x * view.scale + view.x) * box.width / canvas.width + noise,
            y: box.y + (target.y * view.scale + view.y) * box.height / canvas.height + noise };
        const point = { id: 1, wasTouch: true, downTime: 0, upTime: 100,
            x: (screen.x - box.x) * canvas.width / box.width,
            y: (screen.y - box.y) * canvas.height / box.height };
        handlers.get('pointerdown')(point);
        handlers.get('pointerup')(point);
        assert.equal(engine.current, next);
        assert.equal(engine.next, current);
        assert.equal(engine.shots, shots, 'No shot on a noisy reserve/hero tap');
    }
    assert.match(hook.hudText(), /SCORE|pts/);
}
// Golden helper fingerprints for replayCollier's documented reference DOM boxes.
// Receipts left read() (pass 121): same shots, swaps and game time (29/1/17400 ms, 45/1/34050 ms), new final-state fingerprints.
// Élan (fewer than three visible beads hurry in): new transcripts, still won with zero misses
// (L1 10 shots/1 swap/5700 ms instead of 29/1/17400 ms; L5 51/9/37800 ms instead of 45/1/34050 ms).
const expected = { 0: 527225163, 4: 1719010492 };
for (const level of [0, 4]) {
    const result = await replayCollier(level);
    assert.equal(result.fingerprint, expected[level], 'Same helper transcript and final snapshot');
    console.log(`Collier doigt L${level + 1}: ${JSON.stringify({ fingerprint: result.fingerprint, shots: result.final.shots, swaps: result.swaps, gameMs: result.gameMs })}`);
}

// Persisted JSON transport: offset, fractional CSS box and input height deliberately
// differ from both historical 640 and 736. Policy/noise run only when recording.
const box = { x: 23.125, y: 51.25, width: 321.75, height: 589.5 };
const geometry = createScene().hook.geometry();
geometry.canvas = { width: 360, height: 812 };
geometry.input = { x: box.x, y: box.y, scaleX: 360 / box.width, scaleY: 812 / box.height };
const resume = { x: 100.125, y: 350.25, width: 190, height: 56 };
const recording = JSON.parse(JSON.stringify(await replayCollier(0, box, resume, undefined, geometry)));
const replay = replayCollierRecording(recording);
assert.deepEqual(replay.final, recording.final, 'Recorded packets reconstruct the entire snapshot');
assert.equal(replay.fingerprint, recording.fingerprint, 'JSON geometry and clock preserve the fingerprint');
const wrongGeometry = structuredClone(recording);
wrongGeometry.geometry.input.scaleY = 736 / box.height;
assert.throws(() => replayCollierRecording(wrongGeometry), /recorded/, 'Historical canvas height must fail');
