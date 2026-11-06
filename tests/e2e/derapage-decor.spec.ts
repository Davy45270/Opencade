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
/** Loads the first circuit with boost strips and puts the player 14 units before the first one; returns the ramp keys. */
async function nearRamp(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const hook = window.__DERAPAGE_TEST__;
        for (let level = 0; level < 30; level++) {
            hook?.loadLevel(level, 28); hook?.advance(0);
            const track = hook?.read().track, b = track?.boosts[0];
            if (!track || !b) continue;
            const p = track.points[b.index], q = track.points[(b.index + 1) % track.points.length];
            if (!p || !q) continue;
            const a = Math.atan2(q.y - p.y, q.x - p.x);
            hook.pose(0, p.x - Math.cos(a) * 14, p.y - Math.sin(a) * 14, a);
            return hook.read().rampViews;
        }
        return [];
    });
}
// Circuit index -> the prop drawn by David: the city (barrier), the quays (barrier and crate), the technical cup (sign),
// the tight bends (tyre walls, Z48).
const cases: [number, string, string][] = [[1, 'ville', 'barriere'], [21, 'quais', 'caisse'], [9, 'technique', 'panneau'], [4, 'pneus', 'pneus']];
test('Z47-Z48 décors dessinés par David : barrière, caisse, panneaux, murs de pneus et rampes d\'accélération, dans les deux vues', async ({ page }, info) => {
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
    // David's ramps in place of the green boost strips (Z48): one top view per tile.
    const top = await nearRamp(page);
    expect(top.length).toBeGreaterThan(0);
    expect(top.every(k => k === 'rampe')).toBe(true);
    await shot(page, 'rampe-dessus', 40, 250, 280, 280);
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
    // In 3D its four quarters, laid on the ground.
    const quarters = new Set(await nearRamp(page));
    expect([...quarters].sort()).toEqual(['rampe_0', 'rampe_1', 'rampe_2', 'rampe_3']);
    await shot(page, 'rampe-3d', 0, 140, 360, 360);
});
