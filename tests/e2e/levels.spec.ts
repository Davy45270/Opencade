import { openGameMenu, test, expect, ready, read, load, point } from './fixture';
import type { Page } from '@playwright/test';
async function win(page: Page): Promise<void> {
    await load(page, [{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }]);
    await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).status).toBe('won');
    await expect(page.locator('#result')).toBeVisible();
}
test('L10 victoire panneau niveau suivant et sauvegarde après reload', async ({ page }, info) => {
    await ready(page); await win(page);
    await expect(page.locator('#result-title')).toHaveText('Niveau 1 réussi');
    await expect(page.locator('#result-scores')).toContainText('Score cumulé : 30');
    await page.screenshot({ path: `test-results/screenshots/level-complete-${info.project.name}.png` });
    await page.getByRole('button', { name: 'Niveau suivant', exact: true }).click();
    await expect.poll(async () => (await read(page)).level).toBe(1);
    expect((await read(page)).cumulativeScore).toBe(30);
    expect((await read(page)).shotsBeforeDrop).toBe(12);
    await page.reload();
    await expect.poll(async () => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await openGameMenu(page, '#levels'); await page.getByRole('button', { name: 'Niveaux', exact: true }).click();
    await expect(page.locator('#best-score')).toContainText('30');
    const buttons = page.locator('#level-list button');
    await expect(buttons.nth(1)).toBeEnabled(); await expect(buttons.nth(2)).toBeDisabled();
    await page.screenshot({ path: `test-results/screenshots/level-select-${info.project.name}.png` });
    await buttons.nth(1).click();
    await expect.poll(async () => (await read(page)).level).toBe(1);
});
test('L11 défaite vraie entrée puis reprise restaure le cumul et le niveau', async ({ page }, info) => {
    await ready(page); await win(page);
    await page.getByRole('button', { name: 'Niveau suivant', exact: true }).click();
    const grid: import('../../src/engines/bubble/engine').Cell[] = [];
    for (let row = 0; row < 12; row++) for (let col = 0; col < (row % 2 ? 8 : 9); col++) grid.push({ row, col, color: row % 2 ? 1 : 2 });
    grid[0] = { row: 0, col: 0, color: 0 };
    await load(page, grid); await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).status).toBe('lost');
    expect((await read(page)).cumulativeScore).toBe(30);
    await page.screenshot({ path: `test-results/screenshots/level-failed-${info.project.name}.png` });
    await page.getByRole('button', { name: 'Rejouer le niveau', exact: true }).click();
    await expect.poll(async () => (await read(page)).status).toBe('playing');
    const state = await read(page); expect(state.level).toBe(1); expect(state.cumulativeScore).toBe(30); expect(state.score).toBe(0); expect(state.shots).toBe(0);
});
test('L12 stockage interdit et niveau avancé restent jouables', async ({ page }, info) => {
    await page.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new Error('Storage denied'); };
        Storage.prototype.setItem = () => { throw new Error('Storage denied'); };
    });
    await ready(page); await win(page);
    await page.getByRole('button', { name: 'Niveau suivant', exact: true }).click();
    expect((await read(page)).level).toBe(1);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.loadLevel(4, 452); });
    expect((await read(page)).level).toBe(4);
    await page.screenshot({ path: `test-results/screenshots/level-5-${info.project.name}.png` });
    await page.keyboard.press('Space');
    await expect.poll(async () => (await read(page)).shots).toBe(1);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).inFlight).toBe(false);
    await expect(page.locator('#status')).toContainText('En jeu');
});
test('L13 dernier niveau affiche la fin et accès localStorage absent', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Unavailable'); } });
    });
    await ready(page);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.loadLevel(9, 452); });
    await win(page);
    await expect(page.locator('#result-title')).toHaveText('Tous les niveaux réussis !');
    expect((await read(page)).progression).toBe('complete');
    await expect(page.locator('#next-level')).toBeHidden();
    await openGameMenu(page, '#levels'); await page.getByRole('button', { name: 'Niveaux', exact: true }).click();
    await expect(page.locator('#level-list button').nth(9)).toBeEnabled();
});

test('L14 défaite par descente après six tirs réels sans éclatement', async ({ page }, info) => {
    await ready(page);
    await page.evaluate(() => {
        window.__BUBBLE_TEST__?.loadLevel(9);
        window.__BUBBLE_TEST__?.load([
            { row: 0, col: 0, color: 1 }, { row: 0, col: 8, color: 2 },
            { row: 11, col: 7, color: 1 }
        ], 1);
    });
    const target = await point(page, 180 - Math.tan(0.28) * 470, 100);
    await page.mouse.move(target.x, target.y);
    await expect.poll(async () => (await read(page)).angle).toBeCloseTo(-0.28);
    // Mouse aiming and keyboard firing use the normal input handlers.
    for (let i = 0; i < 6; i++) {
        await page.evaluate(i => { window.__BUBBLE_TEST__?.setNext((i % 2 + 1) as 1 | 2); }, i);
        await page.keyboard.press('Space');
        await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
        await expect.poll(async () => (await read(page)).resolved).toBe(i + 1);
        await expect(page.locator('#status')).toContainText(i === 5 ? 'Défaite' : 'En jeu');
        expect((await read(page)).score).toBe(0);
        expect((await read(page)).drops).toBe(i === 5 ? 1 : 0);
    }
    expect((await read(page)).status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    await expect(page.getByRole('button', { name: 'Rejouer le niveau', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/ceiling-defeat-${info.project.name}.png` });
});
