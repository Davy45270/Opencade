import assert from 'node:assert/strict';
import { Engine, DT, type Input } from '../src/engines/ferraille/engine';
export interface Recording { code: string; level: number; seed: number; frames: number; inputs: [number, Input][]; checkpoints: [number, number][]; result: number }
/** Numeric digest covers the complete state, including timers and accumulator. */
export function witness(e: Engine): number {
    const source = JSON.stringify(e.snapshot()); let hash = 2166136261;
    for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
    return hash;
}
export function replay(record: Recording): void {
    const e = new Engine(); e.loadLevel(record.level, record.seed);
    let cursor = 0, checkpoint = 0;
    for (let frame = 0; frame < record.frames; frame++) {
        const expected = record.checkpoints[checkpoint];
        if (expected?.[0] === frame) { assert.equal(witness(e), expected[1], `${record.code} frame ${String(frame)}`); checkpoint++; }
        const next = record.inputs[cursor];
        if (next?.[0] === frame) { e.input(next[1]); cursor++; }
        e.step(DT);
    }
    assert.equal(checkpoint, record.checkpoints.length); assert.equal(e.status, 'won'); assert.equal(witness(e), record.result);
}
