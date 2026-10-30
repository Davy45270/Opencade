import { openGameMenu, test, expect, ready, load, read } from './fixture';

test('A01 registre accueil navigation et retour navigateur', async ({ page }, info) => {
    await page.goto('/?test=1#/');
    await expect(page).toHaveTitle('Opencade');
    const ids = await page.evaluate(() => Object.keys(window.__ARCADE_TEST__?.games ?? {}));
    expect(ids.length).toBeGreaterThan(0); expect(new Set(ids).size).toBe(ids.length);
    await expect(page.locator('#home')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/home-${info.project.name}.png` });
    await page.getByRole('button', { name: /Bubble Lab/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#game canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__ARCADE_TEST__?.current())).toBe('bubble');
    await page.screenshot({ path: `test-results/screenshots/bubble-in-arcade-${info.project.name}.png` });
    await page.locator('#topbar [data-home]').click();
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#game canvas')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(false);
    await page.goBack();
    await expect(page.locator('#game canvas')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await openGameMenu(page, '#levels'); await page.locator('#levels').click();
    await expect(page.locator('#level-select')).toBeVisible();
    await page.locator('#close-levels').click();
    await expect(page.locator('#level-select')).toBeHidden();
});
test('A02 A04 ouverture directe son global persistant', async ({ page }) => {
    await ready(page);
    await expect(page.locator('#game canvas')).toBeVisible();
    await expect(page.locator('#sound')).toHaveCount(1);
    await page.locator('#sound').click();
    await page.locator('#topbar [data-home]').click();
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() => { window.__ARCADE_TEST__?.open('bubble'); });
    await expect(page.locator('#game canvas')).toBeVisible();
});
test('A05 A06 sélecteur et panneaux communs', async ({ page }) => {
    await ready(page);
    await openGameMenu(page, '#levels'); await page.locator('#levels').click();
    await expect(page.locator('#level-list button')).toHaveCount(30);
    await expect(page.locator('#level-list button').nth(1)).toBeDisabled();
    await page.locator('#close-levels').click();
    await load(page, [{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }]);
    await page.locator('#close-levels').blur();
    await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect.poll(async () => (await read(page)).status).toBe('won');
    await expect(page.locator('#result-scores')).toContainText('Score du niveau : 30 · Score cumulé : 30');
    for (const selector of ['#next-level', '#replay-level', '#result-levels', '#result [data-home]']) await expect(page.locator(selector)).toBeVisible();
});
test('A07 mobile sans scroll et cibles tactiles accessibles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => (document.scrollingElement?.scrollHeight ?? 0) <= innerHeight + 1)).toBe(true);
    for (const button of await page.locator('button:visible').all()) {
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44); expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.y).toBeGreaterThanOrEqual(0);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
    }
    if (await page.locator('#touch-fire').isVisible()) {
        await load(page);
        await page.locator('#touch-fire').click();
        await expect.poll(async () => (await read(page)).shots).toBe(1);
    }
});
test('A08 aucun crochet sans paramètre', async ({ page }) => {
    await page.goto('/#/bubble');
    await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => [window.__ARCADE_TEST__, window.__BUBBLE_TEST__])).toEqual([undefined, undefined]);
});

test('A07b barre compacte et canevas mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    const bar = await page.locator('#topbar').boundingBox();
    const canvas = await page.locator('#game canvas').boundingBox();
    expect(bar?.height).toBeLessThanOrEqual(64);
    expect(canvas?.height).toBeGreaterThanOrEqual(844 * 0.6);
    for (const button of await page.locator('#topbar button:visible').all()) {
        const box = await button.boundingBox();
        expect(box?.y).toBeGreaterThanOrEqual(bar?.y ?? 0);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0));
    }
});

for (const id of ['derapage', 'traverse', 'alunir', 'serpentin', 'briqueterie', 'empilo', 'orbite', 'essaim', 'dedale', 'ferraille', 'bubble'] as const) {
    test(`A11 ${id} horloge manuelle, regroupement et pause`, async ({ page }) => {
        await page.goto(`/?test=1#/${id}`);
        await expect.poll(() => page.evaluate(id => Boolean(window.__ARCADE_TEST__?.games[id]), id)).toBe(true);
        if (id !== 'bubble') await page.locator('#resume').click();
        const states = await page.evaluate(id => {
            const hook = {
                derapage: window.__DERAPAGE_TEST__, traverse: window.__TRAVERSE_TEST__, alunir: window.__ALUNIR_TEST__, serpentin: window.__SERPENTIN_TEST__, briqueterie: window.__BRIQUETERIE_TEST__,
                empilo: window.__EMPILO_TEST__, orbite: window.__ORBITE_TEST__,
                essaim: window.__ESSAIM_TEST__, dedale: window.__DEDALE_TEST__,
                ferraille: window.__FERRAILLE_TEST__, bubble: window.__BUBBLE_TEST__,
            }[id];
            if (!hook) throw new Error('Crochet absent');
            hook.loadLevel(0, 461); hook.advance(1000);
            const whole = hook.read();
            hook.loadLevel(0, 461);
            for (let i = 0; i < 4; i++) hook.advance(250);
            const split = hook.read();
            let rejected = 0;
            for (const ms of [-1, NaN, Infinity]) {
                try { hook.advance(ms); } catch (error) { if (error instanceof RangeError) rejected++; else throw error; }
            }
            hook.advance(0);
            return { whole, split, zero: hook.read(), rejected };
        }, id);
        expect(states.rejected).toBe(3);
        expect(states.split).toEqual(states.whole);
        expect(states.zero).toEqual(states.split);
        await page.waitForTimeout(250);
        expect(await page.evaluate(id => window.__ARCADE_TEST__?.games[id]?.read(), id)).toEqual(states.zero);
        await expect(page.locator('#status')).toContainText('Score');
        if (id !== 'bubble') await page.locator('#pause').click();
        else { await openGameMenu(page, '#levels'); await page.locator('#levels').click(); }
        const paused = await page.evaluate(id => {
            const hook = window.__ARCADE_TEST__?.games[id] as { read(): unknown; advance(ms: number): void } | undefined;
            if (!hook) throw new Error('Crochet absent');
            const before = hook.read(); hook.advance(1000);
            return { before, after: hook.read() };
        }, id);
        expect(paused.after).toEqual(paused.before);
        if (id !== 'bubble') await expect(page.locator('#pause-title')).toHaveText('En pause');
        else await expect(page.locator('#level-select')).toBeVisible();
    });
}
