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
    const box = await page.locator('#game canvas').boundingBox();
    if (!box)
        throw new Error('Canvas absent');
    return { x: box.x + x * box.width / 360, y: box.y + y * box.height / 640 };
}

/** Measure one layout in one browser call, without repeated frame waits. */
export async function measureLayout(page: Page, selectors: readonly string[]) {
    const menuSelectors = selectors.filter(selector => ['#levels', '#restart', '#sound'].includes(selector));
    const toggle = page.locator('#pause');
    const mobileMenu = menuSelectors.length > 0 && await mobilePlay(page);
    // Already paused through the ⏸: the pause page is open, measure it as it is and leave it open.
    const alreadyOpen = mobileMenu && await toggle.getAttribute('aria-expanded') === 'true';
    if (mobileMenu) {
        if (!alreadyOpen) await toggle.tap();
        try {
            await expect(toggle).toHaveAttribute('aria-expanded', 'true');
            // The floating menu pauses play and may cover the canvas. Its buttons
            // must remain visible, large enough and entirely inside the viewport.
            for (const selector of menuSelectors) {
                const control = page.locator(selector);
                await expect(control).toBeVisible();
                const box = await control.boundingBox();
                if (!box) throw new Error(`Contrôle absent : ${selector}`);
                const viewport = page.viewportSize();
                if (!viewport) throw new Error('Viewport absent');
                expect(box.width, selector).toBeGreaterThanOrEqual(44);
                expect(box.height, selector).toBeGreaterThanOrEqual(44);
                expect(box.x, selector).toBeGreaterThanOrEqual(0);
                expect(box.y, selector).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width);
                expect(box.y + box.height, selector).toBeLessThanOrEqual(viewport.height);
                await control.click({ trial: true });
            }
        } finally {
            if (!alreadyOpen) await toggle.tap();
        }
        if (!alreadyOpen) {
            await expect(toggle, 'Fermeture réelle au toucher').toHaveAttribute('aria-expanded', 'false');
            await expect(page.locator('#game-menu')).toBeHidden();
        }
    }
    const measuredSelectors = mobileMenu
        ? [...selectors.filter(selector => !menuSelectors.includes(selector) && selector !== '#pause'), '#pause'] : selectors;
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
    }, measuredSelectors);
    return result;
}

export async function openGameMenu(page: Page, selector: string): Promise<boolean> {
    if (['#levels', '#restart', '#sound', '#game-menu [data-home]'].includes(selector) && await mobilePlay(page) && !await page.locator(selector).isVisible()) {
        await page.locator('#pause').click();
        return true;
    }
    return false;
}
/** Touch play: no bar, the ⏸ opens the single pause page (home, sound, levels, restart). */
export async function mobilePlay(page: Page): Promise<boolean> {
    return page.evaluate(() => document.body.classList.contains('playing') && matchMedia('(pointer: coarse), (width < 600px)').matches);
}
export async function goHome(page: Page): Promise<void> {
    if (await mobilePlay(page)) {
        if (!await page.locator('#game-menu [data-home]').isVisible()) await page.locator('#pause').click();
        await page.locator('#game-menu [data-home]').click();
    } else await page.locator('#topbar [data-home]').click();
}
/** Toggles the global sound; on touch play through the pause page, closed again afterwards. */
export async function clickSound(page: Page): Promise<void> {
    const opened = await openGameMenu(page, '#sound');
    await page.locator('#sound').click();
    if (opened) await page.locator('#pause').click();
}
