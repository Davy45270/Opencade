import { test, expect } from './fixture';
import { ready, swap } from './gourmandises-input';
test('parcours, résultats et reprise par vraies entrées', async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/?test=1#/gourmandises');
    await ready(page, isMobile);
    const finish = await page.evaluate(() => window.__GOURMANDISES_TEST__?.scenario('finish'));
    expect(finish).toBeTruthy();
    await page.screenshot({ path: 'test-results/screenshots/gourmandises-play.png' });
    if (!finish) throw new Error('Permutation finale absente');
    await swap(page, finish, isMobile);
    await expect(page.locator('#result-title')).toContainText('réussi');
    await page.screenshot({ path: 'test-results/screenshots/gourmandises-won.png' });
    if (isMobile) await page.locator('#next-level').tap();
    else await page.locator('#next-level').click();
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().level)).toBe(1);
    const before = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    await page.reload();
    await ready(page, isMobile);
    const after = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    expect(after?.cells).toEqual(before?.cells);
    expect(after?.moves).toBe(before?.moves);
    expect(after?.level).toBe(1);
    await page.evaluate(() => window.__GOURMANDISES_TEST__?.loadLevel(59, 6));
    await page.screenshot({ path: 'test-results/screenshots/gourmandises-level60.png' });
    const loss = await page.evaluate(() => window.__GOURMANDISES_TEST__?.scenario('loss'));
    if (!loss) throw new Error('Permutation perdante absente');
    await swap(page, loss, isMobile);
    await expect(page.locator('#result-title')).toHaveText('Défaite');
    await page.screenshot({ path: 'test-results/screenshots/gourmandises-lost.png' });
    if (isMobile) await page.locator('#retry-level').tap();
    else await page.locator('#retry-level').click();
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().status)).toBe('playing');
    expect(await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves)).toBe(0);
    expect(errors).toEqual([]);
});

test('clavier, sélection visible et raccourcis des trois outils', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Le parcours mobile utilise exclusivement le doigt');
    await page.goto('/?test=1#/gourmandises');
    await ready(page);
    await page.evaluate(() => window.__GOURMANDISES_TEST__?.loadLevel(0, 8));
    const pair = await page.evaluate(() => window.__GOURMANDISES_TEST__?.bestMove());
    if (!pair) throw new Error('Permutation absente');
    const columns = 6;
    for (let y = 0; y < Math.floor(pair[0] / columns); y++) await page.keyboard.press('ArrowDown');
    for (let x = 0; x < pair[0] % columns; x++) await page.keyboard.press('ArrowRight');
    const board = await page.evaluate(() => window.__GOURMANDISES_TEST__?.board());
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!board || !canvas) throw new Error('Plateau absent');
    const clip = {
        x: canvas.x + board.x,
        y: canvas.y + board.y,
        width: board.width,
        height: board.height,
    };
    const unselected = await page.screenshot({ clip });
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    const selected = await page.screenshot({ clip });
    expect(selected.equals(unselected), 'La sélection change les pixels du plateau').toBe(false);
    await page.keyboard.press(pair[1] - pair[0] === 1 ? 'ArrowRight' : 'ArrowDown');
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves)).toBe(1);
    await page.waitForTimeout(320);
    for (const [key, tool] of [['1', 'hammer'], ['2', 'rocket'], ['3', 'rainbow']] as const) {
        const before = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().tools);
        await page.keyboard.press(key);
        await expect(page.locator(`#gourmandises-${tool}`)).toHaveAttribute('aria-pressed', 'true');
        expect(await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().armedTool)).toBe(tool);
        await page.keyboard.press('Space');
        await expect.poll(() => page.evaluate(tool => window.__GOURMANDISES_TEST__?.read().tools[tool], tool)).toBe((before?.[tool] ?? 0) - 1);
        await page.waitForTimeout(320);
    }
    await page.keyboard.press('3');
    await page.keyboard.press('Escape');
    for (const tool of ['hammer', 'rocket', 'rainbow']) {
        await expect(page.locator(`#gourmandises-${tool}`)).toHaveAttribute('aria-pressed', 'false');
    }
    expect(await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().armedTool)).toBe(null);
});

