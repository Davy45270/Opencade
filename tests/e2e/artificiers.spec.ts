import { screenY, WORLD_SCALE, PANEL_TOP } from '../../src/games/artificiers/art';
import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/artificiers/scene';
async function state(page: Page) { return page.evaluate(() => {
    const s = window.__ARTIFICIERS_TEST__?.read();
    return s ? { level: s.level, shots: s.shots, phase: s.phase, status: s.status, active: s.active, units: s.units, world: s.config.world } : null;
}); }
test('Artificiers : ouverture, glisser réel et trois ambiances', async ({ page, hasTouch }, info) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/?test=1#/artificiers');
    await expect.poll(() => state(page)).not.toBeNull();
    await page.locator('#resume').click();
    const cdp = hasTouch ? await page.context().newCDPSession(page) : null;
    for (const [level, capture] of [[0, 'artificiers-n1.png'], [9, 'artificiers-n10.png'], [20, 'artificiers-w03.png']] as const) {
        await page.evaluate(i => window.__ARTIFICIERS_TEST__?.loadLevel(i), level);
        await expect.poll(async () => (await state(page))?.level).toBe(level);
        const input = await page.evaluate(() => {
            const h = window.__ARTIFICIERS_TEST__, s = h?.read(), shot = h?.suggestion();
            if (!s || !shot) throw new Error('État absent');
            const a = s.units[s.active]; if (!a) throw new Error('Héros absent');
            return { start: { x: a.x, y: a.y }, end: { x: a.x + Math.cos(shot.angle) * shot.power / 1.25, y: a.y + Math.sin(shot.angle) * shot.power / 1.25 } };
        });
        // Select the suggested signature using the real on-screen button, never a state setter.
        const desired = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.suggestion().weapon);
        for (let n = 0; n < 6; n++) {
            const selected = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.read().weapon);
            if (selected === desired) break;
            await page.locator('#artificiers-weapon').click();
        }
        const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canvas absent');
        const point = (p: { x: number; y: number }) => ({ id: 0, x: box.x + p.x / 360 * box.width, y: box.y + screenY(p.y) / 640 * box.height });
        const before = await state(page); expect(before?.phase).toBe('aim');
        const active = before?.units[before.active]; expect(active).toBeDefined();
        const rendered = await page.evaluate(() => {
            const h = window.__ARTIFICIERS_TEST__, s = h?.read();
            return h?.heroBounds().find(b => b.id === s?.active);
        });
        expect(rendered?.visible).toBe(true); expect(rendered?.width).toBeGreaterThan(0);
        expect((rendered?.y ?? 640) + (rendered?.height ?? 0)).toBeLessThan(PANEL_TOP);
        expect(screenY((active?.y ?? 640) + 13)).toBeLessThan(PANEL_TOP);
        expect(screenY((active?.y ?? 0) - 34)).toBeGreaterThan(80);
        // The pointer target at the hero must belong to the visible canvas.
        const heroPoint = point(input.start);
        expect(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.tagName, heroPoint)).toBe('CANVAS');
        if (cdp) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [heroPoint] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(input.end)] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
            const endPoint = point(input.end);
            await page.mouse.move(heroPoint.x, heroPoint.y);
            await page.mouse.down();
            await page.mouse.move(endPoint.x, endPoint.y, { steps: 10 });
            await page.mouse.up();
        }
        await expect.poll(async () => (await state(page))?.shots).toBe((before?.shots ?? 0) + 1);
        await expect.poll(async () => (await state(page))?.phase).toBe('flight');
        await page.evaluate(() => window.__ARTIFICIERS_TEST__?.advance(160));
        await expect.poll(async () => page.evaluate(() => window.__ARTIFICIERS_TEST__?.renderBudget().calls)).toBeGreaterThan(10);
        await page.screenshot({ path: info.outputPath(capture) });
        const budget = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.renderBudget());
        expect(budget?.calls).toBeLessThanOrEqual(budget?.limit ?? 0);
    }
    for (const level of [19, 21, 25, 29]) {
        await page.evaluate(i => window.__ARTIFICIERS_TEST__?.loadLevel(i), level);
        const s = await state(page); expect(s?.level).toBe(level);
        const sprites = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.heroBounds());
        for (const sprite of sprites ?? []) {
            expect(sprite.visible).toBe(true); expect(sprite.y + sprite.height).toBeLessThan(PANEL_TOP);
        }
        for (const u of s?.units ?? []) {
            expect((u.y + 13) * WORLD_SCALE).toBeLessThan(PANEL_TOP);
            expect((u.y - 34) * WORLD_SCALE).toBeGreaterThan(80);
        }
        await page.screenshot({ path: info.outputPath(`artificiers-n${String(level + 1)}-visible.png`) });
    }
    expect(errors).toEqual([]);
});
test('A20 tactile : « 2 joueurs » hors des commandes de jeu, vent et puissance ≥ 18 px rendus, corde accessible', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Commandes tactiles');
    test.setTimeout(120_000);
    // A finger lands where the control is drawn (as in the other touch tests), whatever overlay Playwright suspects.
    const touch = async (selector: string) => {
        const r = await page.locator(selector).evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width }; });
        if (!r.w) throw new Error(`Contrôle absent : ${selector}`);
        await page.touchscreen.tap(r.x, r.y);
    };
    for (const [width, height] of [[405, 480], [780, 412], [360, 640]] as const) {
        await page.setViewportSize({ width, height });
        await page.goto('/?test=1#/artificiers');
        await expect.poll(() => state(page)).not.toBeNull();
        await touch('#resume');
        await page.evaluate(() => { window.__ARTIFICIERS_TEST__?.advance(50); });
        const size = `${String(width)}×${String(height)}`;
        const inBar = await page.evaluate(() => [...document.querySelectorAll('#touch-controls button')].filter(b => b.getBoundingClientRect().width > 0).map(b => b.textContent));
        expect(inBar, size).not.toContain('1 / 2'); expect(inBar, size).not.toContain('2 joueurs');
        expect(await page.locator('#game-menu #artificiers-mode').count(), size).toBe(1);
        const px = await page.evaluate(() => window.__ARTIFICIERS_TEST__?.readoutPx());
        expect(px?.wind ?? 0, size).toBeGreaterThanOrEqual(18); expect(px?.power ?? 0, size).toBeGreaterThanOrEqual(18);
        const rope = await page.locator('#artificiers-rope').boundingBox();
        expect(rope, size).not.toBeNull();
        if (rope) { expect(rope.width).toBeGreaterThanOrEqual(56); expect(rope.x).toBeGreaterThanOrEqual(0); expect(rope.x + rope.width).toBeLessThanOrEqual(width); expect(rope.y + rope.height).toBeLessThanOrEqual(height); }
    }
    // Chosen before the game, from the pause page.
    await touch('#pause'); await touch('#artificiers-mode');
    await expect(page.locator('#artificiers-mode')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__ARTIFICIERS_TEST__?.read().mode)).toBe('duo');
});
