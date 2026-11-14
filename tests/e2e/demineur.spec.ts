import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const read = (page: Page) => page.evaluate(() => {
    const hook = window.__DEMINEUR_TEST__; if (!hook) throw new Error('Crochet Démineur absent');
    return hook.read();
});
const hookReady = (page: Page) => expect.poll(() => page.evaluate(() => Boolean(window.__DEMINEUR_TEST__))).toBe(true);
/** Screen point of a world point (the world is the canvas size: the game draws at the play area's size). */
async function screen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const world = await page.evaluate(() => window.__DEMINEUR_TEST__?.usefulArea() ?? { width: 360, height: 640 });
    return { x: box.x + x * box.width / world.width, y: box.y + y * box.height / world.height };
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
test('DM-E08 130 grilles en onglets de dix ; la dernière, 16 × 24, jouée au doigt', async ({ page }, info) => {
    test.setTimeout(120000);
    const mobile = info.project.name === 'mobile-chromium';
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:demineur:v1', JSON.stringify({ unlocked: 130, best: 0 })); });
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    await tapButton(page, '#pause', mobile);
    await tapButton(page, '#levels', mobile);
    await expect(page.locator('#level-select')).toBeVisible();
    // Thirteen tabs of ten; the list opens on the tier of the next grid to play (130).
    await expect(page.locator('#level-tiers [role="tab"]')).toHaveCount(13);
    await expect(page.locator('#level-list button')).toHaveCount(130);
    await expect(page.locator('#level-tiers [aria-selected="true"]')).toHaveAccessibleName('Niveaux 121 à 130 · Le sommet');
    // Order: classic modes, then the tabs, then the grids of the chosen tab, nothing in between.
    const box = async (selector: string) => { const b = await page.locator(selector).boundingBox(); if (!b) throw new Error(selector); return b; };
    const [modes, tabs, list] = [await box('#demineur-modes'), await box('#level-tiers'), await box('#level-list')];
    expect(modes.y + modes.height).toBeLessThanOrEqual(tabs.y + 1);
    expect(list.y).toBeGreaterThanOrEqual(tabs.y + tabs.height - 1);
    expect(await page.evaluate(() => document.querySelector('#level-tiers')?.nextElementSibling?.id)).toBe('level-list');
    const last = page.locator('#level-list button').nth(129);
    await expect(last).toBeVisible(); await expect(last).toBeEnabled();
    await tapButton(page, '#level-list button >> nth=129', mobile);
    await page.evaluate(() => window.__DEMINEUR_TEST__?.advance(0));
    const start = await read(page);
    expect(start).toMatchObject({ kind: 'progression', level: 129, status: 'playing', noGuess: true });
    expect(start.width * start.height).toBeLessThanOrEqual(16 * 24);
    if (mobile) expect(start.view).toMatchObject({ zoomable: true, zoomed: true });
    // 40 proven moves by touch on the zoomed board (the view scrolls to each cell). The win of every grid by the engine
    // following its hints is checked by validate-demineur.js.
    await playToEnd(page, mobile, 40);
    const after = await read(page);
    expect(after.status).toBe('playing'); expect(after.revealed).toBeGreaterThan(start.revealed + 20);
});

