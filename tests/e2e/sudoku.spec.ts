import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/sudoku/scene';

const read = async (page: Page) => {
    const state = await page.evaluate(() => window.__SUDOKU_TEST__?.read());
    if (!state) throw new Error('Crochet Sudoku absent');
    return state;
};
const hooked = (page: Page) => expect.poll(() => page.evaluate(() => Boolean(window.__SUDOKU_TEST__))).toBe(true);
/** Screen point of a cell, pad key (0: eraser) or action button, from the scene's own layout. */
async function point(page: Page, kind: 'cell' | 'pad' | 'action', what: number | string) {
    const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
    const { t, area } = await page.evaluate(([k, w]) => {
        const hook = window.__SUDOKU_TEST__; if (!hook) throw new Error('Crochet absent');
        return { t: hook.target(k, w), area: hook.usefulArea() };
    }, [kind, what] as const);
    return { x: box.x + t.x * box.width / area.width, y: box.y + t.y * box.height / area.height };
}
/** A real finger (mobile project) or a real mouse click (desktop project). */
async function press(page: Page, mobile: boolean, kind: 'cell' | 'pad' | 'action', what: number | string) {
    const p = await point(page, kind, what);
    if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
/** The CI's default font is wider than the local one: the page is served with DejaVu Sans forced on every text. */
async function dejaVu(page: Page) {
    await page.route(/\/(\?test=1)?(#.*)?$/, async route => {
        const response = await route.fetch(), body = await response.text();
        await route.fulfill({ response, body: body.replace('</head>', '<style>body, body * { font-family: "DejaVu Sans" !important; }</style></head>') });
    });
}
// Level 1 (4 × 4): '4321/1.4./.1.4/3412', empty cells 5, 7, 8 and 10.
const EMPTY = [5, 7, 8, 10];

test('S-E2E-01 crochet absent sans paramètre test', async ({ page }) => {
    await page.goto('/#/sudoku');
    await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => Boolean(window.__SUDOKU_TEST__))).toBe(false);
});

test('S-E2E-02 ouverture depuis l’accueil par la carte du jeu', async ({ page }, info) => {
    await page.goto('/?test=1#/');
    const card = page.getByRole('button', { name: /Sudoku/ });
    await expect(card).toBeVisible();
    if (info.project.name === 'mobile-chromium') await card.tap(); else await card.click();
    await expect(page.locator('#game canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__ARCADE_TEST__?.current())).toBe('sudoku');
    await hooked(page);
    await expect.poll(async () => page.evaluate(() => window.__SUDOKU_TEST__?.hudText())).toMatch(/SUDOKU · 1\/30/);
});

test('S-E2E-03 AC02 AC03 AC05 AC07 AC11 AC12 saisie, notes, erreur, annuler, indice, reprise et victoire 4×4', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/sudoku');
    await hooked(page);
    expect((await read(page)).level).toBe(0);
    // Real inputs only from here: taps (mobile) or mouse and keyboard (desktop).
    await press(page, mobile, 'cell', 5);
    expect((await read(page)).selectedIndex).toBe(5);
    if (mobile) await press(page, true, 'action', 'notes'); else await page.keyboard.press('n');
    expect((await read(page)).notesMode).toBe(true);
    if (mobile) { await press(page, true, 'pad', 2); await press(page, true, 'pad', 3); } else { await page.keyboard.press('2'); await page.keyboard.press('3'); }
    expect((await read(page)).notes[5]).toEqual([2, 3]);
    if (mobile) await press(page, true, 'action', 'notes'); else await page.keyboard.press('n');
    // A 3 in cell 5: column 2 already has the given 3 above it.
    if (mobile) await press(page, true, 'pad', 3); else await page.keyboard.press('3');
    let s = await read(page);
    expect(s.values[5]).toBe(3); expect(s.conflicts).toEqual([1, 5]); expect(s.mistakes).toBe(1); expect(s.tone).toBe('error');
    await page.screenshot({ path: info.outputPath('sudoku-conflit.png') });
    if (mobile) await press(page, true, 'action', 'undo'); else await page.keyboard.press('Control+z');
    s = await read(page);
    expect(s.values[5]).toBe(0); expect(s.notes[5]).toEqual([2, 3]); expect(s.conflicts).toEqual([]); expect(s.mistakes).toBe(1);
    if (mobile) await press(page, true, 'action', 'hint'); else await page.keyboard.press('h');
    s = await read(page);
    expect(s.hint?.kind).toBe('logic'); expect(s.hintsUsed).toBe(1); expect(s.selectedIndex).toBe(s.hint?.index);
    expect(s.message).toMatch(/ne peut aller|seul le/);
    const solution = await page.evaluate(() => window.__SUDOKU_TEST__?.solution() ?? []);
    expect(s.hint?.value).toBe(solution[s.hint?.index ?? -1]);
    const first = s.hint?.index ?? 0;
    if (mobile) await press(page, true, 'pad', solution[first] ?? 0); else await page.keyboard.press(String(solution[first]));
    // Reload: values, notes, counters and the level come back.
    await page.evaluate(() => { window.__SUDOKU_TEST__?.advance(5100); });
    const before = await read(page);
    await page.reload(); await hooked(page);
    const after = await read(page);
    for (const key of ['level', 'values', 'notes', 'mistakes', 'hintsUsed', 'moves'] as const) expect(after[key], key).toEqual(before[key]);
    expect(after.elapsedMs).toBeGreaterThanOrEqual(5000);
    // Finish the grid; the arrow keys reach the cells on desktop.
    for (const i of EMPTY.filter(i => !after.values[i])) {
        if (mobile) { await press(page, true, 'cell', i); await press(page, true, 'pad', solution[i] ?? 0); }
        else { await press(page, false, 'cell', 0); for (let k = 0; k < i % 4; k++) await page.keyboard.press('ArrowRight'); for (let k = 0; k < Math.floor(i / 4); k++) await page.keyboard.press('ArrowDown'); await page.keyboard.press(String(solution[i])); }
    }
    s = await read(page);
    expect(s.status).toBe('won'); expect(s.progression).toBe('won'); expect(s.unlocked).toBe(2); expect(s.stars).toBe(2);
    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#result-scores')).toContainText('★★☆');
    await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: info.outputPath('sudoku-victoire.png') });
    if (mobile) await page.locator('#next-level').tap(); else await page.locator('#next-level').click();
    expect((await read(page)).level).toBe(1);
});

