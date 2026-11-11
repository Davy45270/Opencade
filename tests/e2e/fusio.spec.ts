import { test, expect } from './fixture';
import type { CDPSession, Page } from '@playwright/test';
import type {} from '../../src/games/fusio/scene';
type Direction = 'up' | 'down' | 'left' | 'right';
const read = (page: Page) => page.evaluate(() => {
    const hook = window.__FUSIO_TEST__; if (!hook) throw new Error('Crochet Fusio absent');
    return hook.read();
});
const hooked = (page: Page) => expect.poll(() => page.evaluate(() => Boolean(window.__FUSIO_TEST__))).toBe(true);
/** Screen point of a logical point of the canvas (RESIZE: 1 unit = 1 CSS px, offset by the canvas box). */
async function screen(page: Page, x: number, y: number) {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const area = await page.evaluate(() => window.__FUSIO_TEST__?.usefulArea());
    return { x: box.x + x * box.width / (area?.width ?? 1), y: box.y + y * box.height / (area?.height ?? 1) };
}
const sessions = new WeakMap<Page, CDPSession>();
const VECTOR: Record<Direction, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
/** A real swipe across the board: a finger (CDP touch events, mobile) or a mouse drag (desktop). */
async function swipe(page: Page, direction: Direction, mobile: boolean) {
    const r = await page.evaluate(() => window.__FUSIO_TEST__?.boardRect()); if (!r) throw new Error('plateau');
    const [dx, dy] = VECTOR[direction], a = await screen(page, r.x + r.w / 2 - dx * r.w * 0.2, r.y + r.h / 2 - dy * r.h * 0.2), b = await screen(page, r.x + r.w / 2 + dx * r.w * 0.2, r.y + r.h / 2 + dy * r.h * 0.2 + 3 * dx);
    if (mobile) {
        let cdp = sessions.get(page);
        if (!cdp) { cdp = await page.context().newCDPSession(page); sessions.set(page, cdp); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
        for (let k = 1; k <= 6; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * k / 6, y: a.y + (b.y - a.y) * k / 6 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
        await page.mouse.move(a.x, a.y); await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up();
    }
}
const KEY: Record<Direction, string> = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
async function tap(page: Page, selector: string, mobile: boolean) { if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click(); }
/** Plays the agent's moves with real inputs (cycling swipe, button, key), until the end or `limit` moves. */
async function playAgent(page: Page, mobile: boolean, limit: number, until: (s: Awaited<ReturnType<typeof read>>) => boolean = () => false) {
    for (let n = 0; n < limit; n++) {
        const s = await read(page);
        if (s.status !== 'playing' || until(s)) return s;
        const d = await page.evaluate(() => window.__FUSIO_TEST__?.nextMove() ?? null);
        if (!d) throw new Error('aucun coup');
        const way = n % 3;
        if (way === 0) await swipe(page, d, mobile);
        else if (way === 1 && mobile) await tap(page, `#fusio-${d}`, true);
        else await page.keyboard.press(KEY[d]);
        expect((await read(page)).moves, `coup ${String(n)} (${['glisser', 'bouton', 'clavier'][way] ?? ''})`).toBe(s.moves + 1);
    }
    return read(page);
}

test('FU-E01 crochet absent sans paramètre test', async ({ page }) => {
    await page.goto('/#/fusio');
    await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => Boolean(window.__FUSIO_TEST__))).toBe(false);
});

test('FU-E02 depuis l’accueil, la partie classique 4 × 4 vers 2048, aide du compagnon', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/');
    const card = page.locator('.game-card').filter({ hasText: 'Fusio' });
    await expect(card).toHaveCount(1);
    if (mobile) await card.tap(); else await card.click();
    await expect(page).toHaveURL(/#\/fusio$/);
    await hooked(page);
    const s = await read(page);
    expect(s).toMatchObject({ kind: 'classic', size: 4, target: 2048, status: 'playing', moves: 0 });
    expect(s.board.filter(Boolean)).toHaveLength(2);
    expect(s.message).toMatch(/Glissez/);
    await expect.poll(() => page.evaluate(() => window.__FUSIO_TEST__?.hudText())).toMatch(/Classique · objectif 2048 · SCORE 0/);
});

