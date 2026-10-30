/* global URL */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { transpile } from './transpile.js';
import { Engine, STEP } from '../src/engines/alunir/engine.ts';
// Both historical modules come from the pinned revision, never from today's catalogue.
const historical = path => execFileSync('git', ['show', `eecddb7:${path}`], { encoding: 'utf8' });
const levels = `data:text/javascript,${encodeURIComponent(transpile(historical('src/engines/alunir/levels.ts')))}`;
const source = historical('src/engines/alunir/engine.ts')
    .replaceAll("'./levels'", JSON.stringify(levels))
    .replace("'../shared/random'", JSON.stringify(new URL('../src/engines/shared/random.ts', import.meta.url).href));
const { Engine: HistoricalEngine } = await import(`data:text/javascript,${encodeURIComponent(transpile(source))}`);
function compare(old, current) {
    const snapshot = current.snapshot();
    for (const [key, value] of Object.entries(old.snapshot())) assert.deepEqual(snapshot[key], value, `107 continuation ${old.level}/${key}`);
}
for (let level = 0; level < 30; level++) {
    const old = new HistoricalEngine(); old.loadLevel(level, 2026);
    old.input({ thrust: true, left: false, right: true }); old.step(STEP * 8);
    const saved = old.snapshot(); assert(saved.mission); assert.equal(saved.legacy, false);
    const current = new Engine(); current.loadState(saved);
    assert.equal(current.catalogueVersion, 107); assert.equal(current.nextGate(), undefined);
    for (const controls of [{ thrust: false, left: true, right: false }, { thrust: true, left: false, right: false }]) {
        old.input(controls); current.input(controls);
        for (let tick = 0; tick < 40; tick++) { old.step(STEP); current.step(STEP); compare(old, current); }
    }
    const copy = new Engine(); copy.loadState(current.snapshot()); copy.step(STEP); current.step(STEP); assert.deepEqual(copy.snapshot(), current.snapshot());
}
// The adverse review's safe approach used to become a loss after restoration.
const approach = new HistoricalEngine(); approach.loadLevel(1);
approach.loadState({ x: 185, y: 497.9, vx: 0, vy: 0.982 });
const restored = new Engine(); restored.loadState(approach.snapshot());
approach.step(STEP); restored.step(STEP); assert.equal(approach.status, 'won'); compare(approach, restored);
// Old rescue has no lateral prerequisite and retains its original centre.
const rescue = new HistoricalEngine(); rescue.loadLevel(10); rescue.loadState({ x: 90, y: 342, vx: 0, vy: 0 });
const resumed = new Engine(); resumed.loadState(rescue.snapshot()); rescue.step(STEP); resumed.step(STEP); compare(rescue, resumed);

// Restore completed service stops and old objectives at their old positions.
for (const [level, state] of [
    [3, { x: 90, y: 387.9, vx: 0, vy: 0.982 }],
    [12, { x: 180, y: 350, vx: 0, vy: 0 }],
    [15, { x: 90, y: 370, vx: 0, vy: 0 }],
]) {
    const old = new HistoricalEngine(); old.loadLevel(level); old.loadState(state); old.step(STEP);
    const current = new Engine(); current.loadLevel(24); current.loadState(old.snapshot());
    old.input({ thrust: true, left: false, right: false }); current.input(old.controls);
    for (let tick = 0; tick < 40; tick++) { old.step(STEP); current.step(STEP); compare(old, current); }
}
