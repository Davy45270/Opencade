import { test, expect } from './fixture';

// Petits Pompiers fills the screen on every phone: the canvas (Phaser RESIZE) takes the full width and
// all the height between the top bar and a bottom control bar, with no band; tiles stay >= 40 px, the HUD floats in the
// top-left corner clear of the ⏸, the tool button stands out (>= 3:1) and counters read at >= 18 px.
const luminance = (rgb: string): number => {
    const [r = 0, g = 0, b = 0] = (rgb.match(/\d+(\.\d+)?/g) ?? []).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b;
};
const contrast = (a: string, b: string): number => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return ((x ?? 0) + .05) / ((y ?? 0) + .05); };
test('PT01 Petits Pompiers plein écran : 0 px de bande, monde + barre = 100 % de la hauteur, cases ≥ 40 px', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    const all: Record<string, unknown> = {};
    for (const [width, height] of [[405, 480], [360, 640], [412, 780], [430, 860], [780, 412], [480, 405]] as const) {
        const size = `${String(width)}×${String(height)}`;
        await page.setViewportSize({ width, height });
        await page.goto('/pompiers/?test=1');
        // Same URL on every size: reload so that each size starts the game afresh.
        await page.reload();
        await expect.poll(() => page.evaluate(() => Boolean(window.__PETITS_POMPIERS_TEST__))).toBe(true);
        await page.locator('#level-list button').first().tap(); await page.locator('#pompiers-detente').tap();
        await page.locator('#resume').tap();
        await page.evaluate(() => { window.__PETITS_POMPIERS_TEST__?.advance(0); });
        await expect.poll(() => page.evaluate(() => Math.round(document.querySelector('#game canvas')?.getBoundingClientRect().width ?? 0))).toBe(width);
        const g = await page.evaluate(() => {
            const box = (e: Element | null) => { const r = e?.getBoundingClientRect(); return { x: r?.x ?? 0, y: r?.y ?? 0, w: r?.width ?? 0, h: r?.height ?? 0 }; };
            const bar = document.querySelector('#touch-controls'), tool = document.querySelector('#pompiers-tool');
            return { canvas: box(document.querySelector('#game canvas')), bar: box(bar), barMargin: bar ? parseFloat(getComputedStyle(bar).marginBottom) : 0,
                joystick: box(document.querySelector('#touch-controls .joystick')), action: box(document.querySelector('#pompiers-action')), tool: box(tool), pause: box(document.querySelector('#pause')), topbar: box(document.querySelector('#topbar')),
                frame: window.__PETITS_POMPIERS_TEST__?.frame(), side: document.body.classList.contains('side-controls'),
                toolBackground: tool ? getComputedStyle(tool).backgroundColor : '', page: getComputedStyle(document.body).backgroundColor,
                counterPx: window.__PETITS_POMPIERS_TEST__?.counterPx() ?? 0, vw: innerWidth, vh: innerHeight };
        });
        all[size] = g;
        const { canvas, bar, frame } = g;
        if (!frame) throw new Error('frame() absent');
        // 100 % of the width, no band on the sides or at the top (the canvas starts right under the 44 px top bar).
        expect(canvas.x, `${size} bande gauche`).toBeLessThanOrEqual(0.5); expect(canvas.x + canvas.w, `${size} bande droite`).toBeGreaterThanOrEqual(g.vw - 0.5);
        expect(canvas.y, `${size} bande haute`).toBeLessThanOrEqual(g.topbar.y + g.topbar.h + 0.5);
        // World + bar = 100 % of the height: the bar starts where the canvas ends and reaches the bottom.
        expect(g.side, size).toBe(false);
        expect(Math.abs(bar.y - (canvas.y + canvas.h)), `${size} jointure monde/barre`).toBeLessThanOrEqual(1);
        expect(bar.y + bar.h + g.barMargin, `${size} bas d'écran`).toBeGreaterThanOrEqual(g.vh - 1);
        expect(frame.tilePx, `${size} case`).toBeGreaterThanOrEqual(40);
        for (const [name, c] of [['joystick', g.joystick], ['action', g.action], ['outil', g.tool]] as const) {
            expect(c.w, `${size} ${name}`).toBeGreaterThanOrEqual(56); expect(c.h, `${size} ${name}`).toBeGreaterThanOrEqual(56);
            expect(c.y, `${size} ${name} dans la barre`).toBeGreaterThanOrEqual(bar.y - 1);
            expect(c.x + c.w, `${size} ${name}`).toBeLessThanOrEqual(g.vw);
        }
        // HUD inside the canvas, never cut, never under the ⏸.
        expect(frame.hud.x).toBeGreaterThanOrEqual(0); expect(frame.hud.y).toBeGreaterThanOrEqual(0);
        // The ⏸ lives in the top bar above the canvas; if it ever overlaps the canvas, the HUD must stay left of it.
        if (g.pause.y + g.pause.h > canvas.y) expect(canvas.x + frame.hud.x + frame.hud.width, `${size} HUD sous ⏸`).toBeLessThanOrEqual(g.pause.x);
        expect(frame.hud.y + frame.hud.height, `${size} HUD coupé`).toBeLessThanOrEqual(canvas.h);
        expect(contrast(g.toolBackground, g.page)).toBeGreaterThanOrEqual(3);
        expect(g.counterPx, size).toBeGreaterThanOrEqual(18);
        await page.screenshot({ path: `test-results/screenshots/pompiers-plein-ecran-${String(width)}x${String(height)}.png` });
    }
    await info.attach('PT01-geometrie', { body: JSON.stringify(all, null, 2), contentType: 'application/json' });
});
