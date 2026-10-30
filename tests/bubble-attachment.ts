import assert from './bubble-assert';
import { Engine } from '../src/engines/bubble/engine';
/** A shot grazing the right flank of a hanging bubble settles beside it, not under it. */
export function grazingAttachment(EngineClass = Engine): void {
    const e = new EngineClass(); e.load([{ row: 9, col: 3, color: 0 }]); e.aim(.05);
    assert.deepEqual(e.trace().struck, { row: 9, col: 3, color: 0 });
    assert.deepEqual(e.trace().target, { row: 9, col: 4, color: 0 });
    e.shoot(); e.advance(10000);
    assert.deepEqual(e.last.attached, { row: 9, col: 4, color: 0 });
}

/** After a wall bounce the shot climbs into the upper-side socket of the bubble it strikes; mirrored on the other wall. */
export function bounceUpperSocket(EngineClass = Engine): void {
    for (const [cell, angle, socket] of [[{ row: 4, col: 0 }, 0.81, { row: 3, col: 0 }], [{ row: 4, col: 8 }, -0.81, { row: 3, col: 7 }]] as const) {
        const e = new EngineClass(); e.load([{ ...cell, color: 0 }]);
        const path = e.trace(angle);
        assert.equal(path.segments.length, 2);
        assert.equal(path.segments[0]?.bounce, true);
        assert.deepEqual(path.struck, { ...cell, color: 0 });
        assert.deepEqual(path.target, { ...socket, color: 0 });
    }
    // The former radial rule found no socket here and lost the game on a free board.
    const e = new EngineClass(); e.load([{ row: 4, col: 0, color: 0 }]); e.aim(-1.13);
    assert.equal(e.trace().segments.length, 4);
    assert.deepEqual(e.trace().target, { row: 5, col: 0, color: 0 });
    e.shoot(); e.advance(10000);
    assert.equal(e.status, 'playing');
    assert.deepEqual(e.last.attached, { row: 5, col: 0, color: 0 });
}
