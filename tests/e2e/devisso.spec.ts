import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => {
    const hook = window.__DEVISSO_TEST__; if (!hook) throw new Error('Crochet Dévisso absent');
    return hook.read();
});
/** Screen point of a world point of the 360 × 640 layout, through the camera of its region (full-screen game). */
async function screen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const p = await page.evaluate(([x, y]) => { const hook = window.__DEVISSO_TEST__; if (!hook) throw new Error('Crochet'); return { ...hook.toCanvas(x, y), game: hook.usefulArea() }; }, [x, y] as const);
    return { x: box.x + p.x * box.width / p.game.width, y: box.y + p.y * box.height / p.game.height };
}
async function touch(page: Page, x: number, y: number, mobile: boolean): Promise<void> {
    const p = await screen(page, x, y);
    if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
test('DV-E01 ouvert depuis l’accueil, le niveau 1 se démonte au doigt jusqu’à « Niveau terminé ! »', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1');
    const card = page.locator('.game-card').filter({ hasText: 'Dévisso' });
    await expect(card).toHaveCount(1);
    if (mobile) await card.tap(); else await card.click();
    await expect(page).toHaveURL(/#\/devisso$/);
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    await page.evaluate(() => { window.__DEVISSO_TEST__?.loadLevel(0); window.__DEVISSO_TEST__?.advance(0); });
    const start = await read(page);
    expect(start.status).toBe('playing'); expect(start.remaining).toBe(start.total);
    await expect(page.locator('#devisso-hint')).toBeVisible();
    // Real taps on the canvas, each on the screw the solver keeps winnable.
    for (let n = 0; n < start.total && (await read(page)).status === 'playing'; n++) {
        const point = await page.evaluate(() => { const hook = window.__DEVISSO_TEST__; if (!hook) throw new Error('Crochet'); return hook.screwPoint(hook.bestMove()); });
        const before = (await read(page)).remaining;
        await touch(page, point.x, point.y, mobile);
        expect((await read(page)).remaining).toBeLessThan(before);
    }
    const end = await read(page);
    expect(end.status).toBe('won'); expect(end.stars).toBe(3); expect(end.helps).toBe(0);
    expect(await page.evaluate(() => window.__DEVISSO_TEST__?.hudText())).toContain('SCORE');
    await expect(page.locator('#next-level')).toBeVisible();
    // One coin figure: the HUD pill says what the result panel says.
    await page.evaluate(() => { window.__DEVISSO_TEST__?.advance(500); });
    const panelText = await page.locator('#result-scores').textContent() ?? '';
    const panelCoins = /Pièces : (\d+)/u.exec(panelText)?.[1];
    expect(panelCoins).toBe(String(end.score));
    expect(await page.evaluate(() => window.__DEVISSO_TEST__?.hudCoins())).toBe(panelCoins);
    // One ending: the shell's result panel, and no canvas banner on top of the game.
    await expect(page.locator('#result')).toBeVisible();
    expect(await page.evaluate(() => window.__DEVISSO_TEST__?.banners() ?? [])).toEqual([]);
    // The canvas only says it in the tip row, which stays clear of the panel.
    const panel = await page.locator('#result').boundingBox(); if (!panel) throw new Error('Panneau absent');
    const row = await page.evaluate(() => window.__DEVISSO_TEST__?.tipRow()); if (!row) throw new Error('Ligne absente');
    expect(row.text).toContain('Niveau terminé !');
    const a = await screen(page, row.x, row.y), z = await screen(page, row.x + row.width, row.y + row.height);
    const overlap = Math.min(z.x, panel.x + panel.width) > Math.max(a.x, panel.x) && Math.min(z.y, panel.y + panel.height) > Math.max(a.y, panel.y);
    expect(overlap, `ligne ${JSON.stringify({ a, z })} sous le panneau ${JSON.stringify(panel)}`).toBe(false);
});
test('DV-E02 impasse : « Aucun coup possible ! », puis un cœur reprend trois coups', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/devisso');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    await page.evaluate(() => { window.__DEVISSO_TEST__?.loadLevel(1); window.__DEVISSO_TEST__?.scenario('stuck'); window.__DEVISSO_TEST__?.advance(0); });
    const stuck = await read(page);
    expect(stuck.stuck).toBe(true); expect(stuck.status).toBe('playing'); expect(stuck.hearts).toBe(5);
    // The banner hook reports what is drawn: the red dead-end banner is there.
    expect(await page.evaluate(() => window.__DEVISSO_TEST__?.banners().length)).toBe(1);
    // The "Reprendre" button of the red banner (world 70–290 × 392–444).
    await touch(page, 180, 418, mobile);
    const after = await read(page);
    expect(after.hearts).toBe(4); expect(after.stuck).toBe(false); expect(after.moves).toBe(stuck.moves - 3);
});
for (const width of [320, 390, 1280]) test(`DV-E03 mise en page ${String(width)} px avec DejaVu Sans : rien ne déborde, plateau et bonus visibles sans défiler`, async ({ page }) => {
    const height = width === 1280 ? 900 : width === 320 ? 640 : 844;
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/devisso');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    // A wide font (installed on the CI runner): text that fits with it fits with the system fonts.
    await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
    await page.evaluate(() => { window.__DEVISSO_TEST__?.loadLevel(29); window.__DEVISSO_TEST__?.advance(0); });
    const layout = await page.evaluate(() => {
        const rect = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null; };
        return {
            scroll: document.documentElement.scrollWidth, scrollY: document.documentElement.scrollHeight, inner: innerHeight,
            canvas: rect(document.querySelector('#game canvas')),
            buttons: [...document.querySelectorAll('#touch-controls button')].map(b => ({ ...rect(b), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, wrap: b.scrollWidth <= b.clientWidth })),
        };
    });
    expect(layout.scroll).toBeLessThanOrEqual(width);
    expect(layout.canvas?.right ?? Infinity).toBeLessThanOrEqual(width + 0.5);
    expect(layout.canvas?.bottom ?? Infinity).toBeLessThanOrEqual(layout.inner + 0.5);
    expect(layout.buttons).toHaveLength(5);
    for (const b of layout.buttons) {
        expect(b.w).toBeGreaterThanOrEqual(44); expect(b.h).toBeGreaterThanOrEqual(44);
        expect(b.right ?? Infinity).toBeLessThanOrEqual(width); expect(b.bottom ?? Infinity).toBeLessThanOrEqual(layout.inner + 0.5);
        expect(b.wrap).toBe(true);
    }
});

