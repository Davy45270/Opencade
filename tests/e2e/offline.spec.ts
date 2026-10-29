import { test, expect } from './fixture';

test('PWA : accueil, victoire et sauvegarde sans connexion', async ({ page, context }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1&pwa=1#/');
    await expect(page.locator('h1')).toHaveText('Opencade');
    await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.active) throw new Error('Service worker non actif');
    });
    // A first visit may not yet have a controller. Reload while still online.
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await context.setOffline(true);
    try {
        await page.reload();
        await expect(page).toHaveTitle('Opencade');
        await expect(page.locator('h1')).toHaveText('Opencade');
        const card = page.getByRole('button', { name: /^Dédale/ });
        if (mobile) await card.tap(); else await card.click();
        await expect.poll(() => page.evaluate(() => Boolean(window.__DEDALE_TEST__))).toBe(true);
        // Same near-finished state as the ordinary Dédale E2E: the last seed
        // still requires a real movement and the normal engine win condition.
        await page.evaluate(() => { window.__DEDALE_TEST__?.scenario('finish'); });
        if (mobile) await page.locator('#dedale-up').tap();
        else await page.keyboard.press('ArrowUp');
        await page.evaluate(() => { window.__DEDALE_TEST__?.advance(10000); });
        await expect.poll(() => page.evaluate(() => window.__DEDALE_TEST__?.read().status)).toBe('won');
        await expect(page.locator('#result')).toBeVisible();
        await expect(page.locator('#result-title')).toContainText('réussi');
        await page.reload();
        await expect(page.locator('canvas')).toBeVisible();
        await page.locator('#topbar [data-home]').click();
        await expect(page.locator('h1')).toHaveText('Opencade');
        await expect(page.getByRole('button', { name: /^Dédale/ })).toContainText('Niveaux débloqués : 2/30');
    } finally {
        await context.setOffline(false);
    }
});
