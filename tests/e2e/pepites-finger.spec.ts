import { test, expect } from './fixture';
import { Finger } from './finger-stepped';
import { pepitesStep } from './pepites-policy';
import { MINES } from '../../src/engines/pepites/levels';
import type {} from '../../src/games/pepites/scene';
// Pépites: noisy finger on the stepped test clock (390 × 844, ±12 px, 150 ms decision latency, CDP touches only).
// The page clock is paused and the scene only moves through advance(): game time between an observation and
// the step it decides is fixed (150 ms reaction + 60 ms finger travel), whatever the host's load.
const reactionMs = 150, travelMs = 60;
for (const level of [0, 2])
    test(`Pépites doigt bruité mine ${String(level + 1)}`, async ({ page, isMobile }, info) => {
        test.skip(!isMobile, 'Parcours tactile CDP uniquement');
        test.setTimeout(200000);
        await page.setViewportSize({ width: 390, height: 844 });
        await Finger.prepare(page);
        await page.goto('/?test=1#/pepites');
        await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
        const cdp = await page.context().newCDPSession(page), finger = await Finger.create(page, cdp), decisions: unknown[] = [];
        const turnFrames = MINES[level]?.turnFrames ?? 9, seconds = MINES[level]?.seconds ?? 150;
        // No arrows: one step is a drag on the mine. 60 px keeps the drag on its axis under ±12 px noise on both points.
        const swipe = async (d: 'left' | 'right' | 'up' | 'down') => {
            const r = await page.locator('#game canvas').boundingBox(); if (!r) throw new Error('Canevas absent');
            const [dx, dy] = ({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as const)[d];
            const x = r.x + r.width / 2, y = r.y + r.height * .4;
            await finger.touch('touchStart', [{ id: 0, x, y }], undefined, reactionMs);
            await finger.touch('touchMove', [{ id: 0, x: x + dx * 60, y: y + dy * 60 }], undefined, travelMs);
            await finger.release();
        };
        try {
            await finger.press(['#resume']);
            await page.evaluate(i => { window.__PEPITES_TEST__?.loadLevel(i, 484); window.__PEPITES_TEST__?.advance(0); }, level);
            while (finger.elapsed < seconds * 1000 + 5000) {
                const s = await page.evaluate(() => window.__PEPITES_TEST__?.read());
                if (!s) throw new Error('État absent');
                if (s.status !== 'playing') break;
                // A step still queued has not been played yet: deciding again now would stack a second step on top of it.
                if (s.queue.length) { await finger.advance(1000 / 60); continue; }
                // The step lands on the first turn after reaction + travel; plan from the world as it will be then.
                const frames = s.frames + Math.floor((s.remainder + reactionMs + travelMs) * 60 / 1000 + 1e-6);
                const ahead = Math.floor(frames / turnFrames);
                const d = pepitesStep(level, s, ahead);
                decisions.push({ gameMs: finger.elapsed, player: s.player, nuggets: s.nuggets, ahead, d });
                if (!d) { await finger.advance(reactionMs); continue; }
                await swipe(d);
                // The drag holds its direction until the finger lifts: one swipe must stay one step.
                const after = await page.evaluate(() => window.__PEPITES_TEST__?.read());
                if (after) expect(Math.abs(after.player.x - s.player.x) + Math.abs(after.player.y - s.player.y), JSON.stringify({ d, from: s.player, to: after.player })).toBeLessThanOrEqual(1);
            }
            const final = await page.evaluate(() => window.__PEPITES_TEST__?.read());
            await page.screenshot({ path: `test-results/screenshots/pepites-finger-${String(level + 1)}.png` });
            expect(final?.status, JSON.stringify({ reason: final?.reason, player: final?.player, nuggets: final?.nuggets, turns: final?.turns })).toBe('won');
            expect(finger.entries.filter(e => e.missed)).toEqual([]);
        } finally {
            await info.attach(`pepites-doigt-${String(level + 1)}.json`, { body: JSON.stringify({ latencyMs: reactionMs, travelMs, noisePx: 12, decisions }), contentType: 'application/json' });
            await finger.attach(info, `pepites-doigt-${String(level + 1)}-stepped.json`);
            await finger.release(); await cdp.detach();
        }
    });
