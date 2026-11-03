import { test, expect } from './fixture';
import { Finger } from './finger-stepped';
import { landingControl } from './character-policy';
import { FingerClock } from './finger-clock';
import { LEVELS } from '../../src/engines/alunir/levels';
import { Engine } from '../../src/engines/alunir/engine';

test('A-niv E2E : sept situations et doigt bruité, niveaux 1 et 10', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(300000);
    await page.setViewportSize({ width: 390, height: 844 });
    await Finger.prepare(page);
    await page.goto('/?test=1#/alunir');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ALUNIR_TEST__))).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = await Finger.create(page, cdp);
    const read = async () => { const s = await page.evaluate(() => window.__ALUNIR_TEST__?.read()); if (!s) throw new Error('État absent'); return s; };
    const capture = async (level: number) => {
        const name = `alunir-niveau-${String(level)}`, path = info.outputPath(`${name}.png`);
        await page.screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
    };
    try {
        await finger.press(['#resume']);
        for (const level of [1, 5, 10, 15, 20, 25, 30]) {
            // Piloted time: the game only moves when the test advances it.
            await page.evaluate(level => { window.__ALUNIR_TEST__?.loadLevel(level - 1, 28); window.__ALUNIR_TEST__?.advance(17); }, level);
            expect((await read()).ticks).toBeGreaterThan(0);
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
            await page.evaluate(level => { window.__ALUNIR_TEST__?.loadLevel(level, 28); window.__ALUNIR_TEST__?.advance(0); }, level);
            const clock = new FingerClock(), firstEntry = finger.entries.length; clock.observe(await read());
            const model = new Engine();
            while (clock.elapsed < 90000) {
                const s = await read(); clock.observe(s); if (s.status !== 'playing') break;
                // Same lander pilot as P-alunir: the model follows the held controls through the 150 ms of game time before the command.
                model.loadLevel(level, s.seed); model.loadState(s); model.input(s.controls); model.step(clock.horizon);
                const controls = landingControl(model), selectors = [];
                if (controls.thrust) selectors.push('#alunir-thrust');
                if (controls.left) selectors.push('#alunir-left'); if (controls.right) selectors.push('#alunir-right');
                await finger.steer(selectors);
            }
            await finger.release(); const end = await read();
            await finger.attach(info, `stepped-alunir-niv-${String(level + 1)}.json`);
            expect(finger.entries.slice(firstEntry).filter(entry => entry.missed)).toEqual([]);
            expect(end.status).toBe('won'); expect(clock.elapsed).toBeLessThan(90000);
            results.push({ level: level + 1, gameTimeMs: end.ticks * 1000 / 60, score: end.score, status: end.status });
        }
        await info.attach('alunir-doigt', { body: JSON.stringify({ results, entries: finger.entries }), contentType: 'application/json' });
    } finally { await finger.release(); await cdp.detach(); }
});
