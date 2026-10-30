import { test, expect } from './fixture';
import { ANALOG_DEAD_ZONE, FULL_DEFLECTION } from '../../src/engines/derapage/physics';
test('Z08 Z09 podium, défaite, progression, commandes réelles et HUD séparé', async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium';
    const activate = async (selector: string) => { if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click(); };
    const driveGate = async () => {
        if (mobile) {
            const b = await page.locator('#game canvas').boundingBox(); if (!b) throw new Error('Canevas absent');
            const cdp = await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + 32, y: b.y + 32 }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + 92, y: b.y + 32 }] });
            await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1500));
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
        } else {
            await page.keyboard.down('ArrowRight'); await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1500)); await page.keyboard.up('ArrowRight');
        }
    };
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:derapage:controls:v1', JSON.stringify({ camera: 'rotating', assist: true })); });
    await page.goto('/?test=1#/derapage');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ARCADE_TEST__?.games.derapage))).toBe(true);
    await activate('#resume'); await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(0));
    const bounds = await page.evaluate(() => window.__DERAPAGE_TEST__?.bounds()); if (!bounds) throw new Error('Boîtes absentes');
    expect(bounds.hud.height).toBeGreaterThan(40);
    expect(bounds.hud.y + bounds.hud.height).toBeLessThanOrEqual(bounds.forward.y);
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    for (const button of await page.locator('#touch-controls button').all()) {
        const b = await button.boundingBox(); if (b) { expect(b.width).toBeGreaterThanOrEqual(56); expect(b.height).toBeGreaterThanOrEqual(56); expect(b.y >= canvas.y + canvas.height || b.y + b.height <= canvas.y).toBe(true); }
    }
    await page.screenshot({ path: `test-results/screenshots/derapage-play-${info.project.name}.png` });
    // The scenario is a legal last-gate state, still requiring the kart to drive across it.
    await page.evaluate(() => window.__DERAPAGE_TEST__?.scenario('finish'));
    await driveGate();
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().status)).toBe('won'); await expect(page.locator('#next-level')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__DERAPAGE_TEST__?.hudText())).toContain('COUPE 1/4');
    await page.screenshot({ path: `test-results/screenshots/derapage-won-${info.project.name}.png` });
    await activate('#next-level'); expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().level)).toBe(1);
    await page.reload(); await expect(page.locator('#resume')).toBeVisible(); await activate('#resume');
    if (mobile) await activate('#game-menu-toggle'); await activate('#levels'); await expect(page.locator('#level-list button').nth(1)).toBeEnabled(); await activate('#close-levels');
    await page.evaluate(() => window.__DERAPAGE_TEST__?.scenario('danger'));
    await driveGate();
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().status)).toBe('lost'); await expect(page.locator('#retry-level')).toBeVisible();
    await page.screenshot({ path: `test-results/screenshots/derapage-lost-${info.project.name}.png` });
    await activate('#retry-level'); expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().status)).toBe('playing');
    await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(29, 28); window.__DERAPAGE_TEST__?.advance(0); });
    await page.screenshot({ path: `test-results/screenshots/derapage-level30-${info.project.name}.png` });
});
test('Z02 Z03 maintien tactile ou clavier et absence de crochet en production', async ({ page }, info) => {
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:derapage:controls:v1', JSON.stringify({ camera: 'rotating', assist: true })); });
    await page.goto('/?test=1#/derapage');
    if (info.project.name === 'mobile-chromium') await page.locator('#resume').tap(); else await page.locator('#resume').click();
    await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(2000));
    const before = await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.angle);
    if (info.project.name === 'mobile-chromium') {
        const right = await page.locator('#game canvas').boundingBox(), drift = await page.locator('#derapage-drift').boundingBox(); if (!right || !drift) throw new Error('Boutons absents');
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x + 32, y: right.y + 32, id: 1 }, { x: drift.x + 32, y: drift.y + 32, id: 2 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: right.x + 65, y: right.y + 32, id: 1 }, { x: drift.x + 32, y: drift.y + 32, id: 2 }] });
        await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(700));
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().controls.steer)).toBeGreaterThan(0);
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.driftMs)).toBeGreaterThan(0);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().controls.steer)).toBe(0);
    } else {
        await page.keyboard.down('ArrowRight'); await page.keyboard.down('Space'); await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(700)); await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
    }
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.angle)).not.toBe(before);
    await page.goto('/#/derapage'); await expect(page.locator('#game canvas')).toBeVisible(); expect(await page.evaluate(() => window.__DERAPAGE_TEST__)).toBeUndefined();
});