// Both projects use the same legal scenario; mobile permutations use two finger taps.
test('palais givré et sortie réelle d’un objet', async ({ page, isMobile }) => {
    const captures = `test-results/screenshots/${isMobile ? 'mobile' : 'desktop'}`;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/?test=1#/gourmandises');
    await ready(page, isMobile);
    await page.evaluate(() => window.__GOURMANDISES_TEST__?.loadLevel(119, 8));
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().level)).toBe(119);
    const palace = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    expect(palace?.objectives).toHaveLength(2);
    expect(palace?.cells.some(cell => cell.ice === 2)).toBe(true);
    await page.screenshot({ path: `${captures}/gourmandises-level120.png` });
    const pair = await page.evaluate(() => window.__GOURMANDISES_TEST__?.scenario('drop'));
    if (!pair) throw new Error('Permutation ouvrant la sortie absente');
    const before = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    expect(before?.cells.some(cell => cell.exit)).toBe(true);
    expect(before?.cells.some(cell => cell.piece?.drop)).toBe(true);
    await page.screenshot({ path: `${captures}/gourmandises-drop-before.png` });
    await swap(page, pair, isMobile);
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().dropped ?? 0))
        .toBeGreaterThan(before?.dropped ?? 0);
    expect(await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves)).toBe((before?.moves ?? 0) + 1);
    await page.screenshot({ path: `${captures}/gourmandises-drop-after.png` });
    expect(errors).toEqual([]);
});

test('canyon des flèches, boucle et permutation réelle sur le tapis', async ({ page, isMobile }) => {
    const captures = `test-results/screenshots/${isMobile ? 'mobile' : 'desktop'}`;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?test=1#/gourmandises');
    await ready(page, isMobile);
    await page.evaluate(() => window.__GOURMANDISES_TEST__?.loadLevel(179, 8));
    const finale = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    expect(finale?.objectives).toHaveLength(2);
    expect(finale?.cells.some(cell => cell.belt)).toBe(true);
    await page.screenshot({ path: `${captures}/gourmandises-level180.png` });
    const pair = await page.evaluate(() => window.__GOURMANDISES_TEST__?.scenario('belt'));
    if (!pair) throw new Error('Permutation sur le tapis absente');
    const before = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    await swap(page, pair, isMobile);
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves)).toBe((before?.moves ?? 0) + 1);
    const after = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
    expect(after?.cells.map(cell => cell.belt)).toEqual(before?.cells.map(cell => cell.belt));
    const transport = await page.evaluate(() => window.__GOURMANDISES_TEST__?.transport());
    expect(transport?.length).toBeGreaterThan(0);
    if (!before || !transport) throw new Error('Transport absent');
    for (const move of transport) {
        const belt = before.cells[move.from]?.belt;
        expect(belt).toBeTruthy();
        const band = before.cells.flatMap((cell, i) => cell.belt?.band === belt?.band ? [i] : []);
        const step = belt?.direction === 'left' || belt?.direction === 'up' ? -1 : 1;
        const expected = band[(band.indexOf(move.from) + step + band.length) % band.length];
        expect(move.to).toBe(expected);
        expect(move.piece).toBeTruthy();
    }
    // A swap alone emits no transport; each band must rotate all its occupied cells.
    expect(new Set(transport.map(move => move.from)).size).toBe(transport.length);
    expect(new Set(transport.map(move => move.to))).toEqual(new Set(transport.map(move => move.from)));
    await page.screenshot({ path: `${captures}/gourmandises-belt-after.png` });
    expect(errors).toEqual([]);
});

