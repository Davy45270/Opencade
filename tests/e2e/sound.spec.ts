import { test, expect, ready, read, load } from './fixture';
import type { Page } from '@playwright/test';

async function pop(page: Page): Promise<void> {
    await load(page, [{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }]);
    await page.locator('#sound').blur();
    await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).status).toBe('won');
    expect((await read(page)).score).toBe(30);
}

test('S06 son clic clavier persistance et éclatements actifs puis coupés', async ({ page }) => {
    await ready(page);
    const button = page.locator('#sound');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await pop(page);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveText('Son coupé');
    await page.reload();
    await expect.poll(async () => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await pop(page);
    await button.focus(); await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await page.reload();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
});

test('S07 WebAudio absent jeu jouable et éclatement sans erreur', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'AudioContext', { value: undefined });
        Object.defineProperty(window, 'webkitAudioContext', { value: undefined });
    });
    await ready(page); await pop(page);
    await page.locator('#sound').click();
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
});
