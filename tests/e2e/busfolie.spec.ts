import { test, expect } from './fixture';
import type { CDPSession, Page } from '@playwright/test';
type Move = { busId: string; direction: 'forward' | 'backward'; distance: number; departs: boolean };
const read = (page: Page) => page.evaluate(() => {
    const hook = window.__BUSFOLIE_TEST__; if (!hook) throw new Error('Crochet Bus en folie absent');
    return hook.read();
});
const hookReady = (page: Page) => expect.poll(() => page.evaluate(() => Boolean(window.__BUSFOLIE_TEST__))).toBe(true);
const parse = (text: string): Move => { const [busId = '', how = 'f1'] = text.split(' '); return { busId, direction: how.startsWith('f') ? 'forward' : 'backward', distance: Number(how.slice(1)), departs: false }; };
/** Screen point of a world point of the 360 × 640 layout, through the camera of its region (full-screen game). */
async function screen(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const p = await page.evaluate(([x, y]) => { const hook = window.__BUSFOLIE_TEST__; if (!hook) throw new Error('Crochet'); return { ...hook.toCanvas(x, y), game: hook.usefulArea() }; }, [x, y] as const);
    return { x: box.x + p.x * box.width / p.game.width, y: box.y + p.y * box.height / p.game.height };
}
/** A real finger drag of a bus along its axis (CDP touch events only): `distance` cells, or past the edge to leave. */
async function dragBus(page: Page, cdp: CDPSession, move: Move): Promise<void> {
    const info = await page.evaluate(m => {
        const hook = window.__BUSFOLIE_TEST__; if (!hook) throw new Error('crochet');
        return { at: hook.busPoint(m.busId) };
    }, move);
    if (!info.at) throw new Error(`bus ${move.busId} absent`);
    const vector = await page.evaluate(m => {
        const hook = window.__BUSFOLIE_TEST__; if (!hook) throw new Error('crochet');
        return hook.moveVector(m.busId, m.direction, m.distance, m.departs);
    }, move);
    const a = await screen(page, info.at.x, info.at.y), b = await screen(page, info.at.x + vector.x, info.at.y + vector.y);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
    for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * k / 8, y: a.y + (b.y - a.y) * k / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function playLine(page: Page, cdp: CDPSession, line: readonly string[]): Promise<void> {
    for (const text of line) {
        const before = (await read(page)).moves, m = parse(text);
        m.departs = await page.evaluate(mv => window.__BUSFOLIE_TEST__?.departs(mv.busId, mv.direction, mv.distance) ?? false, m);
        await dragBus(page, cdp, m);
        expect((await read(page)).moves, text).toBe(before + 1);
    }
}
const line = (page: Page, index: number) => page.evaluate(i => window.__BUSFOLIE_TEST__?.line(i) ?? [], index);
test('BF-E01 depuis l’accueil, le niveau 1 gagné au doigt en glissant les bus', async ({ page }) => {
    await page.goto('/?test=1');
    const card = page.locator('.game-card').filter({ hasText: 'Bus en folie' });
    await expect(card).toHaveCount(1);
    await card.tap();
    await expect(page).toHaveURL(/#\/busfolie$/);
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(0); window.__BUSFOLIE_TEST__?.advance(0); });
    expect(await read(page)).toMatchObject({ level: 0, status: 'playing', moves: 0 });
    const cdp = await page.context().newCDPSession(page);
    await playLine(page, cdp, await line(page, 0));
    const end = await read(page);
    expect(end.status).toBe('won'); expect(end.hints).toBe(0); expect(end.stars).toBe(3); expect(end.moves).toBe(end.par);
    await page.evaluate(() => window.__BUSFOLIE_TEST__?.advance(1500));
    await expect(page.locator('#next-level')).toBeVisible();
    expect(await page.evaluate(() => window.__BUSFOLIE_TEST__?.hudText())).toContain('SCORE');
});
test('BF-E02 glisser réel d’un bus jusqu’à la sortie : le groupe embarque sous les yeux, puis le bus part', async ({ page }) => {
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(0); window.__BUSFOLIE_TEST__?.advance(0); });
    const cdp = await page.context().newCDPSession(page);
    const all = await line(page, 0);
    // Play up to the first departure of the line.
    for (const text of all) {
        const m = parse(text);
        m.departs = await page.evaluate(mv => window.__BUSFOLIE_TEST__?.departs(mv.busId, mv.direction, mv.distance) ?? false, m);
        const before = await read(page);
        await dragBus(page, cdp, m);
        if (!m.departs) continue;
        const after = await read(page);
        expect(after.departed).toContain(m.busId);
        expect(after.events).toEqual(expect.arrayContaining(['PASSENGERS_BOARDED', 'BUS_DEPARTED']));
        expect(after.waiting).toBeLessThan(before.waiting);
        // The boarding is drawn: passengers walk to the bus before it drives away.
        expect(after.boarding).toBe(1); expect(after.leaving).toContain(m.busId);
        await page.evaluate(() => window.__BUSFOLIE_TEST__?.advance(1200));
        expect((await read(page)).leaving).toEqual([]);
        expect(await page.evaluate(() => window.__BUSFOLIE_TEST__?.hudText())).toContain('PARTIS 1');
        return;
    }
    throw new Error('aucun départ dans la ligne');
});
test('BF-E03 blocage : un départ piège, « Bloqué ! », puis annuler', async ({ page }) => {
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(1); window.__BUSFOLIE_TEST__?.advance(0); });
    const trap = await page.evaluate(() => window.__BUSFOLIE_TEST__?.trap() ?? null);
    if (!trap) throw new Error('piège');
    const cdp = await page.context().newCDPSession(page);
    for (const m of [...trap.before, trap.move]) {
        m.departs = await page.evaluate(mv => window.__BUSFOLIE_TEST__?.departs(mv.busId, mv.direction, mv.distance) ?? false, m);
        await dragBus(page, cdp, m);
    }
    const blocked = await read(page);
    expect(blocked.status).toBe('blocked'); expect(blocked.events).toContain('LEVEL_BLOCKED');
    expect(await page.evaluate(() => window.__BUSFOLIE_TEST__?.hudText())).toContain('BLOQUÉ');
    await expect(page.locator('#busfolie-undo')).toHaveClass(/busfolie-urge/);
    await page.locator('#busfolie-undo').tap();
    const back = await read(page);
    expect(back.status).toBe('playing'); expect(back.moves).toBe(blocked.moves - 1);
});
test('BF-E04 annuler au doigt : la position, la file et le compteur reviennent', async ({ page }) => {
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(4); window.__BUSFOLIE_TEST__?.advance(0); });
    const start = await read(page), cdp = await page.context().newCDPSession(page);
    const m = parse((await line(page, 4))[0] ?? '');
    m.departs = await page.evaluate(mv => window.__BUSFOLIE_TEST__?.departs(mv.busId, mv.direction, mv.distance) ?? false, m);
    await dragBus(page, cdp, m);
    expect((await read(page)).moves).toBe(1);
    await page.locator('#busfolie-undo').tap();
    const back = await read(page);
    expect(back).toMatchObject({ moves: 0, positions: start.positions, queueIndex: start.queueIndex, departed: [] });
});
test('BF-E05 indice : le prochain coup le plus court, montré et expliqué par le compagnon', async ({ page }) => {
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(9); window.__BUSFOLIE_TEST__?.advance(0); });
    await page.locator('#busfolie-hint').tap();
    const after = await read(page);
    expect(after.hints).toBe(1); expect(after.hint?.status).toBe('move');
    expect(after.selected).toBe(after.hint?.move?.busId);
    expect(after.hint?.text).toMatch(/libère la route|peut partir|premier coup/);
    expect(await page.evaluate(() => window.__BUSFOLIE_TEST__?.hudText())).toContain('Indice :');
});
test('BF-E06 reprise après rechargement : la partie revient à l’identique', async ({ page }) => {
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(0); window.__BUSFOLIE_TEST__?.advance(0); });
    const cdp = await page.context().newCDPSession(page);
    await playLine(page, cdp, (await line(page, 0)).slice(0, 2));
    const before = await read(page);
    await page.reload();
    await hookReady(page);
    const after = await read(page);
    expect(after).toMatchObject({ level: 0, moves: before.moves, positions: before.positions, departed: before.departed, queueIndex: before.queueIndex, undo: before.undo });
});
test('BF-E07 toucher pour choisir puis toucher une case de sa voie ; clavier Tab et flèches', async ({ page }) => {
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(0); window.__BUSFOLIE_TEST__?.advance(0); });
    const m = parse((await line(page, 0))[0] ?? '');
    const target = await page.evaluate(mv => window.__BUSFOLIE_TEST__?.tapPoint(mv.busId, mv.direction, mv.distance) ?? null, m);
    const bus = await page.evaluate(id => window.__BUSFOLIE_TEST__?.busPoint(id) ?? null, m.busId);
    if (!target || !bus) throw new Error('points');
    const pb = await screen(page, bus.x, bus.y);
    await page.touchscreen.tap(pb.x, pb.y);
    expect((await read(page)).selected).toBe(m.busId);
    const pt = await screen(page, target.x, target.y);
    await page.touchscreen.tap(pt.x, pt.y);
    expect((await read(page)).moves).toBe(1);
    // Keyboard: Tab selects a vehicle, an arrow along its axis slides it one cell (or Z takes it back).
    await page.keyboard.press('KeyZ');
    expect((await read(page)).moves).toBe(0);
    await page.keyboard.press('Tab');
    const selected = (await read(page)).selected;
    expect(selected).not.toBeNull();
    const keys = await page.evaluate(id => window.__BUSFOLIE_TEST__?.axisKeys(id ?? '') ?? [], selected);
    for (const key of keys) { await page.keyboard.press(key); if ((await read(page)).moves > 0) break; }
    expect((await read(page)).moves).toBe(1);
});
for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1280, 900]] as const) test(`BF-E08 AC-13 mise en page ${String(width)}×${String(height)} avec DejaVu Sans : rien ne déborde, boutons ≥ 44 px, cour ≥ 60 % de la hauteur`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(29); window.__BUSFOLIE_TEST__?.advance(0); });
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
    expect(layout.buttons.length).toBe(3);
    for (const b of layout.buttons) {
        expect(b.w, b.id).toBeGreaterThanOrEqual(44); expect(b.h, b.id).toBeGreaterThanOrEqual(44);
        expect(b.right ?? Infinity, b.id).toBeLessThanOrEqual(width); expect(b.bottom ?? Infinity, b.id).toBeLessThanOrEqual(layout.inner + 0.5);
        expect(b.fits, b.id).toBe(true);
    }
    // The station and the yard (world y 50 to 548) fill at least 60 % of the canvas height.
    const area = await page.evaluate(() => window.__BUSFOLIE_TEST__?.playArea());
    expect((area?.height ?? 0) / 640).toBeGreaterThanOrEqual(0.6);
    // A bus cell stays a finger target on a phone.
    if (width === 390) {
        const cell = await page.evaluate(() => window.__BUSFOLIE_TEST__?.cell() ?? 0), a = await screen(page, 100, 300), b = await screen(page, 100 + cell, 300);
        expect(b.x - a.x).toBeGreaterThanOrEqual(40);
    }
});
test('BF-E09 campagne 2 : une sauvegarde de la première campagne ouvre le niveau 31, et le niveau 60 se gagne au doigt', async ({ page }) => {
    test.setTimeout(150_000); // 24 finger drags of the last level
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:busfolie:v1', JSON.stringify({ unlocked: 30, best: 4000 })); });
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.locator('#pause').tap(); await page.locator('#levels').tap();
    const buttons = page.locator('#level-list button');
    await expect(buttons).toHaveCount(90);
    await expect(buttons.nth(30)).toBeEnabled(); await expect(buttons.nth(31)).toBeDisabled();
    await page.locator('#close-levels').tap();
    if (await page.locator('#resume').isVisible()) await page.locator('#resume').tap();
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.loadLevel(59); window.__BUSFOLIE_TEST__?.advance(0); });
    expect(await read(page)).toMatchObject({ level: 59, status: 'playing', moves: 0 });
    const cdp = await page.context().newCDPSession(page);
    await playLine(page, cdp, await line(page, 59));
    const end = await read(page);
    expect(end.status).toBe('won'); expect(end.stars).toBe(3); expect(end.moves).toBe(end.par);
    expect(await page.evaluate(() => window.__BUSFOLIE_TEST__?.hudText())).toContain('NIVEAU 60/90');
});
test('BF-E10 campagne 3 : une sauvegarde de la deuxième campagne ouvre le niveau 61, une cour de 7 × 7 gagnée au doigt', async ({ page }) => {
    test.setTimeout(180_000); // up to 40 finger drags on a 7 × 7 yard
    // A player who won level 60 when it was the last one: the save says so (cleared: 60).
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:busfolie:v1', JSON.stringify({ unlocked: 60, best: 9000, cleared: 60 })); });
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.locator('#pause').tap(); await page.locator('#levels').tap();
    const buttons = page.locator('#level-list button');
    await expect(buttons).toHaveCount(90);
    await expect(buttons.nth(60)).toBeEnabled(); await expect(buttons.nth(61)).toBeDisabled();
    await buttons.nth(60).tap();
    await expect.poll(async () => (await read(page)).level).toBe(60);
    await page.evaluate(() => { window.__BUSFOLIE_TEST__?.advance(0); });
    expect(await read(page)).toMatchObject({ level: 60, status: 'playing', moves: 0 });
    expect(await page.evaluate(() => window.__BUSFOLIE_TEST__?.hudText())).toContain('NIVEAU 61/90');
    const cdp = await page.context().newCDPSession(page);
    await playLine(page, cdp, await line(page, 60));
    const end = await read(page);
    expect(end.status).toBe('won'); expect(end.stars).toBe(3); expect(end.moves).toBe(end.par);
});

