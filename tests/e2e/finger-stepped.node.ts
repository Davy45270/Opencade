// Browser-free: nice -n 19 ionice -c3 node --import ./scripts/ts-loader.js --test tests/e2e/finger-stepped.node.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Page, CDPSession } from '@playwright/test';
import type { Inputs } from '../../src/shell/input';
import { Engine as EmpiloEngine } from '../../src/engines/empilo/engine';
import { GameCharacter } from '../../src/characters/game';
import { fingerReceipts } from '../../src/games/finger-receipts';
import { Engine as ArtificiersEngine, chooseShot } from '../../src/engines/artificiers/engine';
import { AimDriver } from '../../src/games/artificiers/driver';
import { WORLD_SCALE } from '../../src/games/artificiers/art';
import { aimShot } from './artificiers-finger-gesture';
import { Finger, performanceMetrics, received } from './finger-stepped';

type Point = { id: number; x: number; y: number };

void test('stepped finger regressions without a browser', async t => {
    const globals = ['window', 'document', 'location'] as const;
    const previous = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    function define(key: string, value: unknown) { Object.defineProperty(globalThis, key, { configurable: true, value }); }
    async function setup(seed = 109, game = 'dedale', level = 0) {
        const listeners = new Map<string, EventListener>();
        define('location', { search: '?test=1' });
        define('window', {});
        const width = game === 'artificiers' ? 358 : 200, height = game === 'artificiers' ? 640 * 358 / 360 : 200;
        let currentSelector = '#game canvas';
        define('document', {
            querySelector: (selector: string) => { currentSelector = selector; return { getBoundingClientRect: () => ({ x: 0, y: 0, width, height }) }; },
            elementFromPoint: () => ({ closest: () => true }),
        });
        define('window', {}); // finger-receipts listens on window (capture phase); the hook is installed below.
        const receipts = fingerReceipts({ on: (_target: unknown, type: string, listener: EventListener) => listeners.set(type, listener) } as unknown as Inputs);
        const engine = new ArtificiersEngine(level, 220), driver = new AimDriver(engine);
        const state = { status: 'playing', requested: 'up', ticks: 0, inFlight: false, shots: 0,
            fingerInput: { paused: false, held: [] as string[], aiming: null as { id: number; x: number; y: number } | null, aimingPointer: null as number | null } };
        let manual = false, installed = false, paused = false;
        const hook = { read: () => structuredClone({ ...state, ...(game === 'artificiers' ? engine.snapshot() : {}), fingerInput: { ...state.fingerInput, receipts: receipts() } }), advance: (ms: number) => { manual = true; state.ticks += ms; if (game === 'artificiers') engine.advance(ms); } };
        define('window', { __ARCADE_TEST__: { current: () => game, games: { [game]: hook } } });
        const clockCalls: unknown[] = [], packets: { type: string; touchPoints: Point[]; at: number }[] = [];
        const page = { clock: {
            install: (value: unknown) => { installed = true; clockCalls.push(['install', value]); return Promise.resolve(); },
            pauseAt: (value: unknown) => { assert.ok(installed && manual); paused = true; clockCalls.push(['pauseAt', value]); return Promise.resolve(); },
            runFor: (value: number) => { assert.ok(paused); if (!manual) state.ticks += value; clockCalls.push(['runFor', value]); return Promise.resolve(); },
        }, evaluate: <A, R>(fn: (arg: A) => R, arg: A) => Promise.resolve(fn(arg)) } as unknown as Page;
        let active: Point[] = [];
        const dropped = new Set<number>(); // Packet numbers to drop in full.
        const droppedFingers = new Set<number>();
        const cdp = { send: (_method: string, payload: { type: string; touchPoints: Point[] }) => {
            assert.ok(paused && manual);
            if (payload.type !== 'touchStart') assert.ok(active.length, `${payload.type} sans touchStart ouvert`);
            else assert.equal(active.length, 0, 'Le toucher précédent doit être fermé');
            packets.push({ ...structuredClone(payload), at: state.ticks });
            if (dropped.has(packets.length)) return Promise.resolve();
            const points = payload.type === 'touchEnd' ? active : payload.touchPoints;
            for (const point of points) {
                if (droppedFingers.has(point.id)) continue;
                const type = payload.type === 'touchStart' ? 'pointerdown' : payload.type === 'touchMove' ? 'pointermove' : 'pointerup';
                listeners.get(type)?.({ pointerType: 'touch', clientX: point.x, clientY: point.y } as unknown as Event);
                if (game === 'artificiers') {
                    // Match the mobile canvas projection used by the spec.
                    const p = { id: point.id, x: point.x / width * 360, y: point.y / height * 640 / WORLD_SCALE };
                    const selector = currentSelector;
                    if (selector === '#artificiers-weapon' && payload.type === 'touchStart') engine.cycleWeapon();
                    if (selector.includes('canvas')) {
                        if (payload.type === 'touchStart' && driver.down(p)) state.fingerInput.aiming = { id: p.id, x: p.x, y: p.y * WORLD_SCALE };
                        if (payload.type === 'touchMove') { driver.move(p); if (state.fingerInput.aiming) state.fingerInput.aiming = { id: p.id, x: p.x, y: p.y * WORLD_SCALE }; }
                        if (payload.type === 'touchEnd') { driver.up(p); state.fingerInput.aiming = null; }
                    }
                }
                if (payload.type === 'touchStart') {
                    state.requested = 'right'; state.fingerInput.held.push(point.id === 0 ? 'alunir-left' : 'alunir-thrust');
                    state.fingerInput.aimingPointer = point.id;
                }
                if (payload.type === 'touchEnd') {
                    state.fingerInput.held = []; state.fingerInput.aimingPointer = null;
                    if (game === 'bubble') state.shots++;
                }
            }
            active = payload.touchPoints;
            return Promise.resolve();
        } } as unknown as CDPSession;
        await Finger.prepare(page);
        const finger = await Finger.create(page, cdp, seed);
        async function report() {
            let body = '';
            await finger.attach({ attach: (_name, options) => { body = String(options?.body); return Promise.resolve(); } });
            return JSON.parse(body) as { fingerprint: number; misses: number; final: unknown };
        }
        return { finger, state, engine, packets, clockCalls, dropped, droppedFingers, report };
    }
    try {
        await t.test('seed, both noise axes, input latency and clock protocol', async () => {
            async function run(seed: number) {
                const f = await setup(seed);
                for (let i = 0; i < 4; i++) await f.finger.press(['#dedale-right']);
                return { packets: f.packets, entries: f.finger.entries, report: await f.report(), clockCalls: f.clockCalls };
            }
            const first = await run(109), second = await run(109), other = await run(110);
            assert.deepEqual(first, second);
            assert.notDeepEqual(first.packets, other.packets);
            assert.deepEqual(first.packets.map(packet => packet.at), [150, 150, 300, 300, 450, 450, 600, 600]);
            assert.deepEqual(first.clockCalls.slice(0, 2), [['install', { time: 0 }], ['pauseAt', 3600000]]);
            assert.ok(first.clockCalls.slice(2).every(call => JSON.stringify(call) === JSON.stringify(['runFor', 17])));
            let verticalNoise = false;
            for (const entry of first.entries) {
                assert.equal(entry.missed, false);
                entry.points.forEach((point, i) => {
                    const intended = entry.intended[i], noise = entry.noise[i];
                    assert.ok(intended && noise);
                    assert.ok(Math.abs(noise.x) <= 12 && Math.abs(noise.y) <= 12);
                    assert.equal(point.x, intended.x + noise.x);
                    assert.equal(point.y, intended.y + noise.y);
                    verticalNoise ||= noise.y !== 0;
                });
            }
            assert.ok(verticalNoise);
        });
        await t.test('loss of first start, repeated successful direction, and release increments report misses', async () => {
            for (const packet of [1, 3, 4]) {
                const f = await setup();
                if (packet > 1) await f.finger.press(['#dedale-right']);
                f.dropped.add(packet);
                if (packet === 4) await f.finger.steer(['#dedale-right']);
                await assert.rejects(packet === 4 ? f.finger.release() : f.finger.steer(['#dedale-right']), /toucher perdu/);
                assert.equal((await f.report()).misses, 1);
                assert.equal(f.finger.entries.at(-1)?.missed, true);
            }
        });
        await t.test('each finger needs its own start and release receipt even if held state already matches', async () => {
            for (const release of [false, true]) {
                const f = await setup(109, 'alunir');
                const selectors = ['#alunir-left', '#alunir-thrust'];
                if (release) await f.finger.steer(selectors);
                else f.state.fingerInput.held = ['alunir-left', 'alunir-thrust'];
                f.droppedFingers.add(1);
                await assert.rejects(release ? f.finger.release() : f.finger.steer(selectors), /toucher perdu/);
                assert.equal((await f.report()).misses, 1);
            }
        });
        await t.test('lost move fails even when its desired direction persists', async () => {
            const f = await setup();
            await f.finger.steer(['#dedale-right']);
            f.dropped.add(2);
            await assert.rejects(f.finger.touch('touchMove', [{ id: 0, x: 110, y: 100 }], ['#dedale-right']), /toucher perdu/);
            assert.equal((await f.report()).misses, 1);
        });
        await t.test('semantic direction evidence remains required after receipt', () => {
            assert.equal(received('dedale', '#dedale-right', {}, { requested: 'up' }), false);
            assert.equal(received('dedale', '#dedale-right', {}, { requested: 'right' }), true);
        });
        await t.test('Artificiers aiming and weapon evidence accepts effects and rejects stale or missing state', () => {
            const target = { x: 120, y: 240, screenX: 80, screenY: 90, dx: 0, dy: 0 };
            const before = { weapon: 0 };
            assert.equal(received('artificiers', '#artificiers-weapon', before, { weapon: 1 }), true);
            assert.equal(received('artificiers', '#artificiers-weapon', before, before), false);
            for (const aiming of [null, { x: 124, y: 240 }, { x: 120, y: 244 }]) {
                assert.equal(received('artificiers', '#game canvas', {}, { fingerInput: { aiming } }, target), false);
            }
            assert.equal(received('artificiers', '#game canvas', {}, {}, target), false);
            assert.equal(received('artificiers', '#game canvas', {}, { fingerInput: { aiming: { x: 120, y: 240 } } }), false);
            assert.equal(received('artificiers', '#artificiers-rope', before, { weapon: 1 }), false);
            assert.equal(received('artificiers', '#game canvas', {}, { fingerInput: { aiming: { x: 120.5, y: 239.5 } } }, target), true);
        });
        await t.test('Artificiers spec gestures replay against strict CDP, including buttons, repeated shots and final cleanup', async () => {
            for (const level of [0, 9]) {
                const f = await setup(73, 'artificiers', level);
                await f.finger.press(['#resume']);
                let shots = 0;
                // Use the real engine, decision pilot, noisy helper and complete spec gesture.
                for (let action = 0; action < 25; action++) {
                    await f.finger.until(() => Promise.resolve(f.engine.status !== 'playing' || (f.engine.phase === 'aim' && f.engine.actor.team === 0)));
                    if (f.engine.status !== 'playing') break;
                    const model = new ArtificiersEngine(); model.restore(f.engine.snapshot());
                    const shot = chooseShot(model);
                    for (let cycle = 0; f.engine.weapon !== shot.weapon && cycle < 6; cycle++) await f.finger.press(['#artificiers-weapon']);
                    assert.equal(f.engine.weapon, shot.weapon);
                    const hero = f.engine.actor;
                    const point = (x: number, y: number) => ({ id: 7, x: x * 358 / 360, y: y * WORLD_SCALE * 358 / 360 });
                    const prior = f.engine.shots, packetStart = f.packets.length, gameTime = f.state.ticks;
                    await aimShot(f.finger, point(hero.x, hero.y), point(hero.x + Math.cos(shot.angle) * shot.power / 1.25, hero.y + Math.sin(shot.angle) * shot.power / 1.25), () => {
                        assert.equal(f.engine.shots, prior); return Promise.resolve();
                    });
                    assert.equal(f.engine.shots, prior + 1);
                    assert.deepEqual(f.packets.slice(packetStart).map(p => [p.type, p.at - gameTime]), [['touchStart', 150], ['touchMove', 300], ['touchEnd', 450]]);
                    assert.deepEqual(f.finger.entries.slice(-3).map(e => [e.type, e.missed]), [['touchStart', false], ['touchMove', false], ['touchEnd', false]]);
                    shots++;
                    await f.finger.advance(100);
                }
                await f.finger.release(); await f.finger.release();
                assert.ok(shots > 0);
                assert.equal(f.engine.status, 'won');
                assert.equal((await f.report()).misses, 0);
                assert.ok(f.finger.advances.every(a => a.ms === 150 || a.ms === 100));
            }
        });
        await t.test('fingerprint changes with final state and every individual entry', async () => {
            const f = await setup();
            await f.finger.press(['#dedale-right']);
            await f.finger.press(['#dedale-right']);
            const original = (await f.report()).fingerprint;
            assert.ok(Number.isInteger(original));
            f.state.status = 'won';
            assert.notEqual((await f.report()).fingerprint, original);
            f.state.status = 'playing';
            for (const entry of f.finger.entries) {
                entry.timeMs++;
                assert.notEqual((await f.report()).fingerprint, original);
                entry.timeMs--;
            }
            assert.equal((await f.report()).fingerprint, original);
        });
        await t.test('Bubble release has 150 game ms latency after the firing decision', async () => {
            const f = await setup(109, 'bubble');
            // A button avoids needing a geometric aiming model in this transport test.
            await f.finger.touch('touchStart', [{ id: 0, x: 100, y: 100 }], ['#resume']);
            const observed = await f.finger.read();
            assert.equal(observed.shots, 0);
            await f.finger.release();
            assert.equal(f.state.shots, 1);
            assert.deepEqual(f.packets.map(packet => packet.at), [150, 300]);
        });
        await t.test('replacement shares its reaction time; a release decided in a callback waits again', async () => {
            const f = await setup();
            await f.finger.steer(['#dedale-right']);
            await f.finger.steer(['#dedale-right']);
            await f.finger.steer([]);
            assert.deepEqual(f.packets.map(packet => packet.at), [150, 300, 300, 450]);
            const tap = await setup();
            await tap.finger.press(['#dedale-right'], async () => { assert.equal((await tap.finger.read()).ticks, 150); });
            assert.deepEqual(tap.packets.map(packet => packet.at), [150, 300]);
        });
        await t.test('until observes the final allowed step, including zero-step boundary', async () => {
            const f = await setup();
            let observations = 0;
            await f.finger.until(() => { observations++; return Promise.resolve(f.state.ticks === 150); }, 1);
            assert.equal(observations, 2);
            await f.finger.until(() => Promise.resolve(true), 0);
            await assert.rejects(f.finger.until(() => Promise.resolve(false), 0), /Budget/);
            assert.equal(f.state.ticks, 150);
        });
        await t.test('pure performance ratio and warning at 1, 20, 30 and 60 fps', () => {
            for (const fps of [1, 20, 30, 60]) {
                const result = performanceMetrics(fps * 5, 1250, 5000);
                assert.equal(result.fps, fps);
                assert.equal(result.gameToRealRatio, .25);
                assert.equal(result.thresholdFps, 30);
                assert.equal(result.warning, fps < 30 ? `Rendu inférieur au seuil indicatif de 30 i/s : ${fps.toFixed(2)}` : null);
            }
            assert.equal(performanceMetrics(0, 0, 5000).gameToRealRatio, 0);
            assert.equal(performanceMetrics(300, 5000, 5000).gameToRealRatio, 1);
            assert.throws(() => performanceMetrics(1, 1, 0), /Mesure invalide/);
            const engine = new EmpiloEngine(), hero = new GameCharacter();
            const initialY = engine.state.active.y;
            for (let frame = 0; frame < 300; frame++) {
                engine.step(1000 / 60);
                hero.advance(1000 / 60, false, engine.status, false);
            }
            assert.ok(engine.state.active.y > initialY);
            assert.equal(engine.state.timeLeft ?? 0, 0); // Initial level has no timer.
            assert.ok(Math.abs(hero.time - 5000) < .001);
            assert.ok(Math.abs(performanceMetrics(100, hero.time, 10000).gameToRealRatio - .5) < .001);
            const scene = readFileSync(new URL('../../src/games/empilo/scene.ts', import.meta.url), 'utf8');
            assert.match(scene, /performance: \(\) => \(\{ frames: this.game.loop.frame, gameMs: this.hero.time \}\)/);
            assert.match(scene, /this.hero.advance\(delta, this.session.paused \|\| this.selecting/);
            const spec = readFileSync(new URL('./perf-fps.spec.ts', import.meta.url), 'utf8');
            assert.match(spec, /\.\.\.performanceMetrics\(measurement.renderedFrames, measurement.gameMs, measurement.realMs\)/);
        });
    } finally {
        globals.forEach((key, i) => { const descriptor = previous[i]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); });
    }
});
