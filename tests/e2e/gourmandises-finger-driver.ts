import type { Page } from '@playwright/test';
import { Finger, checksum } from './finger-stepped';
import type {} from '../../src/games/gourmandises/scene';

async function point(page: Page, index: number) {
    const board = await page.evaluate(() => {
        const hook = window.__GOURMANDISES_TEST__;
        if (!hook) throw new Error('Crochet absent');
        return { ...hook.board(), columns: hook.read().width };
    });
    const canvas = await page.locator('#game canvas').boundingBox();
    if (!canvas) throw new Error('Canevas absent');
    return {
        x: canvas.x + (board.x + (index % board.columns + .5) * board.unit) * canvas.width / 360,
        y: canvas.y + (board.y + (Math.floor(index / board.columns) + .5) * board.unit) * canvas.height / 640,
    };
}

/** The browser and Node adapter execute exactly the same decisions. */
export async function gourmandisesFinger(page: Page, finger: Finger) {
    const read = async () => {
        const state = await finger.read();
        return state as unknown as ReturnType<NonNullable<Window['__GOURMANDISES_TEST__']>['read']>;
    };
    const settled = async () => { await finger.until(async () => (await read()).fingerInput.animation === 0, 100); };
    const cellTap = async (index: number) => {
        await finger.touch('touchStart', [{ id: 1, ...await point(page, index) }]);
        await finger.release();
    };
    await finger.press(['#gourmandises-hammer']);
    const target = (await read()).cells.findIndex(cell => cell.piece);
    if (target < 0) throw new Error('Cible absente');
    await cellTap(target);
    await settled();
    const records = [];
    let taps = 0, drags = 0;
    for (let step = 0; step < 100; step++) {
        const before = await read();
        if (before.status !== 'playing') break;
        const pair = await page.evaluate(() => window.__GOURMANDISES_TEST__?.bestMove());
        if (!pair) throw new Error('Aucun coup');
        const from = await point(page, pair[0]), to = await point(page, pair[1]);
        if (step === 0) {
            await cellTap(pair[0]); await cellTap(pair[1]); taps++;
        } else {
            await finger.touch('touchStart', [{ id: 1, ...from }]);
            for (let part = 1; part <= 4; part++) {
                await finger.touch('touchMove', [{ id: 1, x: from.x + (to.x - from.x) * part / 4, y: from.y + (to.y - from.y) * part / 4 }]);
            }
            await finger.release(); drags++;
        }
        await settled();
        const after = await read();
        if (after.moves !== before.moves + 1) throw new Error('Permutation perdue');
        records.push({ pair, before: before.moves, after: after.moves, status: after.status });
    }
    const final = await read();
    if (final.status !== 'won' || final.tools.hammer !== 2 || taps < 1 || (final.level === 9 && drags < 1)) throw new Error('Parcours incomplet');
    const engine = { ...final } as Partial<typeof final>;
    delete engine.armedTool; delete engine.stars; delete engine.characterView; delete engine.fingerInput;
    const engineFingerprint = checksum(engine);
    const expected = final.level === 0 ? 1858078123 : 1531739411;
    if (engineFingerprint !== expected) throw new Error(`Rejeu moteur divergent : ${String(engineFingerprint)}`);
    return { taps, drags, records, engineFingerprint };
}
