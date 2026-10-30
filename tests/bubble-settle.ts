import assert from './bubble-assert';
import { Settle, SETTLE_MS, settleTarget } from '../src/games/bubble/settle';
import { Engine, center } from '../src/engines/bubble/engine';
/** B-SNAP-05: 90 ms linear glide from impact to socket, frozen while paused, then drawn at the centre. */
export function settleGlide(SettleClass = Settle, target = settleTarget): void {
    assert.equal(SETTLE_MS, 90);
    const s = new SettleClass();
    assert.equal(s.point('1:4'), null);
    s.start('1:4', { x: 180, y: 82 }, { x: 180, y: 91 });
    assert.deepEqual(s.point('1:4'), { x: 180, y: 82 });
    assert.equal(s.point('1:5'), null);
    s.advance(45, false); assert.deepEqual(s.point('1:4'), { x: 180, y: 86.5 });
    s.advance(500, true); assert.deepEqual(s.point('1:4'), { x: 180, y: 86.5 });
    s.advance(44, false); assert.ok((s.point('1:4')?.y ?? 0) > 90.8);
    s.advance(1, false); assert.equal(s.point('1:4'), null);
    // Horizontal glide too (grazing and wall shots settle sideways).
    s.start('3:3', { x: 100, y: 50 }, { x: 160, y: 50 }); s.advance(30, false);
    assert.deepEqual(s.point('3:3'), { x: 120, y: 50 });
    s.start('2:2', { x: 0, y: 0 }, { x: 90, y: 0 }); s.clear(); assert.equal(s.point('2:2'), null);
    // Pop on arrival while the ceiling descends: glide to the pre-descent socket (no 34 px jump at 90 ms).
    const e = new Engine(); e.loadLevel(1);
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }, { row: 0, col: 0, color: 2 }], 0);
    e.resolved = 11; e.aim(0); e.shoot();
    const result = e.advance(10000);
    assert.ok(result && result.attached);
    assert.equal(e.drops, 1); assert.equal(result.popped.length, 3);
    assert.deepEqual(target(result, 0, e.drops), center(result.attached, 0));
    // A kept bubble follows the descended board.
    const kept = { attached: { row: 1, col: 3, color: 0 as const }, popped: [] };
    assert.deepEqual(target(kept, 0, 1), center(kept.attached, 1));
    assert.equal(target({ attached: null, popped: [] }, 0, 0), null);
}
