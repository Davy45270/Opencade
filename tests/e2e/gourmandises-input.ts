import { expect, type Page } from '@playwright/test';
export async function ready(page: Page, touch = false): Promise<void> {
    await expect.poll(() => page.evaluate(() => !!window.__GOURMANDISES_TEST__)).toBe(true);
    if (await page.locator('#resume').isVisible()) {
        if (touch) await page.locator('#resume').tap();
        else await page.locator('#resume').click();
    }
}
export async function point(page: Page, index: number) {
    const board = await page.evaluate(() => {
        const hook = window.__GOURMANDISES_TEST__;
        if (!hook) throw new Error('Crochet absent');
        return { ...hook.board(), columns: hook.read().width };
    });
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!canvas) throw new Error('Canevas absent');
    return {
        x: canvas.x + (board.x + (index % board.columns + 0.5) * board.unit) * canvas.width / 360,
        y: canvas.y + (board.y + (Math.floor(index / board.columns) + 0.5) * board.unit) * canvas.height / 640,
    };
}
export async function swap(page: Page, pair: [number, number], touch: boolean): Promise<void> {
    const a = await point(page, pair[0]);
    const b = await point(page, pair[1]);
    if (touch) {
        await page.touchscreen.tap(a.x, a.y);
        await page.touchscreen.tap(b.x, b.y);
    } else {
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 5 });
        await page.mouse.up();
    }
    await page.waitForTimeout(320);
}
