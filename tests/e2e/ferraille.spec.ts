import { openGameMenu, test, expect, measureLayout, goHome, mobilePlay } from './fixture';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/ferraille/scene';
async function read(page: Page) { return page.evaluate(() => window.__FERRAILLE_TEST__?.read()); }
async function tap(page: Page, selector: string, mobile: boolean): Promise<void> {
    await openGameMenu(page, selector);
    if (mobile) { const r = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); if (!r.width || !r.height) throw new Error(selector); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); }
    else await page.locator(selector).click();
}
async function walk(page: Page, mobile: boolean, action: () => Promise<void>): Promise<void> {
    if (mobile) {
        const r = await page.locator('.joystick').boundingBox(); if (!r) throw new Error('Joystick absent');
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + 105, y: r.y + 60 }] });
        try { await action(); } finally { await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach(); }
    } else { await page.keyboard.down('ArrowRight'); await action(); await page.keyboard.up('ArrowRight'); }
}
async function layout(page: Page): Promise<void> {
    const { canvas, controls, scroll, height } = await measureLayout(page, ['#pause', '.joystick', '#ferraille-jump', '#ferraille-fire', '#levels', '#restart']);
    const width = page.viewportSize()?.width ?? 0;
    expect(canvas.x).toBeGreaterThanOrEqual(0); expect(canvas.x + canvas.width).toBeLessThanOrEqual(width);
    for (const c of controls) {
        const overlap = c.x < canvas.x + canvas.width && c.x + c.width > canvas.x && c.y < canvas.y + canvas.height && c.y + c.height > canvas.y;
        // The touch ⏸ is fixed in the HUD corner, over the play area by design.
        if (c.selector !== '#pause' || !await mobilePlay(page)) expect(overlap, c.selector).toBe(false);
        const min = c.selector === '.joystick' ? 120 : c.selector === '#ferraille-jump' ? 72 : c.selector.startsWith('#ferraille-') ? 56 : 44;
        expect(c.width).toBeGreaterThanOrEqual(min); expect(c.height).toBeGreaterThanOrEqual(min);
        expect(c.y + c.height).toBeLessThanOrEqual(height); expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x + c.width).toBeLessThanOrEqual(width);
    }
    expect(scroll).toBeLessThanOrEqual(height);
    const view = await page.evaluate(() => window.__FERRAILLE_TEST__?.layout());
    if (!view) throw new Error('Zones du canevas absentes');
    expect(view.hud.y + view.hud.height).toBeLessThanOrEqual(view.world.y);
    expect(view.hud.y + view.hud.height).toBeLessThanOrEqual(view.ground.y);
    expect(view.ground.y + view.ground.height).toBeLessThanOrEqual(view.world.y + view.world.height);
    // F08: the full standing robot (22 world pixels) remains visible at the fall threshold.
    expect(view.visibleWorldBottom).toBeGreaterThanOrEqual(340 + 22);
}
async function victory(page: Page, mobile: boolean): Promise<void> {
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.scenario('finish'); });
    await walk(page, mobile, async () => {
        await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(10000); });
        await expect.poll(async () => (await read(page))?.status).toBe('won');
        await expect(page.locator('#result-title')).toContainText('réussi');
    });
    await expect(page.locator('#next-level')).toBeVisible(); expect((await read(page))?.cumulativeScore).toBe(500);
}
test('F09 F12 victoire par déplacement, niveau suivant et contrôles', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/ferraille'); await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.ferraille))).toBe(true);
    await expect(page.locator('#pause-title')).toHaveText('Prêt ?');
    const ready = await read(page); await page.waitForTimeout(150); expect(await read(page)).toEqual(ready);
    await victory(page, mobile);
    await page.screenshot({ path: `test-results/screenshots/ferraille-won-${info.project.name}.png` });
    // A new level restarts the real-time clock: pin it again, or the opening turret can knock the hero
    // back while the layout is measured, before the test even holds the stick.
    await tap(page, '#next-level', mobile); await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(0); });
    expect((await read(page))?.level).toBe(1); await layout(page); expect((await read(page))?.hero.x).toBe(32);
    await walk(page, mobile, async () => { await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(400); }); await expect.poll(async () => (await read(page))?.hero.x ?? 0).toBeGreaterThan(64); });
    await page.screenshot({ path: `test-results/screenshots/ferraille-play-${info.project.name}.png` });
});
test('F07 F08 chute par entrée réelle, défaite et rejouer', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/ferraille'); await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.scenario('danger'); });
    await tap(page, '#resume', mobile);
    await layout(page);
    await walk(page, mobile, async () => {
        await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(10000); });
        await expect.poll(async () => (await read(page))?.status).toBe('lost');
        await expect(page.locator('#result-title')).toContainText('Défaite');
    });
    expect((await read(page))?.lives).toBe(0); expect((await read(page))?.cumulativeScore).toBe(0);
    await page.screenshot({ path: `test-results/screenshots/ferraille-lost-${info.project.name}.png` });
    await tap(page, '#retry-level', mobile); expect((await read(page))?.status).toBe('playing'); expect((await read(page))?.lives).toBe(3);
});
test('F01 F03 F11 F14 niveau 30, saut et tir maintenus, pause et nettoyage', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/ferraille'); await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.loadLevel(29, 460); }); await tap(page, '#resume', mobile); await tap(page, '#pause', mobile);
    const paused = await read(page); await page.waitForTimeout(200); expect(await read(page)).toEqual(paused); await layout(page);
    await tap(page, '#pause', mobile);
    await page.screenshot({ path: `test-results/screenshots/ferraille-level30-${info.project.name}.png` });
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(0); });
    const client = mobile ? await page.context().newCDPSession(page) : null;
    if (client) {
        const points = []; for (const id of ['#ferraille-jump', '#ferraille-fire']) { const r = await page.locator(id).boundingBox(); if (!r) throw new Error(id); points.push({ x: r.x + r.width / 2, y: r.y + r.height / 2, id: points.length + 1 }); }
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    } else { await page.keyboard.down('Space'); await page.keyboard.down('KeyX'); }
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(300); });
    await expect.poll(async () => (await read(page))?.hero.y ?? 300).toBeLessThan(220);
    await expect.poll(async () => (await read(page))?.shots.filter(p => p.friendly).length ?? 0).toBeGreaterThan(1);
    if (client) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
    } else { await page.keyboard.up('Space'); await page.keyboard.up('KeyX'); await page.keyboard.press('KeyP'); await expect(page.locator('#pause-title')).toHaveText('En pause'); }
    await goHome(page); await expect(page.locator('#game canvas')).toHaveCount(0); expect(await page.evaluate(() => window.__FERRAILLE_TEST__)).toBeUndefined();
    await page.goto('/#/ferraille'); await expect(page.locator('#game canvas')).toBeVisible(); expect(await page.evaluate(() => window.__FERRAILLE_TEST__)).toBeUndefined();
});

