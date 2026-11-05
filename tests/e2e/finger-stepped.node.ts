// Browser-free: nice -n 19 ionice -c3 node --import ./scripts/ts-loader.js --test tests/e2e/finger-stepped.node.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Page, CDPSession } from '@playwright/test';
import type { Inputs } from '../../src/shell/input';
import { Engine as EmpiloEngine } from '../../src/engines/empilo/engine';
import { GameCharacter } from '../../src/characters/game';
import { fingerReceipts, type FingerProof, type FingerState } from '../../src/games/finger-receipts';
import { fingerProof as dedaleProof } from '../../src/games/dedale/finger';
import { fingerProof as alunirProof } from '../../src/games/alunir/finger';
import { fingerProof as bubbleProof } from '../../src/games/bubble/finger';
import { fingerProof as ferrailleProof } from '../../src/games/ferraille/finger';
import { fingerProof as derapageProof } from '../../src/games/derapage/finger';
import { fingerProof as orbiteProof } from '../../src/games/orbite/finger';
import { fingerProof as essaimProof } from '../../src/games/essaim/finger';
import { fingerProof as serpentinProof } from '../../src/games/serpentin/finger';
import { fingerProof as traverseProof } from '../../src/games/traverse/finger';
import { fingerProof as briqueterieProof } from '../../src/games/briqueterie/finger';
import { fingerProof as caissesProof } from '../../src/games/caisses/finger';
import { fingerProof as empiloProof } from '../../src/games/empilo/finger';
import { fingerProof as artificiersProof } from '../../src/games/artificiers/finger';
import { fingerProof as gourmandisesProof } from '../../src/games/gourmandises/finger';
import { Engine as ArtificiersEngine, chooseShot } from '../../src/engines/artificiers/engine';
import { AimDriver } from '../../src/games/artificiers/driver';
import { WORLD_SCALE } from '../../src/games/artificiers/art';
import { aimShot } from './artificiers-finger-gesture';
import { Finger, performanceMetrics } from './finger-stepped';

type Point = { id: number; x: number; y: number };

