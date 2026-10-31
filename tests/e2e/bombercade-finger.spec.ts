import { test, expect } from './fixture';
import { Finger, type Touch } from './finger-stepped';
import { Random } from '../../src/engines/shared/random';
import type { Action } from '../../src/engines/bombercade/pilot';
import type { BombercadeHook } from '../../src/games/bombercade/scene';

type Receipt = ReturnType<BombercadeHook['read']>['fingerInput']['receipts']['events'][number];
type Packet = { type: 'touchStart' | 'touchEnd'; points: Touch[]; sequence: number; endSequence: number;
    before?: { points: { point: Touch; target: string | null }[]; rects: Record<string, { x: number; y: number; width: number; height: number } | null> };
    requireReceipt: boolean; matchedReceipts: { touchId: number; receipt: Receipt }[]; errors: unknown[] };

function matchPacket(packet: Packet, events: Receipt[], pointers: Map<number, number>): void {
    const available = events.filter(e => e.sequence > packet.sequence && e.sequence <= packet.endSequence);
    for (const point of packet.points) {
        const pointerId = pointers.get(point.id);
        const type = packet.type === 'touchStart' ? 'pointerdown' : 'pointerup';
        const control = point.id === 0 ? '.joystick' : point.id === 1 ? 'bombercade-bomb' : point.id === 2 ? 'bombercade-special' : 'resume';
        // CDP touch ids and DOM pointer ids have different lifetimes. Bind them
        // on down by the unique target/point, then require that DOM id on up.
        // The hook records raw clientX/Y (CSS px), without joystick projection.
        // Allow at most 1 px on down for Chromium's touch coordinate rounding.
        // Up is identified by pointerId: its coordinates are diagnostic only.
        const index = available.findIndex(e => e.type === type && (type === 'pointerdown'
            ? pointerId === undefined && ![...pointers.values()].includes(e.pointerId) && e.control === control
                && Math.abs(e.x - point.x) <= 1 && Math.abs(e.y - point.y) <= 1
            : pointerId !== undefined && e.pointerId === pointerId));
        if (index < 0) {
            if (packet.requireReceipt) packet.errors.push({ point, pointerId, type, control, receipts: available });
        } else {
            const receipt = available[index];
            if (!receipt) throw new Error('Accusé absent après appariement');
            available.splice(index, 1);
            packet.matchedReceipts.push({ touchId: point.id, receipt });
            if (type === 'pointerdown') pointers.set(point.id, receipt.pointerId);
        }
        if (type === 'pointerup') pointers.delete(point.id);
    }
}

