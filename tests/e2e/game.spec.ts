import { openGameMenu, test, expect, ready, read, load, point } from './fixture';
test('T14 build statique et crochet inerte sans test=1', async ({ page }) => {
    await page.goto('/#/bubble');
    await expect(page.locator('#game canvas')).toBeVisible();
    await expect(page.getByRole('heading')).toHaveText('Bubble Lab');
    expect(await page.evaluate(() => window.__BUBBLE_TEST__)).toBeUndefined();
    await expect(page.locator('script[type="module"]')).toHaveAttribute('src', /^\.\/assets\//);
});
test('T12 souris : visée et tir passent par le moteur', async ({ page }, info) => {
    await ready(page);
    await load(page);
    const initial = await read(page);
    const target = await point(page, 220, 180);
    await page.mouse.move(target.x, target.y);
    await expect.poll(async () => (await read(page)).angle).not.toBe(initial.angle);
    await page.mouse.click(target.x, target.y);
    await expect.poll(async () => (await read(page)).shots).toBe(1);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).grid.length).toBe(1);
    await expect(page.locator('#status')).toContainText('En jeu');
    expect((await read(page)).shots).toBe(1);
    await page.screenshot({ path: `test-results/screenshots/play-${info.project.name}.png` });
});
test('T12 clavier : flèches et Espace', async ({ page }) => {
    await ready(page);
    await load(page);
    const initial = await read(page);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await read(page)).angle).toBeLessThan(initial.angle);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await read(page)).angle).toBeGreaterThan(initial.angle);
    await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).grid.length).toBe(1);
    await expect(page.locator('#status')).toContainText('En jeu');
    expect((await read(page)).shots).toBe(1);
});
test('T10 Recommencer restaure score grille et statut après victoire', async ({ page }, info) => {
    await ready(page);
    const initial = await read(page);
    await load(page, [{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }]);
    const target = await point(page, 180, 100);
    await page.mouse.click(target.x, target.y);
    await expect.poll(async () => (await read(page)).shots).toBe(1);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).status).toBe('won');
    expect((await read(page)).score).toBe(30);
    expect((await read(page)).grid).toEqual([]);
    await expect(page.locator('#status')).toContainText('Victoire');
    await page.screenshot({ path: `test-results/screenshots/victory-${info.project.name}.png` });
    await openGameMenu(page, '#restart'); await page.getByRole('button', { name: 'Recommencer' }).click();
    await expect.poll(async () => read(page)).toEqual(initial);
    await page.screenshot({ path: `test-results/screenshots/restart-${info.project.name}.png` });
});

test('T09 grille presque pleine : un tir réel déclenche la défaite', async ({ page }, info) => {
    await ready(page);
    const grid: import('../../src/engines/bubble/engine').Cell[] = [];
    for (let row = 0; row < 12; row++) {
        for (let col = 0; col < (row % 2 ? 8 : 9); col++) {
            grid.push({ row, col, color: row % 2 ? 1 : 2 });
        }
    }
    grid[0] = { row: 0, col: 0, color: 0 };
    await load(page, grid);
    expect((await read(page)).status).toBe('playing');
    await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).status).toBe('lost');
    const state = await read(page);
    expect(state.shots).toBe(1);
    expect(state.grid).toHaveLength(grid.length + 1);
    expect(state.grid.some(cell => cell.row === 12)).toBe(true);
    await expect(page.locator('#status')).toContainText('Défaite');
    await page.screenshot({ path: `test-results/screenshots/defeat-${info.project.name}.png` });
});

test('T12 tirs rapides : un seul tir pendant le vol puis reprise', async ({ page }) => {
    await ready(page);
    await load(page);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    const during = await read(page);
    expect(during.inFlight).toBe(true);
    expect(during.shots).toBe(1);
    expect(during.grid).toHaveLength(0);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).inFlight).toBe(false);
    await expect(page.locator('#status')).toContainText('En jeu');
    const resolved = await read(page);
    expect(resolved.shots).toBe(1);
    expect(resolved.grid).toHaveLength(1);
    await page.keyboard.press('Space');
    const next = await read(page);
    expect(next.inFlight).toBe(true);
    expect(next.shots).toBe(2);
    expect(next.grid).toHaveLength(1);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).inFlight).toBe(false);
    await expect(page.locator('#status')).toContainText('En jeu');
    expect((await read(page)).grid).toHaveLength(2);
    expect((await read(page)).shots).toBe(2);
});
