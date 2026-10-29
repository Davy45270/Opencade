import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => window.__ALUNIR_TEST__?.read());
async function activate(page: Page, selector: string, mobile: boolean) {
    if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
}
async function hold(page: Page, mobile: boolean, ms: number) {
    if (mobile) {
        const box = await page.locator('#alunir-thrust').boundingBox();
        if (!box) throw new Error('Poussée absente');
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
        await page.evaluate(ms => { window.__ALUNIR_TEST__?.advance(ms); }, ms);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else {
        await page.keyboard.down('ArrowUp');
        await page.evaluate(ms => { window.__ALUNIR_TEST__?.advance(ms); }, ms);
        await page.keyboard.up('ArrowUp');
    }
}
test('U06 U07 U09 victoire, défaite et progression par entrées réelles', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/alunir');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.alunir))).toBe(true);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const ready = await read(page); await page.waitForTimeout(100); expect(await read(page)).toEqual(ready);
    await activate(page, '#resume', mobile);
    await page.evaluate(() => { window.__ALUNIR_TEST__?.scenario('finish'); window.__ALUNIR_TEST__?.advance(0); });
    await hold(page, mobile, 100);
    expect((await read(page))?.status).toBe('won');
    await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/alunir-won-${info.project.name}.png` });
    await activate(page, '#next-level', mobile); expect((await read(page))?.level).toBe(1);
    await page.evaluate(() => { window.__ALUNIR_TEST__?.advance(0); });
    const bounds = await page.evaluate(() => {
        const b = window.__ALUNIR_TEST__?.bounds(), canvas = document.querySelector('#game canvas')?.getBoundingClientRect();
        if (!b || !canvas) throw new Error('Géométrie absente');
        const convert = (r: typeof b.module) => ({ x: canvas.x + r.x * canvas.width / 360, y: canvas.y + r.y * canvas.height / 640, width: r.width * canvas.width / 360, height: r.height * canvas.height / 640 });
        return { module: convert(b.module), hud: convert(b.hud) };
    });
    const { module: m, hud: h } = bounds;
    expect(m.x + m.width <= h.x || h.x + h.width <= m.x || m.y + m.height <= h.y || h.y + h.height <= m.y).toBe(true);
    await page.screenshot({ path: `test-results/screenshots/alunir-play-${info.project.name}.png` });
    await page.reload(); await expect(page.locator('#resume')).toBeVisible();
    await activate(page, '#resume', mobile);
    if (mobile) await activate(page, '#game-menu-toggle', true);
    await activate(page, '#levels', mobile);
    await expect(page.locator('#level-list button').nth(1)).toBeEnabled();
    await activate(page, '#close-levels', mobile);
    await page.evaluate(() => { window.__ALUNIR_TEST__?.scenario('danger'); window.__ALUNIR_TEST__?.advance(0); });
    await hold(page, mobile, 100);
    expect((await read(page))?.status).toBe('lost');
    await expect(page.locator('#retry-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/alunir-lost-${info.project.name}.png` });
    await activate(page, '#retry-level', mobile); expect((await read(page))?.status).toBe('playing');
    await page.evaluate(() => { window.__ALUNIR_TEST__?.loadLevel(29, 28); window.__ALUNIR_TEST__?.advance(0); });
    expect((await read(page))?.level).toBe(29);
    await page.screenshot({ path: `test-results/screenshots/alunir-level30-${info.project.name}.png` });
    await activate(page, '#pause', mobile); const paused = await read(page);
    await page.evaluate(() => { window.__ALUNIR_TEST__?.advance(10000); }); expect(await read(page)).toEqual(paused);
});
