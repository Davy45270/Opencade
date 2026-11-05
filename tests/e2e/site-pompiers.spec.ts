import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/petits-pompiers/scene';

// Petits Pompiers has its own site, /pompiers/: own address, own installable app (manifest, scope, service worker, icons),
// only its game inside, playable offline after a first visit. The catalogue keeps a card that links there.
const SAVE = 'arcade-lab:petits-pompiers:v1';
async function activate(page: Page, mobile: boolean, selector: string) {
    if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
}
async function read(page: Page) {
    return page.evaluate(() => { const h = window.__PETITS_POMPIERS_TEST__; if (!h) throw new Error('Crochet absent'); return h.read(); });
}

test('SP01 site Pompiers : ancienne adresse redirigée, carte du catalogue vers la nouvelle URL', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/petits-pompiers');
    await expect(page).toHaveURL(/\/pompiers\/\?test=1$/);
    await expect(page).toHaveTitle('Petits Pompiers');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PETITS_POMPIERS_TEST__))).toBe(true);
    await page.goto('/?test=1');
    await expect(page).toHaveTitle('Opencade');
    const card = page.locator('.game-card').filter({ hasText: 'Petits Pompiers' });
    await expect(card).toHaveCount(1);
    await expect(page.locator('.game-card').first()).toContainText('Petits Pompiers');
    if (mobile) await card.tap(); else await card.click();
    await expect(page).toHaveURL(/\/pompiers\/\?test=1$/);
    await expect(page.locator('#level-select')).toBeVisible();
});

test('SP02 site Pompiers : son propre manifeste, sa portée et ses icônes', async ({ page, request }) => {
    await page.goto('/pompiers/?test=1');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBe('./manifest.webmanifest');
    const manifest = await (await request.get('/pompiers/manifest.webmanifest')).json() as { name: string; short_name: string; id: string; scope: string; start_url: string; icons: { src: string; sizes: string; purpose: string }[] };
    expect(manifest).toMatchObject({ name: 'Petits Pompiers', short_name: 'Pompiers', id: './', scope: './', start_url: './', display: 'standalone' });
    expect(manifest.icons.map(icon => `${icon.sizes} ${icon.purpose}`)).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
    for (const icon of manifest.icons) {
        const response = await request.get(`/pompiers/${icon.src}`);
        expect(response.status(), icon.src).toBe(200);
        expect(response.headers()['content-type']).toContain('image/png');
    }
    expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toBe('./icons/pompiers-192.png');
    const catalogue = await (await request.get('/manifest.webmanifest')).json() as { name: string };
    expect(catalogue.name).toBe('Opencade');
});

test('SP03 site Pompiers : installé seul à sa portée, jouable hors connexion après une première visite', async ({ page, context }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/pompiers/?test=1&pwa=1');
    await expect(page).toHaveTitle('Petits Pompiers');
    const scope = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.active) throw new Error('Service worker non actif');
        return registration.scope;
    });
    expect(scope).toBe('http://127.0.0.1:4173/pompiers/');
    // Only its game: the test hook of the shell knows Petits Pompiers and nothing else.
    expect(await page.evaluate(() => Object.keys(window.__ARCADE_TEST__?.games ?? {}))).toEqual(['petits-pompiers']);
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '')).toBe('http://127.0.0.1:4173/pompiers/sw.js');
    await context.setOffline(true);
    try {
        await page.reload();
        await expect(page).toHaveTitle('Petits Pompiers');
        await expect(page.locator('#level-select')).toBeVisible();
        await activate(page, mobile, '#level-list button:first-child');
        await activate(page, mobile, '#pompiers-detente');
        await activate(page, mobile, '#resume');
        await page.evaluate(() => { window.__PETITS_POMPIERS_TEST__?.advance(0); });
        const before = await read(page);
        expect(before.status).toBe('playing');
        await page.evaluate(() => { window.__PETITS_POMPIERS_TEST__?.advance(2000); });
        const after = await read(page);
        expect(after.status).toBe('playing');
        expect(after.ticks).toBeGreaterThan(before.ticks);
        await expect(page.locator('#game canvas')).toBeVisible();
    } finally {
        await context.setOffline(false);
    }
});

test('SP04 site Pompiers : la progression sauvegardée au catalogue est lue à la nouvelle adresse', async ({ page }) => {
    await page.goto('/?test=1');
    await page.evaluate(key => { localStorage.setItem(key, JSON.stringify({ unlocked: 3, best: 120 })); }, SAVE);
    await page.reload();
    await expect(page.locator('.game-card').filter({ hasText: 'Petits Pompiers' })).toContainText('Niveaux débloqués : 3/');
    await page.goto('/pompiers/?test=1');
    await expect(page.locator('#level-select')).toBeVisible();
    await expect(page.locator('#level-list button:nth-child(3)')).toBeEnabled();
    await expect(page.locator('#level-list button:nth-child(4)')).toBeDisabled();
    await expect(page.locator('#best-score')).toContainText('120');
});
