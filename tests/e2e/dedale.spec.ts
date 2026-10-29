import { openGameMenu, test, expect, measureLayout } from './fixture';
import type { Page } from '@playwright/test';
async function read(page: Page) { return page.evaluate(() => window.__DEDALE_TEST__?.read()); }
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    if (mobile) {
        const box = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
        if (!box.width || !box.height) throw new Error(`Contrôle absent : ${selector}`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    } else await page.locator(selector).click();
}
async function geometry(page: Page) {
    return measureLayout(page, ['#pause', '#dedale-up', '#dedale-down', '#dedale-left', '#dedale-right', '#levels', '#restart']);
}
async function expectControlsOutsideCanvas(page: Page): Promise<void> {
    const { canvas, controls } = await geometry(page);
    for (const control of controls) {
        expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44);
        const overlaps = control.x < canvas.x + canvas.width && control.x + control.width > canvas.x
            && control.y < canvas.y + canvas.height && control.y + control.height > canvas.y;
        expect(overlaps, control.selector).toBe(false);
    }
}
test('D04 D10 victoire tactile ou clavier, niveau suivant et reprise de sauvegarde', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/dedale');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.dedale))).toBe(true);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const initial = await read(page);
    await page.waitForTimeout(250); expect(await read(page)).toEqual(initial);
    await page.evaluate(() => { window.__DEDALE_TEST__?.scenario('finish'); });
    if (mobile) await tap(page, '#dedale-up', true); else await page.keyboard.press('ArrowUp');
    await page.evaluate(() => { window.__DEDALE_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('won');
    await expect(page.locator('#result-title')).toContainText('réussi');
    await expect(page.locator('#next-level')).toBeVisible();
    expect((await read(page))?.cumulativeScore).toBe(10);
    expect((await read(page))?.seeds).toHaveLength(0);
    await page.screenshot({ path: `test-results/screenshots/dedale-won-${info.project.name}.png` });
    await tap(page, '#next-level', mobile);
    expect((await read(page))?.level).toBe(1);
    await expectControlsOutsideCanvas(page);
    await page.screenshot({ path: `test-results/screenshots/dedale-play-${info.project.name}.png` });
    await page.reload();
    await expect(page.locator('#resume')).toBeVisible(); await tap(page, '#resume', mobile);
    await tap(page, '#levels', mobile);
    await expect(page.locator('#level-list button')).toHaveCount(30);
    await expect(page.locator('#level-list button').nth(1)).toBeEnabled();
    await tap(page, '#close-levels', mobile);
});
test('D02 D11 D12 prêt, pause, niveau 30 et contrôles hors du canevas', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/dedale');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEDALE_TEST__))).toBe(true);
    await page.evaluate(() => { window.__DEDALE_TEST__?.loadLevel(29, 459); });
    const ready = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(ready);
    await tap(page, '#resume', mobile);
    await tap(page, '#pause', mobile);
    const paused = await read(page); await page.waitForTimeout(250); expect(await read(page)).toEqual(paused);
    await expectControlsOutsideCanvas(page);
    await tap(page, '#pause', mobile);
    await page.screenshot({ path: `test-results/screenshots/dedale-level30-${info.project.name}.png` });
    if (mobile) {
        const { canvas, controls, scroll, height } = await geometry(page);
        expect(scroll).toBeLessThanOrEqual(height); expect(canvas.y).toBeGreaterThanOrEqual(56);
        expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.x + canvas.width).toBeLessThanOrEqual(390);
        for (const control of controls.filter(c => c.selector.startsWith('#dedale-'))) {
            expect(control.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
            expect(control.width).toBeGreaterThanOrEqual(56); expect(control.height).toBeGreaterThanOrEqual(56);
            expect(control.y + control.height).toBeLessThanOrEqual(844);
        }
    }
});
test('D09 D10 défaite par entrée réelle puis rejouer, glisser et pause', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/dedale');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEDALE_TEST__))).toBe(true);
    await page.evaluate(() => { window.__DEDALE_TEST__?.scenario('danger'); });
    if (mobile) {
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 180 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 160 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await client.detach();
    } else await page.keyboard.press('KeyW');
    await page.evaluate(() => { window.__DEDALE_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    await expect(page.locator('#retry-level')).toBeVisible();
    expect((await read(page))?.cumulativeScore).toBe(0);
    await page.screenshot({ path: `test-results/screenshots/dedale-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile);
    await expect.poll(async () => (await read(page))?.status).toBe('playing');
    expect((await read(page))?.score).toBe(0);
    await tap(page, '#pause', mobile);
    const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
});

test('D12 crochet inerte et nettoyage lors du retour à l’accueil', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/#/dedale'); await expect(page.locator('canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__DEDALE_TEST__)).toBeUndefined();
    await page.goto('/?test=1#/dedale');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.dedale))).toBe(true);
    await tap(page, '#resume', mobile);
    if (!mobile) {
        await page.locator('#dedale-right').click();
        expect((await read(page))?.requested).toBe('right');
        await page.keyboard.press('Escape'); await expect(page.locator('#pause-title')).toHaveText('En pause');
        const before = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(before);
    }
    await tap(page, '#topbar [data-home]', mobile);
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.evaluate(() => window.__DEDALE_TEST__)).toBeUndefined();
});
