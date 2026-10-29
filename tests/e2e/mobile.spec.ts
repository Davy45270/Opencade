import { openGameMenu, test, expect, ready, read, load, point } from './fixture';
test('T12 toucher et T13 canevas et contrôles mobiles accessibles', async ({ page }) => {
    await ready(page);
    await load(page);
    const before = await read(page);
    const canvas = await page.locator('canvas').boundingBox();
    const viewport = page.viewportSize();
    if (!canvas || !viewport)
        throw new Error('Géométrie absente');
    expect(canvas.x).toBeGreaterThanOrEqual(0);
    expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width);
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height);
    const target = await point(page, 100, 200);
    await page.touchscreen.tap(target.x, target.y);
    await expect.poll(async () => (await read(page)).angle).toBeLessThan(before.angle);
    await expect.poll(async () => (await read(page)).shots).toBe(1);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).grid.length).toBe(1);
    await expect(page.locator('#status')).toContainText('En jeu');
    expect((await read(page)).shots).toBe(1);
    await openGameMenu(page, '#restart');
    const button = page.getByRole('button', { name: 'Recommencer' });
    const box = await button.boundingBox();
    if (!box)
        throw new Error('Bouton absent');
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    await button.tap();
    await expect.poll(async () => (await read(page)).grid.length).toBe(43);
    expect((await read(page)).score).toBe(0);
    expect((await read(page)).status).toBe('playing');
    await page.screenshot({ path: 'test-results/screenshots/t13-mobile.png' });
});
