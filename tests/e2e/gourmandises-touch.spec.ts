import { test, expect } from './fixture';

// Gourmandises on touch screens: the three tools and their stocks stay visible, the ⏸ covers neither the HUD
// (the Coups tile) nor the board, and the whole canvas (board included) fits the screen.
for (const viewport of [{ width: 405, height: 480 }, { width: 412, height: 780 }, { width: 780, height: 412 }]) test(`GT01 Gourmandises au doigt ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await page.goto('/?test=1#/gourmandises');
    await expect.poll(() => page.evaluate(() => Boolean(window.__GOURMANDISES_TEST__))).toBe(true);
    const geometry = await page.evaluate(() => {
        const box = (e: Element | null) => { const r = e?.getBoundingClientRect(); return { x: r?.x ?? 0, y: r?.y ?? 0, w: r?.width ?? 0, h: r?.height ?? 0 }; };
        return {
            canvas: box(document.querySelector('#game canvas')), pause: box(document.querySelector('#pause')),
            tools: ['hammer', 'rocket', 'rainbow'].map(id => ({ ...box(document.querySelector(`#gourmandises-${id}`)), count: document.querySelector(`#gourmandises-${id} .tool-count`)?.textContent ?? '' })),
            vw: innerWidth, vh: innerHeight, rects: window.__GOURMANDISES_TEST__?.rects(),
        };
    });
    const { canvas, pause } = geometry;
    if (!geometry.rects) throw new Error('Plan absent');
    // The game draws at the canvas size (full-screen): its rectangles are canvas pixels.
    for (const [name, r] of [['bandeau', geometry.rects.hud], ['plateau', geometry.rects.board]] as const) {
        const x = canvas.x + r.x, y = canvas.y + r.y;
        expect(pause.x + pause.w <= x + 0.5 || pause.x >= x + r.w - 0.5 || pause.y + pause.h <= y + 0.5 || pause.y >= y + r.h - 0.5, `⏸ × ${name}`).toBe(true);
    }
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.w).toBeLessThanOrEqual(geometry.vw + 1); expect(canvas.y + canvas.h).toBeLessThanOrEqual(geometry.vh + 1);
    for (const tool of geometry.tools) {
        expect(tool.w).toBeGreaterThanOrEqual(56); expect(tool.count).toMatch(/\d/);
        expect(tool.x).toBeGreaterThanOrEqual(0); expect(tool.y + tool.h).toBeLessThanOrEqual(geometry.vh + 1);
    }
});
