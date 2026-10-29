import assert from './bubble-assert';
import { Engine } from '../src/engines/bubble/engine';
export function facingAttachment(EngineClass = Engine): void {
    const e = new EngineClass(); e.load([{ row: 9, col: 3, color: 0 }]); e.aim(.05);
    assert.deepEqual(e.trace().struck, { row: 9, col: 3, color: 0 });
    assert.deepEqual(e.trace().target, { row: 10, col: 4, color: 0 });
    e.shoot(); e.advance(10000);
    assert.deepEqual(e.last.attached, { row: 10, col: 4, color: 0 });
}

/** Translated grid around the launcher: no socket is reachable without crossing a bubble. */
export function clearSettlingPath(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{ row: 7, col: 4, color: 0 }, { row: 8, col: 4, color: 0 }]);
    e.drops = 7; e.aim(.61);
    assert.deepEqual(e.trace().struck, { row: 7, col: 4, color: 0 });
    assert.equal(e.trace().target, null);
    assert.equal(e.shoot(), true); e.advance(10000);
    assert.equal(e.last.attached, null);
    assert.equal(e.status, 'lost');
}
