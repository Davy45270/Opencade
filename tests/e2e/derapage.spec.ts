import { test, expect } from './fixture';
test('Z08 Z09 podium, défaite, progression, commandes réelles et HUD séparé', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    const activate = async (selector: string) => { if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click(); };
    const driveGate = async () => {
        if (mobile) {
            const b = await page.locator('#derapage-right').boundingBox(); if (!b) throw new Error('Bouton absent');
            const cdp = await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 32, y: b.y + 32 }] });
            await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1500));
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
        } else {
            await page.keyboard.down('ArrowRight'); await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1500)); await page.keyboard.up('ArrowRight');
        }
    };
    await page.goto('/?test=1#/derapage');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.derapage))).toBe(true);
    await activate('#resume'); await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(0));
    const bounds = await page.evaluate(() => window.__DERAPAGE_TEST__?.bounds()); if (!bounds) throw new Error('Boîtes absentes');
    expect(bounds.hud.height).toBeGreaterThan(40);
    expect(bounds.hud.y + bounds.hud.height).toBeLessThanOrEqual(bounds.forward.y);
    const canvas = await page.locator('canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    for (const button of await page.locator('#touch-controls button').all()) {
        const b = await button.boundingBox(); if (b) { expect(b.width).toBeGreaterThanOrEqual(64); expect(b.height).toBeGreaterThanOrEqual(64); expect(b.y >= canvas.y + canvas.height || b.y + b.height <= canvas.y).toBe(true); }
    }
    await page.screenshot({ path: `test-results/screenshots/derapage-play-${info.project.name}.png` });
    // The scenario is a legal last-gate state, still requiring the kart to drive across it.
    await page.evaluate(() => window.__DERAPAGE_TEST__?.scenario('finish'));
    await driveGate();
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().status)).toBe('won'); await expect(page.locator('#next-level')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__DERAPAGE_TEST__?.hudText())).toContain('COUPE 1/4');
    await page.screenshot({ path: `test-results/screenshots/derapage-won-${info.project.name}.png` });
    await activate('#next-level'); expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().level)).toBe(1);
    await page.reload(); await expect(page.locator('#resume')).toBeVisible(); await activate('#resume');
    if (mobile) await activate('#game-menu-toggle'); await activate('#levels'); await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await activate('#close-levels');
    await page.evaluate(() => window.__DERAPAGE_TEST__?.scenario('danger'));
    await driveGate();
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().status)).toBe('lost'); await expect(page.locator('#retry-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/derapage-lost-${info.project.name}.png` });
    await activate('#retry-level'); expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().status)).toBe('playing');
    await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(29, 28); window.__DERAPAGE_TEST__?.advance(0); });
    await page.screenshot({ path: `test-results/screenshots/derapage-level30-${info.project.name}.png` });
});
test('Z02 Z03 maintien tactile ou clavier et absence de crochet en production', async ({ page }, info) => {
    await page.goto('/?test=1#/derapage');
    if (info.project.name === 'mobile-chromium') await page.locator('#resume').tap(); else await page.locator('#resume').click();
    await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(2000));
    const before = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.angle);
    if (info.project.name === 'mobile-chromium') {
        const right = await page.locator('#derapage-right').boundingBox(), drift = await page.locator('#derapage-drift').boundingBox(); if (!right || !drift) throw new Error('Boutons absents');
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x + 32, y: right.y + 32, id: 1 }, { x: drift.x + 32, y: drift.y + 32, id: 2 }] });
        await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(700));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else {
        await page.keyboard.down('ArrowRight'); await page.keyboard.down('Space'); await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(700)); await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
    }
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.angle)).not.toBe(before);
    await page.goto('/#/derapage'); await expect(page.locator('canvas')).toBeVisible(); expect(await page.evaluate(() => window.__DERAPAGE_TEST__)).toBeUndefined();
});
