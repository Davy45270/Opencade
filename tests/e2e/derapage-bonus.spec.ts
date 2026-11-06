import { test, expect, mobilePlay } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/derapage/scene';
test.setTimeout(90_000);
/** Screenshot of a square of the 360×640 canvas, in game pixels. */
async function shot(page: Page, name: string, x: number, y: number, size: number): Promise<void> {
    const box = await page.locator('#game canvas').boundingBox(); expect(box).not.toBeNull();
    const s = (box?.width ?? 360) / 360;
    await page.screenshot({ path: `test-results/screenshots/derapage-bonus-${name}.png`, clip: { x: (box?.x ?? 0) + x * s, y: (box?.y ?? 0) + y * s, width: size * s, height: size * s } });
}
/** Puts the player on the ground `back` units behind a point, facing it (heading .35), and draws one frame. */
async function behind(page: Page, q: { x: number; y: number }, back: number): Promise<void> {
    await page.evaluate(({ x, y, back }) => { window.__DERAPAGE_TEST__?.pose(0, x - Math.cos(.35) * back, y - Math.sin(.35) * back, .35); }, { x: q.x, y: q.y, back });
}
test('Z43 bonus dessinés par David : capsule sur la piste, icône commune du bonus ramassé, nuage farceur en vue de dessus et en 3D', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.goto('/?test=1#/derapage');
    await page.waitForFunction(() => Boolean(window.__DERAPAGE_TEST__));
    await page.locator('#resume').click();
    await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(0, 28); window.__DERAPAGE_TEST__?.advance(0); });
    const crates = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().crates.map(c => ({ x: c.x, y: c.y })) ?? []);
    expect(crates.length).toBeGreaterThan(3);
    const first = crates[0] ?? { x: 0, y: 0 };
    // The bonus chunk arrives on its own: wait for the capsule on the road (top view).
    await behind(page, first, 6);
    await page.waitForFunction(() => window.__DERAPAGE_TEST__?.read().bonusViews.includes('capsule_top'));
    const capsule = await page.evaluate(() => { const s = window.__DERAPAGE_TEST__?.read(), p = s?.karts[0], c = s?.crates[0]; return p && c ? { x: 180 + (c.x - p.x) * 5, y: 368 + (c.y - p.y) * 5 } : null; });
    // Camera turns with the kart in the default (rotating) view: frame the kart and the box together.
    expect(capsule).not.toBeNull();
    await shot(page, 'capsule-dessus', 120, 300, 120);
    // Each box picked up: the hand shows its bonus as the same drawn icon (turbo, spring, puddle, bubble), then it is used.
    const seen = new Set<string>();
    for (let round = 0; round < 80 && seen.size < 4; round++) {
        const crate = crates[round % crates.length] ?? first;
        if (round && round % crates.length === 0) await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(5000); });
        await page.evaluate(({ x, y }) => { window.__DERAPAGE_TEST__?.pose(0, x, y, .35); window.__DERAPAGE_TEST__?.advance(17); }, crate);
        const s = await page.evaluate(() => { const r = window.__DERAPAGE_TEST__?.read(); return { item: r?.karts[0]?.item ?? null, held: r?.heldBonus ?? null, views: r?.bonusViews ?? [] }; });
        if (!s.item) continue;
        expect(s.held).toBe(`icon_${s.item}`);
        expect(s.views).toContain(`icon_${s.item}`);
        if (!seen.has(s.item)) { seen.add(s.item); await shot(page, `en-main-${s.item}`, 300, 96, 56); }
        if (s.item === 'flaque') {
            // Kept for the trap check below: dropped behind the kart, then seen from above.
            await page.keyboard.down('KeyX'); await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(17); }); await page.keyboard.up('KeyX');
            const puddle = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().puddles.find(p => p.owner === 0) ?? null);
            expect(puddle).not.toBeNull();
            await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(0); });
            expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().bonusViews)).toContain('cloud_top');
            await shot(page, 'nuage-dessus', 120, 300, 120);
        } else {
            await page.keyboard.down('KeyX'); await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(17); }); await page.keyboard.up('KeyX');
        }
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.item ?? null)).toBeNull();
    }
    expect([...seen].sort()).toEqual(['bulle', 'flaque', 'ressort', 'turbo']);
    // 3D view: the capsule and the cloud stand as panels facing the camera.
    const menu = page.locator('#pause'), mobile = await mobilePlay(page);
    if (mobile) await menu.click();
    await page.locator('#derapage-view').click();
    if (mobile) await menu.click();
    await page.waitForFunction(() => window.__DERAPAGE_TEST__?.view().active === '3d');
    await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(5000); window.__DERAPAGE_TEST__?.loadLevel(0, 28); window.__DERAPAGE_TEST__?.advance(0); });
    await behind(page, first, 12);
    const views3d = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().bonusViews ?? []);
    expect(views3d.some(v => v === 'capsule' || v === 'capsule_far')).toBe(true);
    await shot(page, 'capsule-3d', 120, 280, 120);
    // A cloud dropped by the player, seen from behind in 3D.
    for (let round = 0; round < 80; round++) {
        const crate = crates[round % crates.length] ?? first;
        if (round && round % crates.length === 0) await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(5000); });
        await page.evaluate(({ x, y }) => { window.__DERAPAGE_TEST__?.pose(0, x, y, .35); window.__DERAPAGE_TEST__?.advance(17); }, crate);
        const item = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.item ?? null);
        if (!item) continue;
        await page.keyboard.down('KeyX'); await page.evaluate(() => { window.__DERAPAGE_TEST__?.advance(17); }); await page.keyboard.up('KeyX');
        if (item === 'flaque') break;
    }
    const puddle = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().puddles.find(p => p.owner === 0) ?? null);
    expect(puddle).not.toBeNull();
    await behind(page, puddle ?? first, 8);
    const views = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().bonusViews ?? []);
    expect(views.some(v => v === 'icon_flaque' || v === 'icon_flaque_small')).toBe(true);
    await shot(page, 'nuage-3d', 120, 280, 120);
});