test('S-E2E-04 AC06 aucun débordement à 320, 390, 768 et 1280 px avec DejaVu Sans, pavé ≥ 44 px', async ({ page }, info) => {
    await dejaVu(page);
    const sizes = info.project.name === 'mobile-chromium' ? [[320, 640], [390, 844], [768, 1024]] : [[1280, 900]];
    for (const [width, height] of sizes as [number, number][]) {
        await page.setViewportSize({ width, height });
        await page.goto('/?test=1#/sudoku'); await hooked(page);
        expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('DejaVu');
        for (const level of [0, 5, 29]) {
            // The longest lines: a hint with its explanation in the bubble.
            await page.evaluate(level => { window.__SUDOKU_TEST__?.loadLevel(level); window.__SUDOKU_TEST__?.advance(0); }, level);
            await page.keyboard.press('h');
            const box = await page.locator('#game canvas').boundingBox(); if (!box) throw new Error('Canevas absent');
            const m = await page.evaluate(() => ({ texts: window.__SUDOKU_TEST__?.texts() ?? [], area: window.__SUDOKU_TEST__?.usefulArea(), scrollW: document.scrollingElement?.scrollWidth ?? 0, scrollH: document.scrollingElement?.scrollHeight ?? 0, w: innerWidth, h: innerHeight }));
            const where = `${String(width)}×${String(height)} niveau ${String(level + 1)}`;
            expect(m.texts.length, where).toBe(6);
            for (const t of m.texts) {
                expect(t.box.x, `${where} ${t.name} gauche`).toBeGreaterThanOrEqual(t.limit.x - .5);
                expect(t.box.y, `${where} ${t.name} haut`).toBeGreaterThanOrEqual(t.limit.y - .5);
                expect(t.box.x + t.box.w, `${where} ${t.name} droite`).toBeLessThanOrEqual(t.limit.x + t.limit.w + .5);
                expect(t.box.y + t.box.h, `${where} ${t.name} bas`).toBeLessThanOrEqual(t.limit.y + t.limit.h + .5);
            }
            expect(m.scrollW, where).toBeLessThanOrEqual(m.w); expect(m.scrollH, where).toBeLessThanOrEqual(m.h + 1);
            expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + .5);
            expect(box.y + box.height).toBeLessThanOrEqual(height + .5);
            const k = box.width / (m.area?.width ?? 1);
            for (const what of [1, 0]) {
                const r = await page.evaluate(w => window.__SUDOKU_TEST__?.target('pad', w), what);
                expect(r).toBeDefined();
            }
            const key = await page.evaluate(() => { const hook = window.__SUDOKU_TEST__; const a = hook?.target('pad', 1), b = hook?.target('pad', 2); return a && b ? b.x - a.x : 0; });
            expect(key * k, `${where} pas du pavé`).toBeGreaterThanOrEqual(44);
        }
        await page.screenshot({ path: info.outputPath(`sudoku-${String(width)}x${String(height)}.png`) });
    }
});

test('S-E2E-05 le chrono suit le temps réel en jeu, même à faible cadence d’images', async ({ page }) => {
    await page.clock.install();
    await page.goto('/?test=1#/sudoku'); await hooked(page);
    const start = (await read(page)).elapsedMs;
    // 6 s of wall time in 8 jumps of 750 ms, one frame each: a slow device. Phaser alone would count ~0.13 s.
    for (let i = 0; i < 8; i++) { await page.clock.fastForward(750); await page.evaluate(() => new Promise(requestAnimationFrame)); }
    const s = await read(page);
    expect(s.elapsedMs - start).toBeGreaterThanOrEqual(5000);
    await expect.poll(() => page.evaluate(() => window.__SUDOKU_TEST__?.hudText())).toMatch(/⏱ 00:(0[5-9]|1[0-9])/);
});
