import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => {
    const hook = window.__DEMINEUR_TEST__; if (!hook) throw new Error('Crochet Démineur absent');
    return hook.read();
});
const hookReady = (page: Page) => expect.poll(() => page.evaluate(() => Boolean(window.__DEMINEUR_TEST__))).toBe(true);
/** Screen point of a world point of the 360 × 640 canvas. */
async function screen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    return { x: box.x + x * box.width / 360, y: box.y + y * box.height / 640 };
}
async function touchCell(page: Page, x: number, y: number, mobile: boolean): Promise<void> {
    const w = await page.evaluate(([x, y]) => window.__DEMINEUR_TEST__?.cellPoint(x, y), [x, y] as const);
    if (!w) throw new Error('case');
    const p = await screen(page, w.x, w.y);
    if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function tapButton(page: Page, selector: string, mobile: boolean): Promise<void> {
    if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
}
/** Plays the next proven moves with real touches, switching the Dig/Flag tool with its button. */
async function playToEnd(page: Page, mobile: boolean, limit = 400): Promise<number> {
    let switches = 0;
    for (let n = 0; n < limit && (await read(page)).status === 'playing'; n++) {
        const move = await page.evaluate(() => window.__DEMINEUR_TEST__?.nextMove() ?? null);
        if (!move) throw new Error('Aucun coup prouvé');
        if ((await read(page)).tool !== move.tool) { await tapButton(page, '#demineur-tool', mobile); switches++; expect((await read(page)).tool).toBe(move.tool); }
        const before = (await read(page)).turn;
        await touchCell(page, move.x, move.y, mobile);
        expect((await read(page)).turn).toBeGreaterThan(before);
    }
    return switches;
}
test('DM-E01 depuis l’accueil, la grille 1 gagnée au doigt avec la bascule Creuser/Drapeau', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1');
    const card = page.locator('.game-card').filter({ hasText: 'Démineur' });
    await expect(card).toHaveCount(1);
    if (mobile) await card.tap(); else await card.click();
    await expect(page).toHaveURL(/#\/demineur$/);
    await hookReady(page);
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadLevel(0); window.__DEMINEUR_TEST__?.advance(0); });
    const start = await read(page);
    expect(start).toMatchObject({ kind: 'progression', level: 0, status: 'playing', noGuess: true, tool: 'dig' });
    expect(start.revealed).toBeGreaterThan(0);
    await expect(page.locator('#demineur-tool')).toHaveText('Creuser');
    const switches = await playToEnd(page, mobile);
    expect(switches).toBeGreaterThan(0);
    const end = await read(page);
    expect(end.status).toBe('won'); expect(end.hints).toBe(0); expect(end.stars).toBe(3);
    await page.evaluate(() => window.__DEMINEUR_TEST__?.advance(1500));
    await expect(page.locator('#next-level')).toBeVisible();
    expect(await page.evaluate(() => window.__DEMINEUR_TEST__?.hudText())).toContain('SCORE');
});
test('DM-E02 indice : une déduction certaine, expliquée par le compagnon', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadLevel(4); window.__DEMINEUR_TEST__?.advance(0); });
    await tapButton(page, '#demineur-hint', mobile);
    const after = await read(page);
    expect(after.hints).toBe(1);
    expect(['safe_move', 'mine_proven']).toContain(after.hint?.status);
    expect(after.hint?.proof).toMatch(/forcément|sûre/);
    expect(await page.evaluate(() => window.__DEMINEUR_TEST__?.hudText())).toContain('Indice :');
});
test('DM-E03 défaite : la mine explose, le plateau se dévoile, « Rejouer »', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadLevel(0); window.__DEMINEUR_TEST__?.advance(0); });
    const mine = await page.evaluate(() => window.__DEMINEUR_TEST__?.mineCell() ?? null);
    if (!mine) throw new Error('mine');
    await touchCell(page, mine.x, mine.y, mobile);
    const lost = await read(page);
    expect(lost.status).toBe('lost'); expect(lost.events).toContain('GAME_LOST');
    // The panel waits for the explosion and the unveiling.
    expect(lost.panel).toBe(false);
    await page.evaluate(() => window.__DEMINEUR_TEST__?.advance(1500));
    await expect(page.locator('#retry-level')).toBeVisible();
    await expect(page.locator('#retry-level')).toHaveText('Rejouer');
    await tapButton(page, '#retry-level', mobile);
    const again = await read(page);
    expect(again.status).toBe('playing'); expect(again.turn).toBe(0); expect(again.level).toBe(0);
});
test('DM-E04 reprise après rechargement : la partie classique revient à l’identique', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadMode('beginner', 45270); window.__DEMINEUR_TEST__?.advance(0); });
    await touchCell(page, 4, 4, mobile);
    await page.evaluate(() => window.__DEMINEUR_TEST__?.advance(3000));
    const move = await page.evaluate(() => window.__DEMINEUR_TEST__?.nextMove() ?? null);
    if (move?.tool === 'flag') { await tapButton(page, '#demineur-tool', mobile); await touchCell(page, move.x, move.y, mobile); }
    const before = await read(page);
    expect(before.phase).toBe('playing');
    await page.reload();
    await hookReady(page);
    const after = await read(page);
    expect(after).toMatchObject({ kind: 'beginner', seed: 45270, cells: before.cells, flags: before.flags, turn: before.turn, firstClick: before.firstClick });
    expect(after.elapsedMs).toBeGreaterThanOrEqual(3000);
});
test('DM-E05 Expert sur téléphone : grille pivotée, zoom au doigt, glisser pour se déplacer', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadMode('expert', 7); window.__DEMINEUR_TEST__?.advance(0); });
    const start = await read(page);
    expect(start).toMatchObject({ width: 30, height: 16, mines: 99, noGuess: false });
    expect(start.view).toMatchObject({ transposed: true, cols: 16, rows: 30, zoomable: true, zoomed: true });
    await expect(page.locator('#demineur-zoom')).toBeVisible();
    // First touch: always safe, and the clock starts.
    await touchCell(page, 15, 8, true);
    expect((await read(page)).phase).toBe('playing');
    // A finger drag pans the board instead of playing.
    const turn = (await read(page)).turn, oy = (await read(page)).view.oy;
    const a = await screen(page, 180, 480), b = await screen(page, 180, 180);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
    for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x, y: a.y + (b.y - a.y) * k / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const panned = await read(page);
    expect(panned.turn).toBe(turn); expect(panned.view.oy).not.toBe(oy);
    // The magnifier shows the whole board, a touch there zooms back in without playing.
    await page.locator('#demineur-zoom').tap();
    expect((await read(page)).view.zoomed).toBe(false);
    const centre = await screen(page, 180, 300);
    await page.touchscreen.tap(centre.x, centre.y);
    const zoomed = await read(page);
    expect(zoomed.view.zoomed).toBe(true); expect(zoomed.turn).toBe(turn);
});
test('DM-E06 clavier et souris : flèches, Espace, F, clic droit', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadMode('beginner', 99); window.__DEMINEUR_TEST__?.advance(0); });
    await page.locator('#game canvas').focus().catch(() => undefined);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    const dug = await read(page);
    expect(dug.phase).toBe('playing'); expect(dug.firstClick).toEqual({ x: 4, y: 4 });
    const hidden = dug.cells.split('').findIndex(c => c === '#');
    const w = await page.evaluate(i => window.__DEMINEUR_TEST__?.cellPoint(i % 9, Math.floor(i / 9)), hidden);
    if (!w) throw new Error('case');
    const p = await screen(page, w.x, w.y);
    await page.mouse.click(p.x, p.y, { button: 'right' });
    expect((await read(page)).flags).toBe(1);
    await page.keyboard.press('KeyF');
    expect((await read(page)).turn).toBeGreaterThanOrEqual(dug.turn + 1);
});
for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1280, 900], [1440, 900]] as const) test(`DM-E07 AC12 mise en page ${String(width)}×${String(height)} avec DejaVu Sans : rien ne déborde, boutons ≥ 44 px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadLevel(29); window.__DEMINEUR_TEST__?.advance(0); });
    await page.locator('#demineur-tool').evaluate(b => { (b as HTMLButtonElement).click(); });
    const layout = await page.evaluate(() => {
        const rect = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height } : null; };
        return {
            scroll: document.documentElement.scrollWidth, scrollY: document.documentElement.scrollHeight, inner: innerHeight,
            canvas: rect(document.querySelector('#game canvas')),
            buttons: [...document.querySelectorAll('#touch-controls button')].filter(b => b.getBoundingClientRect().width > 0).map(b => ({ id: b.id, ...rect(b), fits: b.scrollWidth <= b.clientWidth && b.scrollHeight <= b.clientHeight })),
        };
    });
    expect(layout.scroll).toBeLessThanOrEqual(width);
    expect(layout.scrollY).toBeLessThanOrEqual(height + 1);
    expect(layout.canvas?.right ?? Infinity).toBeLessThanOrEqual(width + 0.5);
    expect(layout.canvas?.bottom ?? Infinity).toBeLessThanOrEqual(layout.inner + 0.5);
    expect(layout.buttons.length).toBeGreaterThanOrEqual(2);
    for (const b of layout.buttons) {
        expect(b.w, b.id).toBeGreaterThanOrEqual(44); expect(b.h, b.id).toBeGreaterThanOrEqual(44);
        expect(b.right ?? Infinity, b.id).toBeLessThanOrEqual(width); expect(b.bottom ?? Infinity, b.id).toBeLessThanOrEqual(layout.inner + 0.5);
        expect(b.fits, b.id).toBe(true);
    }
    await expect(page.locator('#demineur-tool')).toHaveAttribute('data-tool', 'flag');
    await expect(page.locator('#demineur-tool')).toHaveAttribute('aria-pressed', 'true');
});
