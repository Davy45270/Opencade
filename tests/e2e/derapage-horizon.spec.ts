import { test, expect, mobilePlay } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/derapage/scene';
test.setTimeout(90_000);
/** Screenshot of the sky band and the road below, in game pixels. */
async function shot(page: Page, name: string): Promise<Buffer> {
    const box = await page.locator('#game canvas').boundingBox(); expect(box).not.toBeNull();
    const s = (box?.width ?? 360) / 360;
    return page.screenshot({ path: `test-results/screenshots/derapage-horizon-${name}.png`, clip: { x: box?.x ?? 0, y: (box?.y ?? 0) + 96 * s, width: 360 * s, height: 116 * s } });
}
/** Loads a circuit, turns the camera to `angle` and returns the horizon drawn in the sky. */
async function sky(page: Page, level: number, angle: number): Promise<{ key: string; x: number } | null> {
    return page.evaluate(([level, angle]) => {
        const hook = window.__DERAPAGE_TEST__;
        hook?.loadLevel(level, 28); hook?.advance(0);
        const p = hook?.read().karts[0];
        if (hook && p) hook.pose(0, p.x, p.y, angle);
        return hook?.read().horizon ?? null;
    }, [level, angle] as const);
}
// Circuit index -> horizon of its cup: meadows, Ardennes forest, Volcan Turbo.
const cases: [number, string][] = [[5, 'rapide'], [16, 'nature'], [26, 'volcan']];
test('Z45 horizon dessiné par David dans le ciel 3D : celui de la coupe, raccordé, qui défile avec le cap', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.goto('/?test=1#/derapage');
    await page.waitForFunction(() => Boolean(window.__DERAPAGE_TEST__));
    await page.locator('#resume').click();
    const menu = page.locator('#pause'), mobile = await mobilePlay(page);
    if (mobile) await menu.click();
    await page.locator('#derapage-view').click();
    if (mobile) await menu.click();
    await page.waitForFunction(() => window.__DERAPAGE_TEST__?.view().active === '3d');
    for (const [level, key] of cases) {
        // The horizon of the cup arrives in its own chunk: until then the flat sky stays.
        await sky(page, level, 0);
        await page.waitForFunction(k => window.__DERAPAGE_TEST__?.read().horizon?.key === k, key);
        const a = await sky(page, level, 0), b = await sky(page, level, .5);
        expect(a?.key).toBe(key);
        // 0.5 rad to the right moves the sky left by 0.5 × 1856 / 2π px (mod 928).
        expect((((a?.x ?? 0) - (b?.x ?? 0)) % 928 + 928) % 928).toBeCloseTo(.5 * 1856 / (2 * Math.PI), 3);
        // The join on screen: the left copy ends at x = 180 (the middle of the screen).
        const join = (928 - 180) * 2 * Math.PI / 1856;
        const c = await sky(page, level, join);
        expect((c?.x ?? 0) + 928).toBeCloseTo(180, 3);
        await shot(page, `${key}-joint`);
        const before = await shot(page, `${key}-cap-0`);
        expect(before.length).toBeGreaterThan(0);
    }
});
