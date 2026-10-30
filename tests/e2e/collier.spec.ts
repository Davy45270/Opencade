import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { decision } from './collier-policy';
import { GAME_NAME } from '../../src/engines/collier/levels';
import type { Page } from '@playwright/test';
import type {} from '../../src/games/collier/scene';
async function state(page: Page) {
    return page.evaluate(() => {
            const state = window.__COLLIER_TEST__?.read();
            return state ? { ...state, paths: [] } : undefined;
        });
}
async function point(page: Page, x: number, y: number) {
    const box = await page.locator('#game canvas').boundingBox();
    if (!box)
        throw new Error('Canevas absent');
    const view = await page.evaluate(() => window.__COLLIER_TEST__?.view());
    if (!view) throw new Error('Transformation absente');
    return { x: box.x + (x * view.scale + view.x) * box.width / 360, y: box.y + (y * view.scale + view.y) * box.height / 640 };
}
test('Collier : victoire, niveau suivant, défaite, reprise et captures', async ({ page, isMobile }, info) => {
    await page.goto('/?test=1#/collier');
    await expect.poll(() => state(page)).toBeTruthy();
    if (isMobile)
        await page.locator('#resume').tap();
    else
        await page.locator('#resume').click();
    await page.screenshot({ path: `test-results/screenshots/collier-play-${info.project.name}.png` });
    // Real reserve/hero taps exercise the canvas targets, independently of ⇄.
    await page.evaluate(() => {
        window.__COLLIER_TEST__?.scenario('combo');
        window.__COLLIER_TEST__?.advance(0);
    });
    const setup = await state(page);
    if (!setup)
        throw new Error('État absent');
    const reserve = await point(page, setup.shooter.x + 44, setup.shooter.y + 35);
    const hero = await point(page, setup.shooter.x, setup.shooter.y);
    const finger = isMobile ? new Finger(page, await page.context().newCDPSession(page)) : null;
    if (finger) {
        await finger.touch('touchStart', [{ id: 0, ...reserve }]);
        await finger.release();
    }
    else
        await page.mouse.click(reserve.x, reserve.y);
    await expect.poll(async () => (await state(page))?.current).toBe(1);
    expect((await state(page))?.shots).toBe(0);
    if (finger) {
        await finger.touch('touchStart', [{ id: 0, ...hero }]);
        await finger.release();
    }
    else
        await page.keyboard.press('KeyX');
    await expect.poll(async () => (await state(page))?.current).toBe(0);
    expect((await state(page))?.shots).toBe(0);
    await page.evaluate(() => {
        window.__COLLIER_TEST__?.scenario('finish');
        window.__COLLIER_TEST__?.advance(0);
    });
    for (let n = 0; n < 12; n++) {
        const s = await state(page);
        if (!s || s.status !== 'playing')
            break;
        const aim = decision(s);
        expect(aim).toBeTruthy();
        if (!aim)
            break;
        if (aim.swap) {
            if (finger) {
                await finger.touch('touchStart', [{ id: 0, ...reserve }]);
                await finger.release();
            }
            else
                await page.keyboard.press('KeyX');
        }
        const p = await point(page, aim.x, aim.y);
        const shots = s.shots;
        const box = await page.locator('#game canvas').boundingBox();
        const view = await page.evaluate(() => window.__COLLIER_TEST__?.view());
        if (!box || !view) throw new Error('Transformation absente');
        // Touch coordinates are rounded to CSS pixels by the input platform.
        // At the far edge, one CSS pixel is under .01 radian from the shooter.
        const sent = { x: Math.round(p.x), y: Math.round(p.y) };
        const logical = { x: ((sent.x - box.x) * 360 / box.width - view.x) / view.scale,
            y: ((sent.y - box.y) * 640 / box.height - view.y) / view.scale };
        const expected = Math.atan2(logical.y - s.shooter.y, logical.x - s.shooter.x);
        if (finger) {
            const start = await point(page, 180, 80);
            await finger.touch('touchStart', [{ id: 0, ...start }]);
            const before = (await state(page))?.angle;
            await finger.touch('touchMove', [{ id: 0, ...sent }]);
            await expect.poll(async () => (await state(page))?.angle).not.toBe(before);
            expect(Math.abs(((await state(page))?.angle ?? 100) - expected)).toBeLessThan(.01);
            expect((await state(page))?.shots).toBe(shots);
            await finger.release();
        }
        else {
            await page.mouse.move(sent.x, sent.y);
            await expect.poll(async () => Math.abs(((await state(page))?.angle ?? 100) - expected)).toBeLessThan(.01);
            await page.keyboard.press('Space');
        }
        await expect.poll(async () => (await state(page))?.shots).toBe(shots + 1);
        await page.evaluate(() => window.__COLLIER_TEST__?.advance(500));
    }
    await expect.poll(async () => (await state(page))?.status).toBe('won');
    await page.screenshot({ path: `test-results/screenshots/collier-won-${info.project.name}.png` });
    if (isMobile)
        await page.locator('#next-level').tap();
    else
        await page.locator('#next-level').click();
    await expect.poll(async () => (await state(page))?.level).toBe(1);
    await page.reload();
    await expect.poll(() => state(page)).toBeTruthy();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('arcade-lab:collier:v1') ?? '{}') as {
        unlocked?: number;
    })).toMatchObject({ unlocked: 2 });
    if (isMobile)
        await page.locator('#resume').tap();
    else
        await page.locator('#resume').click();
    await page.evaluate(() => window.__COLLIER_TEST__?.loadLevel(29, 300));
    expect((await state(page))?.chains).toHaveLength(2);
    await page.screenshot({ path: `test-results/screenshots/collier-level30-${info.project.name}.png` });
    await page.evaluate(() => {
        window.__COLLIER_TEST__?.scenario('loss');
        window.__COLLIER_TEST__?.advance(1000);
    });
    await expect.poll(async () => (await state(page))?.status).toBe('lost');
    await page.screenshot({ path: `test-results/screenshots/collier-lost-${info.project.name}.png` });
    if (isMobile)
        await page.locator('#retry-level').tap();
    else
        await page.locator('#retry-level').click();
    await expect.poll(async () => (await state(page))?.status).toBe('playing');
    expect((await state(page))?.shots).toBe(0);
});
test('C16 Collier : le choix réel de chacun des cinq compagnons conserve les règles', async ({ page, isMobile }) => {
    const cast = [
        ['panda', 'Boubou'],
        ['pandaroux', 'CaliRoux'],
        ['dragon', 'Pestouille'],
        ['singe', 'Tutu'],
        ['licorne', 'Lumi']
    ] as const;
    const witnesses: unknown[] = [];
    for (const [id, name] of cast) {
        await page.goto('/?test=1#/');
        if (isMobile)
            await page.locator('#character-toggle').tap();
        else
            await page.locator('#character-toggle').click();
        const choose = page.getByRole('button', { name: `Choisir ${name}`, exact: true });
        await choose.scrollIntoViewIfNeeded();
        if (isMobile)
            await choose.tap();
        else
            await choose.click();
        const game = page.getByRole('button', { name: new RegExp(GAME_NAME) });
        await game.scrollIntoViewIfNeeded();
        if (isMobile)
            await game.tap();
        else
            await game.click();
        await expect.poll(() => state(page)).toBeTruthy();
        if (isMobile)
            await page.locator('#resume').tap();
        else
            await page.locator('#resume').click();
        await page.evaluate(() => {
            window.__COLLIER_TEST__?.loadLevel(4, 300);
            window.__COLLIER_TEST__?.advance(1000);
        });
        const s = await state(page);
        expect(s?.character.id).toBe(id);
        expect(s?.leader.id).toBe(id === 'singe' ? 'panda' : 'singe');
        witnesses.push({
            chains: s?.chains,
            score: s?.score,
            current: s?.current,
            next: s?.next,
            shooter: s?.shooter
        });
    }
    for (const witness of witnesses)
        expect(witness).toEqual(witnesses[0]);
});
