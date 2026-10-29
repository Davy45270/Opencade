import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (p: Page) => p.evaluate(() => window.__TRAVERSE_TEST__?.read());
test('R01 R02 R06 R08 R09 victoire, défaite, progression et zone utile', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    const activate = async (selector: string) => { if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click(); };
    await page.goto('/?test=1#/traverse');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.traverse))).toBe(true);
    await activate('#resume');
    await page.evaluate(() => window.__TRAVERSE_TEST__?.advance(0));
    await page.screenshot({ path: `test-results/screenshots/traverse-play-${info.project.name}.png` });
    const bounds = await page.evaluate(() => {
        const useful = window.__TRAVERSE_TEST__?.usefulArea(); if (!useful) throw new Error('Zone absente');
        const b = window.__TRAVERSE_TEST__?.bounds(); if (!b) throw new Error('Boîtes absentes');
        return { useful, hudBottom: b.hud.y + b.hud.height, heroTop: b.hero.y };
    });
    expect(bounds.hudBottom).toBeLessThan(bounds.useful.y); expect(bounds.hudBottom).toBeLessThan(bounds.heroTop);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    for (const button of await page.locator('#touch-controls button').all()) {
        const b = await button.boundingBox(); if (b) expect(b.y >= canvas.y + canvas.height || b.y + b.height <= canvas.y).toBe(true);
    }
    await page.evaluate(() => window.__TRAVERSE_TEST__?.scenario('finish'));
    if (mobile) await page.touchscreen.tap(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2); else await page.keyboard.press('ArrowUp');
    await page.evaluate(() => window.__TRAVERSE_TEST__?.advance(500));
    expect((await read(page))?.status).toBe('won'); await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/traverse-won-${info.project.name}.png` });
    await activate('#next-level'); expect((await read(page))?.level).toBe(1);
    await page.reload(); await expect.poll(() => page.evaluate(() => Boolean(window.__TRAVERSE_TEST__))).toBe(true);
    await activate('#resume');
    if (mobile) await activate('#game-menu-toggle'); await activate('#levels'); await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await activate('#close-levels');
    await page.evaluate(() => window.__TRAVERSE_TEST__?.scenario('danger'));
    if (mobile) await page.locator('#traverse-up').tap(); else await page.keyboard.press('ArrowUp');
    await page.evaluate(() => window.__TRAVERSE_TEST__?.advance(500));
    expect((await read(page))?.status).toBe('lost'); await expect(page.locator('#retry-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/traverse-lost-${info.project.name}.png` });
    await activate('#retry-level'); expect((await read(page))?.lives).toBe(3);
    await page.evaluate(() => window.__TRAVERSE_TEST__?.loadLevel(29, 28));
    expect((await read(page))?.level).toBe(29);
    await page.screenshot({ path: `test-results/screenshots/traverse-level30-${info.project.name}.png` });
});

test('R01 glisser tactile unique, pause et crochet de production absent', async ({ page }, info) => {
    if (info.project.name === 'mobile-chromium') {
        await page.goto('/?test=1#/traverse'); await expect(page.locator('#resume')).toBeVisible(); await page.locator('#resume').tap();
        await page.evaluate(() => window.__TRAVERSE_TEST__?.scenario('finish'));
        const b = await page.locator('#game canvas').boundingBox(); if (!b) throw new Error('Canevas absent');
        const cdp = await page.context().newCDPSession(page), x = b.x + b.width / 2, y = b.y + b.height / 2;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 80 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
        expect((await read(page))?.queue).toEqual(['up']);
        await page.evaluate(() => window.__TRAVERSE_TEST__?.advance(500)); expect((await read(page))?.status).toBe('won');
    }
    await page.goto('/#/traverse'); await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__TRAVERSE_TEST__)).toBeUndefined(); expect(await page.evaluate(() => window.__ARCADE_TEST__)).toBeUndefined();
});
