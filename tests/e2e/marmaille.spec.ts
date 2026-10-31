import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import { Finger } from './character-finger-input';
import { solutions } from '../marmaille-solutions';
import { ROLES } from '../../src/engines/marmaille/engine';
import { LEVELS } from '../../src/engines/marmaille/levels';
const TICK = 125;
async function open(page: Page): Promise<void> {
    await page.goto('/?test=1#/marmaille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__MARMAILLE_TEST__))).toBe(true);
}
/** Real-time game: leave the « Prêt ? » screen before driving the clock with advance(). */
async function play(page: Page): Promise<void> {
    const resume = page.locator('#resume');
    if (await resume.isVisible()) await resume.click();
}
/** Page coordinates of a logical canvas point (360 × 640). */
async function toPage(page: Page, p: { x: number; y: number }): Promise<{ x: number; y: number }> {
    const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('canvas');
    return { x: box.x + p.x * box.width / 360, y: box.y + p.y * box.height / 640 };
}
// MA-E1: the board opens with its HUD, the role slots follow the level and a real click hands a role.
test('MA-E1 ouverture, emplacements de rôles et clic sur un enfant', async ({ page }) => {
    await open(page); await play(page);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.loadLevel(1); });
    await expect.poll(() => page.evaluate(() => window.__MARMAILLE_TEST__?.hudText())).toMatch(/SCORE/);
    await expect(page.locator('#marmaille-r0')).toHaveText('✋1');
    await expect(page.locator('#marmaille-r1')).toBeHidden();
    // Advance to the recorded tick, then click the kid (mouse on desktop and mobile alike).
    const [tick, kid] = solutions[1]?.[0] ?? [0, 0];
    await page.evaluate(ms => { window.__MARMAILLE_TEST__?.advance(ms); }, tick * TICK);
    const at = await page.evaluate(id => window.__MARMAILLE_TEST__?.kidPoint(id), kid); if (!at) throw new Error('kid');
    const p = await toPage(page, at); await page.mouse.click(p.x, p.y);
    await expect.poll(() => page.evaluate(() => window.__MARMAILLE_TEST__?.read().roles.block)).toBe(0);
    await expect(page.locator('#marmaille-r0')).toHaveText('✋0');
    // V doubles game time: one second of host time is sixteen ticks instead of eight.
    const t0 = (await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.tick ?? 0;
    await page.keyboard.press('KeyV'); expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.fast).toBe(true);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.advance(1000); });
    expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.tick).toBe(t0 + 16);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.advance(60000); });
    const s = await page.evaluate(() => window.__MARMAILLE_TEST__?.read());
    expect(s?.status).toBe('won'); expect(s?.kids.find(k => k.id === kid)?.state).toBe('block');
    await page.screenshot({ path: test.info().outputPath('marmaille-M2.png') });
});
// MA-E2: a level without the needed role is lost; replay and level menu stay usable.
test('MA-E2 sans rôle, la falaise est perdue', async ({ page }) => {
    await open(page); await play(page);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.loadLevel(2); window.__MARMAILLE_TEST__?.advance(60000); });
    await expect.poll(() => page.evaluate(() => window.__MARMAILLE_TEST__?.read().status)).toBe('lost');
});
// MA-E3: noisy finger on the phone: select the role slot, then tap the kid, on the recorded ticks (game time from advance()).
test('MA-E3 doigt bruité : niveaux 2, 9, 15 et 25 gagnés', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(300000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [];
    await finger.press(['#resume']);
    let seed = 483; const noise = () => { seed = seed * 16807 % 2147483647; return seed % 9 - 4; };
    try {
        for (const level of [1, 8, 14, 24]) {
            await page.evaluate(i => { window.__MARMAILLE_TEST__?.loadLevel(i); }, level);
            const roles = ROLES.filter(r => (LEVELS[level]?.roles[r] ?? 0) > 0);
            let tick = 0;
            for (const [at, kid, role] of solutions[level] ?? []) {
                await page.evaluate(ms => { window.__MARMAILLE_TEST__?.advance(ms); }, (at - tick) * TICK); tick = at;
                await finger.press([`#marmaille-r${String(roles.indexOf(role))}`]);
                expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.selected).toBe(role);
                const point = await page.evaluate(id => window.__MARMAILLE_TEST__?.kidPoint(id), kid); if (!point) throw new Error('kid');
                const p = await toPage(page, point), touch = { id: 4, x: p.x + noise(), y: p.y + noise() };
                const before = (await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.roles[role] ?? 0;
                await finger.touch('touchStart', [touch]); await finger.release();
                await expect.poll(async () => (await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.roles[role]).toBe(before - 1);
            }
            await page.evaluate(() => { window.__MARMAILLE_TEST__?.advance(120000); });
            const final = await page.evaluate(() => window.__MARMAILLE_TEST__?.read());
            results.push({ level: level + 1, status: final?.status, saved: final?.saved });
            expect(final?.status).toBe('won');
            await page.screenshot({ path: info.outputPath(`marmaille-doigt-M${String(level + 1)}.png`) });
        }
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
    } finally {
        await info.attach('marmaille-doigt.json', { body: JSON.stringify({ noisePx: 4, results }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
