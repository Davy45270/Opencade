import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => window.__CAISSES_TEST__?.read());
const gameState = (state: Awaited<ReturnType<typeof read>>) => {
    if (!state) throw new Error('État Caisses absent');
    const { character, ...game } = state;
    return { character, game };
};
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
    const after = gameState(await read(page));
    expect(after.game).toEqual(gameState(before).game);
    expect(after.character.id).toBe(gameState(before).character.id);
    expect(after.character.pose).toBe('profil');
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

// Pass 403: each introduction workshop names its mechanism; the first challenge fails at its budget and undo resumes.
test('C10 C19 ateliers d\'introduction annoncés, défi perdu au budget puis repris par annulation', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/caisses');
    await expect.poll(() => page.evaluate(() => Boolean(window.__CAISSES_TEST__))).toBe(true);
    for (const [level, tip] of [[3, /Glace/], [7, /Flèches/], [11, /Bouton/], [15, /Trou/], [20, /Plots/], [25, /Couleurs/], [29, /Grand final/]] as const) {
        await page.evaluate(index => { window.__CAISSES_TEST__?.loadLevel(index, 28); }, level);
        expect(await page.evaluate(() => window.__CAISSES_TEST__?.hudText() ?? '')).toMatch(tip);
        await page.screenshot({ path: `test-results/screenshots/caisses-intro-${String(level + 1)}-${info.project.name}.png` });
    }
    await page.evaluate(() => { window.__CAISSES_TEST__?.loadLevel(4, 28); });
    expect(await page.evaluate(() => window.__CAISSES_TEST__?.hudText() ?? '')).toMatch(/reste 13/);
    for (let i = 0; i < 13; i++) {
        if (mobile) await page.locator(i % 2 ? '#caisses-down' : '#caisses-up').tap();
        else await page.keyboard.press(i % 2 ? 'ArrowDown' : 'ArrowUp');
    }
    expect((await read(page))?.status).toBe('lost'); await expect(page.locator('#retry-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/caisses-budget-${info.project.name}.png` });
    await page.keyboard.press('Backspace');
    expect((await read(page))?.status).toBe('playing');
});