for (const level of [0, 3]) test(`B doigt bruité niveau ${String(level + 1)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(150000);
    const started = Date.now();
    // Node with 150 ms reaction latency: level 4 wins in 11.05 s / 73
    // decisions on seed 1, versus 30.70 s / 204 decisions on seed 28.
    const seed = level === 3 ? 1 : 28;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'panda'); });
    await Finger.prepare(page);
    await page.goto('/?test=1#/bombercade');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BOMBERCADE_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page);
    await Finger.create(page, cdp);
    const random = new Random(28), entries: unknown[] = [], packets: Packet[] = [];
    const advances: { from: number; to: number; requestedMs: number }[] = [];
    let active: Touch[] = [], missed = 0, presses = 0;
    const pointers = new Map<number, number>();
    let expected: { intent: Action; bombRequests: number; specialRequests: number } | null = null;
    const dispatch = async (points: Touch[], requireReceipt = true) => {
        const sequence = await page.evaluate(() => {
            const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent');
            return hook.read().fingerInput.receipts.sequence;
        });
        const packet: Packet = { type: points.length ? 'touchStart' : 'touchEnd', points: points.length ? points : active,
            sequence, endSequence: sequence, requireReceipt, matchedReceipts: [], errors: [] };
        packets.push(packet);
        packet.before = await page.evaluate(points => {
            const describeTarget = (target: Element | null): string | null => target
                ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${Array.from(target.classList, name => `.${name}`).join('')}`.slice(0, 80) : null;
            return {
                points: points.map(point => ({ point, target: describeTarget(document.elementFromPoint(point.x, point.y)) })),
                rects: Object.fromEntries(['.joystick', '#touch-controls', '#play-area', '#game', '#game canvas'].map(selector => {
                    const r = document.querySelector(selector)?.getBoundingClientRect();
                    return [selector, r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null];
                })),
            };
        }, packet.points);
        await cdp.send('Input.dispatchTouchEvent', { type: packet.type, touchPoints: points });
        active = points;
        const after = await page.evaluate(points => {
            const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent');
            const state = hook.read();
            return { receipts: state.fingerInput.receipts, status: state.status, time: state.time,
                targets: points.map(point => {
                    const selector = point.id === 0 ? '.joystick' : point.id === 1 ? '#bombercade-bomb' : point.id === 2 ? '#bombercade-special' : '#resume';
                    const r = document.querySelector(selector)?.getBoundingClientRect();
                    return { point, rect: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null };
                }) };
        }, packet.points);
        packet.endSequence = after.receipts.sequence;
        matchPacket(packet, after.receipts.events, pointers);
        missed += packet.errors.length;
        if (packet.errors.length) entries.push({ packet, ...after });
    };
    // One decision evaluation still reads effects, decides, advances held
    // controls by 150 game ms and measures targets. Receipts are packet-local.
    const observe = async (drive: boolean, assertReceipts = true) => {
        const result = await page.evaluate(({ expected, drive, noise }) => {
            const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent');
            const before = hook.read(), errors: unknown[] = [];
            const selector = (id: number) => id === 0 ? '.joystick' : id === 1 ? '#bombercade-bomb' : id === 2 ? '#bombercade-special' : '#resume';
            const rect = (id: number) => {
                const r = document.querySelector(selector(id))?.getBoundingClientRect();
                return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
            };
            if (expected) {
                if (before.actors[0]?.queued !== expected.intent.direction) errors.push({ effect: 'direction', expected, state: before });
                if (before.fingerInput.bombRequests !== expected.bombRequests + Number(expected.intent.bomb)) errors.push({ effect: 'bomb', expected, state: before });
                if (before.fingerInput.specialRequests !== expected.specialRequests + Number(Boolean(expected.intent.special))) errors.push({ effect: 'special', expected, state: before });
            }
            let intent: Action | null = null;
            if (drive && !errors.length && before.status === 'playing' && !before.fingerInput.paused) {
                intent = hook.pilotAction();
                hook.advance(150);
            }
            const state = hook.read(), intended: Touch[] = [], targets: unknown[] = [];
            if (intent && state.status === 'playing' && !state.fingerInput.paused) {
                const target = (id: number, dx = 0, dy = 0) => {
                    const r = rect(id); if (!r || !r.width || !r.height) throw new Error(`Cible absente ${selector(id)}`);
                    const x = r.x + r.width / 2 + dx, y = r.y + r.height / 2 + dy;
                    const offset = noise[id] ?? { x: 0, y: 0 };
                    const point = { id, x: x + offset.x, y: y + offset.y };
                    const hit = document.elementFromPoint(point.x, point.y);
                    const margin = Math.min(x - r.x, r.x + r.width - x, y - r.y, r.y + r.height - y);
                    const radialMargin = Math.min(r.width, r.height) / 2 - Math.hypot(dx, dy);
                    if (margin < 12 || (id === 0 && radialMargin < 12) || !hit?.closest(selector(id))) {
                        errors.push({ effect: 'target', point, rect: r, margin, radialMargin, hit: hit?.id || hit?.className, state });
                    }
                    intended.push(point);
                    targets.push({ id, rect: r, center: { x, y }, noise: offset, margin, radialMargin });
                };
                // Radius 60: (42 + 12)^2 + 12^2 < 60^2. The base point
                // has 18 px edge margin, and even worst noise keeps its sector.
                if (intent.direction) {
                    const [dx, dy] = { up: [0, -42], down: [0, 42], left: [-42, 0], right: [42, 0] }[intent.direction];
                    target(0, dx, dy);
                }
                if (intent.bomb) target(1);
                if (intent.special) target(2);
            } else intent = null;
            const resultPanelVisible = document.querySelector<HTMLElement>('#result')?.hidden === false;
            // Keep ordinary decision payloads small; errors retain the full snapshot.
            return { state: { status: state.status, time: state.time, fingerInput: {
                paused: state.fingerInput.paused, bombRequests: state.fingerInput.bombRequests,
                specialRequests: state.fingerInput.specialRequests, receipts: { sequence: state.fingerInput.receipts.sequence },
            } }, resultPanelVisible, intent, intended, targets, errors, fromGameMs: before.time };
        }, { expected, drive, noise: Array.from({ length: 3 }, () => ({ x: Math.floor(random.next() * 25) - 12, y: Math.floor(random.next() * 25) - 12 })) });
        expected = null;
        missed += result.errors.length;
        entries.push(result);
        if (drive && result.state.time > result.fromGameMs) advances.push({ from: result.fromGameMs, to: result.state.time, requestedMs: 150 });
        if (assertReceipts) {
            expect(missed, 'Chaque appui de jeu doit être reçu par la scène (accusés par paquet dans le JSON)').toBe(0);
            expect(result.errors, 'Chaque doigt et son effet doivent être reçus par la scène (point, rectangle et état dans le JSON)').toEqual([]);
        }
        return result;
    };
    try {
        const resume = await page.locator('#resume').boundingBox(); if (!resume) throw new Error('Reprise absente');
        await observe(false);
        await dispatch([{ id: 9, x: resume.x + resume.width / 2 + Math.floor(random.next() * 25) - 12, y: resume.y + resume.height / 2 + Math.floor(random.next() * 25) - 12 }]);
        await dispatch([]);
        await page.clock.runFor(17);
        await expect.poll(() => page.evaluate(() => window.__BOMBERCADE_TEST__?.read().fingerInput.paused)).toBe(false);
        await observe(false);
        await page.evaluate(({ level, seed }) => { window.__BOMBERCADE_TEST__?.loadLevel(level, seed); }, { level, seed });
        const controlBottoms = await page.evaluate(() => {
            return ['.joystick', '#bombercade-bomb'].map(selector => {
                const control = document.querySelector(selector);
                if (!control) throw new Error(`Commande absente : ${selector}`);
                return { selector, bottom: control.getBoundingClientRect().bottom, limit: innerHeight - 12 };
            });
        });
        for (const { selector, bottom, limit } of controlBottoms) {
            expect(bottom, `${selector} doit rester à au moins 12 px du bas de l’écran`).toBeLessThanOrEqual(limit);
        }
        const ringMisses = await page.evaluate(() => {
            const stick = document.querySelector('.joystick');
            if (!stick) throw new Error('Croix absente');
            const r = stick.getBoundingClientRect(), misses: unknown[] = [];
            const probe = (dx: number, dy: number) => {
                const x = r.x + r.width / 2 + dx, y = r.y + r.height / 2 + dy;
                const hit = document.elementFromPoint(x, y);
                if (!hit?.closest('.joystick')) misses.push({ x, y, dx, dy, hit: hit?.outerHTML, rect: { x: r.x, y: r.y, width: r.width, height: r.height } });
            };
            // Stay strictly inside the visible edge (the bottom edge is the viewport boundary).
            for (const radius of [50, 55, 59.5]) for (let sector = 0; sector < 8; sector++) {
                const angle = sector * Math.PI / 4;
                probe(radius * Math.cos(angle), radius * Math.sin(angle));
            }
            probe(7, -54); // Regression: (83,730) in the reported x16 y724 rectangle.
            return misses;
        });
        entries.push({ outerRingHitMisses: ringMisses });
        expect(ringMisses, 'Tout l’anneau visible doit cibler la croix').toEqual([]);
        const stickRect = await page.locator('.joystick').boundingBox();
        if (!stickRect) throw new Error('Croix absente');
        const edgePoints = [
            ...[1, 3, 6, 9].map(dy => ({ id: 0, x: stickRect.x + stickRect.width / 2, y: stickRect.y + dy })),
            ...[1, 3, 6].map(dx => ({ id: 0, x: stickRect.x + dx, y: stickRect.y + stickRect.height / 2 })),
        ];
        const edgeTouchTargets: { point: Touch; receipts: Receipt[] }[] = [];
        entries.push({ edgeTouchTargets });
        for (const point of edgePoints) {
            const sequence = await page.evaluate(() => {
                const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent');
                return hook.read().fingerInput.receipts.sequence;
            });
            try {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
            } finally {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            }
            const receipts = await page.evaluate(sequence => {
                const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent');
                return hook.read().fingerInput.receipts.events
                    .filter(event => event.sequence > sequence && event.type === 'pointerdown');
            }, sequence);
            edgeTouchTargets.push({ point, receipts });
        }
        // Reset all probe effects and held engine input before the unchanged game run.
        await page.evaluate(({ level, seed }) => { window.__BOMBERCADE_TEST__?.loadLevel(level, seed); }, { level, seed });
        expect(edgeTouchTargets.map(({ receipts }) => receipts.map(receipt => receipt.control)),
            'Chaque toucher réel près des bords haut et gauche doit être reçu par la croix (edgeTouchTargets dans le JSON)')
            .toEqual(edgePoints.map(() => ['.joystick']));
        await page.screenshot({ path: info.outputPath('bombercade-finger-before.png') });
        for (let step = 0; step < 360; step++) {
            const result = await observe(true), { state, intent } = result;
            if (active.length) {
                const requireReceipt = state.status === 'playing' && !result.resultPanelVisible;
                entries.push({ cleanup: !requireReceipt, status: state.status, resultPanelVisible: result.resultPanelVisible, requireReceipt });
                await dispatch([], requireReceipt);
            }
            if (!intent) break;
            const points = result.intended;
            entries.push({ gameTimeMs: state.time, points, targets: result.targets, status: state.status, paused: state.fingerInput.paused });
            if (points.length) await dispatch(points);
            expected = { intent, bombRequests: state.fingerInput.bombRequests, specialRequests: state.fingerInput.specialRequests };
            presses += points.length;
            // CDP completion precedes the next evaluation; DOM handlers apply
            // controls synchronously. No rendered frame is needed per decision.
        }
        const end = await observe(false);
        expect(end.state.status).toBe('won');
        await page.clock.runFor(17);
        await page.screenshot({ path: info.outputPath('bombercade-finger-after.png') });
    } finally {
        // Attach all packet diagnostics before asserting gameplay receipts.
        if (active.length) {
            const cleanup = await page.evaluate(() => {
                const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent');
                const state = hook.read(), resultPanelVisible = document.querySelector<HTMLElement>('#result')?.hidden === false;
                return { status: state.status, resultPanelVisible, sequence: state.fingerInput.receipts.sequence,
                    requireReceipt: state.status === 'playing' && !resultPanelVisible };
            });
            entries.push({ cleanup: true, ...cleanup });
            await dispatch([], cleanup.requireReceipt);
        }
        await observe(false, false);
        const end = await page.evaluate(() => { const hook = window.__BOMBERCADE_TEST__; if (!hook) throw new Error('Crochet absent'); return hook.read(); });
        await info.attach('bombercade-finger.json', { contentType: 'application/json', body: JSON.stringify({ level: level + 1, seed, clock: 'stepped', timeMs: Date.now() - started, gameTimeMs: end.time, latencyGameMs: 150, noisePx: 12, presses, touchErrors: missed, entries, packets, advances, won: end.status === 'won' }) });
        await cdp.detach();
        expect(missed, 'Chaque appui de jeu doit être reçu par la scène').toBe(0);
    }
});