test('Z25 commandes analogiques mobiles, tailles et captures', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:derapage:controls:v1', JSON.stringify({ camera: 'rotating', assist: true })); });
    await page.goto('/?test=1#/derapage'); await page.locator('#resume').tap();
    await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(14, 28); window.__DERAPAGE_TEST__?.advance(2000); });
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    const drift = await page.locator('#derapage-drift').boundingBox(), bonus = await page.locator('#derapage-bonus').boundingBox();
    if (!drift || !bonus) throw new Error('Commandes absentes');
    expect(drift.width).toBeGreaterThanOrEqual(88); expect(drift.height).toBeGreaterThanOrEqual(88);
    expect(bonus.width).toBeGreaterThanOrEqual(56); expect(bonus.height).toBeGreaterThanOrEqual(56);
    expect(bonus.y + bonus.height).toBeLessThanOrEqual(drift.y);
    for (const box of [drift, bonus]) expect(box.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
    await expect(page.locator('#derapage-left, #derapage-right')).toHaveCount(0);
    const cdp = await page.context().newCDPSession(page);
    const x = canvas.x + canvas.width * .25, y = canvas.y + canvas.height * .6;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (const delta of [ANALOG_DEAD_ZONE - 1, ANALOG_DEAD_ZONE + 1, -33, 33, -FULL_DEFLECTION, FULL_DEFLECTION]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + delta, y, id: 1 }] });
        await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(0));
        const expected = Math.sign(delta) * Math.min(1, Math.max(0, Math.abs(delta) - ANALOG_DEAD_ZONE) / (FULL_DEFLECTION - ANALOG_DEAD_ZONE));
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().controls.steer)).toBeCloseTo(expected, 6);
    }
    await page.screenshot({ path: 'test-results/screenshots/derapage-mobile-controls.png' });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().controls.steer)).toBe(0);
    await page.evaluate(() => window.__DERAPAGE_TEST__?.scenario('trees-boost'));
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.boostMs)).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/screenshots/derapage-trees-boost.png' });
});

test('Z26 Z27 vues entières et arrivée visible', async ({ page }, info) => {
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:derapage:controls:v1', JSON.stringify({ camera: 'rotating', assist: true })); });
    await page.goto('/?test=1#/derapage');
    if (info.project.name === 'mobile-chromium') await page.locator('#resume').tap();
    else await page.locator('#resume').click();
    for (const [level, name] of [
        [0,'circuit-01'],[7,'circuit-08'],[14,'circuit-15'],[21,'circuit-22'],[29,'circuit-30'],
        [4,'le-rocher'],[1,'invalides'],[16,'ardennes'],[28,'slalom'],[29,'bmx'],
    ] as const) {
        await page.evaluate(i => { const hook=window.__DERAPAGE_TEST__; hook?.loadLevel(i,28); hook?.overview(true); },level);
        const track=await page.evaluate(()=>window.__DERAPAGE_TEST__?.read().track);
        expect(track?.finishLine).toBeDefined();
        await page.screenshot({ path:`test-results/screenshots/derapage-${name}-${info.project.name}.png` });
    }
});

test('Z28 Z29 chronos mobiles réservés, franchissement piloté et record persistant', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:derapage:controls:v1', JSON.stringify({ camera: 'rotating', assist: true })); });
    await page.goto('/?test=1#/derapage'); await page.locator('#resume').tap();
    await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(0, 28); window.__DERAPAGE_TEST__?.advance(1000); });
    const hud = page.locator('[data-derapage-hud]');
    await expect(hud).toBeVisible();
    await expect(hud).toContainText('COURSE 00:01.00');
    await expect(hud).toContainText('TOUR 00:01.00');
    await expect(hud).toContainText('MEILLEUR');
    const bounds = await page.evaluate(() => window.__DERAPAGE_TEST__?.bounds());
    if (!bounds) throw new Error('Boîtes absentes');
    expect(bounds.hud.y + bounds.hud.height).toBeLessThanOrEqual(bounds.forward.y);
    await page.evaluate(() => window.__DERAPAGE_TEST__?.scenario('lap'));
    const canvas = await page.locator('#game canvas').boundingBox(); if (!canvas) throw new Error('Canevas absent');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: canvas.x + 32, y: canvas.y + 32 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: canvas.x + 92, y: canvas.y + 32 }] });
    await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1500));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().timing.lapTimesMs.length)).toBe(1);
    await expect(page.locator('[data-lap-delta]')).toBeVisible();
    await expect(hud).toContainText('Nouveau record !');
    const record = await page.evaluate(() => {
        const raw = localStorage.getItem('arcade-lab:derapage:v1');
        return (JSON.parse(raw ?? '{}') as { circuitRecords?: Record<string, number> }).circuitRecords?.['La Flèche des prés'];
    });
    expect(record).toBeGreaterThan(0);
    await page.reload(); await page.locator('#resume').tap();
    expect(await page.evaluate(() => {
        const raw = localStorage.getItem('arcade-lab:derapage:v1');
        return (JSON.parse(raw ?? '{}') as { circuitRecords?: Record<string, number> }).circuitRecords?.['La Flèche des prés'];
    })).toBe(record);
});


