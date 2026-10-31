import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/bombercade/scene';
async function read(page: Page) { return page.evaluate(() => { if (!window.__BOMBERCADE_TEST__) throw new Error('Crochet absent'); return window.__BOMBERCADE_TEST__.read(); }); }
async function advance(page: Page, ms: number) { await page.evaluate(ms => { window.__BOMBERCADE_TEST__?.advance(ms); }, ms); }
async function direction(page: Page, mobile: boolean, dir: 'left' | 'down', ms: number) {
    if (mobile) {
        const stick = page.locator('.joystick'), box = await stick.boundingBox(); if (!box) throw new Error('Pavé absent');
        const cdp = await page.context().newCDPSession(page);
        try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x: box.x + 60 + (dir === 'left' ? -40 : 0), y: box.y + 60 + (dir === 'down' ? 40 : 0) }] }); await advance(page, ms); }
        finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }
    } else { const key = dir === 'left' ? 'ArrowLeft' : 'ArrowDown'; await page.keyboard.down(key); await advance(page, ms); await page.keyboard.up(key); }
}
test('B parcours victoire, suite, défaite, reprise et quatre captures', async ({ page }, info) => {
    test.setTimeout(120_000);
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/bombercade');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BOMBERCADE_TEST__))).toBe(true);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    await expect(page.locator('#resume')).toBeHidden();
    await expect.poll(async () => (await read(page)).status).toBe('playing');
    await page.screenshot({ path: info.outputPath('bombercade-play.png') });
    await page.evaluate(() => { window.__BOMBERCADE_TEST__?.loadLevel(29, 28); });
    await page.screenshot({ path: info.outputPath('bombercade-level30.png') });
    await page.evaluate(() => { window.__BOMBERCADE_TEST__?.scenario('finish'); });
    if (mobile) await page.locator('#bombercade-bomb').tap(); else await page.keyboard.press('Space');
    await direction(page, mobile, 'left', 270); await direction(page, mobile, 'down', 270); await advance(page, 2500);
    expect((await read(page)).status).toBe('won'); await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: info.outputPath('bombercade-won.png') });
    if (mobile) await page.locator('#next-level').tap(); else await page.locator('#next-level').click();
    await expect.poll(async () => (await read(page)).level).toBe(1);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(window.__BOMBERCADE_TEST__))).toBe(true);
    await expect.poll(async () => (await read(page)).level).toBe(1);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    await expect(page.locator('#resume')).toBeHidden();
    await page.evaluate(() => { window.__BOMBERCADE_TEST__?.scenario('danger'); }); await advance(page, 500);
    expect((await read(page)).status).toBe('lost'); await expect(page.locator('#retry-level')).toBeVisible();
    await page.screenshot({ path: info.outputPath('bombercade-lost.png') });
    if (mobile) await page.locator('#retry-level').tap(); else await page.locator('#retry-level').click();
    expect((await read(page)).status).toBe('playing'); expect((await read(page)).actors[0]?.hearts).toBe(1);
});
test('B crochet réservé au paramètre test', async ({ page }) => {
    await page.goto('/#/bombercade'); await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__BOMBERCADE_TEST__)).toBeUndefined();
});
