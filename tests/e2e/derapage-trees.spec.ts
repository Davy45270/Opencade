import { test, expect, mobilePlay } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/derapage/scene';
test.setTimeout(90_000);
/** Screenshot of a rectangle of the 360×640 canvas, in game pixels. */
async function shot(page: Page, name: string, x: number, y: number, width: number, height: number): Promise<void> {
    const box = await page.locator('#game canvas').boundingBox(); expect(box).not.toBeNull();
    const s = (box?.width ?? 360) / 360;
    await page.screenshot({ path: `test-results/screenshots/derapage-trees-${name}.png`, clip: { x: (box?.x ?? 0) + x * s, y: (box?.y ?? 0) + y * s, width: width * s, height: height * s } });
}
/** Loads a circuit and puts the player 14 units before its middle tree, facing it; returns the drawn tree keys. */
async function nearTree(page: Page, level: number): Promise<string[]> {
    return page.evaluate((level) => {
        const hook = window.__DERAPAGE_TEST__;
        hook?.loadLevel(level, 28); hook?.advance(0);
        const trees = hook?.read().track.trees ?? [], tree = trees[Math.floor(trees.length / 2)];
        if (tree) hook?.pose(0, tree.x - 14, tree.y, 0);
        return hook?.read().treeViews ?? [];
    }, level);
}
const essence = (key: string): string => key.replace(/_(side|side_far|top)$/, '');
// Circuit index -> essences of its ambiance: meadows, Ardennes forest, coast.
const cases: [number, string, string[]][] = [[5, 'pres', ['feuillu', 'cerisier']], [16, 'ardennes', ['sapin', 'feuillu']], [27, 'cote', ['palmier']]];
test('Z44 arbres dessinés par David : essences selon l’ambiance, vue de dessus d’en haut, vue de côté en 3D', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.goto('/?test=1#/derapage');
    await page.waitForFunction(() => Boolean(window.__DERAPAGE_TEST__));
    await page.locator('#resume').click();
    // The tree chunk arrives on its own: wait for a drawn tree from above.
    await nearTree(page, 5);
    await page.waitForFunction(() => (window.__DERAPAGE_TEST__?.read().treeViews.length ?? 0) > 0);
    for (const [level, name, expected] of cases) {
        const keys = await nearTree(page, level);
        expect(keys.length).toBeGreaterThan(0);
        expect(keys.every(k => k.endsWith('_top'))).toBe(true);
        expect(keys.map(essence).every(e => expected.includes(e))).toBe(true);
        await shot(page, `${name}-dessus`, 60, 250, 240, 240);
    }
    const menu = page.locator('#pause'), mobile = await mobilePlay(page);
    if (mobile) await menu.click();
    await page.locator('#derapage-view').click();
    if (mobile) await menu.click();
    await page.waitForFunction(() => window.__DERAPAGE_TEST__?.view().active === '3d');
    for (const [level, name, expected] of cases) {
        const keys = await nearTree(page, level);
        expect(keys.length).toBeGreaterThan(0);
        expect(keys.every(k => /_side(_far)?$/.test(k))).toBe(true);
        expect(keys.map(essence).every(e => expected.includes(e))).toBe(true);
        await shot(page, `${name}-3d`, 0, 140, 360, 360);
    }
});
