import { test, expect } from './fixture';
import type { Page, TestInfo } from '@playwright/test';
import { ids, type CharacterId } from '../../src/characters/model';
import { Engine as Crates, directions, type Direction } from '../../src/engines/caisses/engine';
import { solve as solveCrates, type PullInput } from '../../src/engines/caisses/solver';
import { pull, push } from '../../src/engines/caisses/rules';
import { difficulty } from '../../src/engines/traverse/engine';
import { crossingAction, landingControl, crossingInputWindowMs } from './character-policy';
import { Engine as Lander } from '../../src/engines/alunir/engine';
type Game = 'caisses' | 'traverse' | 'alunir';
import { Finger } from './finger-stepped';
import { FingerClock } from './finger-clock';
function cratesInputs(model: Crates): PullInput[] {
    const budget = model.budgetLeft(), proof = solveCrates(model.board, budget ? 'steps' : 'pushes', true);
    if (!proof) throw new Error('Missing pull proof');
    if (proof.inputs.some(a => a.startsWith('pull-'))) return proof.inputs;
    // The move-budget room needs the step solver. Use a reversible legal pull
    // along its route, keeping both the solver's placement and the move budget.
    let position = { player: model.state.player, boxes: model.state.boxes, colors: model.state.colors, filled: model.state.filled };
    for (const [index, action] of proof.inputs.entries()) {
        for (const direction of directions) {
            const pulled = pull(model.board, position, direction), restored = pulled && push(model.board, pulled.pos, direction);
            if (restored && JSON.stringify(restored.pos) === JSON.stringify(position) && (!budget || proof.inputs.length + 2 <= budget)) {
                return [...proof.inputs.slice(0, index), `pull-${direction}`, direction, ...proof.inputs.slice(index)];
            }
        }
        const next = push(model.board, position, action as Direction);
        if (!next) throw new Error('Invalid solver route');
        position = next.pos;
    }
    throw new Error('No pull within move budget');
}
async function read(page: Page, game: Game) {
    return page.evaluate(game => {
        const hook = game === 'caisses' ? window.__CAISSES_TEST__ : game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__;
        if (!hook) throw new Error('Missing character game hook');
        return hook.read();
    }, game);
}
async function capture(page: Page, info: TestInfo, game: Game, id: CharacterId, kind: 'jeu' | 'special') {
    const name = `perso-${game}-${kind}`;
    const path = info.outputPath(`${name}-${String((await read(page, game)).level + 1)}.png`);
    await page.screenshot({ path });
    await info.attach(name, { path, contentType: 'image/png' });
    await info.attach(`perso-${id}-${game}-${kind}`, { path, contentType: 'image/png' });
}
for (const game of ['caisses', 'traverse', 'alunir'] as const) test(`P-${game} doigt bruité : niveaux 1 et 10`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium'); test.setTimeout(1800000);
    await page.setViewportSize({ width: 390, height: 844 });
    const id = ids[game === 'caisses' ? 0 : game === 'traverse' ? 1 : 4];
    await page.addInitScript(id => { localStorage.setItem('arcade-lab:character:v1', id); }, id);
    await Finger.prepare(page);
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(game => Boolean(game === 'caisses' ? window.__CAISSES_TEST__ : game === 'traverse' ? window.__TRAVERSE_TEST__ : window.__ALUNIR_TEST__), game), { timeout: 30000 }).toBe(true);
    const cdp = await page.context().newCDPSession(page), finger = await Finger.create(page, cdp), results: unknown[] = [];
    try {
        if (game !== 'caisses') await finger.press(['#resume']);
        for (const level of (game === 'caisses' ? [0, 9, 13] : game === 'traverse' ? [0, 9, 12] : [0, 9])) {
            await page.evaluate(({ game, level }) => {
                // Keep the later mechanics workshops as well as the required levels 1 and 10.
                if (game === 'caisses') { window.__CAISSES_TEST__?.loadLevel(level, 28); window.__CAISSES_TEST__?.advance(0); }
                else if (game === 'traverse') { window.__TRAVERSE_TEST__?.loadLevel(level, 28); window.__TRAVERSE_TEST__?.advance(0); }
                else { window.__ALUNIR_TEST__?.loadLevel(level, 28); window.__ALUNIR_TEST__?.advance(0); }
            }, { game, level });
            const clock = new FingerClock(), started = finger.elapsed, firstEntry = finger.entries.length, decisions: unknown[] = [];
            expect((await read(page, game)).character.id).toBe(id);
            if (game === 'caisses') {
                const model = new Crates(); model.loadLevel(level, 28);
                const proof = { inputs: cratesInputs(model) };
                expect(proof.inputs.some(a => a.startsWith('pull-'))).toBe(true);
                for (const action of proof.inputs) {
                    await read(page, game);
                    if (action.startsWith('pull-')) {
                        await finger.press(['#caisses-special']);
                        await finger.press([`#caisses-${action.slice(5)}`]); model.special(action.slice(5) as Direction);
                        await finger.advance(30); await capture(page, info, game, id, 'special');
                    } else { await finger.press([`#caisses-${action}`]); model.input(action as Direction); }
                    const after = await page.evaluate(() => window.__CAISSES_TEST__?.read());
                    expect(after?.player).toBe(model.state.player); expect(after?.boxes).toEqual(model.state.boxes);
                    expect(after?.moves).toBe(model.state.moves);
                }
            } else if (game === 'traverse') {
                let lastPhase = -1, specialCaptured = false;
                while (clock.elapsed < 90000) {
                    const state = await page.evaluate(() => window.__TRAVERSE_TEST__?.read());
                    if (!state) throw new Error('Missing crossing');
                    clock.observe(state); if (state.status !== 'playing') break;
                    if (state.specialMs > 0 && !specialCaptured) {
                        specialCaptured = true;
                        continue; // Observe again before planning.
                    }
                    // One queued command per quantum, leaving enough room for input latency.
                    if (state.phase === lastPhase || (difficulty(state.level).flowFrames - state.frames) * 1000 / 60 < Math.max(crossingInputWindowMs, clock.horizon)) {
                        await finger.advance(10); continue;
                    }
                    const action = crossingAction(state);
                    decisions.push({ timeMs: clock.elapsed, state, action });
                    lastPhase = state.phase;
                    await finger.press(action === 'wait' ? [] : [`#traverse-${action === 'bond' ? 'special' : action}`]);

                }
            } else {
                const model = new Lander(); model.loadLevel(level);
                while (clock.elapsed < 90000) {
                    const state = await page.evaluate(() => window.__ALUNIR_TEST__?.read());
                    if (!state) throw new Error('Missing lander');
                    clock.observe(state); if (state.status !== 'playing') break;
                    model.loadLevel(level, state.seed); model.loadState(state); model.specialTicks = state.specialTicks; model.specialUses = state.specialUses; model.input(state.controls);
                    // Predict only the model through the 150 ms observation-to-command delay.
                    model.step(clock.horizon);
                    const control = landingControl(model), selectors = [];
                    if (control.left) selectors.push('#alunir-left'); if (control.right) selectors.push('#alunir-right'); if (control.thrust) selectors.push('#alunir-thrust');
                    if (state.terrain.pads[0] && state.terrain.pads[0].y - state.y < 40 && state.specialUses > 0 && state.specialTicks === 0) selectors.push('#alunir-special');
                    decisions.push({ timeMs: clock.elapsed, state, control, selectors });
                    await finger.steer(selectors);
                }
                await finger.release();
            }
            const final = await read(page, game);
            await finger.attach(info, `stepped-${game}-${String(level + 1)}.json`);
            results.push({ decisions, clock: 'stepped', level: level + 1, timeMs: finger.elapsed - started, entries: finger.entries.slice(firstEntry), touchErrors: finger.entries.slice(firstEntry).filter(e => e.missed).length, victory: final.status === 'won', final });
            expect(finger.entries.slice(firstEntry).filter(entry => entry.missed)).toEqual([]);
            await capture(page, info, game, id, 'jeu');
            expect(final.status).toBe('won'); expect(final.specialUses).toBeLessThan(game === 'alunir' ? 2 : 1);
        }
    } finally {
        await info.attach(`perso-${game}-doigt-bruite.json`, { body: JSON.stringify({ game, character: id, viewport: [390, 844], latencyMs: 150, noisePx: 12, results, entries: finger.entries }, null, 2), contentType: 'application/json' });
        await finger.release();
        await finger.attach(info); await cdp.detach();
    }
});
