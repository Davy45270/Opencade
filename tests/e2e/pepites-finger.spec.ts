import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { pepitesStep } from './pepites-policy';
import { FingerClock } from './finger-clock';
import { MINES } from '../../src/engines/pepites/levels';
import type {} from '../../src/games/pepites/scene';
// Pépites: real-time noisy finger (390 × 844, ±12 px, 150 ms decision latency, CDP touches only, no advance()).
for (const level of [0, 2])
    test(`Pépites doigt bruité mine ${String(level + 1)}`, async ({ page, isMobile }, info) => {
        test.skip(!isMobile, 'Parcours tactile CDP uniquement');
        test.setTimeout(200000);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?test=1#/pepites');
        await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
        const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), started = Date.now(), decisions: unknown[] = [];
        try {
            await finger.press(['#resume']);
            await page.evaluate(i => { window.__PEPITES_TEST__?.loadLevel(i, 484); }, level);
            const clock = new FingerClock(), turnMs = (MINES[level]?.turnFrames ?? 9) * 1000 / 60;
            while (Date.now() - started < 170000) {
                const s = await page.evaluate(() => window.__PEPITES_TEST__?.read());
                if (!s) throw new Error('État absent');
                if (s.status !== 'playing') break;
                // A tap still queued has not been played yet: deciding again now would stack a second step on top of it.
                if (s.queue.length) { await page.waitForTimeout(40); continue; }
                // Reaction horizon in game time (finger-clock): plan from the position the world will have reached.
                const horizon = clock.observe({ gameTimeMs: (MINES[level]?.seconds ?? 150) * 1000 - s.timeLeft });
                const d = pepitesStep(level, s, Math.ceil(horizon / turnMs));
                decisions.push({ timeMs: Date.now() - started, player: s.player, nuggets: s.nuggets, d });
                if (d) await finger.press([`#pepites-${d}`]); else await page.waitForTimeout(150);
            }
            const final = await page.evaluate(() => window.__PEPITES_TEST__?.read());
            await page.screenshot({ path: `test-results/screenshots/pepites-finger-${String(level + 1)}.png` });
            expect(final?.status, JSON.stringify({ reason: final?.reason, player: final?.player, nuggets: final?.nuggets, turns: final?.turns })).toBe('won');
            expect(finger.entries.filter(e => e.missed)).toEqual([]);
        } finally {
            await info.attach(`pepites-doigt-${String(level + 1)}.json`, { body: JSON.stringify({ latencyMs: 150, noisePx: 12, decisions, entries: finger.entries }), contentType: 'application/json' });
            await finger.release(); await cdp.detach();
        }
    });
