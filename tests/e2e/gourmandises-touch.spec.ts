import { test, expect } from './fixture';

// Gourmandises on touch screens: the three tools and their stocks stay visible, the ⏸ has its own
// row (it no longer covers the Coups tile), and the whole canvas (board included) fits the screen.
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
            vw: innerWidth, vh: innerHeight,
        };
    });
    const { canvas, pause } = geometry;
    expect(pause.x + pause.w <= canvas.x || pause.x >= canvas.x + canvas.w || pause.y + pause.h <= canvas.y + 1).toBe(true);
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.w).toBeLessThanOrEqual(geometry.vw + 1); expect(canvas.y + canvas.h).toBeLessThanOrEqual(geometry.vh + 1);
    for (const tool of geometry.tools) {
        expect(tool.w).toBeGreaterThanOrEqual(56); expect(tool.count).toMatch(/\d/);
        expect(tool.x).toBeGreaterThanOrEqual(0); expect(tool.y + tool.h).toBeLessThanOrEqual(geometry.vh + 1);
    }
});
