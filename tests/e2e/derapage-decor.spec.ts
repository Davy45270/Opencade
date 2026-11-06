import { test, expect, mobilePlay } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/derapage/scene';
test.setTimeout(90_000);
/** Screenshot of a rectangle of the 360×640 canvas, in game pixels. */
async function shot(page: Page, name: string, x: number, y: number, width: number, height: number): Promise<void> {
    const box = await page.locator('#game canvas').boundingBox(); expect(box).not.toBeNull();
    const s = (box?.width ?? 360) / 360;
    await page.screenshot({ path: `test-results/screenshots/derapage-decor-${name}.png`, clip: { x: (box?.x ?? 0) + x * s, y: (box?.y ?? 0) + y * s, width: width * s, height: height * s } });
}
/** Loads a circuit and puts the player 16 units before the middle prop of `prefix`, down the road; returns the drawn prop keys. */
async function nearProp(page: Page, level: number, prefix: string): Promise<string[]> {
    return page.evaluate(([level, prefix]) => {
        const hook = window.__DERAPAGE_TEST__;
        hook?.loadLevel(level, 28); hook?.advance(0);
        // Find a drawn prop of that kind from above: pose on each point until one is in the frame.
        const points = hook?.read().track.points ?? [];
        for (let i = 0; i < points.length; i++) {
            const p = points[i], q = points[(i + 1) % points.length];
            if (!p || !q) continue;
            hook?.pose(0, p.x, p.y, Math.atan2(q.y - p.y, q.x - p.x));
            const keys = hook?.read().decorViews ?? [];
            if (keys.some(k => k.startsWith(prefix))) return keys;
        }
        return [];
    }, [level, prefix] as const);
}
// Circuit index -> the prop drawn by David: the city (barrier), the quays (barrier and crate), the technical cup (sign).
const cases: [number, string, string][] = [[1, 'ville', 'barriere'], [21, 'quais', 'caisse'], [9, 'technique', 'panneau']];
test('Z47 décors dessinés par David : barrière en ville, caisse sur les quais, panneau avant les virages, dans les deux vues', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.goto('/?test=1#/derapage');
    await page.waitForFunction(() => Boolean(window.__DERAPAGE_TEST__));
    await page.locator('#resume').click();
    // The prop chunk arrives on its own: wait for a drawn prop from above.
    await nearProp(page, 1, 'barriere');
    await page.waitForFunction(() => (window.__DERAPAGE_TEST__?.read().decorViews.length ?? 0) > 0);
    for (const [level, name, prefix] of cases) {
        const keys = await nearProp(page, level, prefix);
        expect(keys.some(k => k.startsWith(prefix))).toBe(true);
        expect(keys.every(k => /_dessus(_g)?$/.test(k))).toBe(true);
        await shot(page, `${name}-dessus`, 40, 250, 280, 280);
    }
    const menu = page.locator('#pause'), mobile = await mobilePlay(page);
    if (mobile) await menu.click();
    await page.locator('#derapage-view').click();
    if (mobile) await menu.click();
    await page.waitForFunction(() => window.__DERAPAGE_TEST__?.view().active === '3d');
    for (const [level, name, prefix] of cases) {
        const keys = await nearProp(page, level, prefix);
        expect(keys.some(k => k.startsWith(prefix))).toBe(true);
        expect(keys.some(k => /_dessus(_g)?$/.test(k))).toBe(false);
        await shot(page, `${name}-3d`, 0, 140, 360, 360);
    }
});
