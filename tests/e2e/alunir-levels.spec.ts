import { test, expect } from './fixture';
import { Finger } from './character-finger-input';
import { landingControl } from './character-policy';
import { FingerClock } from './finger-clock';
import { LEVELS } from '../../src/engines/alunir/levels';
import { Engine } from '../../src/engines/alunir/engine';

test('A-niv E2E : sept situations et doigt bruité, niveaux 1 et 10', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(300000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?test=1#/alunir');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ALUNIR_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = new Finger(page, cdp);
    const read = async () => { const s = await page.evaluate(() => window.__ALUNIR_TEST__?.read()); if (!s) throw new Error('État absent'); return s; };
    const capture = async (level: number) => {
        const name = `alunir-niveau-${String(level)}`, path = info.outputPath(`${name}.png`);
        await page.screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
    };
    try {
        await finger.press(['#resume']);
        for (const level of [1, 5, 10, 15, 20, 25, 30]) {
            await page.evaluate(level => { window.__ALUNIR_TEST__?.loadLevel(level - 1, 28); }, level);
            await expect.poll(async () => (await read()).ticks).toBeGreaterThan(0);
            expect((await read()).ticks).toBeLessThan(120);
            const intro = await page.evaluate(() => window.__ALUNIR_TEST__?.hudText());
            expect(intro).toContain(LEVELS[level - 1]?.name);
            expect(intro).toContain(LEVELS[level - 1]?.idea);
            await capture(level);
            // HUD timing is checked on the manual clock: game time runs far slower than wall time under software rendering.
            await page.evaluate(() => { window.__ALUNIR_TEST__?.advance(2100); });
            expect((await read()).ticks).toBeGreaterThanOrEqual(120);
            const after = await page.evaluate(() => window.__ALUNIR_TEST__?.hudText());
            expect(after).not.toContain(LEVELS[level - 1]?.name);
            expect(after).not.toContain(LEVELS[level - 1]?.idea);
        }
        const results = [];
        for (const level of [0, 9]) {
            await page.evaluate(level => { window.__ALUNIR_TEST__?.loadLevel(level, 28); }, level);
            const clock = new FingerClock(); clock.observe(await read());
            while (clock.elapsed < 90000) {
                const s = await read(); clock.observe(s); if (s.status !== 'playing') break;
                const model = new Engine(); model.loadLevel(level, s.seed); model.loadState(s); model.step(clock.horizon);
                const controls = landingControl(model), selectors = [];
                if (controls.thrust) selectors.push('#alunir-thrust');
                if (controls.left) selectors.push('#alunir-left'); if (controls.right) selectors.push('#alunir-right');
                // Finger.steer retains the previous intent for 150 ms and adds ±12 px.
                await finger.steer(selectors);
            }
            await finger.release(); const end = await read();
            expect(end.status).toBe('won'); expect(clock.elapsed).toBeLessThan(90000);
            results.push({ level: level + 1, gameTimeMs: end.ticks * 1000 / 60, score: end.score, status: end.status });
        }
        expect(finger.entries.every(e => !e.missed)).toBe(true);
        await info.attach('alunir-doigt', { body: JSON.stringify({ results, entries: finger.entries }), contentType: 'application/json' });
    } finally { await finger.release(); await cdp.detach(); }
});
