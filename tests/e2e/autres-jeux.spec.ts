import { test, expect } from './fixture';

const expected = [
    ['Opencadkid', 'https://davy45270.github.io/opencadkid/'],
    ['TicTac', 'https://davy45270.github.io/tictac/'],
    ['Petit Astronome', 'https://davy45270.github.io/petit-astronome/'],
] as const;

test('the ☰ home menu shows the three other games with their exact addresses and icons', async ({ page }) => {
    await page.goto('/?test=1#/');
    await page.locator('#home-menu > summary').click();
    await expect(page.locator('#other-games > summary')).toHaveText('Mes autres jeux');
    await page.locator('#other-games > summary').click();
    const links = page.locator('#other-games-list a.other-game');
    await expect(links).toHaveCount(3);
    for (const [index, [name, url]] of expected.entries()) {
        const link = links.nth(index);
        await expect(link).toBeVisible();
        await expect(link).toContainText(name);
        await expect(link).toHaveAttribute('href', url);
        expect(await link.getAttribute('target')).toBeNull();
        expect(await link.locator('img').evaluate((image: HTMLImageElement) => image.decode().then(() => image.naturalWidth))).toBe(96);
    }
});

test('a finger opens the list and follows a link in the same tab', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'finger journey');
    const [, url] = expected[1];
    await page.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title><h1>stub</h1>' }));
    await page.goto('/?test=1#/');
    await page.locator('#home-menu > summary').tap();
    await page.locator('#other-games > summary').tap();
    const link = page.locator('a.other-game[data-game="tictac"]');
    await expect(link).toBeVisible();
    await link.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('autres-jeux.png') });
    const pages = page.context().pages().length;
    await link.tap();
    await page.waitForURL(url);
    expect(page.context().pages()).toHaveLength(pages);
});

test('the list and its icons still show offline', async ({ page, context }) => {
    await page.goto('/?test=1&pwa=1#/');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await context.setOffline(true);
    try {
        await page.reload();
        await page.locator('#home-menu > summary').click();
        await page.locator('#other-games > summary').click();
        const images = page.locator('#other-games-list img');
        await expect(images).toHaveCount(3);
        for (let index = 0; index < 3; index++) expect(await images.nth(index).evaluate((image: HTMLImageElement) => image.decode().then(() => image.naturalWidth))).toBe(96);
    } finally {
        await context.setOffline(false);
    }
});
