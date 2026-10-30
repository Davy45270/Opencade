import assert from 'node:assert/strict';
import { Engine } from '../src/engines/derapage/engine';
import { controller } from '../src/engines/derapage/ai';
import { required } from '../src/engines/derapage/access';
import { sameReplayStep } from './derapage-replay';

// The former Z15 and Z28 loops have the same grid, seed, controller and fixed
// steps. Their assertions share one complete pair; no snapshots are sampled away.
export function completeReplay(): void {
    const a = new Engine(0, 28), b = new Engine(0, 28);
    for (let frame = 0; frame < 6000 && a.status === 'playing'; frame++) {
        const input = controller(required(a.karts[0]), a.track);
        assert.equal(b.time, a.time, 'timestamped event applied at the same race time');
        a.input(input); b.input(input);
        a.step(1000 / 60); b.step(1000 / 120); b.step(1000 / 120);
        assert(sameReplayStep(a, b, frame, frame === 5999), 'Z15 complete snapshot comparison');
        assert.equal(JSON.stringify(a.snapshot(false).timing), JSON.stringify(b.snapshot(false).timing), 'Z28 timing at every step');
    }
    assert.deepEqual(b.snapshot(), a.snapshot());
    assert.equal(required(a.karts[0]).lap, 3);
    assert.equal(a.status, 'won');
    assert.equal(a.lapTimesMs.length, 3);
    assert.equal(a.bestLapMs, Math.min(...a.lapTimesMs));
    assert.equal(JSON.stringify(a.snapshot(false).timing), JSON.stringify(a.snapshot().timing));
    assert.deepEqual(JSON.parse(JSON.stringify(a.snapshot())), a.snapshot());
    const copy = a.snapshot(); required(copy.karts[0]).x = 999;
    assert.notEqual(required(a.karts[0]).x, 999);
    for (const ms of [-1, NaN, Infinity]) assert.throws(() => { a.step(ms); }, RangeError);
}