test('F09 F12 sauvegarde et déblocage après victoire réelle', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await victory(page, mobile);
    await tap(page, '#next-level', mobile);
    await page.reload(); await expect(page.locator('#resume')).toBeVisible(); await tap(page, '#resume', mobile); await tap(page, '#levels', mobile);
    await expect(page.locator('#level-list button')).toHaveCount(30); await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await tap(page, '#close-levels', mobile);
});

for (const level of [5, 12, 18, 30]) test(`F-DIV capture ferraille-level${String(level).padStart(2, '0')}`, async ({ page }, info) => {
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await page.evaluate(index => { const h = window.__FERRAILLE_TEST__; h?.loadLevel(index, 28); h?.scenario('showcase'); h?.advance(0); }, level - 1);
    await tap(page, '#resume', info.project.name === 'mobile-chromium');
    const s = await read(page); expect(s?.level).toBe(level - 1);
    if (level === 5 || level === 30) expect(s?.boss?.hp).toBeGreaterThan(0);
    if (level === 12) expect(s?.vehicle).toBe(true);
    if (level === 18) expect(s?.cages.length).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: `test-results/screenshots/ferraille-level${String(level).padStart(2, '0')}-${info.project.name}.png` });
});

test('F-SCENE-01 quatre palettes, parallaxe relative et texte réel des munitions', async ({ page }, info) => {
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await tap(page, '#resume', info.project.name === 'mobile-chromium');
    const palettes = [
        { level: 0, colors: [0x101e30, 0x182e43, 0x5e8d91] },
        { level: 5, colors: [0x392a25, 0x76513b, 0xd4a568] },
        { level: 10, colors: [0x102d28, 0x1d4b38, 0x83ae68] },
        { level: 15, colors: [0x121329, 0x292949, 0x8b8fc1] },
    ];
    for (const { level, colors } of palettes) {
        const rendering = await page.evaluate(index => {
            const h = window.__FERRAILLE_TEST__; h?.loadLevel(index, 460); h?.advance(0);
            h?.inspect({ heroX: 300, weapon: 'grenade', ammo: 7, score: 913 });
            return { before: h?.rendering(), text: h?.hudText() };
        }, level);
        expect(rendering.before?.palette).toEqual(colors);
        expect(rendering.text).toContain('GRENADES · 7'); expect(rendering.text).toContain('913 pts');
        expect(rendering.text).not.toContain('GRENADES · 913');
        const after = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.inspect({ heroX: 400 }); return h?.rendering(); });
        const before = rendering.before;
        if (!after || !before) throw new Error('Rendu absent');
        expect(after.camera - before.camera).toBe(100);
        expect(after.layers.map((layer, i) => layer.x - (before.layers[i]?.x ?? NaN))).toEqual([-15, -30, -55]);
        expect(after.layers[1]?.factor).toBeGreaterThan(after.layers[0]?.factor ?? NaN);
        await page.screenshot({ path: `test-results/screenshots/ferraille-palette-${String(level + 1)}-${info.project.name}.png` });
    }
});

