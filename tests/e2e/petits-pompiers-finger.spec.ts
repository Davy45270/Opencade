import { test, expect } from './fixture';
import { Finger } from './finger-stepped';
import type {} from '../../src/games/petits-pompiers/scene';
for (const level of [0, 4]) test(`Petits Pompiers : doigt bruité, niveau ${String(level + 1)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(240000);
    await Finger.prepare(page); await page.goto('/?test=1#/petits-pompiers');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PETITS_POMPIERS_TEST__))).toBe(true);
    await page.locator('#level-list button').first().tap(); await page.locator('#pompiers-detente').tap();
    const cdp = await page.context().newCDPSession(page), finger = await Finger.create(page, cdp);
    await finger.press(['#resume']);
    await page.evaluate(level => { window.__PETITS_POMPIERS_TEST__?.load(level, 28, 'detente'); }, level);
    try {
        for (let step = 0; step < 2400; step++) {
            const state = await finger.read(); if (state.status !== 'playing') break;
            const intent = await page.evaluate(() => window.__PETITS_POMPIERS_TEST__?.pilotAction());
            if (!intent) throw new Error('Pilote absent');
            const targets = await page.evaluate(i => {
                const points: { id: number; x: number; y: number }[] = [], selectors: string[] = [];
                const add = (selector: string, id: number, dx = 0, dy = 0) => { const r = document.querySelector(selector)?.getBoundingClientRect(); if (!r) throw new Error('Cible absente'); points.push({ id, x: r.x + r.width / 2 + dx, y: r.y + r.height / 2 + dy }); selectors.push(selector); };
                if (i.dx || i.dy) add('.joystick', 0, i.dx * 44, i.dy * 44);
                if (i.action) add('#pompiers-action', 1); if (i.tool) add('#pompiers-tool', 2);
                return { points, selectors };
            }, intent);
            if (targets.points.length) await finger.touch('touchStart', targets.points, targets.selectors);
            else await finger.steer([]);
        }
        expect((await finger.read()).status).toBe('won');
        expect(finger.entries.length).toBeGreaterThan(10); expect(finger.entries.every(e => !e.missed)).toBe(true);
        await page.screenshot({ path: info.outputPath(`petits-pompiers-mobile-doigt-niveau${String(level + 1)}-victoire.png`) });
    } finally { await finger.release(); await finger.attach(info, `petits-pompiers-doigt-${String(level + 1)}.json`); await cdp.detach(); }
});
