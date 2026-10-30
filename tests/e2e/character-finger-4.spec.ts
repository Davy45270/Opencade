import { test, expect } from './fixture';
import type { Page, TestInfo } from '@playwright/test';
import { Finger } from './character-finger-input';
import { FingerClock } from './finger-clock';
import { Engine as Runner } from '../../src/engines/ferraille/engine';
import { pilot as run } from '../../src/engines/ferraille/pilot';
import { Engine as Fleet } from '../../src/engines/essaim/engine';
import { pilot as fly } from '../../src/engines/essaim/pilot';
import { Engine as Bricks } from '../../src/engines/briqueterie/engine';
import { controller } from '../../scripts/briqueterie-pilot.js';
type Game = 'ferraille' | 'briqueterie' | 'essaim';
async function read(page: Page, game: Game) {
    return page.evaluate(game => {
        const hook = game === 'ferraille' ? window.__FERRAILLE_TEST__ : game === 'essaim' ? window.__ESSAIM_TEST__ : window.__BRIQUETERIE_TEST__;
        if (!hook) throw new Error('Missing hook'); return hook.read();
    }, game);
}
async function capture(page: Page, info: TestInfo, name: string) {
    const path = info.outputPath(`${name}.png`); await page.screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function layout(page: Page) {
    const boxes = await page.evaluate(() => {
        const box = (element: Element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
        const canvas = document.querySelector('#game canvas'); if (!canvas) throw new Error('Missing field');
        const field = box(canvas), s = window.__ESSAIM_TEST__?.read(); if (!s || !('cannon' in s)) throw new Error('Missing ship');
        const ship = { x: field.x + (s.cannon - 29) / 360 * field.w, y: field.y + 521 / 640 * field.h, w: 58 / 360 * field.w, h: 58 / 640 * field.h };
        return { field, ship, controls: [...document.querySelectorAll('#touch-controls button')].map(box) };
    });
    const overlap = (a: typeof boxes.field, b: typeof boxes.field) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const [i, button] of boxes.controls.entries()) {
        expect(button.w).toBeGreaterThanOrEqual(56); expect(button.h).toBeGreaterThanOrEqual(56);
        expect(overlap(button, boxes.field)).toBe(false); expect(overlap(button, boxes.ship)).toBe(false);
        for (const other of boxes.controls.slice(i + 1)) expect(overlap(button, other)).toBe(false);
    }
    return boxes;
}
for (const game of ['ferraille', 'briqueterie', 'essaim'] as const) test(`P-${game} doigt bruité / deux pouces, niveaux 1 et 10`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(600000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'dragon'); });
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'ferraille' ? window.__FERRAILLE_TEST__ : game === 'essaim' ? window.__ESSAIM_TEST__ : window.__BRIQUETERIE_TEST__), game), { timeout: 30000 }).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [], entries: unknown[] = [];
    let seed = 84;
    const noise = () => { seed = seed * 16807 % 2147483647; return seed % 25 - 12; };
    try {
        await finger.press(['#resume']);
        for (const level of [0, 9]) {
            await page.evaluate(({ game, level }) => {
                if (game === 'ferraille') window.__FERRAILLE_TEST__?.loadLevel(level, 28);
                else if (game === 'essaim') window.__ESSAIM_TEST__?.loadLevel(level, 28);
                else window.__BRIQUETERIE_TEST__?.loadLevel(level, 28);
            }, { game, level });
            const clock = new FingerClock(); clock.observe(await read(page, game)); let uses = 0, touchErrors = 0;
            if (game === 'essaim') {
                await layout(page); await capture(page, info, 'essaim-controles-portrait');
                // Level 10 exercises the same two thumbs in landscape.
                if (level === 9) { await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(200); await layout(page); await capture(page, info, 'essaim-controles-paysage'); }
            }
            await capture(page, info, `perso-${game}-jeu`);
            while (clock.elapsed < 150000) {
                const state = await read(page, game); clock.observe(state); if (state.status !== 'playing') break;
                expect(state.character.id).toBe('dragon');
                const selectors: string[] = []; let stick: { x: number; y: number } | undefined, paddle: number | undefined, thumb: number | undefined;
                if (game === 'ferraille' && 'hero' in state) {
                    const model = new Runner(); model.loadLevel(level, state.seed); model.loadState(state); model.step(clock.horizon); run(model);
                    const input = model.state.input;
                    if (input.x || input.y) stick = { x: input.x, y: input.y };
                    if (input.jump) selectors.push('#ferraille-jump'); if (input.fire) selectors.push('#ferraille-fire');
                    if (!uses && (state.ticks >= 120 || state.enemies.some(e => Math.abs(e.x - state.hero.x) < 65))) selectors.push('#ferraille-special');
                } else if (game === 'essaim' && 'cannon' in state) {
                    const model = new Fleet(level, state.seed); model.loadState(state); model.step(clock.horizon); fly(model, model.state.ticks);
                    const target = model.state.target ?? state.cannon, dx = target - model.state.cannon;
                    thumb = dx;
                    // A simultaneous left and right thumb packet, including at least one shield.
                    if (!state.specialUsed) selectors.push('#essaim-special');
                    if (model.has('charge') && state.ticks % 100 < 90) selectors.push('#essaim-fire');
                } else if (game === 'briqueterie' && 'bricks' in state) {
                    const model = new Bricks(level, state.seed); model.loadState(state); model.step(clock.horizon);
                    paddle = controller(model, state.ticks, 0);
                    if (state.ready) selectors.push('#briqueterie-launch');
                    if (!uses) selectors.push('#briqueterie-special');
                }
                const targets = await page.evaluate(({ selectors, stick, paddle, thumb }) => {
                    const targets = selectors.map(selector => { const el = document.querySelector(selector); if (!el) throw new Error(selector); const r = el.getBoundingClientRect(); return { selector, x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
                    if (stick) { const r = document.querySelector('.joystick')?.getBoundingClientRect(); if (!r) throw new Error('Missing stick'); targets.push({ selector: '.joystick', x: r.x + r.width / 2 + stick.x * 43 / Math.hypot(stick.x, stick.y), y: r.y + r.height / 2 + stick.y * 43 / Math.hypot(stick.x, stick.y) }); }
                    if (thumb !== undefined) { const r = document.querySelector('#essaim-steer')?.getBoundingClientRect(); if (!r) throw new Error('Missing thumb pad'); targets.push({ selector: '#essaim-steer', x: r.x + r.width / 2 + Math.max(-43, Math.min(43, thumb)) * r.width / 120, y: r.y + r.height / 2 }); }
                    if (paddle !== undefined) { const r = document.querySelector('#game canvas')?.getBoundingClientRect(); if (!r) throw new Error('Missing canvas'); targets.push({ selector: '#game canvas', x: r.x + Math.max(20, Math.min(340, paddle)) / 360 * r.width, y: r.y + r.height * .94 }); }
                    return targets;
                }, { selectors, stick, paddle, thumb });
                const points = targets.map((t, id) => ({ id, x: t.x + noise(), y: t.y + noise() }));
                const missed = await page.evaluate(({ targets, points }) => points.some((p, i) => !document.elementFromPoint(p.x, p.y)?.closest(targets[i]?.selector ?? 'missing')), { targets, points });
                touchErrors += Number(missed);
                await page.waitForTimeout(150); await finger.release();
                if (points.length) await finger.touch('touchStart', points);
                const accepted = await read(page, game);
                const activated = 'hero' in state && 'hero' in accepted
                    ? (accepted.specialCooldown ?? 0) > (state.specialCooldown ?? 0)
                    : 'specialUsed' in accepted && !('specialUsed' in state && state.specialUsed) && accepted.specialUsed === true;
                if (activated) uses++;
                entries.push({ timeMs: clock.elapsed, level: level + 1, points, selectors, missed });
            }
            await finger.release(); const final = await read(page, game);
            results.push({ level: level + 1, timeMs: clock.elapsed, uses, touchErrors, victory: final.status === 'won', score: final.score });
            expect(uses).toBeGreaterThan(0); expect(touchErrors).toBe(0); expect(final.status).toBe('won');
            // Separate presentation after driving: capture the actual active effect.
            await page.evaluate(({ game, level }) => {
                if (game === 'ferraille') window.__FERRAILLE_TEST__?.loadLevel(level, 28);
                else if (game === 'essaim') window.__ESSAIM_TEST__?.loadLevel(level, 28);
                else window.__BRIQUETERIE_TEST__?.loadLevel(level, 28);
            }, { game, level });
            await finger.press([`#${game}-special`]);
            await capture(page, info, `perso-${game}-special`);
        }
    } finally {
        await finger.release(); await cdp.detach();
        await info.attach(`perso-${game}-doigt-bruite.json`, { body: JSON.stringify({ latencyMs: 150, noisePx: 12, realtime: true, results, entries }), contentType: 'application/json' });
    }
});
test('P-essaim le bouclier change la défaite en victoire en temps réel', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.goto('/?test=1#/essaim'); await expect.poll(() => page.evaluate(() => !!window.__ESSAIM_TEST__), { timeout: 30000 }).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results = [];
    try {
        await finger.press(['#resume']);
        for (const special of [false, true]) {
            await page.evaluate(() => window.__ESSAIM_TEST__?.scenario('special'));
            if (special) await finger.press(['#essaim-special']);
            await expect.poll(async () => (await read(page, 'essaim')).status, { timeout: 30000 }).toBe(special ? 'won' : 'lost');
            results.push({ special, final: await read(page, 'essaim') });
        }
        await capture(page, info, 'perso-essaim-special-decisif');
    } finally { await finger.release(); await cdp.detach(); await info.attach('essaim-special-issue.json', { body: JSON.stringify({ results, entries: finger.entries }), contentType: 'application/json' }); }
});
