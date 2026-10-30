import { test, expect } from './fixture';
import { point, ready } from './gourmandises-input';
import { Random } from '../../src/engines/shared/random';
test('doigt bruité, deux touchers, outil et glisser : niveaux 1 et 10', async ({ page, context, isMobile }, testInfo) => {
    test.skip(!isMobile, 'Parcours tactile');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/gourmandises');
    await ready(page, true);
    const cdp = await context.newCDPSession(page);
    const random = new Random(28);
    const records: unknown[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0): Promise<void> => {
        await cdp.send('Input.dispatchTouchEvent', {
            type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 7, radiusY: 7, force: 1 }],
        });
    };
    const tap = async (x: number, y: number): Promise<void> => {
        await touch('touchStart', x, y);
        await touch('touchEnd');
    };
    for (const level of [0, 9]) {
        await page.evaluate(index => window.__GOURMANDISES_TEST__?.loadLevel(index, 6), level);
        await page.screenshot({ path: `test-results/screenshots/gourmandises-finger-${String(level + 1)}-before.png` });
        const tool = await page.locator('#gourmandises-hammer').boundingBox();
        if (!tool) throw new Error('Outil absent');
        await tap(tool.x + tool.width / 2, tool.y + tool.height / 2);
        const targetIndex = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read().cells.findIndex(cell => cell.piece));
        if (targetIndex === undefined || targetIndex < 0) throw new Error('Cible absente');
        const target = await point(page, targetIndex);
        await tap(target.x, target.y);
        await page.waitForTimeout(320);
        let taps = 0;
        let drags = 0;
        const started = Date.now();
        for (let step = 0; step < 100; step++) {
            const state = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
            if (state?.status !== 'playing') break;
            const pair = await page.evaluate(() => window.__GOURMANDISES_TEST__?.bestMove());
            if (!pair) throw new Error('Aucun coup');
            const a = await point(page, pair[0]);
            const b = await point(page, pair[1]);
            await page.waitForTimeout(150);
            const noise = (): number => (random.next() * 2 - 1) * 12;
            const from = { x: a.x + noise(), y: a.y + noise() };
            const to = { x: b.x + noise(), y: b.y + noise() };
            if (step === 0) {
                await tap(from.x, from.y);
                await tap(to.x, to.y);
                taps++;
            } else {
                await touch('touchStart', from.x, from.y);
                for (let part = 1; part <= 4; part++) {
                    await touch('touchMove', from.x + (to.x - from.x) * part / 4, from.y + (to.y - from.y) * part / 4);
                }
                await touch('touchEnd');
                drags++;
            }
            await page.waitForTimeout(320);
            const after = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
            records.push({ level: level + 1, pair, from, to, before: state.moves, after: after?.moves, status: after?.status });
            expect(after?.moves, 'La permutation visée est reçue').toBe(state.moves + 1);
        }
        const result = await page.evaluate(() => window.__GOURMANDISES_TEST__?.read());
        expect(result?.status).toBe('won');
        expect(result?.tools.hammer).toBe(2);
        expect(taps).toBeGreaterThanOrEqual(1);
        if (level === 9) expect(drags).toBeGreaterThanOrEqual(1);
        records.push({ level: level + 1, duration: Date.now() - started, taps, drags, result });
        await page.screenshot({ path: `test-results/screenshots/gourmandises-finger-${String(level + 1)}-after.png` });
    }
    expect(errors).toEqual([]);
    await testInfo.attach('gourmandises-finger', { body: JSON.stringify({ records, errors }, null, 2), contentType: 'application/json' });
});
