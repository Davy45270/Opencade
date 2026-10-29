import { test, expect, point, openGameMenu } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/briqueterie/scene';
declare global { interface Window { deviceCalls: { wake: number; release: number; fullscreen: number; vibrations: (number | number[])[] } } }
async function stub(page: Page, mode: 'ok' | 'absent' | 'refused' = 'ok'): Promise<void> {
    await page.addInitScript(mode => {
        window.deviceCalls = { wake: 0, release: 0, fullscreen: 0, vibrations: [] };
        Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: mode === 'absent' ? undefined : { request: async () => {
            await Promise.resolve();
            window.deviceCalls.wake++;
            if (mode === 'refused') throw Error('refus');
            return { release: () => { window.deviceCalls.release++; return Promise.resolve(); } };
        } } });
        // Phaser normalizes navigator.vibrate by assigning to it during import.
        Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: mode === 'absent' ? undefined : (pattern: number | number[]) => {
            if (mode === 'refused') throw Error('refus');
            window.deviceCalls.vibrations.push(pattern); return true;
        } });
        // Init scripts run before the parser creates document.documentElement.
        // The root will inherit this stub when it is created.
        Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, value: mode === 'absent' ? undefined : async () => {
            await Promise.resolve();
            window.deviceCalls.fullscreen++; if (mode === 'refused') throw Error('refus');
        } });
    }, mode);
}
async function open(page: Page): Promise<void> {
    await page.goto('/?test=1#/briqueterie');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BRIQUETERIE_TEST__))).toBe(true);
}
async function win(page: Page): Promise<void> {
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.scenario('finish'); });
    await page.locator('#briqueterie-launch').click();
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.advance(10000); });
    await expect(page.locator('#result')).toBeVisible();
    expect(await page.evaluate(() => window.__BRIQUETERIE_TEST__?.read().status)).toBe('won');
}
test('T01 Wake Lock au démarrage, pause, reprise, fin et sortie', async ({ page }) => {
    await stub(page); await open(page);
    expect(await page.evaluate(() => window.deviceCalls.wake)).toBe(0);
    await page.locator('#resume').click();
    await expect.poll(() => page.evaluate(() => window.deviceCalls.wake)).toBe(1);
    await page.locator('#pause').click();
    await expect.poll(() => page.evaluate(() => window.deviceCalls.release)).toBe(1);
    await page.locator('#resume').click(); await win(page);
    await expect.poll(() => page.evaluate(() => window.deviceCalls.release)).toBe(2);
    await page.locator('#replay-level').click();
    await expect.poll(() => page.evaluate(() => window.deviceCalls.wake)).toBe(3);
    await page.locator('#topbar [data-home]').click();
    await expect.poll(() => page.evaluate(() => window.deviceCalls.release)).toBe(3);
});
test('T02 vibrations de perte de vie et victoire suivent le son global', async ({ page }) => {
    await stub(page); await open(page); await page.locator('#resume').click();
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.scenario('fall'); });
    await page.locator('#briqueterie-launch').click();
    // Move the paddle away from the falling ball without waiting for rendering.
    const target = await point(page, 300, 620); await page.touchscreen.tap(target.x, target.y);
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.advance(10000); });
    expect(await page.evaluate(() => window.__BRIQUETERIE_TEST__?.read().status)).toBe('lost');
    expect(await page.evaluate(() => window.deviceCalls.vibrations)).toContain(30);
    await win(page);
    expect(await page.evaluate(() => window.deviceCalls.vibrations)).toContainEqual([30, 40, 60]);
    await page.locator('#sound').click();
    const before = await page.evaluate(() => window.deviceCalls.vibrations);
    await win(page);
    expect(await page.evaluate(() => window.deviceCalls.vibrations)).toEqual(before);
});
test('T03 menu plein écran présent et requestFullscreen appelé', async ({ page }) => {
    await stub(page); await open(page);
    await openGameMenu(page, '#levels');
    await expect(page.locator('#fullscreen')).toBeVisible(); await page.locator('#fullscreen').click();
    expect(await page.evaluate(() => window.deviceCalls.fullscreen)).toBe(1);
});
test('T04 gestes parasites bloqués sur aire et contrôles', async ({ page }) => {
    await open(page);
    for (const selector of ['#play-area', '#touch-controls']) {
        expect(await page.locator(selector).evaluate(element => {
            const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
            element.dispatchEvent(event); return event.defaultPrevented;
        })).toBe(true);
        await expect(page.locator(selector)).toHaveCSS('user-select', 'none');
    }
});
test('T05 toucher hors Jouer démarre sans lancer ni déplacer', async ({ page }) => {
    await open(page);
    const before = await page.evaluate(() => window.__BRIQUETERIE_TEST__?.read());
    const target = await point(page, 50, 100); await page.touchscreen.tap(target.x, target.y);
    await expect(page.locator('#pause-panel')).toBeHidden();
    await page.evaluate(() => { window.__BRIQUETERIE_TEST__?.advance(100); });
    const after = await page.evaluate(() => window.__BRIQUETERIE_TEST__?.read());
    expect(after?.ready).toBe(true); expect(after?.paddle).toBe(before?.paddle); expect(after?.balls).toEqual(before?.balls);
    await win(page);
});
for (const mode of ['absent', 'refused'] as const) test(`T07 API ${mode} : jeu jouable sans erreur ni avertissement`, async ({ page }) => {
    const messages: string[] = [];
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) messages.push(message.text()); });
    await stub(page, mode); await open(page); await page.locator('#resume').click();
    await openGameMenu(page, '#levels');
    if (mode === 'absent') await expect(page.locator('#fullscreen')).toBeHidden();
    else await page.locator('#fullscreen').click();
    await page.locator('#game-menu-toggle').click();
    await win(page); expect(messages).toEqual([]);
});
