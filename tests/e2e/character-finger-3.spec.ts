import { test, expect } from './fixture';
import type { Page, TestInfo } from '@playwright/test';
import { Finger } from './character-finger-input';
import { Engine as Maze, type Direction } from '../../src/engines/dedale/engine';
import { route } from '../../src/engines/dedale/solver';
import { Engine as Orbit } from '../../src/engines/orbite/engine';
import { pilot } from '../../src/engines/orbite/pilot';
import { empiloPlacement } from './character-policy-3';
import { ids, type CharacterId } from '../../src/characters/model';
type Game = 'dedale' | 'orbite' | 'empilo';
async function read(page: Page, game: Game) {
    return page.evaluate(game => {
        if (game === 'dedale') { const hook = window.__DEDALE_TEST__; if (!hook) throw new Error('Missing maze'); return hook.read(); }
        if (game === 'orbite') { const hook = window.__ORBITE_TEST__; if (!hook) throw new Error('Missing orbit'); return hook.read(); }
        const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing stack'); return hook.read();
    }, game);
}
async function load(page: Page, game: Game, level: number) {
    await page.evaluate(({ game, level }) => {
        if (game === 'dedale') window.__DEDALE_TEST__?.loadLevel(level, 28);
        else if (game === 'orbite') window.__ORBITE_TEST__?.loadLevel(level, 28);
        else window.__EMPILO_TEST__?.loadLevel(level, 28);
    }, { game, level });
}
async function capture(page: Page, info: TestInfo, game: Game, id: CharacterId, kind: 'jeu' | 'special') {
    const name = `perso-${game}-${kind}`, path = info.outputPath(`${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    await info.attach(`perso-${id}-${game}-${kind}`, { path, contentType: 'image/png' });
}
for (const [index, game] of (['dedale', 'orbite', 'empilo'] as const).entries()) test(`P-${game} doigt bruité, temps réel, niveaux 1 et 10`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(300000);
    await page.setViewportSize({ width: 390, height: 844 });
    const id = ids[index + 1] ?? 'panda';
    await page.addInitScript(id => { localStorage.setItem('arcade-lab:character:v1', id); }, id);
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'dedale' ? window.__DEDALE_TEST__ : game === 'orbite' ? window.__ORBITE_TEST__ : window.__EMPILO_TEST__), game)).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [];
    try {
        await finger.press(['#resume']);
        for (const level of [0, 9]) {
            await load(page, game, level);
            const started = Date.now(), first = finger.entries.length, decisions: unknown[] = [];
            expect((await read(page, game)).character.id).toBe(id);
            await finger.press([`#${game}-special`]);
            const special = await read(page, game); expect(special.specialUses).toBe(0);
            if (game === 'dedale') {
                const model = new Maze(level, 28);
                while (Date.now() - started < 90000) {
                    const state = await page.evaluate(() => { const hook = window.__DEDALE_TEST__; if (!hook) throw new Error('Missing dedale'); return hook.read(); });
                    if (state.status !== 'playing') break;
                    model.loadState(state); model.step(150);
                    if (model.status === 'won') { await page.waitForTimeout(150); continue; }
                    const action: Direction | undefined = route(model)?.[0];
                    if (!action) throw new Error('Missing maze route');
                    decisions.push({ atMs: Date.now() - started, ticks: state.ticks, action });
                    await finger.press([`#dedale-${action}`]);
                }
            } else if (game === 'orbite') {
                const model = new Orbit(level, 28);
                // Keep fire held; each delayed decision moves the cannon by a real noisy drag.
                await finger.steer(['#orbite-fire']);
                while (Date.now() - started < 120000) {
                    const state = await page.evaluate(() => { const hook = window.__ORBITE_TEST__; if (!hook) throw new Error('Missing orbite'); return hook.read(); });
                    if (state.status !== 'playing') break;
                    model.loadState(state); model.step(150); pilot(model);
                    const target = model.state.target ?? 180;
                    const r = await page.locator('#game canvas').boundingBox(); if (!r) throw new Error('Missing canvas');
                    const fire = await page.locator('#orbite-fire').boundingBox(); if (!fire) throw new Error('Missing fire');
                    // Integer deterministic noise, independently on both axes, bounded by 12 px.
                    const n = decisions.length, dx = n * 7 % 25 - 12, dy = n * 11 % 25 - 12;
                    const points = [{ id: 0, x: r.x + r.width * target / 360 + dx, y: r.y + r.height * 610 / 640 + dy },
                        { id: 1, x: fire.x + fire.width / 2 + dy, y: fire.y + fire.height / 2 + dx }];
                    await page.waitForTimeout(150); await finger.release(); await finger.touch('touchStart', points);
                    const missed = await page.evaluate(points => {
                        const fire = points[1], cannon = points[0];
                        return !fire || !cannon || !document.elementFromPoint(fire.x, fire.y)?.closest('#orbite-fire') || !document.elementFromPoint(cannon.x, cannon.y)?.closest('#game canvas');
                    }, points);
                    finger.entries.push({ selectors: ['#game canvas', '#orbite-fire'], points, timeMs: Date.now() - started, missed });
                    decisions.push({ atMs: Date.now() - started, ticks: state.ticks, target });
                }
                await finger.release();
            } else {
                pieces: while (Date.now() - started < 120000) {
                    const state = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing empilo'); return hook.read(); });
                    if (state.status !== 'playing') break;
                    const placement = empiloPlacement(state); if (!placement) throw new Error('Missing stack placement');
                    decisions.push({ atMs: Date.now() - started, active: state.active, placement });
                    for (let i = 0; i < placement.rotations; i++) {
                        const current = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing stack'); return hook.read(); });
                        if (current.status !== 'playing' || current.next.join() !== state.next.join()) continue pieces;
                        await finger.press(['#empilo-clockwise']);
                    }
                    for (let step = 0; step < 9; step++) {
                        const current = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing empilo'); return hook.read(); });
                        if (current.status !== 'playing' || current.next.join() !== state.next.join()) continue pieces;
                        if (current.active.x === placement.x) break;
                        await finger.press([current.active.x < placement.x ? '#empilo-right' : '#empilo-left']);
                    }
                    const current = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing stack'); return hook.read(); });
                    if (current.status !== 'playing' || current.next.join() !== state.next.join()) continue pieces;
                    await finger.press(['#empilo-drop']);
                }
            }
            const final = await read(page, game), entries = finger.entries.slice(first);
            results.push({ level: level + 1, timeMs: Date.now() - started, decisions, entries, touchErrors: entries.filter(e => e.missed).length, victory: final.status === 'won', final });
            expect(entries.filter(e => e.missed)).toEqual([]); expect(final.status).toBe('won');
        }
        // Screenshots only after driving has ended. Separate static special showcase.
        await capture(page, info, game, id, 'jeu');
        await load(page, game, 0); await finger.press([`#${game}-special`]); await finger.release();
        await capture(page, info, game, id, 'special');
    } finally {
        const final = await read(page, game).catch(() => null);
        await info.attach(`perso-${game}-doigt-bruite.json`, { body: JSON.stringify({ game, character: id, finalStatus: final?.status, touchErrors: finger.entries.filter(e => e.missed).length, realtime: true, viewport: [390, 844], latencyMs: 150, noisePx: 12, results, entries: finger.entries }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
test('P-empilo réserve change défaite en victoire, mêmes touches de chute', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'panda'); });
    await page.goto('/?test=1#/empilo');
    await expect.poll(() => page.evaluate(() => Boolean(window.__EMPILO_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [];
    try {
        await finger.press(['#resume']);
        for (const special of [false, true]) {
            await page.evaluate(() => { window.__EMPILO_TEST__?.scenario('reserve'); });
            const started = Date.now();
            if (special) await finger.press(['#empilo-special']);
            await finger.press(['#empilo-drop']);
            await expect.poll(() => page.evaluate(() => window.__EMPILO_TEST__?.read().status)).toBe(special ? 'won' : 'lost');
            results.push({ special, timeMs: Date.now() - started, victory: (await read(page, 'empilo')).status === 'won' });
        }
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
        await capture(page, info, 'empilo', 'panda', 'special');
    } finally {
        await info.attach('perso-empilo-issue.json', { body: JSON.stringify({ results, latencyMs: 150, noisePx: 12, entries: finger.entries, touchErrors: finger.entries.filter(e => e.missed).length }), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
