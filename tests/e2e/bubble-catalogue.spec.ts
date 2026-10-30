import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { Engine, ORIGIN, key } from '../../src/engines/bubble/engine';
import { LEVELS } from '../../src/engines/bubble/levels';
import { solutions } from '../bubble-solutions';
import { bubbleOutcome } from './character-bubble-policy';
const boards = [['P01', 11, null], ['P02', 19, 'leaf'], ['P03', 25, 'crystal']] as const;
// B-CAT-05: each catalogue board opens on its slot with its scenery, hint and special bubbles; capture for review.
for (const [code, index, kind] of boards) test(`B-CAT-05 ${code} ${LEVELS[index]?.name ?? ''}`, async ({ page }, info) => {
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    await page.evaluate(i => { window.__BUBBLE_TEST__?.loadLevel(i, 28); window.__BUBBLE_TEST__?.advance(0); }, index);
    const state = await page.evaluate(() => window.__BUBBLE_TEST__?.read());
    expect(state?.level).toBe(index);
    const hud = await page.evaluate(() => window.__BUBBLE_TEST__?.hudText());
    expect(hud).toContain(LEVELS[index]?.name ?? '?');
    expect(hud).toContain(code === 'P01' ? 'Jardin' : code === 'P02' ? 'Feuille' : 'Prisme');
    if (kind) expect(state?.grid.some(c => c.kind === kind)).toBe(true);
    // What the frame drew: the board's own scenery and one on-screen symbol per special bubble.
    const drawn = await page.evaluate(() => window.__BUBBLE_TEST__?.visuals().drawn);
    const count = (k: string, ice = false) => state?.grid.filter(c => c.kind === k && (!ice || c.kind === 'ice')).length ?? -1;
    expect(drawn?.decor).toEqual(code === 'P01' ? ['bambous', 'bao'] : code === 'P02' ? ['temple', 'lanternes'] : ['constellation']);
    expect(drawn?.icons).toEqual({ crystal: count('crystal'), prism: count('prism'), leaf: count('leaf'), lock: code === 'P02' ? count('ice', true) : 0 });
    expect(drawn?.icons.leaf ?? 0).toBe(code === 'P02' ? 3 : 0); expect(drawn?.icons.crystal ?? 0).toBe(code === 'P03' ? 3 : 0);
    if (code === 'P03') expect(drawn?.prismArcAlpha).toBe(1);
    await page.screenshot({ path: info.outputPath(`level-catalogue-${code}-${info.project.name}.png`) });
});
// B-CAT-06: noisy real finger through the three boards, same closed loop as P-bubble: aim, observe, release
// only on the solver's socket (or an identical outcome), grid equal to the model after every shot, then victory.
test('B-CAT-06 doigt bruité : P01, P02 et P03 gagnés', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(600000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results: unknown[] = [];
    let seed = 488;
    const noise = () => { seed = seed * 16807 % 2147483647; return seed % 25 - 12; };
    try {
        for (const [code, index] of boards) {
            await page.evaluate(i => { window.__BUBBLE_TEST__?.loadLevel(i, 28); }, index);
            const model = new Engine(28); model.loadLevel(index, 28);
            const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('canvas');
            const touchAt = (angle: number, radius: number) => ({ id: 5, x: box.x + (ORIGIN.x + Math.sin(angle) * radius) * box.width / 360 + noise(), y: box.y + (ORIGIN.y - Math.cos(angle) * radius) * box.height / 640 + noise() });
            const start = Date.now(); let corrections = 0;
            for (const shot of solutions[index] ?? []) {
                if (shot.swap) { await finger.press(['#touch-swap']); model.swap(); }
                const intended = model.trace(shot.angle), outcome = bubbleOutcome(model, shot.angle);
                const radius = Math.min(500, 145 / Math.max(0.01, Math.abs(Math.sin(shot.angle))));
                let commanded = shot.angle, actual = shot.angle, found = false;
                await page.waitForTimeout(150); await finger.touch('touchStart', [touchAt(commanded, radius)]);
                for (let attempt = 0; attempt < 120; attempt++) {
                    await page.waitForTimeout(150);
                    const state = await page.evaluate(() => window.__BUBBLE_TEST__?.read()); if (!state) throw new Error('bubble');
                    actual = state.angle; const path = model.trace(actual);
                    const same = intended.target && path.target && key(intended.target) === key(path.target) && (intended.struck ? path.struck && key(intended.struck) === key(path.struck) : !path.struck);
                    if (same || bubbleOutcome(model, actual) === outcome) { found = true; break; }
                    corrections++;
                    commanded = Math.max(shot.angle - .08, Math.min(shot.angle + .08, commanded + (shot.angle - actual) * .5));
                    await finger.touch('touchMove', [touchAt(commanded, radius)]);
                }
                expect(found).toBe(true); await finger.release();
                model.aim(actual); model.shoot(); while (model.flight) model.step(1000 / 60);
                await expect.poll(async () => (await page.evaluate(() => window.__BUBBLE_TEST__?.read()))?.shots).toBe(model.shots);
                await expect.poll(async () => (await page.evaluate(() => window.__BUBBLE_TEST__?.read()))?.inFlight, { intervals: [150], timeout: 30000 }).toBe(false);
                expect((await page.evaluate(() => window.__BUBBLE_TEST__?.read()))?.grid).toEqual(model.grid);
            }
            const final = await page.evaluate(() => window.__BUBBLE_TEST__?.read());
            await page.screenshot({ path: info.outputPath(`bubble-catalogue-${code}-fin.png`) });
            results.push({ code, shots: final?.shots, status: final?.status, corrections, ms: Date.now() - start });
            expect(final?.status).toBe('won');
        }
        expect(finger.entries.filter(e => e.missed)).toEqual([]);
    } finally {
        await info.attach('bubble-catalogue-doigt.json', { body: JSON.stringify({ noisePx: 12, latencyMs: 150, results }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
