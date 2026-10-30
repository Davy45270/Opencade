import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { Engine, ORIGIN, center, type Cell } from '../../src/engines/bubble/engine';
import { generateLevel } from '../../src/engines/bubble/levels';
// B-SNAP-04: a noisy real finger aims, the ghost shows a socket, the release fills exactly that socket,
// and the socket contains the impact point of the displayed guide (hex cell radius 40/sqrt(3)).
test('B-SNAP-04 doigt bruité : la case fantôme est la case remplie', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(240000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/bubble');
    await expect.poll(() => page.evaluate(() => Boolean(window.__BUBBLE_TEST__))).toBe(true);
    const holed = generateLevel(4, 28).filter((_, i) => i % 4 !== 1);
    const loadBoard = () => page.evaluate(grid => { window.__BUBBLE_TEST__?.loadLevel(4, 28); window.__BUBBLE_TEST__?.load(grid, grid[0]?.color ?? 0, 28); }, holed);
    await loadBoard();
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), shots: unknown[] = [];
    let seed = 500;
    const noise = () => { seed = seed * 16807 % 2147483647; return seed % 25 - 12; };
    const box = await page.locator('canvas').boundingBox(); if (!box) throw new Error('canvas');
    const toPage = (x: number, y: number) => ({ id: 3, x: box.x + x * box.width / 360 + noise(), y: box.y + y * box.height / 640 + noise() });
    let bounced = 0;
    try {
        for (const angle of [-1.25, -0.6, -0.2, 0.15, 0.5, 1.15, -0.95, 0.85, 1.32, -1.36, 0.02, -0.4]) {
            const radius = 170, aim = () => toPage(ORIGIN.x + Math.sin(angle) * radius, ORIGIN.y - Math.cos(angle) * radius);
            await page.waitForTimeout(150); await finger.touch('touchStart', [aim()]);
            for (let i = 0; i < 3; i++) { await page.waitForTimeout(60); await finger.touch('touchMove', [aim()]); }
            await page.waitForTimeout(150);
            const before = await page.evaluate(() => ({ v: window.__BUBBLE_TEST__?.visuals(), s: window.__BUBBLE_TEST__?.read() }));
            const ghost = before.v?.ghost as Cell | null, impact = before.v?.guide.at(-1)?.to;
            expect(ghost).toBeTruthy(); expect(impact).toBeTruthy(); if (!ghost || !impact || !before.s) throw new Error('aim');
            const p = center(ghost, before.s.drops);
            expect(Math.hypot(p.x - impact.x, p.y - impact.y)).toBeLessThanOrEqual(40 / Math.sqrt(3) + 1e-6);
            expect(before.s.grid.some(c => c.row === ghost.row && c.col === ghost.col)).toBe(false);
            // The displayed guide is the engine's whole path for the measured angle, bounces included.
            const model = new Engine(28); model.loadLevel(4, 28); model.load(before.s.grid, before.s.next, 28); model.drops = before.s.drops;
            expect(before.v?.guide).toEqual(model.trace(before.s.angle).segments);
            expect(model.trace(before.s.angle).target).toEqual({ ...ghost, color: before.s.next });
            // What is drawn, not only the hook data: every guide segment and a visible ghost with its ring.
            expect(before.v?.drawn.guide).toBe(before.v?.guide.length);
            expect(before.v?.drawn.ghost).toEqual({ alpha: 0.35, ring: 0.85 });
            if ((before.v?.guide.length ?? 0) > 1) bounced++;
            if (shots.length === 4) await page.screenshot({ path: info.outputPath('bubble-snap-ghost.png') });
            await finger.release();
            await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().shots)).toBe(before.s.shots + 1);
            await expect.poll(() => page.evaluate(() => window.__BUBBLE_TEST__?.read().inFlight), { intervals: [100], timeout: 30000 }).toBe(false);
            const attached = await page.evaluate(() => window.__BUBBLE_TEST__?.lastAttached());
            expect(attached && { row: attached.row, col: attached.col }).toEqual({ row: ghost.row, col: ghost.col });
            shots.push({ angle, measured: before.s.angle, ghost, impact, attached, segments: before.v?.guide.length });
            const after = await page.evaluate(() => window.__BUBBLE_TEST__?.read());
            if (after?.status !== 'playing') await loadBoard();
        }
        expect(shots).toHaveLength(12); expect(bounced).toBeGreaterThanOrEqual(3);
    } finally {
        await info.attach('bubble-snap-doigt.json', { body: JSON.stringify({ noisePx: 12, shots }, null, 2), contentType: 'application/json' });
        await finger.release(); await cdp.detach();
    }
});
