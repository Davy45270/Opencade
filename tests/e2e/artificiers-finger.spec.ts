import { test, expect } from './fixture';
import { Finger, performanceMetrics } from './finger-stepped';
import { Engine, chooseShot, clamp } from '../../src/engines/artificiers/engine';
import { levelAt } from '../../src/engines/artificiers/levels';
import { aimShot } from './artificiers-finger-gesture';
import { screenY, WORLD_SCALE } from '../../src/games/artificiers/art';
import type {} from '../../src/games/artificiers/scene';

for (const level of [0, 9]) {
    test(`Artificiers doigt bruité niveau ${String(level + 1)}`, async ({ page, isMobile }, info) => {
        test.skip(!isMobile, 'Parcours tactile CDP uniquement');
        test.setTimeout(120000);
        await page.setViewportSize({ width: 390, height: 844 });
        await Finger.prepare(page);
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto('/?test=1#/artificiers');
        await expect.poll(() => page.evaluate(() => Boolean(window.__ARTIFICIERS_TEST__))).toBe(true);
        const cdp = await page.context().newCDPSession(page);
        const finger = await Finger.create(page, cdp, 73);
        const read = () => page.evaluate(() => {
            if (!window.__ARTIFICIERS_TEST__) throw new Error('État absent');
            return window.__ARTIFICIERS_TEST__.read();
        });
        const gestures: unknown[] = [];
        const started = performance.now();
        let shots = 0;
        const initialFrames = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.renderedFrames() ?? 0);
        try {
            await finger.press(['#resume']);
            await page.evaluate(i => window.__ARTIFICIERS_TEST__?.loadLevel(i, 220), level);
            const initial = await read();
            expect(initial.config.mission).toBe(levelAt(level).mission); // level 1 is a target drill, level 10 a demolition
            const box = await page.locator('#game canvas').boundingBox();
            if (!box) throw new Error('Canvas absent');
            const point = (x: number, y: number) => ({
                id: 7, x: box.x + x * box.width / 360, y: box.y + screenY(y) * box.height / 640
            });
            for (let action = 0; action < 25; action++) {
                await finger.until(async () => {
                    const s = await read();
                    return s.status !== 'playing' || (s.phase === 'aim' && s.units[s.active]?.team === 0);
                }, 1000);
                let observed = await read();
                if (observed.status !== 'playing') break;
                // Same deterministic search as fingerWin in the Node proof, on a copy
                // of the observed snapshot. No suggestion(), aim() or shoot() in the page.
                const model = new Engine();
                model.restore(observed);
                const shot = chooseShot(model);
                for (let cycle = 0; observed.weapon !== shot.weapon && cycle < 6; cycle++) {
                    const before = observed.weapon;
                    await finger.press(['#artificiers-weapon']);
                    observed = await read();
                    expect(observed.weapon, 'Le bouton Arme agit sur la scène').not.toBe(before);
                }
                expect(observed.weapon).toBe(shot.weapon);
                const hero = observed.units[observed.active];
                if (!hero) throw new Error('Héros absent');
                const intendedStart = point(hero.x, hero.y);
                const intendedEnd = point(hero.x + Math.cos(shot.angle) * shot.power / 1.25,
                    hero.y + Math.sin(shot.angle) * shot.power / 1.25);
                const sequence = observed.fingerInput.receipts.sequence;
                const entryStart = finger.entries.length;
                let from = intendedStart, to = intendedEnd;
                await aimShot(finger, intendedStart, intendedEnd, async () => {
                    from = finger.entries[entryStart]?.points[0] ?? intendedStart;
                    to = finger.entries[entryStart + 1]?.points[0] ?? intendedEnd;
                    const aimed = await read();
                    const aimingHero = aimed.units[aimed.active];
                    if (!aimingHero) throw new Error('Héros absent');
                    const dx = (to.x - box.x) * 360 / box.width - aimingHero.x;
                    const dy = (to.y - box.y) * 640 / box.height / WORLD_SCALE - aimingHero.y;
                    expect(Math.abs(aimed.angle - clamp(Math.atan2(dy, dx), -Math.PI + .08, -.08))).toBeLessThan(.02);
                    expect(Math.abs(aimed.power - clamp(Math.hypot(dx, dy) * 1.25, 65, 245))).toBeLessThan(2);
                    expect(aimed.shots).toBe(observed.shots);
                });
                const after = await read();
                const receipts = after.fingerInput.receipts.events.filter(e => e.sequence > sequence);
                for (const [type, target] of [['pointerdown', from], ['pointermove', to], ['pointerup', to]] as const) {
                    const event = receipts.find(e => e.type === type);
                    expect(event, `Reçu de scène ${type}`).toBeDefined();
                    expect(Math.abs((event?.x ?? Infinity) - target.x)).toBeLessThan(1.5);
                    expect(Math.abs((event?.y ?? Infinity) - target.y)).toBeLessThan(1.5);
                }
                expect(after.shots, 'Le relâchement déclenche exactement un tir').toBe(observed.shots + 1);
                shots++;
                gestures.push({ shot, observedTime: observed.time, intendedStart, intendedEnd, from, to,
                    receipts, shotsBefore: observed.shots, shotsAfter: after.shots, status: after.status });
                // Match the Node pilot's post-gesture step before observing the next turn.
                await finger.advance(100);
            }
            const final = await read();
            expect(shots).toBeGreaterThan(0);
            expect(final.status).toBe('won');
            expect(final.winner).toBe(0);
            expect(errors).toEqual([]);
            expect(finger.entries.filter(entry => entry.missed)).toEqual([]);
        } finally {
            await finger.release();
            const image = info.outputPath(`artificiers-doigt-n${String(level + 1)}.png`);
            await page.screenshot({ path: image });
            await info.attach('artificiers-doigt', { path: image, contentType: 'image/png' });
            const final = await read();
            const renderedFrames = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.renderedFrames() ?? 0) - initialFrames;
            const realMs = performance.now() - started;
            await info.attach(`artificiers-doigt-n${String(level + 1)}.json`, {
                contentType: 'application/json', body: JSON.stringify({ clock: 'stepped', noisePx: 12,
                    latencyGameMs: 150, seed: 73, level: level + 1, shots, gestures, errors,
                    renderedFrames, gameMs: final.time, realMs,
                    ...performanceMetrics(renderedFrames, final.time, realMs), outcome: final.status }, null, 2)
            });
            await finger.attach(info, `artificiers-horloge-n${String(level + 1)}.json`);
            await cdp.detach();
        }
    });
}