// Worlds 10–12 through the real board: one ordinary gesture per new mechanic.
test('portes, îles et atelier : portail, fraise et bombe au doigt', async ({ page, isMobile }) => {
    const captures = `test-results/screenshots/${isMobile ? 'mobile' : 'desktop'}`;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('/?test=1#/gourmandises');
    await ready(page, isMobile);
    for (const [scenario, level] of [['portal', 180], ['fruit', 200], ['bomb', 220]] as const) {
        await page.evaluate(level => window.__GOURMANDISES_TEST__?.loadLevel(level, 6), level);
        await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().level)).toBe(level);
        await page.screenshot({ path: `${captures}/gourmandises-level${String(level + 1)}.png` });
        const pair = await page.evaluate(name => window.__GOURMANDISES_TEST__?.scenario(name) ?? null, scenario);
        if (!pair) throw new Error(`Permutation ${scenario} absente`);
        const before = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
        if (!before) throw new Error('État absent');
        await swap(page, pair, isMobile);
        await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves)).toBe(before.moves + 1);
        const after = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
        if (scenario === 'portal') {
            expect(before.cells.some(cell => cell.portal !== undefined)).toBe(true);
            expect(after?.cells.map(cell => cell.gate)).toEqual(before.cells.map(cell => cell.gate));
        } else if (scenario === 'fruit') {
            expect(after?.dropped ?? 0).toBeGreaterThan(before.dropped ?? 0);
        } else {
            expect(after?.cells.filter(cell => cell.bomb).length).toBeLessThan(before.cells.filter(cell => cell.bomb).length);
        }
        await page.screenshot({ path: `${captures}/gourmandises-${scenario}-after.png` });
    }
    expect(errors).toEqual([]);
});

// Phone window under Chrome's bar (360 × 430) and a short phone (390 × 664): the game takes the width, the HUD and
// the board do not overlap, the tool buttons stay under the canvas, and a swap by touch still lands on its cells.
type Box = { x: number; y: number; w: number; h: number };
/** Plan of the former 360 × 640 world, used only when the hook has no rects() (counter-test on the old code). */
const LEGACY = { width: 360, height: 640, hud: { x: 0, y: 0, w: 360, h: 188 }, board: { x: 6, y: 178, w: 348, h: 428 } };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [width, height] of [[360, 430], [390, 664]] as const) for (const level of [0, 239]) test(`G-FILL ${String(width)}×${String(height)} niveau ${String(level + 1)} : le jeu prend la largeur, bandeau et plateau sans recouvrement`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/gourmandises');
    await ready(page, true);
    await page.evaluate(level => { window.__GOURMANDISES_TEST__?.loadLevel(level, 28); window.__GOURMANDISES_TEST__?.advance(50); }, level);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    expect.soft(canvas.width, 'largeur du jeu ≥ 90 % de la fenêtre').toBeGreaterThanOrEqual(0.9 * width);
    const r = await page.evaluate(() => (window.__GOURMANDISES_TEST__ as { rects?: () => unknown } | undefined)?.rects?.() ?? null) as typeof LEGACY | null ?? LEGACY;
    const k = canvas.width / r.width, toScreen = (b: Box): Box => ({ x: canvas.x + b.x * k, y: canvas.y + b.y * k, w: b.w * k, h: b.h * k });
    const hud = toScreen(r.hud), board = toScreen(r.board);
    expect.soft(meets(hud, board), 'bandeau × plateau').toBe(false);
    for (const [name, b] of [['bandeau', hud], ['plateau', board]] as const) {
        expect.soft(b.x, name).toBeGreaterThanOrEqual(canvas.x - 0.5); expect.soft(b.x + b.w, name).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
        expect.soft(b.y, name).toBeGreaterThanOrEqual(canvas.y - 0.5); expect.soft(b.y + b.h, name).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
    }
    for (const id of ['#gourmandises-hammer', '#gourmandises-rocket', '#gourmandises-rainbow']) {
        const b = await page.locator(id).boundingBox(); if (!b) throw new Error(id);
        expect.soft(b.width, id).toBeGreaterThanOrEqual(56); expect.soft(b.height, id).toBeGreaterThanOrEqual(56);
        expect.soft(b.x + b.width, id).toBeLessThanOrEqual(width + 0.5); expect.soft(b.y + b.height, id).toBeLessThanOrEqual(height + 0.5);
        expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height }), `${id} hors du canevas`).toBe(false);
    }
    const move = await page.evaluate(() => window.__GOURMANDISES_TEST__?.bestMove());
    if (!move) throw new Error('Permutation absente');
    const before = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves);
    await swap(page, move, true);
    await expect.poll(() => page.evaluate(() => window.__GOURMANDISES_TEST__?.read().moves)).toBe((before ?? 0) + 1);
});
