import { test, expect } from './fixture';
const cast = [
    ['panda', 'Panda glouton'], ['pandaroux', 'Panda roux joueur et câlin'], ['dragon', 'Dragon assidu'],
    ['singe', 'Singe en tutu'], ['licorne', 'Licorne joueuse'],
] as const;

test('Characters: real selection, persistence and animated pixels within 600 ms', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?test=1#/');
    await page.evaluate(() => { localStorage.setItem('arcade-lab:sound:v1', 'off'); });
    for (const [id, name] of cast) {
        const toggle = page.locator('#character-toggle');
        if (isMobile) await toggle.tap(); else await toggle.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        const preview = page.locator(`[data-character-preview="${id}"]`);
        await preview.scrollIntoViewIfNeeded();
        // Pixel comparison stays in-page, so transport latency cannot hide the 600 ms budget.
        const ms = await preview.evaluate(async (element: HTMLCanvasElement) => {
            const initial = element.toDataURL(); const start = performance.now();
            return await new Promise<number>(resolve => {
                const sample = (): void => {
                    const elapsed = performance.now() - start;
                    if (element.toDataURL() !== initial) { resolve(elapsed); return; }
                    if (elapsed >= 600) { resolve(elapsed); return; }
                    requestAnimationFrame(sample);
                };
                requestAnimationFrame(sample);
            });
        });
        expect(ms).toBeLessThan(600);
        if (isMobile) await preview.tap(); else await preview.hover();
        const choose = page.getByRole('button', { name: `Choisir ${name}`, exact: true });
        const box = await choose.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(48); expect(box?.width).toBeGreaterThanOrEqual(48);
        if (isMobile) await choose.tap(); else await choose.click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await page.reload();
        await expect(toggle).toHaveAttribute('data-selected-character', id);
        await expect(toggle).toHaveAttribute('aria-label', `Personnage : ${name}`);
        expect(await page.evaluate(() => localStorage.getItem('arcade-lab:character:v1'))).toBe(id);
        expect(await page.evaluate(() => localStorage.getItem('arcade-lab:sound:v1'))).toBe('off');
    }
});

test('Characters: keyboard, reduced motion and review captures', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?test=1#/');
    const toggle = page.locator('#character-toggle');
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Fermer le choix du personnage' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Choisir Panda glouton', exact: true })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    const preview = page.locator('[data-character-preview="panda"]');
    const before = await preview.evaluate((e: HTMLCanvasElement) => e.toDataURL());
    await preview.hover(); await page.waitForTimeout(320);
    expect(await preview.evaluate((e: HTMLCanvasElement) => e.toDataURL())).toBe(before);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(preview).toHaveAttribute('data-motion', 'full');
    await expect(preview).toHaveAttribute('data-animation', 'special');
    await page.locator('#characters-panel').screenshot({ path: testInfo.outputPath('characters-panel.png') });
    await page.locator('#character-review summary').click();
    // Export sheets in ordinary page flow so mobile captures include every figure,
    // without clipping by the modal's scroll viewport. Drawings remain untouched.
    await page.locator('#characters-panel').evaluate((e: HTMLDialogElement) => {
        e.close(); e.setAttribute('open', '');
        Object.assign(e.style, { position: 'relative', maxHeight: 'none', overflow: 'visible', width: '100%', margin: '0', inset: 'auto' });
        const main = document.querySelector('main'); if (main) main.hidden = true;
        for (const child of e.children) if (child.id !== 'character-review') (child as HTMLElement).hidden = true;
    });
    for (const [id] of cast) for (const kind of ['poses', 'expressions', 'special']) {
        const sheet = page.locator(`[data-sheet="${id}-${kind}"]`);
        await page.locator('.character-sheet').evaluateAll((elements, target) => { for (const e of elements) (e as HTMLElement).hidden = (e as HTMLElement).dataset.sheet !== target; }, `${id}-${kind}`);
        await sheet.scrollIntoViewIfNeeded();
        await expect(sheet.locator('canvas')).toHaveCount(kind === 'poses' ? 3 : kind === 'expressions' ? 5 : 1);
        for (const c of await sheet.locator('canvas').all()) expect((await c.boundingBox())?.height).toBeGreaterThanOrEqual(160);
        if (kind === 'special') {
            await expect(sheet.locator('canvas')).toHaveAttribute('data-animation', 'special');
            await expect(sheet.locator('canvas')).toHaveAttribute('data-motion', 'full');
        }
        await sheet.screenshot({ path: testInfo.outputPath(`character-${id}-${kind}.png`) });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('Characters: hover/touch changes rest pixels to special at the same instant', async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto('/?test=1#/');
    await page.locator('#character-toggle').click();
    for (const [id] of cast) {
        const preview = page.locator(`[data-character-preview="${id}"]`);
        await preview.scrollIntoViewIfNeeded();
        await preview.locator('..').dispatchEvent('pointerleave');
        await expect(preview).toHaveAttribute('data-animation', 'repos');
        const rest = await preview.evaluate((e: HTMLCanvasElement) => e.toDataURL());
        if (isMobile) await preview.tap(); else { await page.mouse.move(0, 0); await preview.hover(); }
        await expect(preview).toHaveAttribute('data-animation', 'special');
        expect(await preview.evaluate((e: HTMLCanvasElement) => e.toDataURL())).not.toBe(rest);
    }
});

test('Characters: button sizes, live motion preference and home shutdown', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?test=1#/');
    const toggle = page.locator('#character-toggle');
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox?.width).toBeGreaterThanOrEqual(48); expect(toggleBox?.height).toBeGreaterThanOrEqual(48);
    await toggle.click();
    const closeBox = await page.getByRole('button', { name: 'Fermer le choix du personnage' }).boundingBox();
    expect(closeBox?.width).toBeGreaterThanOrEqual(48); expect(closeBox?.height).toBeGreaterThanOrEqual(48);
    const preview = page.locator('[data-character-preview="dragon"]');
    await preview.hover();
    await expect(preview).toHaveAttribute('data-animation', 'special');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(preview).toHaveAttribute('data-motion', 'reduce');
    const frozen = await preview.evaluate((e: HTMLCanvasElement) => ({ pixels: e.toDataURL(), paints: e.dataset.paintCount }));
    await page.waitForTimeout(160);
    expect(await preview.evaluate((e: HTMLCanvasElement) => ({ pixels: e.toDataURL(), paints: e.dataset.paintCount }))).toEqual(frozen);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(preview).toHaveAttribute('data-motion', 'full');
    await expect.poll(() => preview.getAttribute('data-paint-count')).not.toBe(frozen.paints);
    const detached = await preview.elementHandle();
    await page.evaluate(() => { location.hash = '#/bubble'; });
    await expect(page.locator('#characters-panel')).toHaveCount(0);
    await expect(toggle).toBeHidden();
    const count = await detached.evaluate(e => e.dataset.paintCount);
    await page.waitForTimeout(160);
    expect(await detached.evaluate(e => e.dataset.paintCount)).toBe(count);
});
