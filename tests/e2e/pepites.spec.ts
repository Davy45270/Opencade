import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Playwright loads specs as ES modules: read the fixture instead of importing JSON.
const route = JSON.parse(readFileSync('tests/fixtures/pepites-campaign.json', 'utf8')) as { pepites: string[][] };
import { MINES } from '../../src/engines/pepites/levels';
const read = (page: Page) => page.evaluate(() => window.__PEPITES_TEST__?.read());
const keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' } as const;
test('P05 P12 mine 1 gagnée au clavier par la route enregistrée, sauvegarde et mine suivante', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/pepites');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    await page.evaluate(() => { window.__PEPITES_TEST__?.loadLevel(0, 484); window.__PEPITES_TEST__?.advance(0); });
    const turn = (MINES[0]?.turnFrames ?? 9) * 1000 / 60;
    for (const m of route.pepites[0] ?? []) {
        if (m !== 'wait') { await page.keyboard.down(keys[m as keyof typeof keys]); await page.keyboard.up(keys[m as keyof typeof keys]); }
        await page.evaluate(ms => { window.__PEPITES_TEST__?.advance(ms); }, turn);
    }
    expect((await read(page))?.status).toBe('won');
    await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/pepites-won-${info.project.name}.png` });
});
test('P13 mise en page : mine entière visible, boutons de 56 px sous le canevas, HUD lisible', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/pepites');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    for (const level of [0, 3, 5, 8, 11]) {
        await page.evaluate(i => { window.__PEPITES_TEST__?.loadLevel(i, 484); window.__PEPITES_TEST__?.advance(0); }, level);
        expect(await page.evaluate(() => window.__PEPITES_TEST__?.hudText() ?? '')).toContain(`MINE ${String(level + 1)}/30`);
        await page.screenshot({ path: `test-results/screenshots/pepites-mine-${String(level + 1)}-${info.project.name}.png` });
    }
    if (mobile) {
        // One icon (Étai) under the canvas, no arrows: the mine is dug by dragging.
        const canvas = await page.locator('#game canvas').boundingBox();
        for (const id of ['left', 'up', 'down', 'right']) await expect(page.locator(`#pepites-${id}`)).toHaveCount(0);
        const b = await page.locator('#pepites-special').boundingBox();
        expect(b?.width).toBeGreaterThanOrEqual(56); expect(b?.height).toBeGreaterThanOrEqual(56);
        expect(b?.y ?? 0).toBeGreaterThanOrEqual((canvas?.y ?? 0) + (canvas?.height ?? 0) - 1);
        // Full screen: the ⏸ and the counters float over the top of the canvas, the mine (canvas pixels) stays under them.
        const mine = await page.evaluate(() => window.__PEPITES_TEST__?.usefulArea()); if (!mine) throw new Error('Mine absente');
        const pause = await page.locator('#pause').boundingBox(), hud = await page.locator('#hud').boundingBox();
        for (const b of [pause, hud]) expect((b?.y ?? 0) + (b?.height ?? 0)).toBeLessThanOrEqual((canvas?.y ?? 0) + mine.y + 1);
        await expect(page.locator('#hud')).toBeVisible(); await expect(page.locator('#hud')).toContainText('/');
    }
});

// Phone window under Chrome's bar (360 × 430) and a short phone (390 × 664): the game takes the width, the text block
// and the mine do not overlap and stay under the counters, Étai stays under the canvas.
type Box = { x: number; y: number; w: number; h: number };
/** Plan of the former 360 × 640 world, used only when the hook has no rects() (counter-test on the old code). */
const LEGACY = { width: 360, height: 640, hud: { x: 0, y: 480, w: 360, h: 76 }, board: { x: 0, y: 0, w: 360, h: 480 } };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [width, height] of [[360, 430], [390, 664]] as const) for (const level of [0, 29]) test(`PE-FILL ${String(width)}×${String(height)} mine ${String(level + 1)} : le jeu prend la largeur, texte et mine sans recouvrement`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/pepites');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
    if (await page.locator('#resume').isVisible()) await page.locator('#resume').tap();
    await page.evaluate(level => { window.__PEPITES_TEST__?.loadLevel(level, 484); window.__PEPITES_TEST__?.advance(50); }, level);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    expect.soft(canvas.width, 'largeur du jeu ≥ 90 % de la fenêtre').toBeGreaterThanOrEqual(0.9 * width);
    const r = await page.evaluate(() => (window.__PEPITES_TEST__ as { rects?: () => unknown } | undefined)?.rects?.() ?? null) as typeof LEGACY | null ?? LEGACY;
    const k = canvas.width / r.width, toScreen = (b: Box): Box => ({ x: canvas.x + b.x * k, y: canvas.y + b.y * k, w: b.w * k, h: b.h * k });
    const text = toScreen(r.hud), mine = toScreen(r.board);
    expect.soft(meets(text, mine), 'texte × mine').toBe(false);
    for (const selector of ['#hud', '#pause']) {
        const b = await page.locator(selector).boundingBox(); if (!b) continue;
        const box = { x: b.x, y: b.y, w: b.width, h: b.height };
        expect.soft(meets(box, mine), `${selector} × mine`).toBe(false); expect.soft(meets(box, text), `${selector} × texte`).toBe(false);
    }
    for (const [name, b] of [['texte', text], ['mine', mine]] as const) {
        expect.soft(b.x, name).toBeGreaterThanOrEqual(canvas.x - 0.5); expect.soft(b.x + b.w, name).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
        expect.soft(b.y + b.h, name).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
    }
    const b = await page.locator('#pepites-special').boundingBox(); if (!b) throw new Error('Étai');
    expect.soft(b.width).toBeGreaterThanOrEqual(56); expect.soft(b.height).toBeGreaterThanOrEqual(56);
    expect.soft(b.x + b.width).toBeLessThanOrEqual(width + 0.5); expect.soft(b.y + b.height).toBeLessThanOrEqual(height + 0.5);
    expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height }), 'Étai hors du canevas').toBe(false);
});
