import { test, expect } from './fixture';

for (const game of ['caisses', 'traverse', 'alunir'] as const) test(`P-${game} pixels du personnage en jeu : repos et spécial`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'panda'); });
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'caisses' ? window.__CAISSES_TEST__ : game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__), game)).toBe(true);
    if (game !== 'caisses') await page.locator('#resume').tap();
    if (game === 'caisses') await page.evaluate(() => { window.__CAISSES_TEST__?.scenario('corner'); });
    else await page.evaluate(game => {
        if (game === 'traverse') window.__TRAVERSE_TEST__?.loadLevel(0, 1);
        (game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__)?.advance(0);
    }, game);
    const pixels = async () => {
        const clip = await page.evaluate(game => {
            const canvas = document.querySelector('#game canvas')?.getBoundingClientRect();
            if (!canvas) throw new Error('Missing game canvas');
            let b;
            if (game === 'caisses') b = window.__CAISSES_TEST__?.bounds().hero;
            else if (game === 'traverse') b = window.__TRAVERSE_TEST__?.bounds().hero;
            else {
                const s = window.__ALUNIR_TEST__?.read();
                if (s) b = { x: s.x - 17, y: s.y - 21, width: 34, height: 34 };
            }
            if (!b) throw new Error('Missing character bounds');
            return { x: canvas.x + b.x * canvas.width / 360, y: canvas.y + b.y * canvas.height / 640, width: b.width * canvas.width / 360, height: b.height * canvas.height / 640 };
        }, game);
        const png = await page.screenshot({ clip }) as Uint8Array;
        return page.evaluate(async (bytes: number[]) => {
            const encoded = btoa(String.fromCharCode(...bytes));
            const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Missing pixel context');
            ctx.drawImage(image, 0, 0, 64, 64);
            const rgba = Array.from(ctx.getImageData(0, 0, 64, 64).data);
            // Panda coat is absent from the board/traffic: require actual character pixels.
            let coat = 0;
            for (let i = 0; i < rgba.length; i += 4) if ((rgba[i] ?? 0) > 235 && (rgba[i + 1] ?? 0) > 225 && (rgba[i + 2] ?? 0) > 210) coat++;
            return { rgba, coat };
        }, Array.from(png));
    };
    const restState = await page.evaluate(game => (game === 'caisses' ? window.__CAISSES_TEST__ : game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__)?.read().character, game);
    expect(restState?.animation).toBe('repos');
    const rest = await pixels(); expect(rest.coat).toBeGreaterThan(40);
    if (game === 'caisses') {
        await page.locator('#caisses-special').tap(); await page.locator('#caisses-left').tap();
    } else {
        await page.locator(`#${game}-special`).tap();
        await page.evaluate(game => { (game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__)?.advance(game === 'traverse' ? 500 : 0); }, game);
    }
    const state = await page.evaluate(game => (game === 'caisses' ? window.__CAISSES_TEST__ : game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__)?.read().character, game);
    expect(state?.animation).toBe('special');
    const special = await pixels(); expect(special.coat).toBeGreaterThan(40);
    expect(special.rgba.filter((v, i) => v !== rest.rgba[i]).length).toBeGreaterThan(40);
    await page.screenshot({ path: info.outputPath(`${game}-special-pixels.png`) });
});
