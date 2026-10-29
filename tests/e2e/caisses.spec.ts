import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => window.__CAISSES_TEST__?.read());
async function activate(page: Page, selector: string, mobile: boolean) {
    if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
}
async function direction(page: Page, name: 'left' | 'right', mobile: boolean) {
    if (mobile) await page.locator(`#caisses-${name}`).tap();
    else await page.keyboard.press(name === 'left' ? 'ArrowLeft' : 'ArrowRight');
}
test('C01 C04 C05 C06 C11 victoire, reprise, impasse sans défaite', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/caisses');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.caisses))).toBe(true);
    await expect(page.locator('#pause')).toBeHidden();
    await page.screenshot({ path: `test-results/screenshots/caisses-play-${info.project.name}.png` });
    // Complete the entire first level with real inputs; no scenario required.
    await direction(page,'right',mobile); await direction(page,'right',mobile);
    expect((await read(page))?.status).toBe('won'); expect((await read(page))?.score).toBe(1000);
    await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/caisses-won-${info.project.name}.png` });
    await activate(page,'#next-level',mobile); expect((await read(page))?.level).toBe(1);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(window.__CAISSES_TEST__))).toBe(true);
    if (mobile) await activate(page,'#game-menu-toggle',true);
    await activate(page,'#levels',mobile); await expect(page.locator('#level-list button').nth(1)).toBeEnabled();
    await activate(page,'#close-levels',mobile);
    await page.evaluate(() => { window.__CAISSES_TEST__?.scenario('corner'); });
    const before=await read(page); await direction(page,'left',mobile);
    expect((await read(page))?.deadlocked).toBe(true); expect((await read(page))?.status).toBe('playing');
    await expect(page.locator('#result')).toBeHidden();
    // The requested lost capture records a recoverable impasse: this game has no defeat.
    await page.screenshot({ path: `test-results/screenshots/caisses-lost-${info.project.name}.png` });
    if (mobile) await activate(page,'#caisses-undo',true); else await page.keyboard.press('Backspace');
    expect(await read(page)).toEqual(before);
    if (mobile) await activate(page,'#game-menu-toggle',true);
    await activate(page,'#restart',mobile); expect((await read(page))?.moves).toBe(0);
    await page.evaluate(() => { window.__CAISSES_TEST__?.loadLevel(29,28); });
    expect((await read(page))?.level).toBe(29);
    await page.screenshot({ path: `test-results/screenshots/caisses-level30-${info.project.name}.png` });
});
test('C01 C05 glisser tactile et menu bloquant les entrées', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Parcours tactile');
    await page.goto('/?test=1#/caisses');
    await expect.poll(() => page.evaluate(() => Boolean(window.__CAISSES_TEST__))).toBe(true);
    const box=await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const cdp=await page.context().newCDPSession(page);
    const x=box.x+box.width*.3, y=box.y+box.height*.5;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
    expect((await read(page))?.moves).toBe(1);
    await activate(page,'#game-menu-toggle',true); const before=await read(page);
    await page.locator('#caisses-right').tap({ force: true }); expect(await read(page)).toEqual(before);
});

test('C12 crochet absent sans paramètre test', async ({ page }) => {
    await page.goto('/#/caisses');
    await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__CAISSES_TEST__)).toBeUndefined();
    expect(await page.evaluate(() => window.__ARCADE_TEST__)).toBeUndefined();
});