// Phone window under Chrome's bar (360 × 430) and a short phone (390 × 664): the game takes the width, the HUD and
// the board do not overlap, the boosters stay under the canvas, and a screw is still unscrewed by a tap.
type Box = { x: number; y: number; w: number; h: number };
/** Plan of the former 360 × 640 world, used only when the hook has no rects() (counter-test on the old code). */
const LEGACY = { width: 360, height: 640, hud: { x: 0, y: 0, w: 360, h: 168 }, board: { x: 0, y: 168, w: 360, h: 472 } };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [width, height] of [[360, 430], [390, 664]] as const) for (const level of [0, 29]) test(`DV-FILL ${String(width)}×${String(height)} niveau ${String(level + 1)} : le jeu prend la largeur, bandeau et plateau sans recouvrement`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/devisso');
    await expect.poll(() => page.evaluate(() => Boolean(window.__DEVISSO_TEST__))).toBe(true);
    await page.evaluate(level => { window.__DEVISSO_TEST__?.loadLevel(level); window.__DEVISSO_TEST__?.advance(0); }, level);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    expect.soft(canvas.width, 'largeur du jeu ≥ 90 % de la fenêtre').toBeGreaterThanOrEqual(0.9 * width);
    const r = await page.evaluate(() => (window.__DEVISSO_TEST__ as { rects?: () => unknown } | undefined)?.rects?.() ?? null) as typeof LEGACY | null ?? LEGACY;
    const k = canvas.width / r.width, toScreen = (b: Box): Box => ({ x: canvas.x + b.x * k, y: canvas.y + b.y * k, w: b.w * k, h: b.h * k });
    const hud = toScreen(r.hud), board = toScreen(r.board);
    expect.soft(meets(hud, board), 'bandeau × plateau').toBe(false);
    for (const [name, b] of [['bandeau', hud], ['plateau', board]] as const) {
        expect.soft(b.x, name).toBeGreaterThanOrEqual(canvas.x - 0.5); expect.soft(b.x + b.w, name).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
        expect.soft(b.y, name).toBeGreaterThanOrEqual(canvas.y - 0.5); expect.soft(b.y + b.h, name).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
    }
    const pause = await page.locator('#pause').boundingBox();
    if (pause) for (const [name, b] of [['bandeau', hud], ['plateau', board]] as const) expect.soft(meets({ x: pause.x, y: pause.y, w: pause.width, h: pause.height }, b), `⏸ × ${name}`).toBe(false);
    for (const id of ['#devisso-undo', '#devisso-hint', '#devisso-hammer', '#devisso-bomb', '#devisso-drill']) {
        const b = await page.locator(id).boundingBox(); if (!b) throw new Error(id);
        expect.soft(b.width, id).toBeGreaterThanOrEqual(56); expect.soft(b.height, id).toBeGreaterThanOrEqual(56);
        expect.soft(b.x + b.width, id).toBeLessThanOrEqual(width + 0.5); expect.soft(b.y + b.height, id).toBeLessThanOrEqual(height + 0.5);
        expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height }), `${id} hors du canevas`).toBe(false);
    }
    const point = await page.evaluate(() => { const hook = window.__DEVISSO_TEST__; if (!hook) throw new Error('Crochet'); return hook.screwPoint(hook.bestMove()); });
    const before = (await read(page)).remaining;
    await touch(page, point.x, point.y, true);
    expect((await read(page)).remaining).toBeLessThan(before);
});
