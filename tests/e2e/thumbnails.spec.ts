import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
async function pixels(page: Page, id: string) {
    return page.locator(`canvas[data-game="${id}"]`).evaluate((canvas: HTMLCanvasElement) => {
        const c = canvas.getContext('2d');
        if (!c) throw new Error('Contexte absent');
        return Array.from(c.getImageData(0, 0, canvas.width, canvas.height).data);
    });
}
test('V04–V05 onze vignettes non vides et animées', async ({ page }) => {
    await page.goto('/?test=1#/');
    const canvases = page.locator('.game-thumbnail');
    await expect(canvases).toHaveCount(11);
    for (const canvas of await canvases.all()) {
        await canvas.scrollIntoViewIfNeeded();
        const id = await canvas.getAttribute('data-game');
        if (!id) throw new Error('Identifiant absent');
        await expect.poll(() => page.evaluate(id => window.__ARCADE_TEST__?.thumbnails()[id] ?? 0, id)).toBeGreaterThan(0);
        const before = await pixels(page, id);
        expect(new Set(before.filter((_, i) => i % 4 !== 3)).size).toBeGreaterThan(4);
        await page.waitForTimeout(600);
        expect(await pixels(page, id), id).not.toEqual(before);
    }
});
test('V06 reduce : une seule image fixe', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?test=1#/');
    await expect.poll(() => page.evaluate(() => window.__ARCADE_TEST__?.thumbnails().ferraille ?? 0)).toBe(1);
    const before = await pixels(page, 'ferraille');
    await page.waitForTimeout(600);
    expect(await pixels(page, 'ferraille')).toEqual(before);
    expect(await page.evaluate(() => window.__ARCADE_TEST__?.thumbnails().ferraille)).toBe(1);
});
test('V07 sortie et retour arrêtent puis relancent les compteurs', async ({ page }) => {
    await page.goto('/?test=1#/');
    await expect.poll(() => page.evaluate(() => window.__ARCADE_TEST__?.thumbnails().ferraille ?? 0)).toBeGreaterThan(1);
    await page.locator('.game-card').first().click();
    await expect(page.locator('#home')).toBeHidden();
    const before = await page.evaluate(() => window.__ARCADE_TEST__?.thumbnails());
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.__ARCADE_TEST__?.thumbnails())).toEqual(before);
    await page.evaluate(() => { location.hash = '/'; });
    await expect.poll(() => page.evaluate(() => window.__ARCADE_TEST__?.thumbnails().ferraille ?? 0)).toBeGreaterThan(before?.ferraille ?? 0);
});
test('V08 deux colonnes à 390 pixels sans débordement', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/');
    const boxes = await page.locator('.game-thumbnail').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width }; }));
    expect(boxes[0]?.y).toBe(boxes[1]?.y);
    expect(boxes[0]?.x).not.toBe(boxes[1]?.x);
    for (const b of boxes) expect(b.width).toBeGreaterThanOrEqual(140);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
