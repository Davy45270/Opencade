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

// Pass 404: each introduction crossing names its rule in the HUD, and the HUD stays above the useful area.
test('R11 traversées d\'introduction annoncées, HUD hors de la zone utile', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/traverse');
    await expect.poll(() => page.evaluate(() => Boolean(window.__TRAVERSE_TEST__))).toBe(true);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    for (const [level, tip] of [[3, /Feux/], [4, /une seule vie/], [6, /plongeurs/], [7, /Rapides/], [11, /Marée/], [15, /Rochers/], [20, /Naufragé/], [25, /Abris en file/]] as const) {
        await page.evaluate(index => { window.__TRAVERSE_TEST__?.loadLevel(index, 28); window.__TRAVERSE_TEST__?.advance(0); }, level);
        expect(await page.evaluate(() => window.__TRAVERSE_TEST__?.hudText() ?? '')).toMatch(tip);
        const b = await page.evaluate(() => window.__TRAVERSE_TEST__?.bounds());
        expect((b?.hud.y ?? 0) + (b?.hud.height ?? 0)).toBeLessThanOrEqual(64);
        const m = await page.evaluate(() => window.__TRAVERSE_TEST__?.marks());
        // Phase 0: a lit lane is red (0 % 6 < 2); rocks, castaway and shut shelters are drawn.
        if (level === 3) expect([m?.red, m?.green]).toEqual([3, 0]);
        if (level === 15) expect(m?.rocks).toBe(6);
        if (level === 20) expect([m?.castaway, m?.closedShelters]).toEqual([true, 5]);
        if (level === 25) expect(m?.closedShelters).toBe(4);
        await page.screenshot({ path: `test-results/screenshots/traverse-intro-${String(level + 1)}-${info.project.name}.png` });
    }
});
