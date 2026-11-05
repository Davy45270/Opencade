import { test, expect } from './fixture';

// Essaim on touch screens: two powers with a gauge ring (Écu, Charge), a bare steering pad,
// lives and score in the HUD corners, no weapon/signature text left on screen.
for (const viewport of [{ width: 405, height: 480 }, { width: 412, height: 780 }, { width: 780, height: 412 }]) test(`ET01 Essaim au doigt ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await page.goto('/?test=1#/essaim');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ESSAIM_TEST__))).toBe(true);
    await page.locator('#resume').tap();
    const controls = await page.evaluate(() => [...document.querySelectorAll('#touch-controls button, #touch-controls label')].filter(e => e.getClientRects().length > 0).map(e => e.id).sort());
    expect(controls).toEqual(['essaim-fire', 'essaim-special']);
    for (const selector of ['#essaim-fire', '#essaim-special']) await expect(page.locator(selector)).toHaveAttribute('data-ring', /^[01]\.\d\d$/);
    await expect(page.locator('#essaim-special')).toHaveAttribute('data-ring', '1.00');
    // The canvas text (weapons, signature) is not drawn; the DOM HUD holds lives and score.
    expect(await page.evaluate(() => window.__ESSAIM_TEST__?.hudShown())).toBe(false);
    expect(await page.locator('body').innerText()).not.toMatch(/Rayon|Onde|Signature/);
    const hud = await page.evaluate(() => {
        const box = (e: Element | null) => { const r = e?.getBoundingClientRect(); return { x: r?.x ?? 0, y: r?.y ?? 0, w: r?.width ?? 0, h: r?.height ?? 0 }; };
        return {
            sizes: [...document.querySelectorAll('#hud .hud-value')].map(e => parseFloat(getComputedStyle(e).fontSize)),
            lives: box(document.querySelector('#hud .left .hud-value')), score: box(document.querySelector('#hud .right .hud-value')),
            canvas: box(document.querySelector('#game canvas')), vw: innerWidth,
        };
    });
    for (const size of hud.sizes) expect(size).toBeGreaterThanOrEqual(18);
    expect(hud.lives.x).toBeLessThan(hud.vw / 3);
    expect(hud.score.x + hud.score.w).toBeGreaterThan(hud.vw * 2 / 3);
    for (const item of [hud.lives, hud.score]) expect(item.y + item.h).toBeLessThanOrEqual(hud.canvas.y + 1);
    // No button for steering: the left zone shows nothing, and the ship moves by the finger's travel
    // from where it landed (landing off-centre does not jump).
    expect(await page.locator('#essaim-steer').evaluate(e => ({ text: e.textContent, border: getComputedStyle(e.querySelector('.steer-zone') ?? e).borderStyle }))).toEqual({ text: '', border: 'none' });
    const before = (await page.evaluate(() => window.__ESSAIM_TEST__?.read()))?.cannon ?? 0;
    const pad = await page.locator('#essaim-steer').boundingBox();
    const field = await page.locator('#game canvas').boundingBox();
    if (!pad || !field) throw new Error('Zone absente');
    const cdp = await page.context().newCDPSession(page);
    const y = pad.y + pad.height / 2, x = pad.x + pad.width * .2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    expect((await page.evaluate(() => window.__ESSAIM_TEST__?.read()))?.target).toBeCloseTo(before, -0.3);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 30, y }] });
    expect((await page.evaluate(() => window.__ESSAIM_TEST__?.read()))?.target).toBeCloseTo(before + 30 * 360 / field.width, -0.3);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
});