test('FU-E03 AC11 glisser au doigt, clavier et boutons ; fusion visible, annuler, indice, reprise', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/fusio'); await hooked(page);
    await page.evaluate(() => { window.__FUSIO_TEST__?.loadClassic(45270); window.__FUSIO_TEST__?.advance(0); });
    // Play the agent's moves with the three inputs until a merge happens on screen.
    const merged = await playAgent(page, mobile, 40, s => s.events.includes('TILE_MERGED'));
    expect(merged.events).toContain('TILE_MERGED');
    expect(merged.animating || merged.events.includes('TILE_MERGED')).toBe(true);
    await page.screenshot({ path: info.outputPath('fusio-fusion.png') });
    // Undo: the board and the score come back.
    const before = await read(page);
    await tap(page, '#fusio-undo', mobile);
    const undone = await read(page);
    expect(undone.moves).toBe(before.moves - 1); expect(undone.undos).toBe(1); expect(undone.score).toBeLessThanOrEqual(before.score);
    // Replay the same move: the same spawn (the generator was restored).
    const d = await page.evaluate(() => window.__FUSIO_TEST__?.nextMove() ?? 'left');
    await page.keyboard.press(KEY[d]);
    expect((await read(page)).moves).toBe(before.moves);
    // Hint: a legal move, explained in one sentence by the companion, the matching arrow lit.
    await tap(page, '#fusio-hint', mobile);
    const hinted = await read(page);
    expect(hinted.hints).toBe(1); expect(hinted.hint?.text).toMatch(/^(Glisser vers|Un seul coup)/); expect(hinted.message).toMatch(/^Indice : /);
    await expect(page.locator(`#fusio-${hinted.hint?.direction ?? 'left'}`)).toHaveClass(/hinted/);
    // Reload: the same game comes back.
    await page.reload(); await hooked(page);
    const back = await read(page);
    for (const key of ['kind', 'seed', 'board', 'score', 'moves', 'prngState', 'hints', 'undos', 'history'] as const) expect(back[key], key).toEqual(hinted[key]);
});

test('FU-E04 victoire sur un défi court (défi 3), au doigt et au clavier, panneau « Défi suivant »', async ({ page }, info) => {
    test.setTimeout(150_000);
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/fusio'); await hooked(page);
    await page.evaluate(() => { window.__FUSIO_TEST__?.loadLevel(2); window.__FUSIO_TEST__?.advance(0); });
    expect(await read(page)).toMatchObject({ kind: 'challenge', level: 2, target: 128 });
    const end = await playAgent(page, mobile, 200);
    expect(end.status).toBe('won'); expect(end.maxTile).toBeGreaterThanOrEqual(128); expect(end.progression).toBe('won');
    await page.evaluate(() => window.__FUSIO_TEST__?.advance(1000));
    await expect(page.locator('#next-level')).toBeVisible();
    await expect(page.locator('#next-level')).toHaveText('Défi suivant');
    await expect(page.locator('#result-scores')).toContainText('★');
    await page.screenshot({ path: info.outputPath('fusio-victoire.png') });
    await tap(page, '#next-level', mobile);
    expect(await read(page)).toMatchObject({ level: 3, status: 'playing', moves: 0 });
});

test('FU-E05 défaite : plateau bloqué, « Rejouer » relance une partie', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/fusio'); await hooked(page);
    await page.evaluate(() => { window.__FUSIO_TEST__?.loadClassic(7); window.__FUSIO_TEST__?.advance(0); });
    // A careless player: left and right, then up and down when nothing moves.
    for (let n = 0; n < 600 && (await read(page)).status === 'playing'; n++) {
        const moves = (await read(page)).moves;
        for (const key of [n % 2 ? 'ArrowLeft' : 'ArrowRight', 'ArrowUp', 'ArrowDown', n % 2 ? 'ArrowRight' : 'ArrowLeft']) { await page.keyboard.press(key); if ((await read(page)).moves > moves || (await read(page)).status !== 'playing') break; }
    }
    const lost = await read(page);
    expect(lost.status).toBe('lost'); expect(lost.lostBy).toBe('blocked'); expect(lost.panel).toBe(false);
    await page.evaluate(() => window.__FUSIO_TEST__?.advance(1000));
    await expect(page.locator('#retry-level')).toBeVisible();
    await expect(page.locator('#retry-level')).toHaveText('Rejouer');
    await page.screenshot({ path: info.outputPath('fusio-defaite.png') });
    await tap(page, '#retry-level', mobile);
    expect(await read(page)).toMatchObject({ kind: 'classic', status: 'playing', moves: 0 });
});

