import { openGameMenu, test, expect } from './fixture';
import type { Page } from '@playwright/test';
async function read(page: Page) { return page.evaluate(() => window.__SERPENTIN_TEST__?.read()); }
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    if (mobile) {
        const box = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
        if (!box.width || !box.height) throw new Error(`Contrôle absent : ${selector}`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    } else await page.locator(selector).click();
}
async function expectPauseOutsideCanvas(page: Page): Promise<void> {
    const pause = await page.locator('#pause').boundingBox();
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!pause || !canvas) throw new Error('Pause ou canevas absent');
    expect(pause.width).toBeGreaterThanOrEqual(44);
    expect(pause.height).toBeGreaterThanOrEqual(44);
    const overlaps = pause.x < canvas.x + canvas.width && pause.x + pause.width > canvas.x
        && pause.y < canvas.y + canvas.height && pause.y + pause.height > canvas.y;
    expect(overlaps).toBe(false);
}
test('N03 N09 parcours victoire tactile ou clavier et sauvegarde', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/serpentin');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.serpentin))).toBe(true);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const initial = await read(page);
    await page.waitForTimeout(250); expect(await read(page)).toEqual(initial);
    await page.evaluate(() => { window.__SERPENTIN_TEST__?.scenario('finish'); });
    if (mobile) await tap(page, '#serpentin-up', true); else await page.keyboard.press('ArrowUp');
    await page.evaluate(() => { window.__SERPENTIN_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('won');
    await expect(page.locator('#result-title')).toContainText('réussi');
    await expect(page.locator('#next-level')).toBeVisible();
    expect((await read(page))?.cumulativeScore).toBe(80);
    expect((await read(page))?.segments).toHaveLength(11);
    await page.screenshot({ path: `test-results/screenshots/serpentin-won-${info.project.name}.png` });
    await tap(page, '#next-level', mobile);
    expect((await read(page))?.level).toBe(1);
    await expectPauseOutsideCanvas(page);
    await page.screenshot({ path: `test-results/screenshots/serpentin-play-${info.project.name}.png` });
    await page.reload();
    await expect(page.locator('#resume')).toBeVisible(); await tap(page, '#resume', mobile);
    await tap(page, '#levels', mobile);
    await expect(page.locator('#level-list button')).toHaveCount(30);
    await expect(page.locator('#level-list button').nth(1)).toBeEnabled();
    await tap(page, '#close-levels', mobile);
    await tap(page, '#pause', mobile);
    const paused = await read(page); await page.waitForTimeout(250); expect(await read(page)).toEqual(paused);
});
test('N05 défaite par entrée réelle puis rejouer, glisser et pause', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/serpentin');
    await expect.poll(() => page.evaluate(() => Boolean(window.__SERPENTIN_TEST__))).toBe(true);
    await page.evaluate(() => { window.__SERPENTIN_TEST__?.scenario('wall'); });
    if (mobile) {
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 180 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 140 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await client.detach();
    } else await page.keyboard.press('KeyW');
    await page.evaluate(() => { window.__SERPENTIN_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    await expect(page.locator('#retry-level')).toBeVisible();
    expect((await read(page))?.cumulativeScore).toBe(0);
    await page.screenshot({ path: `test-results/screenshots/serpentin-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile);
    await expect.poll(async () => (await read(page))?.status).toBe('playing');
    expect((await read(page))?.score).toBe(0);
    await tap(page, '#pause', mobile);
    const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
});

test('N09 niveau 30 et mise en page', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await page.goto('/?test=1#/serpentin');
    await expect.poll(() => page.evaluate(() => Boolean(window.__SERPENTIN_TEST__))).toBe(true);
    await tap(page, '#resume', mobile); await tap(page, '#pause', mobile);
    await page.evaluate(() => { window.__SERPENTIN_TEST__?.loadLevel(29, 454); });
    await tap(page, '#pause', mobile);
    await expectPauseOutsideCanvas(page);
    await page.screenshot({ path: `test-results/screenshots/serpentin-level30-${info.project.name}.png` });
    if (mobile) {
        expect(await page.evaluate(() => (document.scrollingElement?.scrollHeight ?? 0) <= innerHeight)).toBe(true);
        const canvas = await page.locator('#game canvas').boundingBox();
        expect(canvas?.y).toBeGreaterThanOrEqual(56);
        expect(canvas?.x).toBeGreaterThanOrEqual(0);
        expect((canvas?.x ?? 0) + (canvas?.width ?? 0)).toBeLessThanOrEqual(390);
        for (const id of ['up', 'down', 'left', 'right']) {
            const box = await page.locator(`#serpentin-${id}`).boundingBox();
            expect(box?.y).toBeGreaterThanOrEqual((canvas?.y ?? 0) + (canvas?.height ?? 0));
            expect(box?.width).toBeGreaterThanOrEqual(56); expect(box?.height).toBeGreaterThanOrEqual(56);
            expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
        }
    }
});

// Pass 401: each introduction room renders its rule and names it in the HUD.
test('N10 salles d\'introduction : mécanisme visible et annoncé', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await page.goto('/?test=1#/serpentin');
    await expect.poll(() => page.evaluate(() => Boolean(window.__SERPENTIN_TEST__))).toBe(true);
    await tap(page, '#resume', mobile);
    for (const [level, tip] of [[3, /Portails/], [4, /chrono/], [7, /Écluses/], [11, /Luciole/], [15, /Flèches/], [20, /Ciseaux/], [25, /Sentinelles/]] as const) {
        await page.evaluate(index => { window.__SERPENTIN_TEST__?.loadLevel(index, 454); window.__SERPENTIN_TEST__?.advance(50); }, level);
        const hud = await page.evaluate(() => window.__SERPENTIN_TEST__?.hudText() ?? '');
        expect(hud).toContain(`NIVEAU ${String(level + 1)}`); expect(hud).toMatch(tip);
        if (level === 4) expect(hud).toMatch(/⏱ 35 s/);
        await page.screenshot({ path: `test-results/screenshots/serpentin-intro-${String(level + 1)}-${info.project.name}.png` });
    }
});

test('N14 écluses : ouverte, clignotante la dernière demi-seconde, puis fermée', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await page.goto('/?test=1#/serpentin');
    await expect.poll(() => page.evaluate(() => Boolean(window.__SERPENTIN_TEST__))).toBe(true);
    await tap(page, '#resume', mobile);
    // Salle 8 sur un plateau vidé de sa luciole : seules les écluses comptent (période 300, ouverture 180, phases 0/150/75).
    await page.evaluate(() => { window.__SERPENTIN_TEST__?.loadLevel(7, 454); window.__SERPENTIN_TEST__?.advance(0); });
    const at = async (ms: number) => { await page.evaluate(t => { window.__SERPENTIN_TEST__?.advance(t); }, ms); return page.evaluate(() => window.__SERPENTIN_TEST__?.marks()); };
    // Tick 1 : (1, 151, 76) mod 300 → ouverte, clignotante (≥ 150), ouverte. Tick 31 : (31, 181, 106) → la deuxième est fermée.
    expect(await at(1000 / 60)).toEqual({ open: 2, closing: 1, closed: 0 });
    expect(await at(30 * 1000 / 60)).toEqual({ open: 2, closing: 0, closed: 1 });
    await page.screenshot({ path: `test-results/screenshots/serpentin-ecluses-${info.project.name}.png` });
});
