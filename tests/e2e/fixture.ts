import { test as base, expect, type Page } from '@playwright/test';
import type { Cell } from '../../src/engines/bubble/engine';
import type {} from '../../src/games/bubble/scene';
export const test = base.extend<{
    jsErrors: undefined;
}>({ jsErrors: [async ({ page }, use) => {
            const errors: string[] = [];
            page.on('pageerror', error => {
                errors.push(error.message);
            });
            page.on('console', message => {
                if (message.type() === 'error')
                    errors.push(message.text());
            });
            await use(undefined);
            expect(errors, 'Aucune erreur JS ni console.error').toEqual([]);
        }, { auto: true }] });
export { expect };
export async function ready(page: Page): Promise<void> {
    await page.goto('/?test=1#/bubble');
    await expect.poll(async () => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
}
export async function read(page: Page) {
    return page.evaluate(() => {
        if (!window.__BUBBLE_TEST__)
            throw new Error('Hook absent');
        return window.__BUBBLE_TEST__.read();
    });
}
export async function load(page: Page, grid: Cell[] = []): Promise<void> {
    await page.evaluate(grid => {
        if (!window.__BUBBLE_TEST__)
            throw new Error('Hook absent');
        window.__BUBBLE_TEST__.load(grid, 0, 452);
    }, grid);
}
export async function point(page: Page, x: number, y: number) {
    const box = await page.locator('canvas').boundingBox();
    if (!box)
        throw new Error('Canvas absent');
    return { x: box.x + x * box.width / 360, y: box.y + y * box.height / 640 };
}

/** Measure one layout in one browser call, without repeated frame waits. */
export async function measureLayout(page: Page, selectors: readonly string[]) {
    const menuOpened = selectors.some(selector => ['#levels', '#restart'].includes(selector)) && await openGameMenu(page, '#levels');
    const result = await page.evaluate(selectors => {
        const box = (selector: string) => {
            const element = document.querySelector(selector);
            if (!element) throw new Error(`Élément absent : ${selector}`);
            const r = element.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
            canvas: box('canvas'),
            controls: selectors.map(selector => ({ selector, ...box(selector) })),
            scroll: document.scrollingElement?.scrollHeight ?? 0,
            height: innerHeight,
        };
    }, selectors);
    if (menuOpened) await page.locator('#game-menu-toggle').click();
    return result;
}

export async function openGameMenu(page: Page, selector: string): Promise<boolean> {
    if (['#levels', '#restart'].includes(selector) && await page.locator('#game-menu-toggle').isVisible() && !await page.locator(selector).isVisible()) {
        await page.locator('#game-menu-toggle').click();
        return true;
    }
    return false;
}
