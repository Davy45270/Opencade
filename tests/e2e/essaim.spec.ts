import { openGameMenu, test, expect, point, measureLayout } from './fixture';
import type { Page } from '@playwright/test';
async function read(page: Page) { return page.evaluate(() => window.__ESSAIM_TEST__?.read()); }
async function open(page: Page): Promise<void> {
    await page.goto('/?test=1#/essaim');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.essaim))).toBe(true);
}
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    if (mobile) {
        const box = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); if (!box.width || !box.height) throw new Error(`Contrôle absent : ${selector}`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    } else await page.locator(selector).click();
}
async function drag(page: Page, from: number, to: number, y = 618): Promise<void> {
    const a = await point(page, from, y), b = await point(page, to, y);
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
}
async function layout(page: Page): Promise<void> {
    const { canvas, controls, scroll, height } = await measureLayout(page,
        ['#pause', '#sound', '#essaim-fire', '#essaim-left', '#essaim-right', '.essaim-options', '#levels', '#restart']);
    const viewport = page.viewportSize(); if (!viewport) throw new Error('Viewport absent');
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width); expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height);
    for (const box of controls) {
        const selector = box.selector;
        expect(box.width).toBeGreaterThanOrEqual(selector === '#essaim-fire' ? 64 : 44);
        expect(box.height).toBeGreaterThanOrEqual(selector === '#essaim-fire' ? 64 : 44);
        expect(box.x < canvas.x + canvas.width && box.x + box.width > canvas.x && box.y < canvas.y + canvas.height && box.y + box.height > canvas.y).toBe(false);
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    expect(scroll).toBeLessThanOrEqual(height + 1);
}
test('G04 G10 victoire par tir réel, niveau suivant et déblocage repris', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const ready = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(ready);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.scenario('finish'); });
    if (mobile) await tap(page, '#essaim-fire', true); else await page.keyboard.press('Space');
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('won');
    await expect(page.locator('#result-title')).toContainText('réussi');
    await expect(page.locator('#next-level')).toBeVisible(); expect((await read(page))?.score).toBe(10); expect((await read(page))?.cumulativeScore).toBe(10);
    await page.screenshot({ path: `test-results/screenshots/essaim-won-${info.project.name}.png` });
    await tap(page, '#next-level', mobile); await expect.poll(async () => (await read(page))?.level).toBe(1); expect((await read(page))?.cumulativeScore).toBe(10);
    await layout(page); await page.screenshot({ path: `test-results/screenshots/essaim-play-${info.project.name}.png` });
    await page.reload(); await expect(page.locator('#resume')).toBeVisible(); await tap(page, '#resume', mobile);
    await tap(page, '#levels', mobile); await expect(page.locator('#level-list button')).toHaveCount(30);
    await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await expect(page.locator('#level-list button').nth(2)).toBeDisabled(); await expect(page.locator('#best-score')).toContainText('10');
    await tap(page, '#close-levels', mobile); await tap(page, '#pause', mobile);
});
test('G06 G10 défaite après guidage réel puis rejouer restaure vies et score', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await page.evaluate(mobile => {
        window.__ESSAIM_TEST__?.scenario('danger');
        // Freeze rendering while preparing two distinct real touch gestures.
        if (mobile) window.__ESSAIM_TEST__?.advance(0);
    }, mobile);
    if (mobile) {
        await tap(page, '#resume', true);
        await expect(page.locator('#pause-panel')).toBeHidden();
    }
    expect((await read(page))?.status).toBe('playing');
    // Le toucher de démarrage est consommé ; le guidage vient ensuite.
    const target = await point(page, 240, 618);
    if (mobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
    if (mobile) expect((await read(page))?.target).toBe(240);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    expect(Math.abs(((await read(page))?.cannon ?? 0) - 240)).toBeLessThanOrEqual(14); expect((await read(page))?.lives).toBe(0); expect((await read(page))?.cumulativeScore).toBe(0);
    await expect(page.locator('#retry-level')).toBeVisible(); await page.screenshot({ path: `test-results/screenshots/essaim-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile); expect((await read(page))?.status).toBe('playing'); expect((await read(page))?.lives).toBe(3); expect((await read(page))?.score).toBe(0);
    await tap(page, '#pause', mobile); const paused = await read(page); await page.waitForTimeout(220); expect(await read(page)).toEqual(paused);
});
test('G01 G03 G12 guidage clavier souris doigt, tir auto sauvé et pause', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page); await tap(page, '#resume', mobile);
    // Use simulation time for guidance, independently of rendering.
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(0); });
    if (mobile) {
        await drag(page, 180, 280); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(500); }); await expect.poll(async () => (await read(page))?.cannon).toBeCloseTo(280);
        // La moitié haute ne déplace pas le canon au toucher.
        await drag(page, 280, 80, 200); expect((await read(page))?.target).toBe(280);
    } else {
        await page.keyboard.down('ArrowRight'); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(200); }); await expect.poll(async () => (await read(page))?.cannon ?? 0).toBeGreaterThan(215); await page.keyboard.up('ArrowRight');
        await page.keyboard.down('KeyA'); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(400); }); await expect.poll(async () => (await read(page))?.cannon ?? 360).toBeLessThan(180); await page.keyboard.up('KeyA');
        const target = await point(page, 280, 610); await page.mouse.move(target.x, target.y);
        // 600 ms covers the return from keyboard guidance at 300 px/s.
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(600); }); await expect.poll(async () => (await read(page))?.cannon).toBeCloseTo(280);
    }
    if (mobile) {
        const a = await point(page, 280, 618), client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
        await expect.poll(async () => (await read(page))?.firing).toBe(true);
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
        await expect.poll(async () => (await read(page))?.shots.some(s => s.owner === 'player')).toBe(true);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
        await expect.poll(async () => (await read(page))?.firing).toBe(false);
    }
    await tap(page, '#essaim-fire', mobile); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
    await expect.poll(async () => (await read(page))?.shots.some(s => s.owner === 'player')).toBe(true);
    if (mobile) await tap(page, '#pause', true); else await page.keyboard.press('KeyP');
    const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
    if (mobile) await tap(page, '#resume', true); else await page.keyboard.press('Escape');
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
    await expect.poll(async () => (await read(page))?.ticks ?? 0).toBeGreaterThan(paused?.ticks ?? 0);
    await tap(page, '.essaim-options', mobile); expect((await read(page))?.autoFire).toBe(true);
    await page.reload(); await expect(page.locator('#essaim-auto')).toBeChecked(); await tap(page, '#resume', mobile);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
    await expect.poll(async () => (await read(page))?.shots.some(s => s.owner === 'player')).toBe(true); await layout(page);
});
test('G12 crochet inerte sans test et nettoyage à la sortie', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await tap(page, '#topbar [data-home]', mobile); await expect(page.locator('#game canvas')).toHaveCount(0);
    expect(await page.evaluate(() => window.__ESSAIM_TEST__)).toBeUndefined(); await expect(page.locator('#essaim-auto')).toHaveCount(0);
    await page.goto('/#/essaim'); await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => [window.__ARCADE_TEST__, window.__ESSAIM_TEST__])).toEqual([undefined, undefined]);
});

test('G11 G10 niveau 30 et mise en page', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await tap(page, '#resume', mobile); await tap(page, '#pause', mobile);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.loadLevel(29, 457); });
    await tap(page, '#pause', mobile); await layout(page);
    await page.screenshot({ path: `test-results/screenshots/essaim-level30-${info.project.name}.png` });
});
