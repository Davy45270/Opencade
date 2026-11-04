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

test('the ☰ home menu offers “Donner mon avis”, opening the feedback forms in a new tab', async ({ page, context, isMobile }, info) => {
    const url = 'https://github.com/Davy45270/Opencade/issues/new/choose';
    const requests: string[] = [];
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173')) requests.push(request.url()); });
    await context.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title><h1>stub</h1>' }));
    await page.goto('/?test=1#/');
    const link = page.getByRole('link', { name: /^Donner mon avis/ });
    await expect(link).toBeHidden();
    if (isMobile) await page.locator('#home-menu > summary').tap(); else await page.locator('#home-menu > summary').click();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
    await expect(link).toHaveAccessibleName('Donner mon avis (nouvel onglet)');
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    if (isMobile) { await link.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath('avis-menu.png') }); }
    const opened = context.waitForEvent('page');
    if (isMobile) await link.tap(); else await link.click();
    const tab = await opened;
    await tab.waitForURL(url);
    expect(await tab.evaluate(() => window.opener === null)).toBe(true);
    await expect(page.locator('#home')).toBeVisible();
    expect(requests).toEqual([]);
});