test('Z30 Z34 porte et saut en vue de jeu', async ({ page }, info) => {
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:derapage:controls:v1', JSON.stringify({ camera: 'rotating', assist: true })); });
    await page.goto('/?test=1#/derapage');
    if (info.project.name === 'mobile-chromium') await page.locator('#resume').tap();
    else await page.locator('#resume').click();
    for (const [scenario, name, ms] of [['slalom-gate', 'slalom-porte', 100], ['bmx-jump', 'bmx-saut', 150]] as const) {
        await page.evaluate(({ scenario, ms }) => {
            const hook = window.__DERAPAGE_TEST__;
            hook?.scenario(scenario); hook?.advance(ms);
        }, { scenario, ms });
        const state = await page.evaluate(() => window.__DERAPAGE_TEST__?.read());
        if (scenario === 'bmx-jump') expect(state?.karts[0]?.jumpHeight).toBeGreaterThan(0);
        else expect(state?.track.slalom.length).toBe(6);
        await page.screenshot({ path: `test-results/screenshots/derapage-${name}-${info.project.name}.png` });
    }
});

test('Z37 mobile : joystick nord en haut, indicateurs et préférence caméra', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.goto('/?test=1#/derapage'); await page.locator('#resume').tap();
    await page.locator('#game-menu-toggle').tap();
    await expect(page.locator('#derapage-assist')).toHaveText('Aide : oui');
    await page.locator('#derapage-assist').tap(); await page.locator('#game-menu-toggle').tap();
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!canvas) throw new Error('Canevas absent');
    const x = canvas.x + canvas.width * .75, y = canvas.y + canvas.height * .55;
    const cdp = await page.context().newCDPSession(page);
    for (const [dx, dy, target] of [[0, -40, -Math.PI / 2], [-40, 0, Math.PI], [40, 0, 0]] as const) {
        await page.evaluate(() => { window.__DERAPAGE_TEST__?.loadLevel(0, 28); });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy, id: 1 }] });
        await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(1200));
        const state = await page.evaluate(() => window.__DERAPAGE_TEST__?.read());
        expect(state?.controls.mode).toBe('joystick');
        expect(state?.controls.heading).toBe(target);
        const angle = state?.karts[0]?.angle;
        if (angle === undefined) throw new Error('Kart absent');
        expect(Math.abs(Math.atan2(Math.sin(angle - target), Math.cos(angle - target)))).toBeLessThan(.2);
        await page.screenshot({ path: `test-results/screenshots/derapage-joystick-${String(dx)}-${String(dy)}.png` });
        const before = angle;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(100));
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().karts[0]?.angle)).toBe(before);
    }
    await cdp.detach();
    await page.locator('#game-menu-toggle').tap();
    await expect(page.locator('#derapage-camera')).toHaveText('Caméra : fixe');
    await page.locator('#derapage-camera').tap();
    await expect(page.locator('#derapage-camera')).toHaveText('Caméra : tournante');
    await page.reload(); await page.locator('#resume').tap(); await page.locator('#game-menu-toggle').tap();
    await expect(page.locator('#derapage-camera')).toHaveText('Caméra : tournante');
});

test('Z37 clavier : directions absolues et diagonales en caméra fixe', async ({ page }) => {
    await page.goto('/?test=1#/derapage'); await page.locator('#resume').click();
    for (const [keys, target] of [
        [['ArrowUp'], -Math.PI / 2], [['ArrowLeft'], Math.PI], [['ArrowRight'], 0], [['ArrowDown'], Math.PI / 2], [['ArrowUp', 'ArrowRight'], -Math.PI / 4],
    ] as const) {
        for (const key of keys) await page.keyboard.down(key);
        await page.evaluate(() => window.__DERAPAGE_TEST__?.advance(0));
        expect(await page.evaluate(() => window.__DERAPAGE_TEST__?.read().controls.heading)).toBe(target);
        for (const key of keys) await page.keyboard.up(key);
    }
});
