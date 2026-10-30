import { test, expect } from './fixture';
import type { Page, TestInfo } from '@playwright/test';
import { Finger } from './character-finger-input';
import { FingerClock } from './finger-clock';
import { Engine as Bubble, ORIGIN, key } from '../../src/engines/bubble/engine';
import { snakePlan } from './character-snake-policy';
import { solutions } from '../bubble-solutions';
import { bubbleOutcome } from './character-bubble-policy';
import { racingHeading } from './character-policy-2';
const games = ['derapage', 'bubble', 'serpentin'] as const;
type Game = typeof games[number];
async function capture(page: Page, info: TestInfo, game: Game, kind: 'jeu' | 'special') {
    const path = info.outputPath(`perso-${game}-${kind}.png`);
    await page.screenshot({ path }); await info.attach(`perso-${game}-${kind}`, { path, contentType: 'image/png' });
}
for (const game of games) test(`P-${game} doigt bruité : niveaux 1 et 10`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(600000);
    await page.setViewportSize({ width: 390, height: 844 });
    const character = game === 'derapage' ? 'dragon' : game === 'bubble' ? 'pandaroux' : 'licorne';
    await page.addInitScript(character => { localStorage.setItem('arcade-lab:character:v1', character); }, character);
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'derapage' ? window.__DERAPAGE_TEST__ : game === 'bubble' ? window.__BUBBLE_TEST__ : window.__SERPENTIN_TEST__), game), { timeout: 30000 }).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [];
    let noiseSeed = 72;
    const noise = () => { noiseSeed = noiseSeed * 16807 % 2147483647; return noiseSeed % 25 - 12; };
    const canvasTouch = async (x: number, y: number, type: 'touchStart' | 'touchMove') => {
        const b = await page.locator('#game canvas').boundingBox(); if (!b) throw new Error('canvas');
        const dx = noise(), dy = noise();
        const p = { id: 9, x: b.x + x * b.width / 360 + dx, y: b.y + y * b.height / 640 + dy };
        const missed = await page.evaluate(({ x, y }) => !document.elementFromPoint(x, y)?.closest('canvas'), p);
        await finger.touch(type, [p]); return { ...p, dx, dy, missed };
    };
    try {
        if (game !== 'bubble') await finger.press(['#resume']);
        for (const level of [0, 9]) {
            await page.evaluate(({ game, level }) => {
                if (game === 'derapage') window.__DERAPAGE_TEST__?.loadLevel(level, 28);
                else if (game === 'bubble') window.__BUBBLE_TEST__?.loadLevel(level, 28);
                else window.__SERPENTIN_TEST__?.loadLevel(level ? 13 : 0, 454); // pass 401: room 14 (prey, portals)
            }, { game, level });
            const clock = new FingerClock(), entries = finger.entries.length, decisions: unknown[] = [], touches: unknown[] = [];
            if (game === 'bubble') {
                const model = new Bubble(); model.loadLevel(level, 28); let used = false;
                for (const shot of solutions[level] ?? []) {
                    if (shot.swap) { await finger.press(['#touch-swap']); model.swap(); }
                    const target = model.trace(shot.angle).target, struck = model.trace(shot.angle).struck;
                    if (!used && struck?.color === model.next) {
                        await finger.press(['#bubble-special']); used = true; model.special();
                    }
                    const expectedOutcome = bubbleOutcome(model, shot.angle);
                    // Aim with a noisy real drag, observe its result, then release only
                    // when the ordinary solver's intended socket is reached.
                    const radius = Math.min(500, 145 / Math.max(0.01, Math.abs(Math.sin(shot.angle))));
                    let commanded = shot.angle;
                    const point = () => ({ x: ORIGIN.x + Math.sin(commanded) * radius, y: ORIGIN.y - Math.cos(commanded) * radius });
                    const { x, y } = point();
                    await page.waitForTimeout(150); touches.push(await canvasTouch(x, y, 'touchStart'));
                    let actual = shot.angle, found = false;
                    for (let attempt = 0; attempt < 120; attempt++) {
                        await page.waitForTimeout(150);
                        const state = await page.evaluate(() => window.__BUBBLE_TEST__?.read()); if (!state) throw new Error('bubble');
                        actual = state.angle; const path = model.trace(actual);
                        decisions.push({ state, intended: shot, attempt });
                        if ((target && path.target && key(target) === key(path.target) && (struck ? path.struck && key(struck) === key(path.struck) : !path.struck)) || bubbleOutcome(model, actual) === expectedOutcome) { found = true; break; }
                        commanded = Math.max(shot.angle - .08, Math.min(shot.angle + .08, commanded + (shot.angle - actual) * .5));
                        const p = point(); touches.push(await canvasTouch(p.x, p.y, 'touchMove'));
                    }
                    expect(found).toBe(true); await finger.release();
                    model.aim(actual); model.shoot(); while (model.flight) model.step(1000 / 60);
                    await expect.poll(async () => (await page.evaluate(() => window.__BUBBLE_TEST__?.read()))?.shots, { timeout: 30000 }).toBe(model.shots);
                    await expect.poll(async () => (await page.evaluate(() => window.__BUBBLE_TEST__?.read()))?.inFlight, { timeout: 30000, intervals: [150] }).toBe(false);
                    const state = await page.evaluate(() => window.__BUBBLE_TEST__?.read()); expect(state?.grid).toEqual(model.grid);
                }
            } else if (game === 'serpentin') {
                await finger.press(['#serpentin-special']);
                while (clock.elapsed < 90000) {
                    const state = await page.evaluate(() => window.__SERPENTIN_TEST__?.read()); if (!state) throw new Error('snake');
                    expect(state.character.id).toBe(character); clock.observe(state); if (state.status !== 'playing') break;
                    const plan = snakePlan(state, clock.horizon); decisions.push({ state, intention: plan });
                    await finger.press(plan.map(d => `#serpentin-${d}`));
                }
            } else {
                let special = false, down = false;
                const periods: number[] = []; let previousObservation: number | undefined;
                while (clock.elapsed < 120000) {
                    const observedAt = Date.now(); // informative loop period only, never an oracle
                    if (previousObservation !== undefined) periods.push(observedAt - previousObservation);
                    previousObservation = observedAt;
                    const state = await page.evaluate(() => window.__DERAPAGE_TEST__?.read()); if (!state) throw new Error('race');
                    expect(state.character.id).toBe(character); clock.observe(state); if (state.status !== 'playing') break;
                    const horizon = clock.horizon / 1000;
                    const predicted = structuredClone(state), kart = predicted.karts[0];
                    if (kart) { kart.x += kart.vx * Math.max(0, horizon - .15); kart.y += kart.vy * Math.max(0, horizon - .15); }
                    const heading = racingHeading(predicted); decisions.push({ state, heading });
                    if (!special && state.karts[0] && Math.hypot(state.karts[0].vx, state.karts[0].vy) > 16) {
                        await finger.release(); down = false; await finger.press(['#derapage-special']); special = true;
                        continue; // Reobserve after the extra reaction interval.
                    }
                    await page.waitForTimeout(150);
                    if (!down) { touches.push(await canvasTouch(180, 480, 'touchStart')); down = true; }
                    touches.push(await canvasTouch(180 + Math.cos(heading) * 80, 480 + Math.sin(heading) * 80, 'touchMove'));
                }
                await finger.release(); expect(special).toBe(true);
                decisions.push({ loopPeriodMs: { mean: periods.reduce((sum, ms) => sum + ms, 0) / Math.max(1, periods.length), max: Math.max(0, ...periods), samples: periods.length } });
                const race = await page.evaluate(() => window.__DERAPAGE_TEST__?.read());
                expect(race?.karts[0]?.lap, 'la course doit finir trois tours').toBe(3);
                if (level === 0) expect(race?.order[0], 'victoire au niveau 1').toBe(0);
            }
            const final = await page.evaluate(game => game === 'derapage' ? window.__DERAPAGE_TEST__?.read() : game === 'bubble' ? window.__BUBBLE_TEST__?.read() : window.__SERPENTIN_TEST__?.read(), game);
            const canvasErrors = (touches as { missed: boolean }[]).filter(t => t.missed).length;
            results.push({ level: (game === 'serpentin' && level ? 13 : level) + 1, timeMs: clock.elapsed, clock: 'realtime', decisions, touches, entries: finger.entries.slice(entries), touchErrors: finger.entries.slice(entries).filter(e => e.missed).length + canvasErrors, victory: final?.status === 'won', final });
            await capture(page, info, game, 'jeu');
            expect(final?.status).toBe('won'); expect(final?.character.id).toBe(character); expect(canvasErrors).toBe(0);
            if (final && 'specialUses' in final) expect(final.specialUses).toBe(0);
            if (final && 'karts' in final) expect(final.karts[0]?.specialLap).toBeDefined(); expect(finger.entries.slice(entries).filter(e => e.missed)).toEqual([]);
        }
    } finally {
        await info.attach(`perso-${game}-doigt-bruite.json`, { body: JSON.stringify({ character, viewport: [390, 844], noisePx: 12, latencyMs: 150, results, entries: finger.entries }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});

// Paired tactical positions: identical real-time input, only the special differs.
for (const game of ['bubble', 'serpentin'] as const) test(`P-${game} le spécial change l'issue`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(30000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'bubble' ? window.__BUBBLE_TEST__ : window.__SERPENTIN_TEST__), game), { timeout: 30000 }).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results = [];
    try {
        if (game === 'serpentin') await finger.press(['#resume']);
        for (const special of [false, true]) {
            await page.evaluate(game => {
                if (game === 'bubble') window.__BUBBLE_TEST__?.load([{ row: 0, col: 4, color: 1 }, { row: 1, col: 4, color: 1 }, { row: 1, col: 5, color: 0 }], 0, 28);
                else window.__SERPENTIN_TEST__?.scenario('body');
            }, game);
            if (special) await finger.press([`#${game}-special`]);
            if (game === 'bubble') {
                // The broad target admits the same noisy finger drag in both trials.
                const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('canvas');
                const x = box.x + (180 + Math.sin(0.05) * 400) * box.width / 360 + 3;
                const y = box.y + (ORIGIN.y - Math.cos(0.05) * 400) * box.height / 640 - 4;
                await page.waitForTimeout(150);
                await finger.touch('touchStart', [{ id: 9, x, y }]);
                await page.waitForTimeout(150); await finger.release();
                await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().shots), { timeout: 30000 }).toBe(1);
                await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().inFlight), { timeout: 30000, intervals: [150] }).toBe(false);
                const state = await page.evaluate(() => window.__BUBBLE_TEST__?.read());
                expect(state?.shots).toBe(1); expect(state?.status).toBe(special ? 'won' : 'playing');
                expect(state?.grid.some(c => c.color === 1)).toBe(!special); results.push({ special, state });
            } else {
                await expect.poll(() => page.evaluate(() => { const s = window.__SERPENTIN_TEST__?.read(); return s && (s.status === 'lost' || (!s.specialArmed && s.specialUses === 0)); }), { timeout: 30000, intervals: [150] }).toBe(true);
                const state = await page.evaluate(() => window.__SERPENTIN_TEST__?.read());
                expect(state?.status).toBe(special ? 'playing' : 'lost');
                if (special) { expect(state?.specialArmed).toBe(false); expect(state?.specialUses).toBe(0); }
                results.push({ special, state });
            }
        }
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
    } finally {
        await info.attach(`${game}-special-utile.json`, { body: JSON.stringify({ results, entries: finger.entries }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
