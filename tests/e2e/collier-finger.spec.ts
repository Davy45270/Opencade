import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { FingerClock } from './finger-clock';
import { decision } from './collier-policy';
import type {} from '../../src/games/collier/scene';

type Timings = {
    read: number;
    policy: number;
    flightWait: number;
    latency: number;
    cdp: number;
    total: number;
    inputInterval: number | null;
    wallInputInterval: number | null;
};

for (const level of [0, 4]) {
    test(`Collier doigt bruité niveau ${String(level + 1)}`, async ({ page, isMobile }, info) => {
        test.skip(!isMobile, 'Parcours tactile CDP uniquement');
        test.setTimeout(240000);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?test=1#/collier');
        await expect.poll(() => page.evaluate(() => Boolean(window.__COLLIER_TEST__))).toBe(true);
        const cdp = await page.context().newCDPSession(page);
        const finger = new Finger(page, cdp);
        await finger.press(['#resume']);
        await page.evaluate(i => window.__COLLIER_TEST__?.loadLevel(i, 300), level);
        await page.screenshot({ path: `test-results/screenshots/collier-finger-${String(level + 1)}-before.png` });
        // Fixed viewport and level: geometry is invariant throughout this run.
        const box = await page.locator('#game canvas').boundingBox();
        const view = await page.evaluate(() => window.__COLLIER_TEST__?.view());
        if (!box || !view) throw new Error('Transformation absente');
        const bounds = box;
        finger.entries.length = 0;
        const started = performance.now();
        const samples: {
            time: number;
            gameTimeMs: number;
            horizon: number;
            status: string;
            shots: number;
            swap: boolean;
            timings: Timings;
        }[] = [];
        const clock = new FingerClock();
        const inputGameTimes: number[] = [];
        let swaps = 0, seed = 300;
        let lastInput: { wall: number; game: number } | null = null;
        let finalStatus = 'playing';
        let iterationInterval: number | null = null;
        let wallInterval: number | null = null;
        const noise = (): number => {
            seed = seed * 16807 % 2147483647;
            return seed % 25 - 12;
        };
        const screenPoint = (x: number, y: number) => ({
            id: 0,
            x: box.x + (x * view.scale + view.x) * box.width / 360,
            y: box.y + (y * view.scale + view.y) * box.height / 640
        });
        async function tap(point: { id: number; x: number; y: number }, gameTimeMs: number, shoot = false): Promise<void> {
            // CDP preserves transport order. Queue the whole gesture before awaiting
            // acknowledgements so software rendering cannot add a wait per packet.
            const packets = [cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })];
            if (shoot)
                packets.push(cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] }));
            packets.push(cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }));
            await Promise.all(packets);
            // No extra remote evaluation during driving. Geometry was cached above.
            const missed = point.x < bounds.x || point.x > bounds.x + bounds.width
                || point.y < bounds.y || point.y > bounds.y + bounds.height;
            const input = performance.now();
            if (lastInput !== null)
                iterationInterval = Math.max(iterationInterval ?? 0, gameTimeMs - lastInput.game);
            if (lastInput !== null)
                wallInterval = Math.max(wallInterval ?? 0, input - lastInput.wall);
            lastInput = { wall: input, game: gameTimeMs };
            inputGameTimes.push(gameTimeMs);
            finger.entries.push({ selectors: ['canvas'], points: [point], timeMs: input - started, missed });
        }
        try {
            while (performance.now() - started < 120000) {
                const iteration = performance.now();
                iterationInterval = null;
                wallInterval = null;
                const timings: Timings = {
                    read: 0, policy: 0, flightWait: 0, latency: 0, cdp: 0, total: 0,
                    inputInterval: null, wallInputInterval: null
                };
                // Exactly one compact state read, including when a pearl is airborne.
                const s = await page.evaluate(() => window.__COLLIER_TEST__?.readDriver());
                timings.read = performance.now() - iteration;
                if (!s) throw new Error('État absent');
                finalStatus = s.status;
                const horizon = clock.observe(s);
                const sample = {
                    time: iteration - started, gameTimeMs: s.gameTimeMs, horizon,
                    status: s.status, shots: s.shots, swap: false, timings
                };
                samples.push(sample);
                if (s.status !== 'playing') break;
                const computing = performance.now();
                const aim = s.flight ? null : decision(s, view, horizon);
                timings.policy = performance.now() - computing;
                if (!aim) {
                    const waiting = performance.now();
                    await page.waitForTimeout(150);
                    timings.flightWait = performance.now() - waiting;
                } else {
                    const waiting = performance.now();
                    await page.waitForTimeout(150);
                    timings.latency = performance.now() - waiting;
                    const sending = performance.now();
                    // The first tap proves a real reserve exchange. Re-read immediately
                    // afterwards so the next decision uses the exchanged current pearl.
                    const forcedSwap = swaps === 0 && !aim.swap;
                    if (swaps === 0 || aim.swap) {
                        await tap(screenPoint(s.shooter.x + 44, s.shooter.y + 35), s.gameTimeMs);
                        swaps++;
                        sample.swap = true;
                    }
                    if (!forcedSwap) {
                        const point = screenPoint(aim.x, aim.y);
                        point.x += noise();
                        point.y += noise();
                        await tap(point, s.gameTimeMs, true);
                    }
                    timings.cdp = performance.now() - sending;
                    timings.inputInterval = iterationInterval;
                    timings.wallInputInterval = wallInterval;
                }
                timings.total = performance.now() - iteration;
            }
        } finally {
            await finger.release();
            await info.attach('collier-finger.json', {
                body: JSON.stringify({ level: level + 1, elapsed: performance.now() - started,
                    gameTimeMs: samples.at(-1)?.gameTimeMs,
                    inputIntervalUnit: 'game-ms', cdpEventsPerShot: 3,
                    inputs: finger.entries.map((entry, i) => ({ ...entry, gameTimeMs: inputGameTimes[i] })),
                    samples, swaps,
                    touchErrors: finger.entries.filter(e => e.missed), victory: finalStatus === 'won' }),
                contentType: 'application/json'
            });
        }
        expect(swaps).toBeGreaterThan(0);
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
        expect(finalStatus).toBe('won');
        const intervals = samples.flatMap(s => s.timings.inputInterval === null ? [] : [s.timings.inputInterval]);
        expect(intervals.length).toBeGreaterThan(0);
        expect(Math.max(...intervals)).toBeLessThanOrEqual(1500);
        expect(performance.now() - started).toBeLessThan(120000);
        await page.screenshot({ path: `test-results/screenshots/collier-finger-${String(level + 1)}-after.png` });
    });
}
