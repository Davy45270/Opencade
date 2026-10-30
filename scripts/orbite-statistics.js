import assert from 'node:assert/strict';
const { Engine, TICK } = await import('../src/engines/orbite/engine.ts');
/** Long audits belong in Node, outside every individual unit test. */
export function statistics() {
    let appearances = 0;
    const directions = new Set();
    for (let i = 0; i < 400; i++) {
        const e = new Engine(0, i * 7919);
        const base = { ...e.state, probes: [{ id: 0, x: 180, y: 200, row: 0, column: 0, hp: 1 }], initialCount: 1, shields: [], shots: [], enemyTimer: 1000000, cometTimer: 0 };
        e.loadState(base); e.step(TICK);
        if (e.state.comet) { appearances++; directions.add(e.state.comet.direction); assert.equal(e.state.comet.y, 56); }
        e.loadLevel(0, i * 7919); e.loadState({ ...base, comet: { x: 180, y: 56, direction: 1 } }); e.step(TICK);
        assert.ok(Math.abs(e.state.comet.x - 181.58333333333334) < 0.000001);
        e.loadLevel(0, i * 7919); e.loadState({ ...base, probes: [{ ...base.probes[0], y: 56 }] }); e.step(TICK); assert.equal(e.state.comet, null);
    }
    assert.ok(appearances > 65 && appearances < 110); assert.deepEqual([...directions].sort(), [-1, 1]);
    return { seeds: 400, appearances, directions: [...directions].sort() };
}