for (const level of [5, 10, 15, 20, 25, 30]) test(`F-SCENE-02 gardien ${String(level)} silhouette cœur nom et vie`, async ({ page }, info) => {
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await page.evaluate(index => { const h = window.__FERRAILLE_TEST__; h?.loadLevel(index, 460); h?.scenario('showcase'); h?.advance(0); }, level - 1);
    await tap(page, '#resume', info.project.name === 'mobile-chromium');
    const expected = ['ÉVENTREUR', 'PILON', 'SCARABOMBE', 'FAUCHEUSE', 'TENAILLE', 'RÉACTEUR'][level / 5 - 1];
    if (!expected) throw new Error('Nom absent');
    const closed = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.inspect({ bossClock: 0 }); return { drawing: h?.rendering(), text: h?.hudText() }; });
    expect(closed.drawing?.boss?.name).toBe(expected); expect(closed.text).toContain(expected);
    expect(closed.text).toContain('BLINDÉ'); expect(closed.drawing?.boss?.core.exposed).toBe(false);
    expect(closed.drawing?.boss?.parts.length).toBeGreaterThanOrEqual(3);
    expect(closed.drawing?.boss?.health.hp).toBeGreaterThan(0);
    const shapes: string[] = [];
    for (const phase of level === 30 ? [1, 2, 3] : [1]) {
        const appearance = await page.evaluate(phase => {
            const h = window.__FERRAILLE_TEST__, max = h?.read().boss?.maxHp ?? 1;
            h?.inspect({ bossHp: phase === 1 ? max : phase === 2 ? max / 2 : 1, bossClock: 1300 });
            return { drawing: h?.rendering(), text: h?.hudText() };
        }, phase);
        expect(appearance.drawing?.boss?.core.exposed).toBe(true); expect(appearance.text).toContain(`P${String(phase)} OUVERT`);
        expect(appearance.drawing?.boss?.core.color).not.toBe(closed.drawing?.boss?.core.color);
        expect(appearance.drawing?.boss?.phase).toBe(phase);
        if (!appearance.drawing?.boss) throw new Error('Gardien absent');
        shapes.push(appearance.drawing.boss.shape);
        await page.screenshot({ path: `test-results/screenshots/ferraille-boss-${String(level)}-phase${String(phase)}-${info.project.name}.png` });
    }
    expect(new Set(shapes).size).toBe(level === 30 ? 3 : 1);
    const blinking = await page.evaluate(() => window.__FERRAILLE_TEST__?.rendering().boss?.core.alpha);
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(200); });
    expect(await page.evaluate(() => window.__FERRAILLE_TEST__?.rendering().boss?.core.alpha)).not.toBe(blinking);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const steady = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.advance(0); return h?.rendering(); });
    await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(200); });
    const later = await page.evaluate(() => window.__FERRAILLE_TEST__?.rendering());
    expect(steady?.reducedMotion).toBe(true); expect(later?.boss?.core.alpha).toBe(steady?.boss?.core.alpha);
    expect(later?.boss?.core.exposed).toBe(true);
});