// Phone window under Chrome's bar (360 × 430) and a short phone (390 × 664): the game takes the width, the HUD and
// station do not overlap the yard, the buttons stay under the canvas, and a bus still slides under the finger.
type Box = { x: number; y: number; w: number; h: number };
/** Plan of the former 360 × 640 world, used only when the hook has no rects() (counter-test on the old code). */
const LEGACY = { width: 360, height: 640, hud: { x: 0, y: 0, w: 360, h: 148 }, board: { x: 0, y: 148, w: 360, h: 492 } };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [width, height] of [[360, 430], [390, 664]] as const) for (const level of [0, 89]) test(`BF-FILL ${String(width)}×${String(height)} niveau ${String(level + 1)} : le jeu prend la largeur, bandeau et cour sans recouvrement`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/busfolie');
    await hookReady(page);
    await page.evaluate(level => { window.__BUSFOLIE_TEST__?.loadLevel(level); window.__BUSFOLIE_TEST__?.advance(0); }, level);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    expect.soft(canvas.width, 'largeur du jeu ≥ 90 % de la fenêtre').toBeGreaterThanOrEqual(0.9 * width);
    const r = await page.evaluate(() => (window.__BUSFOLIE_TEST__ as { rects?: () => unknown } | undefined)?.rects?.() ?? null) as typeof LEGACY | null ?? LEGACY;
    const k = canvas.width / r.width, toScreen = (b: Box): Box => ({ x: canvas.x + b.x * k, y: canvas.y + b.y * k, w: b.w * k, h: b.h * k });
    const hud = toScreen(r.hud), board = toScreen(r.board);
    expect.soft(meets(hud, board), 'bandeau × cour').toBe(false);
    for (const [name, b] of [['bandeau', hud], ['cour', board]] as const) {
        expect.soft(b.x, name).toBeGreaterThanOrEqual(canvas.x - 0.5); expect.soft(b.x + b.w, name).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
        expect.soft(b.y, name).toBeGreaterThanOrEqual(canvas.y - 0.5); expect.soft(b.y + b.h, name).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
    }
    const pause = await page.locator('#pause').boundingBox();
    if (pause) for (const [name, b] of [['bandeau', hud], ['cour', board]] as const) expect.soft(meets({ x: pause.x, y: pause.y, w: pause.width, h: pause.height }, b), `⏸ × ${name}`).toBe(false);
    for (const b0 of await page.locator('#touch-controls button').all()) {
        const b = await b0.boundingBox(); if (!b || !b.width) continue;
        expect.soft(b.width).toBeGreaterThanOrEqual(56); expect.soft(b.height).toBeGreaterThanOrEqual(56);
        expect.soft(b.x + b.width).toBeLessThanOrEqual(width + 0.5); expect.soft(b.y + b.height).toBeLessThanOrEqual(height + 0.5);
        expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height }), 'bouton hors du canevas').toBe(false);
    }
    const cdp = await page.context().newCDPSession(page);
    await playLine(page, cdp, (await line(page, level)).slice(0, 1));
});
