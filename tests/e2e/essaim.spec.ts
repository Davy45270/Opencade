import { openGameMenu, test, expect, point, measureLayout } from './fixture';
import type { Page } from '@playwright/test';
async function read(page: Page) { return page.evaluate(() => window.__ESSAIM_TEST__?.read()); }
async function open(page: Page): Promise<void> {
    await page.goto('/?test=1#/essaim');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.essaim))).toBe(true);
}
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    if (mobile) {
        const box = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); if (!box.width || !box.height) throw new Error(`Contrôle absent : ${selector}`);
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    } else await page.locator(selector).click();
}
async function drag(page: Page, from: number, to: number, y = 618): Promise<void> {
    const a = await point(page, from, y), b = await point(page, to, y);
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
}
async function layout(page: Page): Promise<void> {
    const { canvas, controls, scroll, height } = await measureLayout(page,
        ['#pause', '#sound', '#essaim-fire', '#essaim-left', '#essaim-right', '.essaim-options', '#levels', '#restart']);
    const viewport = page.viewportSize(); if (!viewport) throw new Error('Viewport absent');
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.y).toBeGreaterThanOrEqual(0);
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width); expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height);
    for (const box of controls) {
        const selector = box.selector;
        expect(box.width).toBeGreaterThanOrEqual(selector === '#essaim-fire' ? 64 : 44);
        expect(box.height).toBeGreaterThanOrEqual(selector === '#essaim-fire' ? 64 : 44);
        expect(box.x < canvas.x + canvas.width && box.x + box.width > canvas.x && box.y < canvas.y + canvas.height && box.y + box.height > canvas.y).toBe(false);
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    expect(scroll).toBeLessThanOrEqual(height + 1);
}
test('G04 G10 victoire par tir réel, niveau suivant et déblocage repris', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const ready = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(ready);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.scenario('finish'); });
    if (mobile) await tap(page, '#essaim-fire', true); else await page.keyboard.press('Space');
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('won');
    await expect(page.locator('#result-title')).toContainText('réussi');
    await expect(page.locator('#next-level')).toBeVisible(); expect((await read(page))?.score).toBe(10); expect((await read(page))?.cumulativeScore).toBe(10);
    await page.screenshot({ path: `test-results/screenshots/essaim-won-${info.project.name}.png` });
    await tap(page, '#next-level', mobile); await expect.poll(async () => (await read(page))?.level).toBe(1); expect((await read(page))?.cumulativeScore).toBe(10);
    await layout(page); await page.screenshot({ path: `test-results/screenshots/essaim-play-${info.project.name}.png` });
    await page.reload(); await expect(page.locator('#resume')).toBeVisible(); await tap(page, '#resume', mobile);
    await tap(page, '#levels', mobile); await expect(page.locator('#level-list button')).toHaveCount(30);
    await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await expect(page.locator('#level-list button').nth(2)).toBeDisabled(); await expect(page.locator('#best-score')).toContainText('10');
    await tap(page, '#close-levels', mobile); await tap(page, '#pause', mobile);
});
test('G06 G10 défaite après guidage réel puis rejouer restaure vies et score', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await page.evaluate(mobile => {
        window.__ESSAIM_TEST__?.scenario('danger');
        // Freeze rendering while preparing two distinct real touch gestures.
        if (mobile) window.__ESSAIM_TEST__?.advance(0);
    }, mobile);
    if (mobile) {
        await tap(page, '#resume', true);
        await expect(page.locator('#pause-panel')).toBeHidden();
    }
    expect((await read(page))?.status).toBe('playing');
    // Le toucher de démarrage est consommé ; le guidage vient ensuite.
    const target = await point(page, 240, 618);
    if (mobile) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
    if (mobile) expect((await read(page))?.target).toBe(240);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(10000); });
    await expect.poll(async () => (await read(page))?.status).toBe('lost');
    await expect(page.locator('#result-title')).toContainText('Défaite');
    expect(Math.abs(((await read(page))?.cannon ?? 0) - 240)).toBeLessThanOrEqual(14); expect((await read(page))?.lives).toBe(0); expect((await read(page))?.cumulativeScore).toBe(0);
    await expect(page.locator('#retry-level')).toBeVisible(); await page.screenshot({ path: `test-results/screenshots/essaim-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile); expect((await read(page))?.status).toBe('playing'); expect((await read(page))?.lives).toBe(3); expect((await read(page))?.score).toBe(0);
    await tap(page, '#pause', mobile); const paused = await read(page); await page.waitForTimeout(220); expect(await read(page)).toEqual(paused);
});
test('G01 G03 G12 guidage clavier souris doigt, tir auto sauvé et pause', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page); await tap(page, '#resume', mobile);
    // Use simulation time for guidance, independently of rendering.
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(0); });
    if (mobile) {
        await drag(page, 180, 280); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(500); }); await expect.poll(async () => (await read(page))?.cannon).toBeCloseTo(280);
        // La moitié haute ne déplace pas le canon au toucher.
        await drag(page, 280, 80, 200); expect((await read(page))?.target).toBe(280);
    } else {
        await page.keyboard.down('ArrowRight'); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(200); }); await expect.poll(async () => (await read(page))?.cannon ?? 0).toBeGreaterThan(215); await page.keyboard.up('ArrowRight');
        await page.keyboard.down('KeyA'); await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(400); }); await expect.poll(async () => (await read(page))?.cannon ?? 360).toBeLessThan(180); await page.keyboard.up('KeyA');
        const target = await point(page, 280, 610); await page.mouse.move(target.x, target.y);
        // 600 ms covers the return from keyboard guidance at 300 px/s.
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(600); }); await expect.poll(async () => (await read(page))?.cannon).toBeCloseTo(280);
    }
    if (mobile) {
        const a = await point(page, 280, 618), client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
        await expect.poll(async () => (await read(page))?.firing).toBe(true);
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
        await expect.poll(async () => (await read(page))?.fired ?? 0).toBeGreaterThan(0);
        const touchShot = await read(page);
        expect(touchShot?.beam || touchShot?.shots.some(s => s.owner === 'player')).toBe(true);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
        await expect.poll(async () => (await read(page))?.firing).toBe(false);
    }
    // Level 1 supplies a beam. A tap released before advance() cannot sustain it.
    // Hold the real keyboard / touch button through simulation and require emission.
    const beforeFire = (await read(page))?.fired ?? 0;
    const fireClient = mobile ? await page.context().newCDPSession(page) : undefined;
    if (fireClient) {
        const box = await page.locator('#essaim-fire').boundingBox();
        if (!box) throw new Error('Bouton Tir absent');
        await fireClient.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    } else await page.keyboard.down('Space');
    try {
        expect((await read(page))?.firing).toBe(true);
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
        const shot = await read(page);
        expect(shot?.fired ?? 0).toBeGreaterThan(beforeFire);
        if (shot?.weapons.some(w => w.kind === 'beam')) {
            expect(shot.beam).toBe(true); expect(shot.heat).toBeGreaterThan(0);
        } else expect(shot?.shots.some(s => s.owner === 'player')).toBe(true);
    } finally {
        if (fireClient) { await fireClient.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await fireClient.detach(); }
        else await page.keyboard.up('Space');
    }
    expect((await read(page))?.firing).toBe(false);
    if (!mobile) {
        // Preserve desktop button coverage as well as the keyboard hold above.
        const beforeButton = (await read(page))?.fired ?? 0;
        await page.locator('#essaim-fire').hover(); await page.mouse.down();
        try {
            expect((await read(page))?.firing).toBe(true);
            await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(200); });
            const shot = await read(page);
            expect(shot?.fired ?? 0).toBeGreaterThan(beforeButton);
            expect(shot?.beam || shot?.shots.some(s => s.owner === 'player')).toBe(true);
        } finally { await page.mouse.up(); }
        expect((await read(page))?.firing).toBe(false);
    }
    if (mobile) await tap(page, '#pause', true); else await page.keyboard.press('KeyP');
    const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused);
    if (mobile) await tap(page, '#resume', true); else await page.keyboard.press('Escape');
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
    await expect.poll(async () => (await read(page))?.ticks ?? 0).toBeGreaterThan(paused?.ticks ?? 0);
    await tap(page, '.essaim-options', mobile); expect((await read(page))?.autoFire).toBe(true);
    await page.reload(); await expect(page.locator('#essaim-auto')).toBeChecked(); await tap(page, '#resume', mobile);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(100); });
    expect((await read(page))?.fired ?? 0).toBeGreaterThan(0);
    const autoShot = await read(page);
    expect(autoShot?.beam || autoShot?.shots.some(s => s.owner === 'player')).toBe(true); await layout(page);
});
test('G12 crochet inerte sans test et nettoyage à la sortie', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await tap(page, '#topbar [data-home]', mobile); await expect(page.locator('#game canvas')).toHaveCount(0);
    expect(await page.evaluate(() => window.__ESSAIM_TEST__)).toBeUndefined(); await expect(page.locator('#essaim-auto')).toHaveCount(0);
    await page.goto('/#/essaim'); await expect(page.locator('#game canvas')).toBeVisible();
    expect(await page.evaluate(() => [window.__ARCADE_TEST__, window.__ESSAIM_TEST__])).toEqual([undefined, undefined]);
});

test('G11 G10 niveau 30 et mise en page', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'; await open(page);
    await tap(page, '#resume', mobile); await tap(page, '#pause', mobile);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.command(); });
    await tap(page, '#pause', mobile); await layout(page);
    await page.screenshot({ path: `test-results/screenshots/essaim-level30-${info.project.name}.png` });
});

for (const [index, kind] of (['beam','bounce','drones','slow','magnet','charge'] as const).entries()) {
    test(`E-WPN capture essaim-weapon-${String(index+1)}`, async ({ page }, info) => {
        const mobile = info.project.name === 'mobile-chromium'; await open(page);
        await tap(page, '#resume', mobile); await tap(page, '#pause', mobile);
        await page.evaluate(weapon => { window.__ESSAIM_TEST__?.weapon(weapon); }, kind);
        await tap(page, '#pause', mobile);
        const touch = mobile ? await page.context().newCDPSession(page) : null;
        if (touch) {
            const box = await page.locator('#essaim-fire').boundingBox(); if (!box) throw new Error('Tir absent');
            await touch.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:box.x+32,y:box.y+32 }] });
        } else await page.keyboard.down('Space');
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(900); });
        const state = await read(page); expect(state?.weapons.map(w => w.kind)).toEqual([kind]);
        if (kind === 'charge') expect(state?.charge).toBeGreaterThan(800);
        if (kind === 'beam') expect(state?.heat).toBeGreaterThan(0);
        await page.screenshot({ path: `test-results/screenshots/essaim-weapon-${String(index+1)}-${info.project.name}.png` });
        if (touch) { await touch.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await touch.detach(); }
        else await page.keyboard.up('Space');
        await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(17); });
        if (kind === 'charge') expect((await read(page))?.shots.some(p => (p.radius ?? 0) > 10)).toBe(true);
    });
}

for (const scene of ['play', 'boss', 'weapons'] as const) {
    test(`E-ART capture essaim-art-${scene}`, async ({ page }, info) => {
        await open(page); await tap(page, '#resume', info.project.name === 'mobile-chromium');
        await page.evaluate(name => {
            window.__ESSAIM_TEST__?.artScenario(name);
            window.__ESSAIM_TEST__?.advance(0);
        }, scene);
        const stats = await page.evaluate(() => window.__ESSAIM_TEST__?.art());
        expect(stats?.activeGraphics).toBe(5);
        expect(stats?.particles).toBeLessThanOrEqual(96);
        expect(stats?.textureGenerations).toBe(2);
        if (scene === 'weapons') expect((await read(page))?.weapons.map(w => w.kind).sort()).toEqual(['bounce', 'drones']);
        if (scene === 'boss') expect((await read(page))?.boss).toMatchObject({ phase: 2, exposed: true });
        await page.screenshot({ path: `test-results/screenshots/essaim-art-${scene}-${info.project.name}.png` });
    });
}

test('E-ART mouvement réduit, effets bornés et textures réutilisées', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page); const mobile = info.project.name === 'mobile-chromium';
    await tap(page, '#resume', mobile);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.artScenario('play'); window.__ESSAIM_TEST__?.advance(0); });
    const art = await page.evaluate(() => window.__ESSAIM_TEST__?.art());
    expect(art?.reducedMotion).toBe(true); expect(art?.particles).toBeGreaterThan(0); expect(art?.particles).toBeLessThanOrEqual(4);
    await page.screenshot({ path: `test-results/screenshots/essaim-art-reduced-${info.project.name}.png` });
    await page.evaluate(() => { window.__ESSAIM_TEST__?.advance(1000); });
    expect((await page.evaluate(() => window.__ESSAIM_TEST__?.art()))?.particles).toBeLessThanOrEqual(4);
    await page.evaluate(() => {
        window.__ESSAIM_TEST__?.loadLevel(12, 458);
        window.__ESSAIM_TEST__?.loadLevel(26, 458);
    });
    expect((await page.evaluate(() => window.__ESSAIM_TEST__?.art()))?.textureGenerations).toBe(2);
    await tap(page, '#topbar [data-home]', mobile);
    await page.goto('/?test=1#/essaim');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ESSAIM_TEST__))).toBe(true);
    expect((await page.evaluate(() => window.__ESSAIM_TEST__?.art()))?.textureGenerations).toBe(2); // New game, new texture manager.
    expect((await page.evaluate(() => window.__ESSAIM_TEST__?.art()))?.activeGraphics).toBe(5);
});

// Literal host-independent contract: Essaim / Serpentin >= 0.5 in this session.
async function sampleFrames(page: Page, game: 'essaim' | 'serpentin') {
    return page.evaluate(async game => {
        const rendered = (): number => game === 'essaim' ? window.__ESSAIM_TEST__?.art().renderedFrames ?? 0 : window.__SERPENTIN_TEST__?.renderedFrames() ?? 0;
        const before = game === 'essaim' ? window.__ESSAIM_TEST__?.read().ticks ?? 0 : window.__SERPENTIN_TEST__?.read().ticks ?? 0;
        const start = performance.now(), first = rendered();
        await new Promise<void>(resolve => {
            const frame = (): void => { if (performance.now() - start >= 5000) resolve(); else requestAnimationFrame(frame); };
            requestAnimationFrame(frame);
        });
        const elapsed = performance.now() - start, frames = rendered() - first;
        const state = game === 'essaim' ? window.__ESSAIM_TEST__?.read() : window.__SERPENTIN_TEST__?.read();
        return { frames, elapsed, fps: frames * 1000 / elapsed, ticks: (state?.ticks ?? 0) - before, status: state?.status };
    }, game);
}
test('E-ART mobile CPU ×4 : cadence relative ≥0,5 et JavaScript ≤8 ms sans bridage', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Profil mobile uniquement');
    const client = await page.context().newCDPSession(page);
    try {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.goto('/?test=1#/serpentin');
        await expect.poll(() => page.evaluate(() => Boolean(window.__SERPENTIN_TEST__))).toBe(true);
        await tap(page, '#resume', true);
        await page.evaluate(() => { window.__SERPENTIN_TEST__?.scenario('benchmark'); });
        const serpentin = await sampleFrames(page, 'serpentin');
        expect(serpentin.frames).toBeGreaterThan(0); expect(serpentin.status).toBe('playing');
        // Under CPU ×4 in a GPU-less test container the simulation itself falls behind real time: compare, don't assume 60 ticks/s.
        expect(serpentin.ticks).toBeGreaterThan(0);
        await open(page); await tap(page, '#resume', true);
        await page.evaluate(() => { window.__ESSAIM_TEST__?.artScenario('weapons'); });
        const essaim = await sampleFrames(page, 'essaim');
        const ratio = essaim.fps / serpentin.fps;
        await info.attach('essaim-art-mobile-relative-fps', { body: JSON.stringify({ serpentin, essaim, ratio, minimumRatio: 0.5 }, null, 2), contentType: 'application/json' });
        expect(essaim.elapsed).toBeGreaterThanOrEqual(5000);
        expect(ratio).toBeGreaterThanOrEqual(0.5);
        expect(essaim.ticks).toBeGreaterThanOrEqual(0.5 * serpentin.ticks); expect(essaim.status).toBe('playing');
        expect((await page.evaluate(() => window.__ESSAIM_TEST__?.art()))?.particles).toBeLessThanOrEqual(96);
        expect((await page.evaluate(() => window.__ESSAIM_TEST__?.art()))?.activeGraphics).toBe(5);
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await page.evaluate(() => { window.__ESSAIM_TEST__?.artScenario('weapons'); window.__ESSAIM_TEST__?.timing(true); });
        const unthrottled = await sampleFrames(page, 'essaim');
        const timing = await page.evaluate(() => window.__ESSAIM_TEST__?.timing());
        await info.attach('essaim-art-javascript-ms', { body: JSON.stringify({ unthrottled, timing, maximumMeanMs: 8 }, null, 2), contentType: 'application/json' });
        expect(unthrottled.status).toBe('playing'); expect(unthrottled.ticks).toBeGreaterThanOrEqual(240);
        expect(timing?.frames ?? 0).toBeGreaterThan(0);
        expect(timing?.updateMs ?? 0).toBeGreaterThan(0); expect(timing?.drawMs ?? 0).toBeGreaterThan(0);
        expect(timing?.meanMs).toBeLessThanOrEqual(8);
    } finally {
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await client.detach();
    }
});
