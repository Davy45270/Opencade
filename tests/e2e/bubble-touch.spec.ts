import { test, expect } from './fixture';

// Bubble on touch screens: one command (Joker), the DOM HUD on one row above the canvas,
// and the swap done by touching the next bubble.
for (const viewport of [{ width: 405, height: 480 }, { width: 412, height: 780 }, { width: 780, height: 412 }]) test(`BT01 Bubble au doigt ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await page.evaluate(() => {
        const hook = window.__BUBBLE_TEST__;
        hook?.loadLevel(0, 28); hook?.advance(0);
        // Two different colours, so the swap is observable.
        const state = hook?.read();
        for (const color of [0, 1, 2, 3, 4, 5] as const) {
            if (!state || state.next !== state.queued || color === state.queued) continue;
            try { hook?.setNext(color); break; } catch { /* Colour absent from this board. */ }
        }
    });
    // Only the Joker under the thumbs, with its stock as a badge.
    const controls = await page.evaluate(() => [...document.querySelectorAll('#touch-controls button')].filter(e => e.getClientRects().length > 0).map(e => e.id));
    expect(controls).toEqual(['bubble-special']);
    await expect(page.locator('#bubble-special')).toHaveAttribute('data-count', '1');
    // HUD: one row, digits ≥ 18 px, never over the canvas.
    await expect(page.locator('#hud')).toBeVisible();
    const hud = await page.evaluate(() => {
        const box = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
        const values = [...document.querySelectorAll('#hud .hud-value')];
        return { values: values.map(e => ({ size: parseFloat(getComputedStyle(e).fontSize), ...box(e) })), canvas: box(document.querySelector('#game canvas') as Element) };
    });
    expect(hud.values.length).toBeGreaterThanOrEqual(2);
    const firstY = hud.values[0]?.y ?? 0;
    for (const value of hud.values) {
        expect(value.size).toBeGreaterThanOrEqual(18);
        expect(Math.abs(value.y - firstY)).toBeLessThan(4);
        expect(value.y + value.h).toBeLessThanOrEqual(hud.canvas.y + 1);
    }
    // The canvas text is hidden (it would render at 6-8 px over the trajectory), but kept up to date.
    expect(await page.evaluate(() => window.__BUBBLE_TEST__?.hudText())).toContain('NIVEAU 1');
    // Touching the next bubble swaps it, without a shot.
    const before = await page.evaluate(() => window.__BUBBLE_TEST__?.read());
    if (!before) throw new Error('Bubble absent');
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!canvas) throw new Error('Canevas absent');
    await page.touchscreen.tap(canvas.x + 300 * canvas.width / 360, canvas.y + 585 * canvas.height / 640);
    await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().next)).toBe(before.queued);
    const after = await page.evaluate(() => window.__BUBBLE_TEST__?.read());
    expect(after?.queued).toBe(before.next);
    expect(after?.shots).toBe(before.shots);
    // Tap-to-shoot is a setting of the pause page.
    await page.locator('#pause').tap();
    await expect(page.locator('#game-menu #touch-mode')).toBeVisible();
    await expect(page.locator('#level-brief')).toContainText(/plafond|étoiles/);
});
