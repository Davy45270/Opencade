import { test, expect } from './fixture';
import type {} from '../../src/games/derapage/scene';
import { ids } from '../../src/characters/model';

for (const [index, id] of ids.entries()) {
    test(`habillage-derapage-${id}`, async ({ page }, info) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(id => {
            localStorage.setItem('arcade-lab:character:v1', id);
            localStorage.setItem('arcade-lab:sound:v1', 'off');
        }, id);
        await page.goto('/?test=1#/derapage');
        await page.locator('#resume').click();
        await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(0, 28); });
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().character.id)).toBe(id);
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.art())).toContain(`arcade-vector-75-kart-${id}-concentre`);
        await page.locator('#game canvas').screenshot({ path: info.outputPath(`habillage-derapage-${id}.png`) });
    });
    test(`habillage-bubble-${id}`, async ({ page }, info) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(id => {
            localStorage.setItem('arcade-lab:character:v1', id);
            localStorage.setItem('arcade-lab:sound:v1', 'off');
        }, id);
        await page.goto('/?test=1#/bubble');
        await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__)), { timeout: 1000 }).toBe(true);
        await page.evaluate(index => {
            const hook = window.__BUBBLE_TEST__;
            if (!hook) throw new Error('Scène absente');
            hook.loadLevel(index * 6, 28);
            hook.load(Array.from({ length: 24 }, (_, i) => ({ row: Math.floor(i / 8), col: i % 8, color: (i % 6) as 0 | 1 | 2 | 3 | 4 | 5 })), 0, 28);
        }, index);
        expect(await page.evaluate(() => window.__BUBBLE_TEST__?.read().character.id)).toBe(id);
        const art = await page.evaluate(() => window.__BUBBLE_TEST__?.art());
        expect(art).toContain(`arcade-vector-75-launcher-${id}-face-concentre`);
        for (let color = 0; color < 6; color++) expect(art).toContain(`arcade-vector-75-bubble-${id}-${String(color)}`);
        await page.locator('#game canvas').screenshot({ path: info.outputPath(`habillage-bubble-${id}.png`) });
    });
}
