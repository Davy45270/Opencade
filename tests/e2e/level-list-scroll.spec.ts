import type { CDPSession, Page } from '@playwright/test';
import { test, expect } from './fixture';

// The level list is a panel inside the play area: a finger swipe scrolls it, while a swipe on
// the canvas stays a play gesture that never scrolls the page.
async function swipe(cdp: CDPSession, x: number, y: number, dy: number): Promise<void> {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + i * dy / 12 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
/** Records whether the touchmoves that reach the window were cancelled by the page. */
async function watchMoves(page: Page): Promise<void> {
    await page.evaluate(() => {
        const moves: boolean[] = [];
        (window as unknown as { __moves: boolean[] }).__moves = moves;
        window.addEventListener('touchmove', e => { moves.push(e.defaultPrevented); }, { passive: true });
    });
}
const moves = (page: Page) => page.evaluate(() => (window as unknown as { __moves: boolean[] }).__moves);
async function openLevels(page: Page, id: string): Promise<void> {
    await page.goto(`/?test=1#/${id}`);
    await page.waitForFunction(game => Boolean(window.__ARCADE_TEST__?.games[game]), id);
    await page.locator('#pause').tap();
    await page.locator('#levels').tap();
    await expect(page.locator('#level-select')).toBeVisible();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) for (const id of ['bubble', 'collier', 'caisses']) test(`LS01 ${id} liste des niveaux défilée au doigt ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize(viewport);
    await openLevels(page, id);
    const list = page.locator('#level-select');
    const size = await list.evaluate(e => ({ scroll: e.scrollHeight, client: e.clientHeight, top: e.scrollTop }));
    // The list is longer than its panel, otherwise the test proves nothing.
    expect(size.scroll).toBeGreaterThan(size.client);
    expect(size.top).toBe(0);
    await watchMoves(page);
    const box = await list.boundingBox();
    if (!box) throw new Error('Liste absente');
    const cdp = await page.context().newCDPSession(page);
    await swipe(cdp, box.x + box.width / 2, box.y + box.height * 0.7, -Math.min(240, box.height * 0.5));
    await expect.poll(() => list.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
    expect((await moves(page)).some(prevented => prevented)).toBe(false);
});

test('LS02 témoin : en partie, le glissé sur le canevas reste capturé et ne défile pas la page', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/caisses');
    await page.waitForFunction(() => Boolean(window.__ARCADE_TEST__?.games.caisses));
    await watchMoves(page);
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!canvas) throw new Error('Canevas absent');
    const cdp = await page.context().newCDPSession(page);
    await swipe(cdp, canvas.x + canvas.width / 2, canvas.y + canvas.height * 0.6, -200);
    const seen = await moves(page);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(prevented => prevented)).toBe(true);
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY, root: document.scrollingElement?.scrollTop ?? 0 }))).toEqual({ x: 0, y: 0, root: 0 });
});
