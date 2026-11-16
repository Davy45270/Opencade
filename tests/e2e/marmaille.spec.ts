import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import { Finger } from './character-finger-input';
import { solutions } from '../marmaille-solutions';
import { ROLES, TICK_MS } from '../../src/engines/marmaille/engine';
import { LEVELS } from '../../src/engines/marmaille/levels';
const TICK = TICK_MS;
async function open(page: Page): Promise<void> {
    await page.goto('/?test=1#/marmaille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__MARMAILLE_TEST__))).toBe(true);
}
/** Real-time game: leave the « Prêt ? » screen before driving the clock with advance(). */
async function play(page: Page): Promise<void> {
    const resume = page.locator('#resume');
    if (await resume.isVisible()) await resume.click();
}
/** Page coordinates of a world point of the 360 × 640 layout, through the field camera (full-screen game). */
async function toPage(page: Page, p: { x: number; y: number }): Promise<{ x: number; y: number }> {
    const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('canvas');
    const c = await page.evaluate(q => { const hook = window.__MARMAILLE_TEST__; if (!hook) throw new Error('crochet'); return { ...hook.toCanvas(q.x, q.y), width: hook.rects().width }; }, p);
    return { x: box.x + c.x * box.width / c.width, y: box.y + c.y * box.width / c.width };
}
// MA-E1: the board opens with its HUD, the role slots follow the level and a real click hands a role.
test('MA-E1 ouverture, emplacements de rôles et clic sur un enfant', async ({ page }) => {
    await open(page); await play(page);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.loadLevel(1); });
    await expect.poll(() => page.evaluate(() => window.__MARMAILLE_TEST__?.hudText())).toMatch(/SCORE/);
    await expect(page.locator('#marmaille-r0')).toHaveText('✋1');
    await expect(page.locator('#marmaille-r1')).toBeHidden();
    // Advance to the recorded tick, then click the kid (mouse on desktop and mobile alike).
    const [tick, kid] = solutions[1]?.[0] ?? [0, 0];
    await page.evaluate(ms => { window.__MARMAILLE_TEST__?.advance(ms); }, tick * TICK);
    const at = await page.evaluate(id => window.__MARMAILLE_TEST__?.kidPoint(id), kid); if (!at) throw new Error('kid');
    const p = await toPage(page, at); await page.mouse.click(p.x, p.y);
    await expect.poll(() => page.evaluate(() => window.__MARMAILLE_TEST__?.read().roles.block)).toBe(0);
    await expect(page.locator('#marmaille-r0')).toHaveText('✋0');
    // V doubles game time: one second of host time is eight ticks instead of four (one tick every TICK_MS = 250 ms).
    const t0 = (await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.tick ?? 0;
    await page.keyboard.press('KeyV'); expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.fast).toBe(true);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.advance(1000); });
    expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.tick).toBe(t0 + 8);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.advance(60000); });
    const s = await page.evaluate(() => window.__MARMAILLE_TEST__?.read());
    expect(s?.status).toBe('won'); expect(s?.kids.find(k => k.id === kid)?.state).toBe('block');
    await page.screenshot({ path: test.info().outputPath('marmaille-M2.png') });
});
// MA-E2: a level without the needed role is lost; replay and level menu stay usable.
test('MA-E2 sans rôle, la falaise est perdue', async ({ page }) => {
    await open(page); await play(page);
    await page.evaluate(() => { window.__MARMAILLE_TEST__?.loadLevel(2); window.__MARMAILLE_TEST__?.advance(60000); });
    await expect.poll(() => page.evaluate(() => window.__MARMAILLE_TEST__?.read().status)).toBe('lost');
});
// MA-E3: noisy finger on the phone: select the role slot, then tap the kid, on the recorded ticks (game time from advance()).
test('MA-E3 doigt bruité : niveaux 2, 9, 15 et 25 gagnés', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(300000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [];
    await finger.press(['#resume']);
    let seed = 483; const noise = () => { seed = seed * 16807 % 2147483647; return seed % 9 - 4; };
    try {
        for (const level of [1, 8, 14, 24]) {
            await page.evaluate(i => { window.__MARMAILLE_TEST__?.loadLevel(i); }, level);
            const roles = ROLES.filter(r => (LEVELS[level]?.roles[r] ?? 0) > 0);
            let tick = 0;
            for (const [at, kid, role] of solutions[level] ?? []) {
                await page.evaluate(ms => { window.__MARMAILLE_TEST__?.advance(ms); }, (at - tick) * TICK); tick = at;
                await finger.press([`#marmaille-r${String(roles.indexOf(role))}`]);
                expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.selected).toBe(role);
                const point = await page.evaluate(id => window.__MARMAILLE_TEST__?.kidPoint(id), kid); if (!point) throw new Error('kid');
                const p = await toPage(page, point), touch = { id: 4, x: p.x + noise(), y: p.y + noise() };
                const before = (await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.roles[role] ?? 0;
                await finger.touch('touchStart', [touch]); await finger.release();
                await expect.poll(async () => (await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.roles[role]).toBe(before - 1);
            }
            await page.evaluate(() => { window.__MARMAILLE_TEST__?.advance(120000); });
            const final = await page.evaluate(() => window.__MARMAILLE_TEST__?.read());
            results.push({ level: level + 1, status: final?.status, saved: final?.saved });
            expect(final?.status).toBe('won');
            await page.screenshot({ path: info.outputPath(`marmaille-doigt-M${String(level + 1)}.png`) });
        }
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
    } finally {
        await info.attach('marmaille-doigt.json', { body: JSON.stringify({ noisePx: 4, results }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
test('MA20 tactile : pas de panneau de texte en bas, rôles et stocks visibles, ⏩ pictogramme près de la pause', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Commandes tactiles');
    for (const [width, height] of [[405, 480], [360, 640], [780, 412]] as const) {
        const size = `${String(width)}×${String(height)}`;
        await page.setViewportSize({ width, height });
        await open(page); await play(page);
        await page.evaluate(() => { window.__MARMAILLE_TEST__?.loadLevel(1); window.__MARMAILLE_TEST__?.advance(0); });
        expect(await page.evaluate(() => window.__MARMAILLE_TEST__?.textPanel()), size).toBe(false);
        await expect(page.locator('#hud .hud-item')).not.toHaveCount(0);
        await expect(page.locator('#marmaille-r0')).toBeVisible(); await expect(page.locator('#marmaille-r0')).toHaveText('✋1');
        const fast = page.locator('#marmaille-fast');
        await expect(fast).toHaveText('⏩'); expect(await page.locator('#topbar #marmaille-fast').count(), size).toBe(1);
        const [f, p] = await Promise.all([fast.boundingBox(), page.locator('#pause').boundingBox()]);
        if (!f || !p) throw new Error('⏩ ou ⏸ absent');
        expect(Math.hypot(f.x - p.x, f.y - p.y), size).toBeLessThan(70);
        expect(f.width).toBeGreaterThanOrEqual(44); expect(f.x + f.width).toBeLessThanOrEqual(width);
        const hud = await page.locator('#hud').boundingBox();
        if (hud) expect(hud.x + hud.width, `${size} HUD sous ⏩`).toBeLessThanOrEqual(f.x + 1);
    }
    await page.locator('#marmaille-fast').tap();
    await expect(page.locator('#marmaille-fast')).toHaveAttribute('aria-pressed', 'true');
    expect((await page.evaluate(() => window.__MARMAILLE_TEST__?.read()))?.fast).toBe(true);
});

// Phone window under Chrome's bar (360 × 430) and a short phone (390 × 664): the game takes the width, the field stays
// under the DOM counters and the pause, the role buttons under the canvas, and a tap still hands a role to a kid.
type Box = { x: number; y: number; w: number; h: number };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
for (const [width, height] of [[360, 430], [390, 664]] as const) for (const level of [0, 29]) test(`MA-FILL ${String(width)}×${String(height)} niveau ${String(level + 1)} : le jeu prend la largeur, le terrain sous les compteurs`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'téléphone');
    await page.setViewportSize({ width, height });
    await open(page); await play(page);
    await page.evaluate(level => { window.__MARMAILLE_TEST__?.loadLevel(level); }, level);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    expect.soft(canvas.width, 'largeur du jeu ≥ 90 % de la fenêtre').toBeGreaterThanOrEqual(0.9 * width);
    const u = await page.evaluate(() => window.__MARMAILLE_TEST__?.usefulArea()); if (!u) throw new Error('zone');
    // usefulArea is in game pixels: canvas pixels for a full-screen game, the 360 × 640 world otherwise.
    const k = canvas.width / await page.evaluate(() => (window.__MARMAILLE_TEST__ as { rects?: () => { width: number } } | undefined)?.rects?.().width ?? 360);
    const field: Box = { x: canvas.x + u.x * k, y: canvas.y + u.y * k, w: u.width * k, h: u.height * k };
    expect.soft(field.x).toBeGreaterThanOrEqual(canvas.x - 0.5); expect.soft(field.x + field.w).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
    expect.soft(field.y + field.h).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
    for (const selector of ['#hud', '#pause']) {
        const b = await page.locator(selector).boundingBox(); if (!b || !b.width) continue;
        expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, field), `${selector} × terrain`).toBe(false);
    }
    for (const b0 of await page.locator('#touch-controls button').all()) {
        const b = await b0.boundingBox(); if (!b || !b.width) continue;
        expect.soft(b.width).toBeGreaterThanOrEqual(56); expect.soft(b.height).toBeGreaterThanOrEqual(56);
        expect.soft(b.x + b.width).toBeLessThanOrEqual(width + 0.5); expect.soft(b.y + b.height).toBeLessThanOrEqual(height + 0.5);
        expect.soft(meets({ x: b.x, y: b.y, w: b.width, h: b.height }, { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height }), 'bouton hors du canevas').toBe(false);
    }
});
