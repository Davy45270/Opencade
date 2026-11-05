import { test, expect } from './fixture';

// Bombercade on a small landscape-ish screen (405 x 480): side layout like the other games, the
// joystick at the bottom left and the bomb at the bottom right overhang only the free rows under
// the arena, which stays whole. The help bubble shows for the first seconds, then lives in the pause page.
test('BC01 Bombercade au doigt 405x480 : disposition latérale, grille entière, aide brève', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize({ width: 405, height: 480 });
    await page.goto('/?test=1#/bombercade');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BOMBERCADE_TEST__))).toBe(true);
    await page.locator('#resume').tap();
    await expect(page.locator('body')).toHaveClass(/side-controls/);
    await expect.poll(() => page.evaluate(() => document.querySelector('#game canvas')?.getBoundingClientRect().width ?? 0)).toBeGreaterThanOrEqual(237);
    const geometry = await page.evaluate(() => {
        const box = (e: Element | null) => { const r = e?.getBoundingClientRect(); return { x: r?.x ?? 0, y: r?.y ?? 0, w: r?.width ?? 0, h: r?.height ?? 0 }; };
        const canvas = box(document.querySelector('#game canvas')), useful = window.__BOMBERCADE_TEST__?.usefulArea() ?? { x: 0, y: 0, width: 0, height: 0 };
        const s = canvas.w / 360;
        return { canvas, grid: { x: canvas.x + useful.x * s, y: canvas.y + useful.y * s, w: useful.width * s, h: useful.height * s },
            joystick: box(document.querySelector('#touch-controls .joystick')), bomb: box(document.querySelector('#bombercade-bomb')), vw: innerWidth, vh: innerHeight };
    });
    await info.attach('BC01-geometrie', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    const { canvas, grid, joystick, bomb } = geometry;
    expect(canvas.w).toBeGreaterThanOrEqual(237); expect(canvas.h).toBeGreaterThanOrEqual(421);
    expect(canvas.y).toBeGreaterThanOrEqual(0); expect(canvas.y + canvas.h).toBeLessThanOrEqual(geometry.vh + 1);
    for (const [name, c] of [['joystick', joystick], ['bombe', bomb]] as const) {
        expect(c.w, name).toBeGreaterThanOrEqual(name === 'joystick' ? 80 : 72);
        expect(c.x, name).toBeGreaterThanOrEqual(16); expect(c.x + c.w, name).toBeLessThanOrEqual(geometry.vw - 16 + 1);
        expect(c.y + c.h, name).toBeLessThanOrEqual(geometry.vh);
        // Never over the arena: below its last row, or beside it.
        expect(c.y >= grid.y + grid.h || c.x >= grid.x + grid.w || c.x + c.w <= grid.x, name).toBe(true);
    }
    expect(joystick.x + joystick.w / 2).toBeLessThan(canvas.x + canvas.w / 2); expect(bomb.x + bomb.w / 2).toBeGreaterThan(canvas.x + canvas.w / 2);
    // The help bubble is brief, its text stays in the pause page.
    await page.evaluate(() => { window.__BOMBERCADE_TEST__?.loadLevel(0, 28); window.__BOMBERCADE_TEST__?.advance(0); });
    expect(await page.evaluate(() => window.__BOMBERCADE_TEST__?.hintShown())).toBe(true);
    await page.evaluate(() => { window.__BOMBERCADE_TEST__?.advance(5200); });
    expect(await page.evaluate(() => window.__BOMBERCADE_TEST__?.hintShown())).toBe(false);
    await page.locator('#pause').tap();
    await expect(page.locator('#level-brief')).toBeVisible(); await expect(page.locator('#level-brief')).toContainText(/bombe|Bonus|Blocs|Tapis|Anneaux|Glaçons|Objectif/);
});
