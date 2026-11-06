import { test, expect } from './fixture';

// Dérapage on touch screens: place, lap and race time in the DOM HUD at ≥ 18 px, two icons
// (Élan, Bonus), no written instruction; the canvas keeps only the lap chronos (lap, best, delta), game counters at >= 18 px.
for (const viewport of [{ width: 405, height: 480 }, { width: 412, height: 780 }]) test(`DT01 Dérapage au doigt ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await page.goto('/?test=1#/derapage');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DERAPAGE_TEST__))).toBe(true);
    await page.locator('#resume').tap();
    await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1000));
    const hud = await page.evaluate(() => ({
        values: [...document.querySelectorAll('#hud .hud-value')].map(e => ({ text: e.textContent, size: parseFloat(getComputedStyle(e).fontSize) })),
        canvasLines: [...document.querySelectorAll('[data-derapage-hud] > *')].filter(e => getComputedStyle(e).display !== 'none').map(e => ({ text: e.textContent, size: parseFloat(getComputedStyle(e).fontSize) })),
        controls: [...document.querySelectorAll('#touch-controls button, #touch-controls output, #touch-controls label')].filter(e => e.getClientRects().length > 0).map(e => e.id).sort(),
    }));
    expect(hud.values.map(v => v.text)).toEqual([expect.stringMatching(/^\d\/5$/), expect.stringMatching(/\d/), expect.stringMatching(/^\d\/3$/)]);
    for (const value of hud.values) expect(value.size).toBeGreaterThanOrEqual(18);
    // Place, race time and lap count live in the DOM HUD only: the canvas shows the three lap chronos.
    expect(hud.canvasLines.map(l => l.text)).toEqual([expect.stringMatching(/^TOUR /), expect.stringMatching(/^MEILLEUR /), expect.any(String)]);
    for (const line of hud.canvasLines) expect(line.size).toBeGreaterThanOrEqual(18);
    expect(hud.controls).toEqual(['derapage-bonus', 'derapage-special']);
});
