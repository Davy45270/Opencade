/* global console, performance, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const { Engine } = await import('../src/engines/derapage/engine.ts');
const { ranking } = await import('../src/engines/derapage/race.ts');
const { controller } = await import('../src/engines/derapage/ai.ts');
const { recordings } = await import('../tests/derapage-recordings-038a0c1.ts');
const { replayHuman } = await import('../tests/derapage-joystick.ts');
const reference = JSON.parse(readFileSync('tests/fixtures/derapage-038a0c1.json', 'utf8'));
// Test-only campaign rule: rejects every activation, including all five AIs.
class WithoutElan extends Engine { special() { return false; } }
function dynamic(engine) {
    const e = engine, player = e.karts[0];
    // Read only dynamic state, avoiding a deep copy of the immutable whole track per step.
    const s = { level: e.level, seed: e.seed, status: e.status, score: e.score, time: e.time,
        timing: { raceMs: e.time + (player.penaltyMs ?? 0), currentLapMs: player.finishMs === null ? (e.frames - e.lapStartFrame) * (1000 / 60) + (player.penaltyMs ?? 0) - e.lapPenaltyStartMs : 0,
            lapTimesMs: e.lapTimesMs, bestLapMs: e.bestLapMs, lastLapDeltaMs: e.lastLapDeltaMs },
        frames: e.frames, remainder: e.remainder, random: e.random.state, controls: e.controls,
        karts: e.karts, crates: e.crates, puddles: e.puddles,
        order: ranking(e.karts, e.track), cup: { races: e.cup.races, scores: e.cup.scores, order: e.cup.standings() } };
    return JSON.stringify(s).replaceAll(',"specialMs":0', '');
}
const timings = [];
for (const [mode, proofs] of [['tapes', reference.tapes], ['campaign', reference.campaign]]) for (const proof of proofs) {
    const start = performance.now(), e = new WithoutElan(proof.level, 28), hash = createHash('sha256');
    const tape = recordings.find(t => t.level === proof.level);
    const bounded = process.argv.includes('--checks-only') && mode === 'campaign' && ![0, 9, 29].includes(proof.level);
    const replayFrames = bounded ? Math.min(1200, proof.frames) : proof.frames;
    let blockStarted = performance.now(), maxBlockMs = 0, block = 0;
    for (let frame = 0; frame < replayFrames; frame++) {
        const input = mode === 'tapes' ? { steer: 0, drift: false, bonus: false, mode: 'joystick', heading: tape.events[Math.floor(frame / 9)], assist: true } : controller(e.karts[0], e.track);
        e.input(input); e.advance(1000 / 60); hash.update(dynamic(e));
        if ((frame + 1) % 600 === 0 || frame + 1 === proof.frames) {
            const ms = performance.now() - blockStarted;
            assert(ms < 2000, `${mode}/L${proof.level + 1}/block ${block}: ${ms} ms`);
            maxBlockMs = Math.max(maxBlockMs, ms);
            if ((frame + 1) % 600 === 0) {
                assert.equal(proof.steps[block].frame, frame + 1);
                assert.equal(hash.copy().digest('hex'), proof.steps[block].digest, 'historical checkpoint, every 600 steps');
                block++;
            }
            blockStarted = performance.now();
        }
    }
    if (bounded) {
        assert.equal(e.frames, replayFrames);
        assert.equal(hash.digest('hex'), proof.steps.find(s => s.frame === replayFrames).digest);
        timings.push({ mode, level: proof.level + 1, frames: replayFrames, bounded: true, ms: Math.round(performance.now() - start), maxBlockMs: Math.round(maxBlockMs) });
        continue;
    }
    for (const k of e.karts) { assert.equal(k.specialMs, 0); assert.equal(k.specialLap, undefined); }
    assert.equal(e.frames, proof.frames); assert.equal(e.status, proof.status ?? 'won');
    assert.equal(hash.digest('hex'), proof.digest, `${mode}, L${proof.level + 1}: every historical step (six karts, RNG, items, timing, cup)`);
    timings.push({ mode, level: proof.level + 1, ms: Math.round(performance.now() - start), maxBlockMs: Math.round(maxBlockMs) });
}
// Preserve the four original exact final-position/heading and human-finger checks too.
if (!process.argv.includes('--checks-only')) for (const tape of recordings) replayHuman(tape, (ok, message) => assert(ok, message), WithoutElan);
// CI already hashes every step of these same four tapes above.
const divergence = [];
for (const tape of recordings) {
    const start = performance.now(), e = new Engine(tape.level, 28);
    for (let frame = 0; frame < tape.frames && e.status === 'playing'; frame++) {
        e.input({ steer: 0, drift: false, bonus: false, mode: 'joystick', heading: tape.events[Math.floor(frame / 9)], assist: true });
        e.advance(1000 / 60);
    }
    const expected = { 0: 3614, 2: 4080, 4: 3397, 14: 3451 };
    assert.equal(e.frames, expected[tape.level]); assert.equal(e.karts[0].specialLap, undefined);
    const aiUsed = e.karts.slice(1).filter(k => k.specialLap !== undefined).map(k => k.id);
    if (tape.level !== 14) assert(aiUsed.length > 0, 'only AI impulse changes this replay');
    assert(performance.now() - start < 2000);
    divergence.push({ level: tape.level + 1, without: tape.frames, withAI: e.frames, aiUsed });
}
console.log(JSON.stringify({ historicalCommit: reference.commit, timings, divergence }));
