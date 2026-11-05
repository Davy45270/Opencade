import { test, expect } from './fixture';
import type { Page, TestInfo } from '@playwright/test';
import { Finger } from './finger-stepped';
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
        if (game === 'dedale') { window.__DEDALE_TEST__?.loadLevel(level, 28); window.__DEDALE_TEST__?.advance(0); }
        else if (game === 'orbite') { window.__ORBITE_TEST__?.loadLevel(level, 28); window.__ORBITE_TEST__?.advance(0); }
        else { window.__EMPILO_TEST__?.loadLevel(level, 28); window.__EMPILO_TEST__?.advance(0); }
    }, { game, level });
}
// Empilo is played by gestures: tap to turn, drag to move, quick swipe down to drop, tap the reserve tile.
type Stepped = Awaited<ReturnType<typeof Finger.create>>;
async function onCanvas(page: Page, x: number, y: number) {
    const r = await page.locator('#game canvas').boundingBox(); if (!r) throw new Error('Canevas absent');
    return { id: 0, x: r.x + r.width * x / 360, y: r.y + r.height * y / 640 };
}
async function empiloTap(page: Page, finger: Stepped, x = 144, y = 300): Promise<void> {
    await finger.touch('touchStart', [await onCanvas(page, x, y)]); await finger.release();
}
const empiloReserve = (page: Page, finger: Stepped) => empiloTap(page, finger, 316, 188);
async function empiloDrop(page: Page, finger: Stepped): Promise<void> {
    await finger.touch('touchStart', [await onCanvas(page, 144, 300)]);
    const landing = finger.entries.at(-1)?.points[0]; if (!landing) throw new Error('Toucher absent');
    // 100 px down within the 350 ms of a quick swipe; the +-12 px noise stays under one column (30 px).
    await finger.touch('touchMove', [{ id: 0, x: landing.x, y: landing.y + 100 }]); await finger.release();
}
async function capture(page: Page, info: TestInfo, game: Game, id: CharacterId, kind: 'jeu' | 'special') {
    const name = `perso-${game}-${kind}`, path = info.outputPath(`${name}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    await info.attach(`perso-${id}-${game}-${kind}`, { path, contentType: 'image/png' });
}
for (const [index, game] of (['dedale', 'orbite', 'empilo'] as const).entries()) test(`P-${game} doigt bruité, temps piloté, niveaux 1 et 10`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(1800000);
    await page.setViewportSize({ width: 390, height: 844 });
    const id = ids[index + 1] ?? 'panda';
    await page.addInitScript(id => { localStorage.setItem('arcade-lab:character:v1', id); }, id);
    // Dédale's noisy finger plays the optional grouped cross (swipes are the default).
    if (game === 'dedale') await page.addInitScript(() => { localStorage.setItem('arcade-lab:dedale:cross:v1', 'on'); });
    await Finger.prepare(page);
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'dedale' ? window.__DEDALE_TEST__ : game === 'orbite' ? window.__ORBITE_TEST__ : window.__EMPILO_TEST__), game)).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = await Finger.create(page, cdp), results: unknown[] = [];
    try {
        await finger.press(['#resume']);
        for (const level of [0, 9]) {
            await load(page, game, level);
            const started = finger.elapsed, first = finger.entries.length, decisions: unknown[] = [];
            expect((await read(page, game)).character.id).toBe(id);
            // Empilo's special is now the RESERVE tile on the canvas (no button): same refusal at the start.
            if (game === 'empilo') await empiloReserve(page, finger); else await finger.press([`#${game}-special`]);
            const special = await read(page, game); expect(special.specialUses).toBe(0);
            if (game === 'dedale') {
                const model = new Maze(level, 28);
                while (finger.elapsed - started < 90000) {
                    const state = await page.evaluate(() => { const hook = window.__DEDALE_TEST__; if (!hook) throw new Error('Missing dedale'); return hook.read(); });
                    if (state.status !== 'playing') break;
                    model.loadState(state); model.step(150);
                    if (model.status === 'won') { await finger.advance(150); continue; }
                    const action: Direction | undefined = route(model)?.[0];
                    if (!action) throw new Error('Missing maze route');
                    decisions.push({ atMs: finger.elapsed - started, ticks: state.ticks, action });
                    await finger.press([`#dedale-${action}`]);
                }
            } else if (game === 'orbite') {
                const model = new Orbit(level, 28);
                // Automatic fire (default): each delayed decision moves the cannon by a real noisy touch.
                while (finger.elapsed - started < 120000) {
                    const state = await page.evaluate(() => { const hook = window.__ORBITE_TEST__; if (!hook) throw new Error('Missing orbite'); return hook.read(); });
                    if (state.status !== 'playing') break;
                    model.loadState(state); model.step(150); pilot(model);
                    const target = model.state.target ?? 180;
                    const r = await page.locator('#game canvas').boundingBox(); if (!r) throw new Error('Missing canvas');
                    const points = [{ id: 0, x: r.x + r.width * target / 360, y: r.y + r.height * 610 / 640 }];
                    await finger.touch('touchStart', points, ['#game canvas']);
                    const missed = await page.evaluate(points => {
                        const cannon = points[0];
                        return !cannon || !document.elementFromPoint(cannon.x, cannon.y)?.closest('#game canvas');
                    }, points);
                    expect(missed).toBe(false);
                    decisions.push({ atMs: finger.elapsed - started, ticks: state.ticks, target });
                }
                await finger.release();
            } else {
                pieces: while (finger.elapsed - started < 120000) {
                    const state = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing empilo'); return hook.read(); });
                    if (state.status !== 'playing') break;
                    const placement = empiloPlacement(state); if (!placement) throw new Error('Missing stack placement');
                    decisions.push({ atMs: finger.elapsed - started, active: state.active, placement });
                    for (let i = 0; i < placement.rotations; i++) {
                        const current = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing stack'); return hook.read(); });
                        if (current.status !== 'playing' || current.next.join() !== state.next.join()) continue pieces;
                        await empiloTap(page, finger);
                    }
                    // One drag: each move lands 45 px past the last 30 px step (noise +-24 px), so exactly one column.
                    let origin: number | null = null, y = 0;
                    for (let step = 0; step < 9; step++) {
                        const current = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing empilo'); return hook.read(); });
                        if (current.status !== 'playing' || current.next.join() !== state.next.join()) { await finger.release(); continue pieces; }
                        if (current.active.x === placement.x) break;
                        if (origin === null) {
                            await finger.touch('touchStart', [await onCanvas(page, 144, 300)]);
                            const landing = finger.entries.at(-1)?.points[0]; if (!landing) throw new Error('Toucher absent');
                            origin = landing.x; y = landing.y; continue;
                        }
                        const sign = current.active.x < placement.x ? 1 : -1;
                        await finger.touch('touchMove', [{ id: 0, x: origin + sign * 45, y }]); origin += sign * 30;
                    }
                    await finger.release();
                    const current = await page.evaluate(() => { const hook = window.__EMPILO_TEST__; if (!hook) throw new Error('Missing stack'); return hook.read(); });
                    if (current.status !== 'playing' || current.next.join() !== state.next.join()) continue pieces;
                    await empiloDrop(page, finger);
                }
            }
            const final = await read(page, game), entries = finger.entries.slice(first);
            await finger.attach(info, `stepped-${game}-${String(level + 1)}.json`);
            results.push({ level: level + 1, timeMs: finger.elapsed - started, decisions, entries, touchErrors: entries.filter(e => e.missed).length, victory: final.status === 'won', final });
            expect(entries.filter(e => e.missed)).toEqual([]); expect(final.status).toBe('won');
        }
        // Screenshots only after driving has ended. Separate static special showcase.
        await capture(page, info, game, id, 'jeu');
        await load(page, game, 0);
        if (game === 'empilo') await empiloReserve(page, finger); else { await finger.press([`#${game}-special`]); await finger.release(); }
        await capture(page, info, game, id, 'special');
    } finally {
        const final = await read(page, game).catch(() => null);
        await info.attach(`perso-${game}-doigt-bruite.json`, { body: JSON.stringify({ game, character: id, finalStatus: final?.status, touchErrors: finger.entries.filter(e => e.missed).length, clock: 'stepped', viewport: [390, 844], latencyMs: 150, noisePx: 12, results, entries: finger.entries }, null, 2), contentType: 'application/json' });
        await finger.release(); await finger.attach(info); await cdp.detach();
    }
});
test('P-empilo réserve change défaite en victoire, mêmes touches de chute', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(1800000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'panda'); });
    await Finger.prepare(page);
    await page.goto('/?test=1#/empilo');
    await expect.poll(() => page.evaluate(() => Boolean(window.__EMPILO_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = await Finger.create(page, cdp), results: unknown[] = [];
    try {
        await finger.press(['#resume']);
        for (const special of [false, true]) {
            await page.evaluate(() => { window.__EMPILO_TEST__?.scenario('reserve'); window.__EMPILO_TEST__?.advance(0); });
            const started = finger.elapsed;
            if (special) await empiloReserve(page, finger);
            await empiloDrop(page, finger);
            await finger.until(async () => (await page.evaluate(() => window.__EMPILO_TEST__?.read().status)) === (special ? 'won' : 'lost'));
            results.push({ special, timeMs: finger.elapsed - started, victory: (await read(page, 'empilo')).status === 'won' });
        }
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
        await capture(page, info, 'empilo', 'panda', 'special');
    } finally {
        await info.attach('perso-empilo-issue.json', { body: JSON.stringify({ results, latencyMs: 150, noisePx: 12, entries: finger.entries, touchErrors: finger.entries.filter(e => e.missed).length }), contentType: 'application/json' });
        await finger.release(); await finger.attach(info); await cdp.detach();
    }
});
