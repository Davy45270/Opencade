import { test, expect } from './fixture';

const ids = ['ferraille', 'dedale', 'essaim', 'orbite', 'empilo', 'briqueterie', 'bubble', 'serpentin'];
const windows = [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 390, height: 600 }];
for (const viewport of windows) for (const id of ids) {
    test(`M01 M02 M02b M03 ${id} ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto(`/?test=1#/${id}`);
        await expect.poll(() => page.evaluate(id => Boolean(window.__ARCADE_TEST__?.games[id]), id)).toBe(true);
        if (id !== 'bubble') await page.locator('#resume').tap();
        await expect.poll(() => page.evaluate(id => window.__ARCADE_TEST__?.games[id]?.hudText(), id)).toMatch(/SCORE|pts/);
        const measure = () => page.evaluate(id => {
            const box = (element: Element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
            const required = (selector: string) => { const e = document.querySelector(selector); if (!e) throw new Error(selector); return e; };
            const canvas = box(required('canvas'));
            const body = getComputedStyle(document.body);
            const useful = window.__ARCADE_TEST__?.games[id]?.usefulArea();
            if (!useful) throw new Error('Zone utile absente');
            return {
                id, viewport: { width: innerWidth, height: innerHeight }, canvas,
                availableWidth: innerWidth - parseFloat(body.paddingLeft) - parseFloat(body.paddingRight),
                availableHeight: innerHeight - box(required('#topbar')).height - box(required('#touch-controls')).height,
                game: box(required('#game')), bar: box(required('#topbar')), row: box(required('#touch-controls')),
                useful: { x: canvas.x + useful.x * canvas.width / 360, y: canvas.y + useful.y * canvas.height / 640, width: useful.width * canvas.width / 360, height: useful.height * canvas.height / 640 },
                controls: Array.from(document.querySelectorAll('#touch-controls button, #touch-controls label, .joystick')).filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = box(e); return { id: e.id || e.className, ...r, receivesPointer: e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; }),
                targets: Array.from(document.querySelectorAll('#topbar button')).filter(e => e.getBoundingClientRect().width > 0).map(box),
                buttons: Array.from(document.querySelectorAll('#touch-controls button')).filter(e => e.getBoundingClientRect().width > 0).map(e => ({
                    id: e.id, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth,
                    scrollHeight: e.scrollHeight, clientHeight: e.clientHeight, fontSize: getComputedStyle(e).fontSize,
                })),
                scroll: document.scrollingElement?.scrollHeight ?? 0,
            };
        }, id);
        const before = await measure();
        await page.touchscreen.tap(before.canvas.x + before.canvas.width / 2, before.canvas.y + 80);
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toHaveClass(/touch/);
        const after = await measure();
        await testInfo.attach('M01-mesures', { body: JSON.stringify({ before, after }, null, 2), contentType: 'application/json' });
        for (const dimension of ['x', 'y', 'width', 'height'] as const) {
            for (const element of ['canvas', 'game', 'bar', 'row'] as const) {
                expect(Math.abs(after[element][dimension] - before[element][dimension]), `M01 ${element} stable : ${dimension}`).toBeLessThanOrEqual(1);
            }
        }
        for (const m of [before, after]) {
            expect(m.canvas.width >= .92 * m.availableWidth || m.canvas.height >= .85 * m.availableHeight).toBe(true);
            expect(m.bar.height).toBeLessThanOrEqual(44);
            expect(m.row.height).toBeLessThanOrEqual(id === 'ferraille' ? 120 : 64);
            expect(m.buttons.length, 'M02b boutons visibles').toBeGreaterThan(0);
            for (const button of m.buttons) {
                expect(button.scrollWidth, `M02b ${button.id} largeur`).toBeLessThanOrEqual(button.clientWidth);
                expect(button.scrollHeight, `M02b ${button.id} hauteur`).toBeLessThanOrEqual(button.clientHeight);
            }
            expect([...new Set(m.buttons.map(button => button.fontSize))], 'M02b police commune').toEqual(['16px']);
            for (const target of m.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44); }
            for (const c of m.controls) {
                expect(c.receivesPointer, c.id).toBe(true);
                expect(c.width, c.id).toBeGreaterThanOrEqual(c.id === 'joystick' ? 120 : 56);
                expect(c.height, c.id).toBeGreaterThanOrEqual(c.id === 'joystick' ? 120 : 56);
                expect(c.x).toBeGreaterThanOrEqual(16); expect(c.x + c.width).toBeLessThanOrEqual(viewport.width - 16 + 1);
                expect(c.y >= m.useful.y + m.useful.height || c.y + c.height <= m.useful.y || c.x >= m.useful.x + m.useful.width || c.x + c.width <= m.useful.x, c.id).toBe(true);
            }
            expect(m.scroll).toBeLessThanOrEqual(viewport.height + 1);
        }
        const m = after;
        await page.touchscreen.tap(m.canvas.x + m.canvas.width / 2, m.canvas.y + 80);
        await page.touchscreen.tap(m.canvas.x + m.canvas.width / 2, m.canvas.y + 80);
        expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
        if (viewport.height === 600) {
            await page.screenshot({ path: `test-results/screenshots/mobile-${id}-390x600.png` });
        }
    });
    test(`M04 ${id} ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(`/?test=1#/${id}`);
        await expect.poll(() => page.evaluate(id => Boolean(window.__ARCADE_TEST__?.games[id]), id)).toBe(true);
        if (id !== 'bubble') await page.locator('#resume').tap();
        await page.locator('#game-menu-toggle').tap();
        const before = await page.evaluate(id => window.__ARCADE_TEST__?.games[id]?.read(), id);
        await expect(page.locator('#levels')).toBeVisible();
        await expect(page.locator('#restart')).toBeVisible();
        await expect(page.locator('#game-help')).toBeVisible();
        await expect(page.locator('#status')).toBeVisible();
        if (id === 'bubble') {
            const canvas = await page.locator('canvas').boundingBox();
            if (!canvas) throw new Error('Canevas absent');
            await page.touchscreen.tap(canvas.x + canvas.width / 2, canvas.y + canvas.height / 4);
            await page.locator('#levels').blur();
            await page.keyboard.press('Space');
            await page.locator('#touch-fire').dispatchEvent('click', { detail: 0 });
        }
        await page.waitForTimeout(300);
        expect(await page.evaluate(id => window.__ARCADE_TEST__?.games[id]?.read(), id)).toEqual(before);
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement?.closest('#game-menu') !== null || document.activeElement.id === 'game-menu-toggle')).toBe(true);
        await page.keyboard.press('Escape');
        await expect(page.locator('#game-menu-toggle')).toBeFocused();
        await expect(page.locator('#game-menu-toggle')).toHaveAttribute('aria-expanded', 'false');
        // A real menu action opens the selector, then a real restart restores level 1.
        await page.locator('#game-menu-toggle').tap();
        await expect(page.locator('#levels')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#level-select')).toBeVisible();
        await page.locator('#close-levels').tap();
        await page.locator('#game-menu-toggle').tap();
        await page.locator('#restart').tap();
        await expect(page.locator('#game-menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    });

}

test('M01 conteneur redimensionné sans resize puis sortie et retour au jeu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/serpentin');
    await expect(page.locator('canvas')).toBeVisible();
    const initial = await page.locator('canvas').boundingBox();
    if (!initial) throw new Error('Canevas absent');
    await page.locator('#game').evaluate(element => { (element as HTMLElement).style.height = '320px'; });
    await expect.poll(async () => (await page.locator('canvas').boundingBox())?.height).toBeCloseTo(320, 0);
    await page.locator('#game').evaluate(element => { (element as HTMLElement).style.removeProperty('height'); });
    await expect.poll(async () => (await page.locator('canvas').boundingBox())?.height).toBeCloseTo(initial.height, 0);
    await page.locator('#topbar [data-home]').tap();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: /Serpentin/ }).tap();
    await expect.poll(async () => (await page.locator('canvas').boundingBox())?.height).toBeCloseTo(initial.height, 0);
});
