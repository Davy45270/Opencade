/* global console, performance, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpile } from './transpile.js';
import { Engine } from '../src/engines/collier/engine.ts';
import { fieldView } from '../src/games/collier/presentation.ts';
import { readDriver } from '../src/games/collier/driver.ts';
import { decision } from '../tests/e2e/collier-policy.ts';
import { FingerClock } from '../tests/e2e/finger-clock.ts';

// Measure construction + wire serialization, not a fictitious browser/CDP delay.
function measure(read, repetitions = 300) {
    const start = performance.now();
    let bytes = 0;
    for (let i = 0; i < repetitions; i++) bytes = JSON.stringify(read()).length;
    return { ms: (performance.now() - start) / repetitions, bytes };
}
for (const level of [0, 4]) {
    const e = new Engine(level, 300);
    e.step(150);
    const view = fieldView(e.config);
    const before = measure(() => ({ ...e.snapshot(), paths: [] }));
    const after = measure(() => readDriver(e));
    // The lightweight hook must agree with real engine targets and never call snapshot.
    const snapshot = e.snapshot();
    const original = e.snapshot;
    e.snapshot = () => { throw new Error('Full snapshot forbidden while driving'); };
    const minimal = readDriver(e);
    e.snapshot = original;
    assert.deepEqual(minimal.chains.map(c => c.beads.map(b => ({ id: b.id, color: b.color, s: b.s, x: b.x, y: b.y, hidden: b.hidden }))), snapshot.chains.map(c => c.beads.map(b => ({
        id: b.id, color: b.color, s: b.s, x: b.x, y: b.y, hidden: b.hidden
    }))));
    assert.ok(!('paths' in minimal) && !('bursts' in minimal));
    const clock = new FingerClock();
    let seed = 300, ms = 150, swaps = 0;
    let lastInput = null;
    const intervals = [];
    const frameMs = 50;
    const readMs = 200, sendMs = 200, latencyMs = 150;
    const step = wallMs => {
        for (let frame = 0; frame < wallMs / frameMs; frame++) e.step(frameMs);
        ms += wallMs;
    };
    const noise = () => {
        seed = seed * 16807 % 2147483647;
        return seed % 25 - 12;
    };
    // Software renderer at 20 fps; read + CDP cost 400 wall milliseconds.
    // Every wait advances real physics, with no fast-forward shortcut in the pilot.
    while (ms < 120000 && e.status === 'playing') {
        step(readMs);
        const state = readDriver(e);
        const horizon = clock.observe(state);
        const aim = state.flight ? null : decision(state, view, horizon);
        if (!aim) {
            step(latencyMs);
            continue;
        }
        step(latencyMs);
        const forcedSwap = swaps === 0 && !aim.swap;
        if (swaps === 0 || aim.swap) {
            step(sendMs);
            e.swap();
            swaps++;
        }
        if (!forcedSwap) {
            step(sendMs);
            const x = aim.x + noise() / (.975 * view.scale);
            const y = aim.y + noise() / (.975 * view.scale);
            e.aim(Math.atan2(y - e.config.shooter.y, x - e.config.shooter.x));
            assert.ok(e.shoot(), 'A shot must be accepted');
        }
        if (lastInput !== null) intervals.push(state.gameTimeMs - lastInput);
        lastInput = state.gameTimeMs;
    }
    assert.ok(Math.max(...intervals) <= 1500, 'Input cadence in game milliseconds');
    assert.equal(e.status, 'won', `Politique tactile 20 images/s, niveau ${level + 1}`);
    assert.ok(ms < 120000, 'Marge de deux sous le délai E2E de 240s');
    console.log(`Politique doigt en Node : niveau ${level + 1}, ${ms} ms simulées, ${e.shots} tirs, ${swaps} échanges`);
    console.log(JSON.stringify({ level: level + 1, nodeRead: { before, after }, latency: latencyMs,
        frameMs, readMs, sendMs, iterationMs: readMs + latencyMs + sendMs,
        maxInputInterval: Math.max(...intervals), victoryMs: ms, shots: e.shots }));
}

// Execute the actual gesture body with a CDP double that withholds all replies.
// Awaiting even the first packet before queuing the others fails this oracle.
const source = readFileSync(new URL('../tests/e2e/collier-finger.spec.ts', import.meta.url), 'utf8');
const gesture = source.slice(source.indexOf('async function tap('), source.indexOf('        try {'));
const packets = [], replies = [];
const entries = [];
const gestureContext = {
    cdp: { send: (method, params) => {
        packets.push({ method, ...params });
        return new Promise(resolve => replies.push(resolve));
    } },
    bounds: { x: 0, y: 0, width: 390, height: 844 },
    performance: { now: () => 550 }, started: 0,
    lastInput: null, iterationInterval: null, wallInterval: null,
    finger: { entries }, inputGameTimes: []
};
const tap = runInNewContext(`${transpile(gesture)}; tap`, gestureContext);
const point = { id: 0, x: 100, y: 200 };
const pending = tap(point, 350, true);
assert.deepEqual(packets.map(p => p.type), ['touchStart', 'touchMove', 'touchEnd']);
assert.ok(packets.every(p => p.method === 'Input.dispatchTouchEvent'));
assert.deepEqual(Array.from(packets[0].touchPoints), [point]);
assert.deepEqual(Array.from(packets[1].touchPoints), [point]);
assert.equal(packets[2].touchPoints.length, 0);
replies.forEach(resolve => resolve());
await pending;
assert.equal(entries.length, 1);
assert.equal(entries[0].missed, false);
gestureContext.performance.now = () => 2550;
const reserveTap = tap(point, 450);
assert.deepEqual(packets.slice(3).map(p => p.type), ['touchStart', 'touchEnd']);
replies.slice(3).forEach(resolve => resolve());
await reserveTap;
assert.equal(gestureContext.iterationInterval, 100, 'Cadence uses game time');
assert.equal(gestureContext.wallInterval, 2000, 'Wall time remains informational');

const clock = new FingerClock();
assert.equal(clock.observe({ gameTimeMs: 1000 }), 150);
assert.equal(clock.observe({ gameTimeMs: 1400 }), 400);
assert.equal(clock.observe({ gameTimeMs: 1400 }), 150);
assert.equal(clock.elapsed, 400);
const ticks = new FingerClock();
ticks.observe({ ticks: 60 });
assert.equal(ticks.observe({ ticks: 90 }), 500);
console.log('Geste CDP : trois paquets en ordre, aucune attente intermédiaire ; horloge de jeu validée.');

const target = {
    current: 0, next: 0, shooter: { x: 180, y: 350 },
    chains: [{ beads: [{ id: 1, color: 0, s: 0, x: 260, y: 200,
        hidden: false, vx: -20, vy: 0 }] }]
};
const immediate = decision(target);
const predicted = decision(target, undefined, 500);
assert.ok(immediate && predicted);
const angle = aim => Math.atan2(aim.y - 350, aim.x - 180);
assert.ok(Math.abs(angle(predicted) - Math.atan2(-150, 70)) < .000001);
assert.ok(Math.abs(angle(predicted) - angle(immediate)) > .01,
    'The reaction horizon must change the target direction');