for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1280, 900]] as const) test(`FU-E06 AC13 ${String(width)}×${String(height)} avec DejaVu Sans : 4 × 4, 5 × 5, 6 × 6 sans débordement, boutons ≥ 44 px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.goto('/?test=1#/fusio'); await hooked(page);
    await page.addStyleTag({ content: '* { font-family: "DejaVu Sans", sans-serif !important; }' });
    for (const level of [null, 1, 6, 21]) {
        await page.evaluate(level => { const h = window.__FUSIO_TEST__; if (level === null) h?.loadClassic(3); else h?.loadLevel(level); h?.advance(0); }, level);
        // The longest line: a hint and its explanation in the bubble.
        await page.keyboard.press('KeyH');
        await page.evaluate(() => window.__FUSIO_TEST__?.advance(20));
        const where = `${String(width)}×${String(height)} ${level === null ? 'classique' : `défi ${String(level + 1)}`}`;
        const m = await page.evaluate(() => {
            const rect = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height } : null; };
            return {
                texts: window.__FUSIO_TEST__?.texts() ?? [], area: window.__FUSIO_TEST__?.usefulArea(), board: window.__FUSIO_TEST__?.boardRect(),
                scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, inner: innerHeight,
                canvas: rect(document.querySelector('#game canvas')),
                buttons: [...document.querySelectorAll('#touch-controls button')].filter(b => b.getBoundingClientRect().width > 0).map(b => ({ id: b.id, ...rect(b) })),
            };
        });
        expect(m.texts.length, where).toBe(8);
        for (const t of m.texts) {
            expect(t.box.x, `${where} ${t.name} gauche`).toBeGreaterThanOrEqual(t.limit.x - 0.5);
            expect(t.box.y, `${where} ${t.name} haut`).toBeGreaterThanOrEqual(t.limit.y - 0.5);
            expect(t.box.x + t.box.w, `${where} ${t.name} droite`).toBeLessThanOrEqual(t.limit.x + t.limit.w + 0.5);
            expect(t.box.y + t.box.h, `${where} ${t.name} bas`).toBeLessThanOrEqual(t.limit.y + t.limit.h + 0.5);
        }
        expect(m.scrollW, where).toBeLessThanOrEqual(width); expect(m.scrollH, where).toBeLessThanOrEqual(height + 1);
        expect(m.canvas?.right ?? Infinity, where).toBeLessThanOrEqual(width + 0.5); expect(m.canvas?.bottom ?? Infinity, where).toBeLessThanOrEqual(m.inner + 0.5);
        if (!m.board || !m.area) throw new Error('plateau');
        expect(m.board.x, where).toBeGreaterThanOrEqual(0); expect(m.board.x + m.board.w, where).toBeLessThanOrEqual(m.area.width);
        expect(m.board.y + m.board.h, where).toBeLessThanOrEqual(m.area.height);
        // The board takes the width (a square limited by the width), and the game fills the height.
        expect(m.board.w, where).toBeGreaterThanOrEqual(Math.min(m.area.width - 40, m.area.height * 0.55));
        expect(m.buttons.map(b => b.id).sort(), where).toEqual(['fusio-down', 'fusio-hint', 'fusio-left', 'fusio-right', 'fusio-undo', 'fusio-up']);
        for (const b of m.buttons) {
            expect(b.w, `${where} ${b.id}`).toBeGreaterThanOrEqual(44); expect(b.h, `${where} ${b.id}`).toBeGreaterThanOrEqual(44);
            expect(b.left ?? -1, b.id).toBeGreaterThanOrEqual(0); expect(b.right ?? Infinity, b.id).toBeLessThanOrEqual(width); expect(b.bottom ?? Infinity, b.id).toBeLessThanOrEqual(m.inner + 0.5);
        }
    }
    await page.screenshot({ path: info.outputPath(`fusio-${String(width)}x${String(height)}.png`) });
});
