import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { Engine } from '../../src/engines/ferraille/engine';
import { pilot } from '../../src/engines/ferraille/pilot';

for (const level of [1, 4, 8, 12, 16, 20, 24, 28]) test(`ferraille-niveau-${String(level)}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp);
    await finger.press(['#resume']); await cdp.detach();
    await page.evaluate(level => { const h = window.__FERRAILLE_TEST__; h?.loadLevel(level - 1, 28); h?.scenario('showcase'); }, level);
    const path = info.outputPath(`ferraille-niveau-${String(level)}.png`);
    await page.screenshot({ path }); await info.attach(`ferraille-niveau-${String(level)}`, { path, contentType: 'image/png' });
});

test('F-niv doigt bruité réel, niveaux 1 et 10', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(240000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/ferraille');
    await expect.poll(() => page.evaluate(() => Boolean(window.__FERRAILLE_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp), results = [];
    let noiseSeed = 103;
    const noise = () => { noiseSeed = noiseSeed * 16807 % 2147483647; return noiseSeed % 25 - 12; };
    try {
        await finger.press(['#resume']);
        for (const level of [0, 9]) {
            await page.evaluate(level => window.__FERRAILLE_TEST__?.loadLevel(level, 28), level);
            const started = Date.now(); let decisions = 0;
            while (Date.now() - started < 100000) {
                const state = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; if (!h) throw new Error('Missing hook'); return h.read(); });
                if (state.status !== 'playing') break;
                const model = new Engine(); model.loadLevel(level, state.seed); model.loadState(state); model.step(150); pilot(model);
                const input = model.state.input;
                const selectors = [input.fire ? '#ferraille-fire' : '', input.jump ? '#ferraille-jump' : ''].filter(Boolean);
                const points = await page.evaluate(({ selectors, input }) => {
                    const points = selectors.map((selector, id) => { const r = document.querySelector(selector)?.getBoundingClientRect(); if (!r) throw new Error(selector); return { id, x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
                    if (input.x || input.y) { const r = document.querySelector('.joystick')?.getBoundingClientRect(), length = Math.hypot(input.x, input.y); if (!r) throw new Error('Missing joystick'); points.push({ id: 5, x: r.x + r.width / 2 + input.x * 43 / length, y: r.y + r.height / 2 + input.y * 43 / length }); }
                    return points;
                }, { selectors, input });
                await page.waitForTimeout(150); await finger.release();
                if (points.length) await finger.touch('touchStart', points.map(p => ({ ...p, x: p.x + noise(), y: p.y + noise() })));
                decisions++;
            }
            await finger.release(); const final = await page.evaluate(() => { const h = window.__FERRAILLE_TEST__; if (!h) throw new Error('Missing hook'); return h.read(); });
            results.push({ level: level + 1, decisions, elapsedMs: Date.now() - started, score: final.score, lives: final.lives, status: final.status });
            expect(final.status).toBe('won');
        }
    } finally {
        await finger.release(); await cdp.detach();
        await info.attach('ferraille-doigt-bruite.json', { body: JSON.stringify({ latencyMs: 150, noisePx: 12, realtime: true, results }), contentType: 'application/json' });
    }
});
