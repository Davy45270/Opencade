import { test, expect, goHome, clickSound } from './fixture';

// Touch play shell: no bar, a fixed ⏸, one pause page with Reprendre at the bottom.
for (const viewport of [{ width: 412, height: 780 }, { width: 405, height: 480 }]) test(`PP01 coquille de jeu ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(true, 'PP01 joue sur Essaim, retenu hors du catalogue public jusqu’à sa correction.');
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await page.goto('/?test=1#/essaim');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.essaim))).toBe(true);
    // Nothing of the shell at the top but the ⏸, and no title.
    const top = await page.evaluate(() => [...document.querySelectorAll('#topbar *, #topbar')].filter(e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => e.id || e.tagName));
    expect(top.filter(id => !['topbar', 'pause', 'SPAN'].includes(id))).toEqual([]);
    await expect(page.locator('#topbar h1')).toBeHidden();
    const pause = await page.locator('#pause').boundingBox();
    if (!pause) throw new Error('⏸ absent');
    expect(pause.width).toBeGreaterThanOrEqual(44); expect(pause.height).toBeGreaterThanOrEqual(44);
    expect(pause.x + pause.width).toBeGreaterThan(viewport.width - 64); expect(pause.y).toBeLessThan(20);
    // The first touch starts play and reaches the game.
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!canvas) throw new Error('Canevas absent');
    await page.touchscreen.tap(canvas.x + canvas.width / 2, canvas.y + canvas.height * .9);
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('play-ready'))).toBe(false);
    // Pause page: whole viewport, Reprendre at the bottom, home and sound inside.
    await page.locator('#pause').tap();
    const veil = await page.locator('#pause-panel').boundingBox();
    const resume = await page.locator('#resume').boundingBox();
    if (!veil || !resume) throw new Error('Page de pause absente');
    expect(veil.width).toBeGreaterThanOrEqual(viewport.width - 1); expect(veil.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(resume.y + resume.height).toBeGreaterThan(viewport.height * .75);
    for (const selector of ['#levels', '#restart', '#game-menu [data-home]', '#game-menu #sound']) await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('#game-menu-toggle')).toBeHidden();
    expect(await page.evaluate(() => window.__ESSAIM_TEST__?.read().status)).toBe('playing');
    // Pressed state: a transform while the button is :active (forced through CDP, headless
    // touch does not hold :active long enough to be sampled), then the real tap resumes.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#resume' });
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
    await page.waitForTimeout(300);
    const pressed = await page.locator('#resume').evaluate(element => getComputedStyle(element).transform);
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    await cdp.detach();
    await page.locator('#resume').tap();
    expect(pressed).not.toBe('none');
    await expect(page.locator('#pause-panel')).toBeHidden();
    await clickSound(page);
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
    await clickSound(page);
    await goHome(page);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#topbar [data-home]')).toBeVisible();
    await expect(page.locator('#topbar #sound')).toBeVisible();
});
test('PP02 écran de fin : un seul bouton principal', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await page.evaluate(() => { window.__BUBBLE_TEST__?.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }], 0, 452); });
    await page.keyboard.press('Space');
    await page.evaluate(() => { window.__BUBBLE_TEST__?.advance(5000); });
    await expect(page.locator('#result')).toBeVisible();
    const primary = await page.locator('#result .primary:visible').count();
    expect(primary).toBe(1);
    for (const selector of ['#replay-level', '#result-levels', '#result [data-home]']) {
        const box = await page.locator(selector).boundingBox();
        if (!box) throw new Error(selector);
        expect(box.width).toBeGreaterThanOrEqual(56); expect(box.height).toBeGreaterThanOrEqual(56);
    }
});
