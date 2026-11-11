import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => {
    const hook = window.__DEVISSO_TEST__; if (!hook) throw new Error('Crochet Dévisso absent');
    return hook.read();
});
/** Screen point of a world point of the 360 × 640 canvas. */
async function screen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    return { x: box.x + x * box.width / 360, y: box.y + y * box.height / 640 };
}
async function touch(page: Page, x: number, y: number, mobile: boolean): Promise<void> {
    const p = await screen(page, x, y);
    if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
test('DV-E01 ouvert depuis l’accueil, le niveau 1 se démonte au doigt jusqu’à « Niveau terminé ! »', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1');
    const card = page.locator('.game-card').filter({ hasText: 'Dévisso' });
    await expect(card).toHaveCount(1);
    if (mobile) await card.tap(); else await card.click();
    await expect(page).toHaveURL(/#\/devisso$/);
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    await page.evaluate(() => { window.__DEVISSO_TEST__?.loadLevel(0); window.__DEVISSO_TEST__?.advance(0); });
    const start = await read(page);
    expect(start.status).toBe('playing'); expect(start.remaining).toBe(start.total);
    await expect(page.locator('#devisso-hint')).toBeVisible();
    // Real taps on the canvas, each on the screw the solver keeps winnable.
    for (let n = 0; n < start.total && (await read(page)).status === 'playing'; n++) {
        const point = await page.evaluate(() => { const hook = window.__DEVISSO_TEST__; if (!hook) throw new Error('Crochet'); return hook.screwPoint(hook.bestMove()); });
        const before = (await read(page)).remaining;
        await touch(page, point.x, point.y, mobile);
        expect((await read(page)).remaining).toBeLessThan(before);
    }
    const end = await read(page);
    expect(end.status).toBe('won'); expect(end.stars).toBe(3); expect(end.helps).toBe(0);
    expect(await page.evaluate(() => window.__DEVISSO_TEST__?.hudText())).toContain('SCORE');
    await expect(page.locator('#next-level')).toBeVisible();
});
test('DV-E02 impasse : « Aucun coup possible ! », puis un cœur reprend trois coups', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/devisso');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    await page.evaluate(() => { window.__DEVISSO_TEST__?.loadLevel(1); window.__DEVISSO_TEST__?.scenario('stuck'); window.__DEVISSO_TEST__?.advance(0); });
    const stuck = await read(page);
    expect(stuck.stuck).toBe(true); expect(stuck.status).toBe('playing'); expect(stuck.hearts).toBe(5);
    // The "Reprendre" button of the red banner (world 70–290 × 392–444).
    await touch(page, 180, 418, mobile);
    const after = await read(page);
    expect(after.hearts).toBe(4); expect(after.stuck).toBe(false); expect(after.moves).toBe(stuck.moves - 3);
});
for (const width of [320, 390, 1280]) test(`DV-E03 mise en page ${String(width)} px avec DejaVu Sans : rien ne déborde, plateau et bonus visibles sans défiler`, async ({ page }) => {
    const height = width === 1280 ? 900 : width === 320 ? 640 : 844;
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/devisso');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    // A wide font (installed on the CI runner): text that fits with it fits with the system fonts.
    await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
    await page.evaluate(() => { window.__DEVISSO_TEST__?.loadLevel(29); window.__DEVISSO_TEST__?.advance(0); });
    const layout = await page.evaluate(() => {
        const rect = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null; };
        return {
            scroll: document.documentElement.scrollWidth, scrollY: document.documentElement.scrollHeight, inner: innerHeight,
            canvas: rect(document.querySelector('#game canvas')),
            buttons: [...document.querySelectorAll('#touch-controls button')].map(b => ({ ...rect(b), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, wrap: b.scrollWidth <= b.clientWidth })),
        };
    });
    expect(layout.scroll).toBeLessThanOrEqual(width);
    expect(layout.canvas?.right ?? Infinity).toBeLessThanOrEqual(width + 0.5);
    expect(layout.canvas?.bottom ?? Infinity).toBeLessThanOrEqual(layout.inner + 0.5);
    expect(layout.buttons).toHaveLength(5);
    for (const b of layout.buttons) {
        expect(b.w).toBeGreaterThanOrEqual(44); expect(b.h).toBeGreaterThanOrEqual(44);
        expect(b.right ?? Infinity).toBeLessThanOrEqual(width); expect(b.bottom ?? Infinity).toBeLessThanOrEqual(layout.inner + 0.5);
        expect(b.wrap).toBe(true);
    }
});
