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
        x: canvas.x + board.x * canvas.width / 360,
        y: canvas.y + board.y * canvas.height / 640,
        width: board.width * canvas.width / 360,
        height: board.height * canvas.height / 640,
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
