import type { CDPSession, Page } from '@playwright/test';
import { test, expect } from './fixture';

// Bubble's 130 levels: tabs of ten, opened on the tier of the next level, 44 px targets, a list that
// scrolls under the finger in portrait and landscape; and David's drawn marbles on the board.
const save = (unlocked: number) => JSON.stringify({ unlocked, best: 4200 });
async function swipe(cdp: CDPSession, x: number, y: number, dy: number): Promise<void> {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + i * dy / 12 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function openList(page: Page, unlocked: number): Promise<void> {
    await page.addInitScript(value => { localStorage.setItem('arcade-lab:bubble:v1', value); }, save(unlocked));
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await page.locator('#pause').tap();
    await page.locator('#levels').tap();
    await expect(page.locator('#level-select')).toBeVisible();
}
const level = (page: Page, n: number) => page.locator('#level-list button').nth(n - 1);

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) test(`BL01 paliers de dix, niveau 125 au doigt ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await openList(page, 126);
    // Thirteen named tiers; the list opens on the tier of the next level to play (126).
    const tabs = page.locator('#level-tiers [role="tab"]');
    await expect(tabs).toHaveCount(13);
    await expect(tabs.nth(3)).toHaveAccessibleName('Niveaux 31 à 40 · Jungle');
    await expect(page.locator('#level-tiers [aria-selected="true"]')).toHaveAccessibleName('Niveaux 121 à 130 · Ciel profond');
    await expect(level(page, 126)).toBeVisible(); await expect(level(page, 1)).toBeHidden();
    // 44 px targets, tabs and levels alike.
    const small = await page.evaluate(() => [...document.querySelectorAll('#level-tiers button, #level-list button')].filter(e => e.getClientRects().length > 0)
        .map(e => e.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length);
    expect(small).toBe(0);
    // Another tier, by touch: its levels replace the others.
    await tabs.nth(0).tap();
    await expect(level(page, 1)).toBeVisible(); await expect(level(page, 125)).toBeHidden();
    // Back to 121-130 by scrolling the list with the finger until its tab, then level 125, are on screen.
    const list = page.locator('#level-select');
    const box = await list.boundingBox();
    if (!box) throw new Error('Liste absente');
    const cdp = await page.context().newCDPSession(page);
    const onScreen = async (selector: string): Promise<boolean> => page.evaluate(s => {
        const r = document.querySelector(s)?.getBoundingClientRect(), l = document.querySelector('#level-select')?.getBoundingClientRect();
        return Boolean(r && l && r.top >= l.top && r.bottom <= l.bottom);
    }, selector);
    for (let i = 0; i < 8 && !await onScreen('#level-tier-12'); i++) await swipe(cdp, box.x + box.width / 2, box.y + box.height * 0.75, -box.height * 0.4);
    expect(await onScreen('#level-tier-12')).toBe(true);
    await page.locator('#level-tier-12').tap();
    for (let i = 0; i < 8 && !await onScreen('#level-tier-panel-12 button:nth-child(5)'); i++) await swipe(cdp, box.x + box.width / 2, box.y + box.height * 0.75, -box.height * 0.4);
    if (viewport.height < 500) expect(await list.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
    await expect(level(page, 125)).toHaveText(/^125 · /);
    await level(page, 125).tap();
    await expect(page.locator('#level-select')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().level)).toBe(124);
    expect(await page.evaluate(() => window.__BUBBLE_TEST__?.read().status)).toBe('playing');
    await page.screenshot({ path: info.outputPath(`bubble-niveau-125-${String(viewport.width)}x${String(viewport.height)}.png`) });
});

// Desktop keeps the flat-list specs (levels, arcade A05) for the mouse; here the keyboard and the mouse on the tabs.
test('BL02 clavier et souris : flèches entre paliers, Entrée lance le niveau', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await openList(page, 14);
    await expect(page.locator('#level-tiers [aria-selected="true"]')).toHaveAccessibleName('Niveaux 11 à 20 · Lucioles');
    await page.locator('#level-tier-1').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#level-tier-0')).toBeFocused();
    await expect(page.locator('#level-tier-0')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#level-tier-1').click();
    await level(page, 13).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().level)).toBe(12);
    await expect(page.locator('#level-select')).toBeHidden();
});

test('BM01 billes dessinées par David sur le plateau et dans la légende', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__?.marbles()))).toBe(true);
    const art = await page.evaluate(() => {
        const hook = window.__BUBBLE_TEST__;
        hook?.load([...Array.from({ length: 6 }, (_, col) => ({ row: 0, col, color: col as 0 | 1 | 2 | 3 | 4 | 5 })), { row: 0, col: 6, color: 0, kind: 'prism' as const }], 0, 28);
        return hook?.art() ?? [];
    });
    for (const name of ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'prism']) expect(art).toContain(`bubble-marble-${name}`);
    expect(art.some(key => key.startsWith('arcade-vector-75-bubble-'))).toBe(false);
});