void test('stepped finger regressions without a browser', async t => {
    const globals = ['window', 'document', 'location'] as const;
    const previous = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    function define(key: string, value: unknown) { Object.defineProperty(globalThis, key, { configurable: true, value }); }
    const proofs: Record<string, FingerProof> = { dedale: dedaleProof, alunir: alunirProof, bubble: bubbleProof, artificiers: artificiersProof, gourmandises: gourmandisesProof };
    async function setup(seed = 109, game = 'dedale', level = 0, proof: FingerProof = proofs[game] ?? {}) {
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
        const hook = { ...proof, fingerReceipts: receipts, read: () => structuredClone({ ...state, ...(game === 'artificiers' ? engine.snapshot() : {}) }), advance: (ms: number) => { manual = true; state.ticks += ms; if (game === 'artificiers') engine.advance(ms); } };
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
        return { finger, state, engine, packets, clockCalls, dropped, droppedFingers, report, receipt: () => listeners.get('pointerdown')?.({ pointerType: 'touch', clientX: 10, clientY: 20 } as unknown as Event), receipts };
    }
    try {
        await t.test('raw receipts change neither read() nor the report fingerprint', async () => {
            const f = await setup();
            const before = await f.finger.read(), report = await f.report();
            f.receipt();
            assert.equal(f.receipts().sequence, 1);
            assert.deepEqual(await f.finger.read(), before);
            assert.deepEqual(await f.report(), report);
            assert.doesNotMatch(JSON.stringify(report.final), /receipts/);
        });
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
            assert.equal(dedaleProof.fingerReceived('#dedale-right', {}, { requested: 'up' }), false);
            assert.equal(dedaleProof.fingerReceived('#dedale-right', {}, { requested: 'right' }), true);
        });
        await t.test('migrated scene evidence accepts its effect and rejects an unchanged command', () => {
            const target = { x: 180, y: 400, screenX: 101, screenY: 203, dx: 1, dy: 0 };
            const cases: [FingerProof, string, FingerState, FingerState, FingerState][] = [
                [alunirProof, '#alunir-left', {}, { fingerInput: { held: ['alunir-left'] } }, { fingerInput: { held: [] } }],
                [ferrailleProof, '.joystick', {}, { fingerInput: { controls: { x: 1, y: 0 } } }, { fingerInput: { controls: { x: 0, y: 0 } } }],
                [ferrailleProof, '#ferraille-jump', {}, { fingerInput: { controls: { jump: true } } }, { fingerInput: { controls: { jump: false } } }],
                [ferrailleProof, '#ferraille-fire', {}, { fingerInput: { controls: { fire: true } } }, { fingerInput: { controls: { fire: false } } }],
                [derapageProof, '#game canvas', {}, { fingerInput: { thumb: { x: 1, y: 3, dx: 100, dy: 200 } } }, { fingerInput: { thumb: null } }],
                [dedaleProof, '#dedale-right', {}, { requested: 'right' }, { requested: 'up' }],
                [serpentinProof, '#serpentin-right', {}, { direction: 'up', queue: ['right'] }, { direction: 'up', queue: [] }],
                [traverseProof, '#traverse-right', {}, { queue: ['right'] }, { queue: [] }],
                [orbiteProof, '#orbite-fire', {}, { fingerInput: { firing: true } }, { fingerInput: { firing: false } }],
                [orbiteProof, '#game canvas', {}, { target: 180 }, { target: 160 }],
                [essaimProof, '#essaim-fire', {}, { fingerInput: { firing: true } }, { fingerInput: { firing: false } }],
                // Relative steering: origin + (x - start) × ratio = 170 + (180 - 160) × .5 = 180.
                [essaimProof, '#essaim-steer', { cannon: 180 }, { target: 180, fingerInput: { steer: { origin: 170, start: 160, ratio: .5 } } }, { target: 190, fingerInput: { steer: { origin: 170, start: 160, ratio: .5 } } }],
                [essaimProof, '#game canvas', {}, { target: 180 }, { target: 160 }],
                [bubbleProof, '#game canvas', {}, { angle: 0, fingerInput: { aimingPointer: 0 } }, { angle: 0, fingerInput: { aimingPointer: null } }],
                [caissesProof, '#game canvas', { moves: 0, fingerInput: { down: true } }, { moves: 1, fingerInput: { down: true } }, { moves: 0, fingerInput: { down: true } }],
                [empiloProof, '#game canvas', { dealt: 0, fingerInput: { down: true } }, { dealt: 1, fingerInput: { down: true } }, { dealt: 0, fingerInput: { down: true } }],
                [gourmandisesProof, '#gourmandises-hammer', {}, { armedTool: 'hammer' }, { armedTool: null }],
                [gourmandisesProof, '#game canvas', {}, { fingerInput: { down: { x: 180, y: 400 } } }, { fingerInput: { down: null } }],
            ];
            for (const [proof, selector, before, accepted, rejected] of cases) {
                assert.ok(typeof proof.fingerReceived === 'function');
                assert.equal(proof.fingerReceived(selector, before, accepted, target), true, selector);
                assert.equal(proof.fingerReceived(selector, before, rejected, target), false, selector);
                assert.equal(proof.fingerReceived('#example-special', { specialUses: 0 }, { specialUses: 1 }), true);
                assert.equal(proof.fingerReceived('#example-special', { specialUses: 0 }, { specialUses: 0 }), false);
            }
            assert.equal(caissesProof.fingerReceived('#caisses-special', {}, { fingerInput: { pulling: true } }), true);
            // Caisses: the swipe's landing is received once, then only a move proves the gesture.
            assert.equal(caissesProof.fingerReceived('#game canvas', { fingerInput: { down: false } }, { fingerInput: { down: true } }, target), true);
            assert.equal(caissesProof.fingerReceived('#game canvas', { fingerInput: { down: false } }, { fingerInput: { down: false } }, target), false);
            // Briqueterie: relative drag in the lower third, a tap above it (launch proven on release).
            const low = { ...target, y: 600 };
            assert.equal(briqueterieProof.fingerReceived('#game canvas', {}, { paddle: 180, width: 40, fingerInput: { drag: { origin: 170, start: 170 } } }, low), true);
            assert.equal(briqueterieProof.fingerReceived('#game canvas', {}, { paddle: 160, width: 40, fingerInput: { drag: { origin: 170, start: 170 } } }, low), false);
            assert.equal(briqueterieProof.fingerReleased(['#game canvas'], { ready: true, fingerInput: { drag: null } }, { ready: false }), true);
            assert.equal(briqueterieProof.fingerReleased(['#game canvas'], { ready: true, fingerInput: { drag: null } }, { ready: true }), false);
            for (const [proof, idle, held] of [
                [alunirProof, { held: [] }, { held: ['alunir-left'] }],
                [ferrailleProof, { controls: { x: 0, y: 0, jump: false, fire: false } }, { controls: { x: 1 } }],
                [derapageProof, { thumb: null }, { thumb: {} }],
                [orbiteProof, { firing: false }, { firing: true }],
                [essaimProof, { firing: false }, { firing: true }],
            ] as [FingerProof, unknown, unknown][]) {
                assert.ok(typeof proof.fingerReleased === 'function');
                assert.equal(proof.fingerReleased(['#game canvas'], {}, { fingerInput: idle }), true);
                assert.equal(proof.fingerReleased(['#game canvas'], {}, { fingerInput: held }), false);
            }
            assert.equal(bubbleProof.fingerReleased(['#game canvas'], { inFlight: false, shots: 2, fingerInput: { aimingPointer: 0 } }, { shots: 3 }), true);
            assert.equal(bubbleProof.fingerReleased(['#game canvas'], { inFlight: false, shots: 2, fingerInput: { aimingPointer: 0 } }, { shots: 2 }), false);
            assert.equal(bubbleProof.fingerReceived('#game canvas', { next: 1, queued: 2 }, { next: 2, queued: 1 }, { ...target, x: 300, y: 585 }), true);
            assert.equal(bubbleProof.fingerReceived('#game canvas', { next: 1, queued: 2 }, { next: 1, queued: 2 }, { ...target, x: 300, y: 585 }), false);
            assert.equal(bubbleProof.fingerReleased(['#game canvas'], { inFlight: false, shots: 2, fingerInput: { aimingPointer: null } }, { shots: 2 }), true);
        });
        await t.test('scene declarations run in the page after delivery with snapshots and target', async () => {
            const calls: string[] = [];
            const f = await setup(109, 'example', 0, {
                fingerReceived(selector, before, after, target) {
                    assert.equal(window.__ARCADE_TEST__?.current(), 'example');
                    assert.equal(selector, '#example-right');
                    assert.equal(before.requested, 'up');
                    assert.equal(after.requested, 'right');
                    assert.equal(after.ticks, 150);
                    assert.equal(f.packets.at(-1)?.type, 'touchStart');
                    const point = f.packets.at(-1)?.touchPoints[0];
                    assert.equal(target?.screenX, point?.x);
                    assert.equal(target?.screenY, point?.y);
                    calls.push('received');
                    return true;
                },
                fingerReleased(selectors, before, after) {
                    assert.deepEqual(selectors, ['#example-right']);
                    assert.equal(before.ticks, 300);
                    assert.equal(after.ticks, 300);
                    assert.equal(f.packets.at(-1)?.type, 'touchEnd');
                    calls.push('released');
                    return true;
                },
            });
            await f.finger.steer(['#example-right']);
            await f.finger.release();
            assert.deepEqual(calls, ['received', 'released']);
            assert.deepEqual(f.packets.map(packet => packet.at), [150, 300]);
        });
        await t.test('a scene may reject a delivered touch or release; without declarations receipts suffice', async () => {
            const refused = await setup(109, 'example', 0, { fingerReceived: () => false });
            await assert.rejects(refused.finger.steer(['#example-right']), /toucher perdu/);
            assert.equal((await refused.report()).misses, 1);
            const released = await setup(109, 'example', 0, { fingerReleased: () => false });
            await released.finger.steer(['#example-right']);
            await assert.rejects(released.finger.release(), /toucher perdu/);
            const fallback = await setup(109, 'example');
            await fallback.finger.press(['#example-right']);
            assert.equal((await fallback.report()).misses, 0);
            fallback.dropped.add(3);
            await assert.rejects(fallback.finger.steer(['#example-right']), /toucher perdu/);
        });
        await t.test('resume requires leaving pause on release even without a declaration', async () => {
            const f = await setup(109, 'example');
            f.state.fingerInput.paused = true;
            await f.finger.steer(['#resume']);
            await assert.rejects(f.finger.release(), /toucher perdu/);
            const resumed = await setup(109, 'example');
            resumed.state.fingerInput.paused = true;
            await resumed.finger.steer(['#resume']);
            resumed.state.fingerInput.paused = false;
            await resumed.finger.release();
        });
        await t.test('the shared helper contains no registered game name', () => {
            const registry = readFileSync(new URL('../../src/games/registry.ts', import.meta.url), 'utf8');
            const helper = readFileSync(new URL('./finger-stepped.ts', import.meta.url), 'utf8');
            const ids = [...registry.slice(registry.indexOf('export const games:')).matchAll(/\bid: '([^']+)'/g)].map(match => match[1] ?? '');
            assert.ok(ids.length >= 12);
            for (const id of ids) assert.ok(id && !helper.toLowerCase().includes(id.toLowerCase()), `Nom de jeu dans l’aide : ${id}`);
        });
        await t.test('Artificiers aiming and weapon evidence accepts effects and rejects stale or missing state', () => {
            const target = { x: 120, y: 240, screenX: 80, screenY: 90, dx: 0, dy: 0 };
            const before = { weapon: 0 };
            assert.equal(artificiersProof.fingerReceived('#artificiers-weapon', before, { weapon: 1 }), true);
            assert.equal(artificiersProof.fingerReceived('#artificiers-weapon', before, before), false);
            for (const aiming of [null, { x: 124, y: 240 }, { x: 120, y: 244 }]) {
                assert.equal(artificiersProof.fingerReceived('#game canvas', {}, { fingerInput: { aiming } }, target), false);
            }
            assert.equal(artificiersProof.fingerReceived('#game canvas', {}, {}, target), false);
            assert.equal(artificiersProof.fingerReceived('#game canvas', {}, { fingerInput: { aiming: { x: 120, y: 240 } } }), false);
            assert.equal(artificiersProof.fingerReceived('#artificiers-rope', before, { weapon: 1 }), false);
            assert.equal(artificiersProof.fingerReceived('#game canvas', {}, { fingerInput: { aiming: { x: 120.5, y: 239.5 } } }, target), true);
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
