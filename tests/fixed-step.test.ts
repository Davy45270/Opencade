import assert from 'node:assert/strict';
import { test } from 'vitest';
import { FixedStep } from '../src/engines/shared/fixed-step';

const STEP = 1000 / 60;

test('one tick per whole step, the remainder carried to the next call', () => {
    const clock = new FixedStep(STEP, 1e-6);
    assert.equal(clock.advance(STEP * 2.5, () => true), 2);
    assert.ok(Math.abs(clock.rest - STEP / 2) < 1e-9);
    assert.equal(clock.advance(STEP / 2, () => true), 1);
    assert.equal(clock.rest, 0);
    assert.equal(clock.advance(STEP - 1, () => true), 0);
    assert.equal(clock.rest, STEP - 1);
});

test('sixty frames of 1000 / 60 ms make sixty ticks despite rounding', () => {
    const clock = new FixedStep(STEP, 1e-6);
    let ticks = 0;
    for (let frame = 0; frame < 60; frame++) ticks += clock.advance(1000 / 60, () => true);
    assert.equal(ticks, 60);
    assert.equal(clock.rest, 0);
    // A remainder just under one step, within epsilon, still ticks.
    assert.equal(new FixedStep(STEP, 1e-6).advance(STEP - 5e-7, () => true), 1);
    assert.equal(new FixedStep(STEP, 1e-6).advance(STEP - 5e-6, () => true), 0);
});

test('a tick returning false stops at once and drops the remainder', () => {
    const clock = new FixedStep(STEP, 1e-6);
    let calls = 0;
    assert.equal(clock.advance(STEP * 5.5, () => ++calls < 2), 2);
    assert.equal(calls, 2);
    assert.equal(clock.rest, 0);
});

test('a zero-length frame runs nothing and keeps the remainder', () => {
    const clock = new FixedStep(STEP, 1e-6);
    clock.advance(5, () => true);
    assert.equal(clock.advance(0, () => assert.fail('no tick')), 0);
    assert.equal(clock.rest, 5);
});