test('F-SCENE-03 les six descriptions de rendu sont distinctes deux à deux', async ({ page }) => {
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    const descriptions = await page.evaluate(() => [4, 9, 14, 19, 24, 29].map(index => {
        const h = window.__FERRAILLE_TEST__; h?.loadLevel(index, 460); h?.advance(0); return h?.rendering().boss;
    }));
    for (const key of ['name', 'shape', 'colors', 'parts'] as const) expect(new Set(descriptions.map(d => JSON.stringify(d?.[key]))).size).toBe(6);
});
test('F20 tactile : Saut plus gros que Tir et Super, joystick à gauche du canevas en bandes, héros jamais sous une commande', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Commandes tactiles');
    const exposed = async () => page.evaluate(() => {
        const canvas = document.querySelector('#game canvas')?.getBoundingClientRect(), hero = window.__FERRAILLE_TEST__?.layout().hero;
        if (!canvas || !hero) throw new Error('Géométrie absente');
        const k = canvas.width / 360, box = { x: canvas.x + hero.x * k, y: canvas.y + hero.y * k, width: hero.width * k, height: hero.height * k };
        const controls = [...document.querySelectorAll<HTMLElement>('#touch-controls button, #touch-controls .joystick, #pause')].map(e => ({ id: e.id || e.className, r: e.getBoundingClientRect() })).filter(c => c.r.width > 0);
        const size = (id: string) => document.querySelector(`#${id}`)?.getBoundingClientRect().width ?? 0;
        const joystick = document.querySelector('#touch-controls .joystick')?.getBoundingClientRect();
        return {
            under: controls.filter(c => c.r.x < box.x + box.width && c.r.x + c.r.width > box.x && c.r.y < box.y + box.height && c.r.y + c.r.height > box.y).map(c => c.id),
            jump: size('ferraille-jump'), fire: size('ferraille-fire'), special: size('ferraille-special'),
            joystickRight: joystick ? joystick.x + joystick.width : 1e4, canvasLeft: canvas.x, side: document.body.classList.contains('side-controls'),
        };
    });
    for (const [width, height] of [[405, 480], [360, 640], [780, 412]] as const) {
        await page.setViewportSize({ width, height });
        // A distinct query per size: the same URL again would only be a hash change, not a fresh game.
        await page.goto(`/?test=1&taille=${String(width)}#/ferraille`);
        await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
        await tap(page, '#resume', true);
        await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(0); });
        const start = await exposed();
        expect(start.jump).toBeGreaterThan(start.fire); expect(start.jump).toBeGreaterThan(start.special);
        // 405×480: the layout keeps the bottom row (chooseLayout, L08: side bands only gain there when the
        // game frees rows under its canvas, which Ferraille does not). In bands, the joystick is left of the canvas.
        if (width === 405) expect(start.side).toBe(false);
        if (start.side) expect(start.joystickRight).toBeLessThanOrEqual(start.canvasLeft);
        expect(start.under, `${String(width)}×${String(height)} départ`).toEqual([]);
        // Walk, jump, and look again at each step.
        await walk(page, true, async () => {
            for (let i = 0; i < 6; i++) {
                await page.evaluate(() => { window.__FERRAILLE_TEST__?.advance(250); });
                expect((await exposed()).under, `${String(width)}×${String(height)} pas ${String(i)}`).toEqual([]);
            }
        });
    }
});

// F-FX-05: destroying the entry turret now bursts into scrap with a floating +100,
// in the real scene, with no shake or red edges (those belong to the hero being hit).
test('F-FX-05 la tourelle d’entrée détruite éclate en ferraille, sans retour « héros touché »', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.loadLevel(0, 460); h?.advance(0); });
    await tap(page, '#resume', false);
    await page.keyboard.down('KeyX');
    let kills = 0;
    for (let i = 0; i < 80 && !kills; i++) kills = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.advance(50); return h?.impacts().counts.kills ?? 0; });
    await page.keyboard.up('KeyX');
    expect(kills).toBeGreaterThanOrEqual(1);
    const fx = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.advance(120); return h?.impacts(); });
    expect(fx?.bursts).toContain('scrap'); expect(fx?.bursts).toContain('score');
    expect(fx?.counts.hurts).toBe(0); expect(fx?.red).toBe(0);
    await page.screenshot({ path: `test-results/screenshots/ferraille-impact-${info.project.name}.png` });
});
// F-FX-07: in the real scene, C fires a visible beam; a life lost with the fan says what hit
// and that the fan is lost.
test('F-FX-07 super-tir visible, vie perdue qui dit la cause et l’arme perdue', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium');
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.loadLevel(0, 460); h?.advance(0); });
    await tap(page, '#resume', false);
    await expect(page.locator('#keyboard-help')).toContainText('C : super-tir');
    await page.keyboard.press('KeyC');
    const beam = await page.evaluate(() => window.__FERRAILLE_TEST__?.impacts());
    expect(beam?.counts.beams).toBe(1); expect(beam?.bursts).toContain('beam');
    await page.screenshot({ path: `test-results/screenshots/ferraille-super-tir-${info.project.name}.png` });
    // The beam may already have destroyed the entry turret: the hurt comes from the pit of the danger scenario.
    await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.advance(400); h?.scenario('danger'); h?.inspect({ weapon: 'fan', ammo: 30 }); });
    await page.keyboard.down('ArrowRight');
    let message = '';
    for (let i = 0; i < 200 && !message; i++) message = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; h?.advance(50); return h?.impacts().message ?? ''; });
    await page.keyboard.up('ArrowRight');
    expect(message).toBe('Chute · Arme perdue : Éventail');
    await page.screenshot({ path: `test-results/screenshots/ferraille-cause-${info.project.name}.png` });
});
