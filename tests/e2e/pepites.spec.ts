import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Playwright loads specs as ES modules: read the fixture instead of importing JSON.
const route = JSON.parse(readFileSync('tests/fixtures/pepites-campaign.json', 'utf8')) as { pepites: string[][] };
import { MINES } from '../../src/engines/pepites/levels';
const read = (page: Page) => page.evaluate(() => window.__PEPITES_TEST__?.read());
const keys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' } as const;
test('P05 P12 mine 1 gagnée au clavier par la route enregistrée, sauvegarde et mine suivante', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/pepites');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    await page.evaluate(() => { window.__PEPITES_TEST__?.loadLevel(0, 484); window.__PEPITES_TEST__?.advance(0); });
    const turn = (MINES[0]?.turnFrames ?? 9) * 1000 / 60;
    for (const m of route.pepites[0] ?? []) {
        if (m !== 'wait') { await page.keyboard.down(keys[m as keyof typeof keys]); await page.keyboard.up(keys[m as keyof typeof keys]); }
        await page.evaluate(ms => { window.__PEPITES_TEST__?.advance(ms); }, turn);
    }
    expect((await read(page))?.status).toBe('won');
    await expect(page.locator('#next-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/pepites-won-${info.project.name}.png` });
});
test('P13 mise en page : mine entière visible, boutons de 56 px sous le canevas, HUD lisible', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/pepites');
    await expect.poll(() => page.evaluate(() => Boolean(window.__PEPITES_TEST__))).toBe(true);
    if (mobile) await page.locator('#resume').tap(); else await page.locator('#resume').click();
    for (const level of [0, 3, 5, 8, 11]) {
        await page.evaluate(i => { window.__PEPITES_TEST__?.loadLevel(i, 484); window.__PEPITES_TEST__?.advance(0); }, level);
        expect(await page.evaluate(() => window.__PEPITES_TEST__?.hudText() ?? '')).toContain(`MINE ${String(level + 1)}/30`);
        await page.screenshot({ path: `test-results/screenshots/pepites-mine-${String(level + 1)}-${info.project.name}.png` });
    }
    if (mobile) {
        const canvas = await page.locator('#game canvas').boundingBox();
        for (const id of ['left', 'up', 'down', 'right', 'special']) {
            const b = await page.locator(`#pepites-${id}`).boundingBox();
            expect(b?.width).toBeGreaterThanOrEqual(56); expect(b?.height).toBeGreaterThanOrEqual(56);
            expect(b?.y ?? 0).toBeGreaterThanOrEqual((canvas?.y ?? 0) + (canvas?.height ?? 0) - 1);
        }
    }
});
