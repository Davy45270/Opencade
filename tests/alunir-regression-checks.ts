import assert from 'node:assert/strict';
import { landingControl } from './e2e/character-policy';
import { Engine, LEVELS, pilot, required, STEP } from '../src/engines/alunir/engine';

type Historic = { saved: Parameters<Engine['loadState']>[0]; after: Partial<ReturnType<Engine['snapshot']>> };
export function migrationChecks(old: Historic, Model = Engine): void {
    // Load into a live, genuinely docked service mission, not only a fresh engine.
    const e = new Model(); e.loadLevel(3);
    e.loadState({ x: 90, y: 387.9, vy: 0.982 }); e.step(STEP);
    assert.equal(e.mission.docked, 1);
    e.loadState(old.saved);
    assert.deepEqual(e.mission, { serviced: false, cargo: false, rescued: false, beacon: false, docked: -1, sliding: false });
    assert.deepEqual(e.events, []);
    e.step(STEP * 40);
    const snapshot = e.snapshot();
    for (const key of Object.keys(old.after) as (keyof Historic['after'])[]) assert.deepEqual(snapshot[key], old.after[key], `historical ${key}`);
    const copy = new Model(); copy.loadState(snapshot);
    copy.step(STEP * 5); e.step(STEP * 5); assert.deepEqual(copy.snapshot(), e.snapshot());
    e.loadLevel(1); assert.equal(e.legacy, false); assert.equal(e.state.y, 300);
    assert.equal(e.mission.docked, -1);
    for (let tick = 0; tick < 2500 && e.status === 'playing'; tick++) { e.input(pilot(e)); e.step(STEP); }
    assert.equal(e.status, 'won', 'cave following historical restore');
    for (const docked of [-2, 0.5, 99]) {
        const invalid = new Model(); invalid.loadState({ ...snapshot, mission: { ...snapshot.mission, docked } });
        assert.equal(invalid.mission.docked, -1); invalid.step(STEP);
    }
}

/** Execute the actual scene text expression under Node, without a rendering runtime. */
export function hudChecks(source: string): void {
    const declaration = required(source.match(/const l = e\.plan\(\), intro = [^;]+;/)?.[0]);
    const expression = required(source.match(/this.hud\?\.setText\((`[^;]+`)\);/)?.[1]);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Run the actual scene expression so removing its idea is observable under Node.
    const render = new Function('e', 's', 'LEVELS', 'required', `${declaration} return ${expression};`) as (e: Engine, s: Engine['state'], levels: typeof LEVELS, need: typeof required) => string;
    for (let level = 0; level < 30; level++) {
        const e = new Engine(); e.loadLevel(level); const l = required(LEVELS[level]);
        for (const ticks of [0, 1, 119, 120, 121]) {
            e.state.ticks = ticks; const text = render.call({ engine: e }, e, e.state, LEVELS, required);
            assert.equal(text.includes(l.name), ticks < 120, `HUD name ${String(level)}/${String(ticks)}`);
            assert.equal(text.includes(l.idea), ticks < 120, `HUD idea ${String(level)}/${String(ticks)}`);
        }
    }
}


/** Held touch buttons with 150 ms transport latency and a 20 ms observation step. */
export function fingerChecks(): void {
    for (const level of [0, 9]) for (const special of [false, true]) {
        const e = new Engine(); e.loadLevel(level);
        for (let elapsed = 0; elapsed < 90000 && e.status === 'playing'; elapsed += 170) {
            const s = e.snapshot(), model = new Engine(); model.loadState(s); model.step(150);
            const controls = landingControl(model);
            e.step(150); e.input(controls);
            if (special && required(s.terrain.pads[0]).y - s.y < 40 && s.specialUses > 0 && s.specialTicks === 0) e.special();
            e.step(20);
        }
        assert.equal(e.status, 'won', `level ${String(level + 1)} delayed finger, special=${String(special)}`);
        assert(e.state.ticks < 5400);
    }
    const angled = new Engine(); angled.loadState({ x: 182, y: 478, vy: 0.5, angle: 0.225 }); angled.step(150);
    assert.equal(angled.state.angle, 0.225, 'visual guide cannot rotate the module');
    const tilted = new Engine(); tilted.loadState({ x: 182, y: 508, vy: 1, angle: 0.225 }); tilted.step(150);
    assert.equal(tilted.status, 'lost', 'visual guide cannot save an excessive impact angle');
    const unsafe = new Engine(); unsafe.loadState({ x: 182, y: 503, vy: 4, angle: 0 }); unsafe.step(150);
    assert.equal(unsafe.status, 'lost', 'visual guide cannot save excessive impact speed');
}
