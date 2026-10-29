import { openGameMenu, test, expect, measureLayout } from './fixture';
import type { Page } from '@playwright/test';
async function read(page: Page) { return page.evaluate(() => window.__EMPILO_TEST__?.read()); }
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    if (mobile) {
        const box = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); if (!box.width || !box.height) throw new Error(`Contrôle absent : ${selector}`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    } else await page.locator(selector).click();
}
async function open(page: Page): Promise<void> {
    await page.goto('/?test=1#/empilo');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.empilo))).toBe(true);
}
async function layout(page: Page): Promise<void> {
    const { canvas, controls, scroll, height } = await measureLayout(page, ['#pause', '#empilo-left', '#empilo-right', '#empilo-clockwise', '#empilo-counterclockwise', '#empilo-soft', '#empilo-drop']);
    const pause = controls[0]; if (!pause) throw new Error('Pause absente');
    expect(pause.width).toBeGreaterThanOrEqual(44); expect(pause.height).toBeGreaterThanOrEqual(44);
    expect(pause.x < canvas.x + canvas.width && pause.x + pause.width > canvas.x && pause.y < canvas.y + canvas.height && pause.y + pause.height > canvas.y).toBe(false);
    const viewport = page.viewportSize(); if (!viewport) throw new Error('Viewport absent');
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width); expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height);
    for (const box of controls.slice(1)) {
        expect(box.width).toBeGreaterThanOrEqual(56); expect(box.height).toBeGreaterThanOrEqual(56);
        expect(box.y).toBeGreaterThanOrEqual(canvas.y + canvas.height); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(scroll).toBeLessThanOrEqual(height);
}
async function swipe(page: Page, dx: number, dy: number): Promise<void> {
    const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const x = box.x + box.width / 2, y = box.y + box.height / 3;
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
}
test('E08 victoire par chute réelle, progression et reprise', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const ready = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(ready);
    await page.evaluate(() => { window.__EMPILO_TEST__?.scenario('finish'); });
    if (mobile) await tap(page, '#empilo-drop', true); else await page.keyboard.press('Space');
    await page.evaluate(() => { window.__EMPILO_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('won');
    await expect(page.locator('#result-title')).toContainText('réussi');
    await expect(page.locator('#next-level')).toBeVisible(); expect((await read(page))?.lines).toBe(5);
    const total = (await read(page))?.cumulativeScore; expect(total).toBeGreaterThan(400);
    await page.screenshot({ path: `test-results/screenshots/empilo-won-${info.project.name}.png` });
    await tap(page, '#next-level', mobile); await expect.poll(async () => (await read(page))?.level).toBe(1);
    expect((await read(page))?.cumulativeScore).toBe(total); await layout(page);
    await page.screenshot({ path: `test-results/screenshots/empilo-play-${info.project.name}.png` });
    await page.reload(); await expect(page.locator('#resume')).toBeVisible(); await tap(page, '#resume', mobile);
    await tap(page, '#levels', mobile); await expect(page.locator('#level-list button')).toHaveCount(30);
    await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await expect(page.locator('#best-score')).toContainText(String(total));
    await tap(page, '#close-levels', mobile); await tap(page, '#pause', mobile);
    const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
});
test('E07 apparition bloquée après entrée, défaite et rejouer', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await page.evaluate(() => { window.__EMPILO_TEST__?.scenario('blocked'); });
    if (mobile) await tap(page, '#empilo-drop', true); else await page.keyboard.press('Space');
    await page.evaluate(() => { window.__EMPILO_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    await expect(page.locator('#retry-level')).toBeVisible(); expect((await read(page))?.cumulativeScore).toBe(0);
    await page.screenshot({ path: `test-results/screenshots/empilo-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile); await expect.poll(async () => (await read(page))?.status).toBe('playing'); expect((await read(page))?.score).toBe(0);
    await tap(page, '#pause', mobile); const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
});
test('E01 E02 E05 contrôles, gestes au doigt, pause et isolation du crochet', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page); await tap(page, '#resume', mobile);
    await page.evaluate(() => { window.__EMPILO_TEST__?.loadLevel(0, 456); });
    const x = (await read(page))?.active.x;
    if (mobile) await swipe(page, -61, 0); else await page.keyboard.press('ArrowLeft');
    expect((await read(page))?.active.x).toBe((x ?? 0) - (mobile ? 2 : 1));
    const cells = (await read(page))?.active.cells;
    if (mobile) { const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('Canevas absent'); await page.touchscreen.tap(box.x + 10, box.y + 10); }
    else { const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('Canevas absent'); await page.mouse.click(box.x + 10, box.y + 10); }
    expect((await read(page))?.active.cells).not.toEqual(cells);
    await tap(page, '#empilo-counterclockwise', mobile); expect((await read(page))?.active.cells).toEqual(cells);
    await tap(page, '#empilo-right', mobile); await tap(page, '#empilo-soft', mobile); expect((await read(page))?.score).toBeGreaterThanOrEqual(1);
    const before = (await read(page))?.board;
    if (mobile) await swipe(page, 0, 80); else await page.keyboard.press('Space');
    expect((await read(page))?.board).not.toEqual(before);
    await tap(page, '#pause', mobile); const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
    await tap(page, '#resume', mobile); await layout(page);
    await page.goto('/#/empilo'); await expect(page.locator('canvas')).toBeVisible();
    expect(await page.evaluate(() => [window.__ARCADE_TEST__, window.__EMPILO_TEST__])).toEqual([undefined, undefined]);
});

test('E11 E08 niveau 30 et mise en page', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await tap(page, '#resume', mobile); await tap(page, '#pause', mobile);
    await page.evaluate(() => { window.__EMPILO_TEST__?.loadLevel(29, 456); }); await tap(page, '#pause', mobile); await layout(page);
    await page.screenshot({ path: `test-results/screenshots/empilo-level30-${info.project.name}.png` });
});