// Retour du 15/11 (capture d’un téléphone 360 × 430 sous la barre de Chrome) : le jeu n'occupait que la moitié de la largeur
// et les cases à demi visibles débordaient sur la ligne d'aide et la bulle du compagnon (masque WebGL sans effet).
type Box = { x: number; y: number; w: number; h: number };
/** Plan of the former 360 × 640 world, used only when the hook has no rects() (counter-test on the old code). */
const LEGACY = { width: 360, height: 640, hud: { x: 8, y: 8, w: 346, h: 32 }, help: { x: 8, y: 48, w: 344, h: 18 }, board: { x: 8, y: 74, w: 344, h: 470 }, tip: { x: 4, y: 554, w: 352, h: 82 } };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [width, height] of [[390, 664], [360, 430]] as const) for (const zoomed of [true, false]) test(`DM-E09 ${String(width)}×${String(height)} ${zoomed ? 'zoomé' : 'dézoomé'} : le jeu prend la largeur, la grille reste dans son cadre`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/demineur');
    await hookReady(page);
    // Grid 21 « Le cœur » (14 × 16), the one of the capture: it opens zoomed on a phone.
    await page.evaluate(() => { window.__DEMINEUR_TEST__?.loadLevel(20); window.__DEMINEUR_TEST__?.advance(0); });
    expect((await read(page)).view.zoomed).toBe(true);
    if (!zoomed) { await page.locator('#demineur-zoom').tap(); expect((await read(page)).view.zoomed).toBe(false); }
    await page.evaluate(() => window.__DEMINEUR_TEST__?.advance(50));
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    expect.soft(canvas.width, 'largeur du jeu ≥ 90 % de la fenêtre').toBeGreaterThanOrEqual(0.9 * width);
    const r = await page.evaluate(() => (window.__DEMINEUR_TEST__ as { rects?: () => unknown } | undefined)?.rects?.() ?? null) as typeof LEGACY | null ?? LEGACY;
    const toScreen = (b: Box): Box => ({ x: canvas.x + b.x * canvas.width / r.width, y: canvas.y + b.y * canvas.height / r.height, w: b.w * canvas.width / r.width, h: b.h * canvas.height / r.height });
    const [hud, help, board, tip] = [r.hud, r.help, r.board, r.tip].map(toScreen) as [Box, Box, Box, Box];
    for (const [name, a, b] of [['bandeau × ligne d’aide', hud, help], ['bandeau × grille', hud, board], ['ligne d’aide × grille', help, board], ['grille × message', board, tip], ['ligne d’aide × message', help, tip]] as const) expect.soft(meets(a, b), name).toBe(false);
    // The buttons sit under the canvas, inside the window, at least 56 px.
    for (const id of ['#demineur-tool', '#demineur-hint', '#demineur-zoom']) {
        const b = await page.locator(id).boundingBox(); if (!b) throw new Error(id);
        expect.soft(b.width, id).toBeGreaterThanOrEqual(56); expect.soft(b.height, id).toBeGreaterThanOrEqual(56);
        expect.soft(b.y + b.height, id).toBeLessThanOrEqual(height + 0.5);
        expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height }), `${id} hors du canevas`).toBe(false);
    }
    // What is drawn, not what is planned: no covered cell (Arcade theme, 0x2fc6e8) outside the board window,
    // in the band of the help line and in the tip box.
    const shot = await page.screenshot();
    const counts = await page.evaluate(async ({ png, zones }) => {
        const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d'); if (!ctx) throw new Error('2d'); ctx.drawImage(img, 0, 0);
        return zones.map(z => {
            const x = Math.max(0, Math.round(z.x)), y = Math.max(0, Math.round(z.y)), w = Math.max(1, Math.round(z.w)), h = Math.max(1, Math.round(z.h));
            const d = ctx.getImageData(x, y, w, h).data; let n = 0;
            for (let i = 0; i < d.length; i += 4) if (Math.abs((d[i] ?? 0) - 0x2f) + Math.abs((d[i + 1] ?? 0) - 0xc6) + Math.abs((d[i + 2] ?? 0) - 0xe8) < 40) n++;
            return n;
        });
    }, { png: shot.toString('base64'), zones: [{ x: help.x, y: help.y, w: help.w, h: board.y - help.y - 8 }, tip, { x: board.x + board.w + 8, y: board.y, w: Math.max(1, canvas.x + canvas.width - board.x - board.w - 8), h: board.h }] });
    expect.soft(counts, 'pixels de case hors du cadre (ligne d’aide, message, droite)').toEqual([0, 0, 0]);
});
