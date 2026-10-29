import { openGameMenu, test, expect, point, measureLayout } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/briqueterie/scene';
async function read(page: Page) { return page.evaluate(() => window.__BRIQUETERIE_TEST__?.read()); }
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    const box = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); if (!box.width || !box.height) throw new Error('Contrôle absent');
    if (mobile) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); else await page.locator(selector).click();
}
async function layout(page: Page): Promise<void> {
    const { canvas, controls, scroll, height } = await measureLayout(page, ['#pause', '#briqueterie-left', '#briqueterie-launch', '#briqueterie-right']);
    const pause = controls[0]; if (!pause) throw new Error('Pause absente');
    expect(pause.width).toBeGreaterThanOrEqual(44); expect(pause.height).toBeGreaterThanOrEqual(44);
    expect(pause.x < canvas.x + canvas.width && pause.x + pause.width > canvas.x && pause.y < canvas.y + canvas.height && pause.y + pause.height > canvas.y).toBe(false);
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.y).toBeGreaterThanOrEqual(0);
    const viewport = page.viewportSize(); expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport?.width ?? 0); expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport?.height ?? 0);
    expect(scroll).toBeLessThanOrEqual(height);
    for (const b of controls.slice(1).filter(box => box.width > 0 && box.height > 0)) { expect(b.width).toBeGreaterThanOrEqual(56); expect(b.height).toBeGreaterThanOrEqual(56); expect(b.y).toBeGreaterThanOrEqual(canvas.y + canvas.height); expect(b.y + b.height).toBeLessThanOrEqual(viewport?.height ?? 0); }
}
async function drag(page: Page, mobile: boolean, x: number): Promise<void> {
    const start = await point(page, 180, 620), end = await point(page, x, 620);
    if (mobile) {
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
    } else await page.mouse.move(end.x, end.y);
}
test('K08 K12 victoire par lancement réel, progression et reprise', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/briqueterie');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.briqueterie))).toBe(true);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const ready = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(ready);
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.scenario('finish'); });
    if (mobile) { await tap(page, '#resume', true); await tap(page, '#briqueterie-launch', true); } else await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('won');
    await expect(page.locator('#result-title')).toContainText('réussi');
    expect((await read(page))?.score).toBe(30); expect((await read(page))?.cumulativeScore).toBe(30);
    await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/briqueterie-won-${info.project.name}.png` });
    await tap(page, '#next-level', mobile); expect((await read(page))?.level).toBe(1);
    await layout(page); await page.screenshot({ path: `test-results/screenshots/briqueterie-play-${info.project.name}.png` });
    await page.reload(); await tap(page, '#resume', mobile); await tap(page, '#levels', mobile);
    await expect(page.locator('#level-list button')).toHaveCount(30); await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await expect(page.locator('#level-list button').nth(2)).toBeDisabled();
    await tap(page, '#close-levels', mobile);
});
// Séparé du parcours précédent : sur une machine lente, l'ensemble dépassait le délai de 30 s.
test('K11 K12 niveau 30 chargé, mise en page et capture', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/briqueterie');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.briqueterie))).toBe(true);
    await tap(page, '#resume', mobile);
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.loadLevel(29, 455); });
    await expect.poll(async () => (await read(page))?.level).toBe(29);
    await layout(page); expect((await read(page))?.speed).toBe(9);
    await page.screenshot({ path: `test-results/screenshots/briqueterie-level30-${info.project.name}.png` });
});
test('K02 contrôles, glisser tactile et pause', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/briqueterie'); await expect.poll(() => page.evaluate(() => Boolean(window.__BRIQUETERIE_TEST__))).toBe(true);
    await tap(page, '#resume', mobile);
    await drag(page, mobile, 260); expect((await read(page))?.paddle).toBeCloseTo(260, 0);
    if (mobile) {
        const box = await page.locator('#briqueterie-left').boundingBox(); if (!box) throw new Error('Contrôle absent');
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 28, y: box.y + 28 }] });
        await expect.poll(async () => (await read(page))?.paddle).toBeLessThan(240);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
    } else { await page.keyboard.down('KeyA'); await expect.poll(async () => (await read(page))?.paddle).toBeLessThan(240); await page.keyboard.up('KeyA'); }
    expect((await read(page))?.paddle).toBeLessThan(240);
    await tap(page, '#pause', mobile); const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused); await layout(page); await tap(page, '#resume', mobile);
});
// Séparé du test des contrôles : sur une machine lente, l'ensemble atteignait le délai de 30 s.
test('K07 défaite par chute réelle puis rejouer', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/briqueterie'); await expect.poll(() => page.evaluate(() => Boolean(window.__BRIQUETERIE_TEST__))).toBe(true);
    await tap(page, '#resume', mobile);
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.scenario('fall'); });
    if (mobile) await tap(page, '#briqueterie-launch', true); else await page.keyboard.press('Space');
    await expect.poll(async () => (await read(page))?.ready).toBe(false);
    await drag(page, mobile, 300);
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    expect((await read(page))?.lives).toBe(0); expect((await read(page))?.cumulativeScore).toBe(0);
    await page.screenshot({ path: `test-results/screenshots/briqueterie-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile); expect((await read(page))?.status).toBe('playing'); expect((await read(page))?.score).toBe(0); expect((await read(page))?.lives).toBe(3); expect((await read(page))?.ready).toBe(true);
});
test('K12 crochet inerte sans mode test et sortie nettoyée', async ({ page }, info) => {
    await page.goto('/#/briqueterie'); await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => window.__BRIQUETERIE_TEST__)).toBeUndefined();
    await tap(page, '#topbar [data-home]', info.project.name === 'mobile-chromium'); await expect(page.locator('#home')).toBeVisible(); await expect(page.locator('#game canvas')).toHaveCount(0);
});
