import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
import { ids, characters } from '../../src/characters/model';
import type {} from '../../src/games/petits-pompiers/scene';
async function read(page: Page) { return page.evaluate(() => { const h = window.__PETITS_POMPIERS_TEST__; if (!h) throw new Error('Crochet absent'); return h.read(); }); }
async function advance(page: Page, ms: number) { await page.evaluate(ms => { window.__PETITS_POMPIERS_TEST__?.advance(ms); }, ms); }
async function choose(page: Page, mobile: boolean, mode: 'detente' | 'defi' = 'detente') {
    const activate = async (selector: string) => { if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click(); };
    await activate('#level-list button:first-child'); await activate(`#pompiers-${mode}`); await activate('#resume');
    await advance(page, 0);
}
async function playerClip(page: Page) {
    return page.evaluate(() => {
        const p = window.__PETITS_POMPIERS_TEST__?.playerArea(), r = document.querySelector('#game canvas')?.getBoundingClientRect();
        if (!p || !r) throw new Error('Zone mascotte absente');
        return { x: r.x + p.x / 360 * r.width, y: r.y + p.y / 640 * r.height, width: p.width / 360 * r.width, height: p.height / 640 * r.height };
    });
}
test('Petits Pompiers : accueil, cinq mascottes distinctes et sélection du mode', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium', prints = new Set<string>();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const id of ids) {
        await page.goto('/?test=1');
        if (mobile) await page.locator('#character-toggle').tap(); else await page.locator('#character-toggle').click();
        if (mobile) await page.getByRole('button', { name: `Choisir ${characters[id].fr}`, exact: true }).tap(); else await page.getByRole('button', { name: `Choisir ${characters[id].fr}`, exact: true }).click();
        const card = page.locator('.game-card').filter({ hasText: 'Petits Pompiers' });
        if (mobile) await card.tap(); else await card.click();
        await expect.poll(() => page.evaluate(() => Boolean(window.__PETITS_POMPIERS_TEST__))).toBe(true);
        await choose(page, mobile);
        expect((await read(page)).character).toBe(id); expect((await read(page)).mode).toBe('detente');
        prints.add((await page.screenshot({ clip: await playerClip(page) })).toString('base64'));
    }
    expect(prints.size).toBe(ids.length);
    await page.goto('/?test=1#/petits-pompiers');
    if (await page.locator('#level-select').isHidden()) {
        if (mobile) { await page.locator('#game-menu-toggle').tap(); await page.locator('#levels').tap(); }
        else await page.locator('#levels').click();
    }
    const gallery = page.locator('#pompiers-mascots'); await expect(gallery).toBeVisible();
    const bounds = await gallery.boundingBox(); if (!bounds) throw new Error('Galerie invisible');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    const pixels = await gallery.evaluate(canvas => {
        const c = (canvas as HTMLCanvasElement).getContext('2d'); if (!c) throw new Error('Galerie absente');
        return Array.from({ length: 5 }, (_, i) => Array.from(c.getImageData(i * 140, 0, 140, 160).data).join(','));
    });
    expect(new Set(pixels).size).toBe(ids.length);
    await page.screenshot({ path: info.outputPath(`petits-pompiers-${mobile ? 'mobile' : 'desktop'}-mascottes.png`) });
});
test('Petits Pompiers : niveau 1 gagné par les commandes, pause, défi et détente', async ({ page }, info) => {
    test.setTimeout(180000);
    const mobile = info.project.name === 'mobile-chromium', platform = mobile ? 'mobile' : 'desktop';
    const external: string[] = [];
    page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
    await page.clock.install();
    await page.goto('/?test=1#/petits-pompiers');
    await expect(page.locator('#level-select')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`petits-pompiers-${platform}-accueil.png`) });
    await choose(page, mobile);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.screenshot({ path: info.outputPath(`petits-pompiers-${platform}-niveau1.png`) });
    // Opening and closing the chooser must preserve the live simulation.
    const ongoing = await read(page);
    if (mobile) await page.locator('#game-menu-toggle').tap();
    if (mobile) await page.locator('#levels').tap(); else await page.locator('#levels').click();
    await expect(page.locator('#level-select')).toBeVisible();
    if (mobile) await page.locator('#close-levels').tap(); else await page.locator('#close-levels').click();
    await expect(page.locator('#level-select')).toBeHidden();
    const resumed = await read(page);
    expect(resumed.player).toEqual(ongoing.player); expect(resumed.progress).toEqual(ongoing.progress);
    expect(resumed.time).toBe(ongoing.time); expect(resumed.ticks).toBe(ongoing.ticks);

    const cdp = mobile ? await page.context().newCDPSession(page) : null;
    const captured = new Set<string>();
    let held: string[] = [], touchActive = false;
    try {
        for (let step = 0; step < 2400; step++) {
            const state = await read(page); if (state.status !== 'playing') break;
            const shot = state.job?.kind === 'spray' ? 'jet' : state.player.carried >= 0 ? 'porter' : '';
            if (shot && !captured.has(shot)) { await page.screenshot({ path: info.outputPath(`petits-pompiers-${platform}-${shot}.png`) }); captured.add(shot); }
            const intent = await page.evaluate(() => window.__PETITS_POMPIERS_TEST__?.pilotAction());
            if (!intent) throw new Error('Pilote absent');
            await advance(page, 150); // Human reaction: previous controls remain held during the delay.
            if (cdp) {
                if (touchActive) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); touchActive = false; }
                const points = await page.evaluate(i => {
                    const result: { id: number; x: number; y: number }[] = [];
                    const point = (selector: string, id: number, dx = 0, dy = 0) => { const r = document.querySelector(selector)?.getBoundingClientRect(); if (!r) throw new Error('Cible absente'); result.push({ id, x: r.x + r.width / 2 + dx, y: r.y + r.height / 2 + dy }); };
                    if (i.dx || i.dy) point('.joystick', 0, i.dx * 44, i.dy * 44);
                    if (i.action) point('#pompiers-action', 1); if (i.tool) point('#pompiers-tool', 2); return result;
                }, intent);
                if (points.length) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points }); touchActive = true; }
            } else {
                for (const key of held) await page.keyboard.up(key);
                held = [intent.dx < 0 ? 'ArrowLeft' : intent.dx > 0 ? 'ArrowRight' : '', intent.dy < 0 ? 'ArrowUp' : intent.dy > 0 ? 'ArrowDown' : '', intent.action ? 'Space' : '', intent.tool ? 'a' : ''].filter(Boolean);
                for (const key of held) await page.keyboard.down(key);
            }
            await page.clock.runFor(17);
        }
    } finally {
        if (cdp) { if (touchActive) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }
        for (const key of held) await page.keyboard.up(key);
    }
    expect((await read(page)).status).toBe('won'); expect(captured).toEqual(new Set(['jet', 'porter']));
    await expect(page.locator('#result')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`petits-pompiers-${platform}-victoire.png`) });
    expect(external).toEqual([]);
    await page.evaluate(() => { window.__PETITS_POMPIERS_TEST__?.load(0, 28, 'defi'); });
    if (mobile) await page.locator('#pause').tap(); else await page.keyboard.press('p');
    const before = (await read(page)).time; await advance(page, 5000); expect((await read(page)).time).toBe(before);
    if (mobile) await page.locator('#resume').tap(); else await page.keyboard.press('Escape');
    await page.clock.runFor(34);
    expect(await page.evaluate(() => window.__PETITS_POMPIERS_TEST__?.hudCells().map(cell => cell.id))).toEqual(expect.arrayContaining(['hearts', 'time']));
    await expect(page.locator('#result')).toBeHidden();
    if (mobile) await page.screenshot({ path: info.outputPath('petits-pompiers-mobile-defi.png') });
    await page.evaluate(() => { window.__PETITS_POMPIERS_TEST__?.scenario('timeout'); });
    const almost = await read(page); expect(almost.status).toBe('playing');
    expect(almost.progress.extinguish).toBeGreaterThan(0); expect(almost.progress.rescue_person).toBeGreaterThan(0);
    await advance(page, 100);
    expect((await read(page)).status).toBe('lost');
    await page.evaluate(() => { window.__PETITS_POMPIERS_TEST__?.load(0, 28, 'detente'); window.__PETITS_POMPIERS_TEST__?.scenario('timeout'); });
    await page.clock.runFor(34);
    const relaxedHud = await page.evaluate(() => window.__PETITS_POMPIERS_TEST__?.hudCells().map(cell => cell.id));
    expect(relaxedHud).not.toContain('hearts'); expect(relaxedHud).not.toContain('time');
    await advance(page, 60000); expect((await read(page)).status).toBe('playing'); expect((await read(page)).player.hearts).toBe(3);
});
test('Petits Pompiers : défi choisi par deux gros boutons, crochet réservé aux tests', async ({ page }, info) => {
    await page.goto('/?test=1#/petits-pompiers'); await choose(page, info.project.name === 'mobile-chromium', 'defi'); expect((await read(page)).mode).toBe('defi');
    await page.goto('/#/petits-pompiers'); await expect(page.locator('#game canvas')).toBeVisible(); expect(await page.evaluate(() => window.__PETITS_POMPIERS_TEST__)).toBeUndefined();
});

test('Petits Pompiers : décors forêt et port', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.goto('/?test=1#/petits-pompiers'); await choose(page, true);
    for (const level of [7, 14]) {
        await page.evaluate(level => { window.__PETITS_POMPIERS_TEST__?.load(level, 28, 'detente'); }, level);
        await page.screenshot({ path: info.outputPath(`petits-pompiers-mobile-niveau${String(level + 1)}.png`) });
    }
});
