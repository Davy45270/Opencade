/* global console, performance, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
const { Engine: Snake, neighbor, difficulty: snakeDifficulty } = await import('../src/engines/serpentin/engine.ts');
const { Engine: Race } = await import('../src/engines/derapage/engine.ts');
const { Engine: Lander, LIMITS } = await import('../src/engines/alunir/engine.ts');
const { Engine: Crossing, difficulty } = await import('../src/engines/traverse/engine.ts');
const { Engine: Bubble, ORIGIN, key } = await import('../src/engines/bubble/engine.ts');
const { snakePlan } = await import('../tests/e2e/character-snake-policy.ts');
const { racingHeading } = await import('../tests/e2e/character-policy-2.ts');
const { landingControl, crossingAction, crossingInputWindowMs } = await import('../tests/e2e/character-policy.ts');
const { bubbleOutcome } = await import('../tests/e2e/character-bubble-policy.ts');
const { solutions } = await import('../tests/bubble-solutions.ts');
const { FingerClock } = await import('../tests/e2e/finger-clock.ts');
{
    const clock = new FingerClock();
    assert.equal(clock.observe({ ticks: 0 }), 150);
    assert.equal(clock.observe({ ticks: 9 }), 150);
    assert.equal(clock.observe({ ticks: 36 }), 450);
    assert.equal(clock.elapsed, 600);
    assert.equal(clock.observe({ ticks: 36 }), 150);
    const crossing = new FingerClock(); crossing.observe({ phase: 2, frames: 20, level: 0 });
    assert.equal(crossing.observe({ phase: 3, frames: 17, level: 0 }), 450);
    for (const E of [Lander]) {
        const live = new E(), model = new E(), reaction = new FingerClock();
        reaction.observe(live.snapshot()); live.step(450);
        const observed = live.snapshot(); const horizon = reaction.observe(observed);
        assert.equal(horizon, 450);
        model.loadLevel(0, live.seed); model.loadState(observed);
        live.step(450); model.step(horizon);
        for (const key of Object.keys(live.state)) assert.deepEqual(model.state[key], live.state[key], 'prediction follows observed slow-host game interval');
    }
}
const results = [], timings = [];
const raceNoise = noise(72), bubbleNoise = noise(72);
const STEP = 1000 / 60;
function step(e, ms) { for (let t = 0; t < ms - 1e-7; t += STEP) e.step(Math.min(STEP, ms - t)); }
function noise(seed) { return () => { seed = seed * 16807 % 2147483647; return seed % 25 - 12; }; }
function check(name, fn) { const start = performance.now(); const value = fn(); const ms = performance.now() - start; timings.push({ name, ms }); return value; }
// CSS touch targets are 56px. Every seeded +/-12px tap remains >=16px inside.
check('seeded button hit margins', () => { const n = noise(70); for (let i = 0; i < 10000; i++) assert(28 - Math.abs(n()) >= 16); });
for (const level of [0, 9]) {
    check(`serpentin capture regression L${level + 1}`, () => {
        const e = new Snake(level); step(e, 1000 + 150); e.special(); step(e, 1000);
        assert.equal(e.status, 'lost');
        const next = neighbor(e.state.segments[0], e.state.direction, snakeDifficulty(level).walls);
        assert(!next || e.state.obstacles.some(c => c.x === next.x && c.y === next.y));
        results.push({ game: 'serpentin', level: level + 1, before: { status: e.status, cause: next ? 'obstacle during capture' : 'wall during capture', eaten: e.state.eaten, captureMs: 1000 } });
    });
    // Pass 401: the second real-time snake room is 14 (prey, portals, torus), the old 10 now holds gates.
    const snakeLevel = level ? 13 : 0;
    for (const overhead of [0, 10, 20, 30]) {
        const e = new Snake(snakeLevel); step(e, 150); e.special(); let elapsed = 150;
        while (e.status === 'playing' && elapsed < 90000) check(`serpentin delayed L${snakeLevel + 1}/${overhead} at ${elapsed}ms`, () => {
            for (let i = 0; i < 10 && e.status === 'playing' && elapsed < 90000; i++) {
                const plan = snakePlan(e.snapshot(), 150); step(e, 150);
                for (const d of plan) e.input(d);
                step(e, overhead); elapsed += 150 + overhead;
            }
        });
        assert.equal(e.status, 'won', JSON.stringify({level: snakeLevel,overhead,elapsed,state:e.snapshot()}));
        results.push({ game: 'serpentin', level: snakeLevel + 1, overheadMs: overhead, status: e.status, elapsedMs: elapsed, deadlineMarginMs: 90000 - elapsed, eaten: e.state.eaten });
    }
    // Pass 404: the second real-time crossing is 13 (crossed tides, a light); 10 is a one-life challenge.
    const crossingLevel = level ? 12 : 0;
    for (const windowMs of [220, 300]) check(`traverse transport window L${crossingLevel + 1}/${windowMs}`, () => {
        const e = new Crossing(crossingLevel); let elapsed = 250, last = -1; step(e, elapsed);
        while (e.status === 'playing' && elapsed < 90000) {
            const s = e.snapshot();
            if (s.phase === last || (difficulty(crossingLevel).flowFrames - s.frames) * STEP < windowMs) { step(e, STEP); elapsed += STEP; continue; }
            const a = crossingAction(s); last = s.phase; step(e, 250); elapsed += 250;
            if (a === 'bond') e.special(); else if (a !== 'wait') e.input(a);
        }
        if (windowMs === 300) { assert.equal(e.status, 'won'); assert.equal(e.state.lives, 3); }
        results.push({ game: 'traverse-window', level: crossingLevel + 1, reactionMs: 150, transportMs: 100, windowMs, status: e.status, lives: e.state.lives, shelters: e.state.occupied.length, inputMarginMs: windowMs - 250 });
    });
    check(`traverse delayed L${crossingLevel + 1}`, () => {
        const e = new Crossing(crossingLevel); let elapsed = 0, last = -1;
        while (e.status === 'playing' && elapsed < 90000) {
            const s = e.snapshot();
            if (s.phase === last || (difficulty(crossingLevel).flowFrames - s.frames) * STEP < crossingInputWindowMs) { step(e, STEP); elapsed += STEP; continue; }
            const a = crossingAction(s); last = s.phase; step(e, 170); elapsed += 170;
            if (a === 'bond') assert(e.special()); else if (a !== 'wait') e.input(a);
        }
        assert.equal(e.status, 'won'); assert.equal(e.state.lives, 3);
        results.push({ game: 'traverse', level: crossingLevel + 1, status: e.status, elapsedMs: elapsed, lives: e.state.lives, inputWindowMarginMs: crossingInputWindowMs - 170, deadlineMarginMs: 90000 - elapsed });
    });
    check(`alunir delayed L${level + 1}`, () => {
        const e = new Lander(); e.loadLevel(level); let elapsed = 0;
        while (e.status === 'playing' && elapsed < 90000) {
            const s = e.snapshot(), model = new Lander(); model.loadLevel(level, s.seed); model.loadState(s); model.specialTicks = s.specialTicks; model.specialUses = s.specialUses; model.input(s.controls); step(model, 150);
            const control = landingControl(model), special = s.terrain.pads[0].y - s.y < 40 && s.specialUses > 0 && s.specialTicks === 0;
            step(e, 150); e.input(control); if (special) e.special(); step(e, 20); elapsed += 170;
        }
        assert.equal(e.status, 'won', JSON.stringify(e.snapshot()));
        results.push({ game: 'alunir', level: level + 1, status: e.status, elapsedMs: elapsed, fuel: e.state.fuel, vxMargin: LIMITS.vx - Math.abs(e.state.vx), vyMargin: LIMITS.vy - e.state.vy, angleMargin: LIMITS.angle - Math.abs(e.state.angle) });
    });
    // A race is a sequence of bounded cases, retaining the same live engine.
    const race = new Race(level), n = raceNoise, scale = Math.min(390 / 360, (844 - 44 - 156) / 640), origin = [n(), n()];
    let elapsed = 0, special = false;
    while (race.status === 'playing' && elapsed < 120000) check(`derapage L${level + 1} at ${elapsed}ms`, () => {
        for (let i = 0; i < 10 && race.status === 'playing' && elapsed < 120000; i++) {
            const h = racingHeading(race.snapshot()); step(race, 150);
            const dx = Math.cos(h) * 80 * scale + n() - origin[0], dy = Math.sin(h) * 80 * scale + n() - origin[1];
            race.input({ mode: 'joystick', heading: Math.atan2(dy, dx), assist: true, steer: 0, drift: false, bonus: false });
            if (!special && Math.hypot(race.karts[0].vx, race.karts[0].vy) > 16) { assert(race.special()); special = true; }
            step(race, 20); elapsed += 170;
        }
    });
    assert.equal(race.status, 'won'); assert(special);
    results.push({ game: 'derapage', level: level + 1, status: race.status, elapsedMs: elapsed, deadlineMarginMs: 120000 - elapsed, place: race.snapshot().order.indexOf(0) + 1, laps: race.karts[0].lap });
    {
        const e = new Bubble(), model = new Bubble(), n = bubbleNoise; e.loadLevel(level, 28); model.loadLevel(level, 28); let used = false, attempts = 0;
        for (const shot of solutions[level]) check(`bubble noisy drag L${level + 1} shot ${e.shots + 1}`, () => {
            if (shot.swap) { assert(e.swap()); assert(model.swap()); }
            const intended = model.trace(shot.angle);
            if (!used && intended.struck?.color === model.next) { assert(e.special()); assert(model.special()); used = true; }
            const expectedOutcome = bubbleOutcome(model, shot.angle);
            const radius = Math.min(500, 145 / Math.max(.01, Math.abs(Math.sin(shot.angle))));
            let found = false, commanded = shot.angle;
            for (let attempt = 0; attempt < 120; attempt++) {
                step(e, 150);
                const x = ORIGIN.x + Math.sin(commanded) * radius + n() / (390 / 360), y = ORIGIN.y - Math.cos(commanded) * radius + n() / (390 / 360);
                if (y < ORIGIN.y - 15) e.aim(Math.atan2(x - ORIGIN.x, ORIGIN.y - y)); const actual = model.trace(e.angle); attempts++;
                if ((intended.target && actual.target && key(intended.target) === key(actual.target) && (intended.struck ? actual.struck && key(intended.struck) === key(actual.struck) : !actual.struck)) || bubbleOutcome(model, e.angle) === expectedOutcome) { found = true; break; }
                commanded = Math.max(shot.angle - .08, Math.min(shot.angle + .08, commanded + (shot.angle - e.angle) * .5));
            }
            assert(found, JSON.stringify({level, shot, intended, angle: e.angle, actual: e.trace(), shots: e.shots})); model.aim(e.angle); assert(e.shoot()); assert(model.shoot());
            while (e.flight || model.flight) { step(e, STEP); step(model, STEP); }
            assert.equal(e.shots, model.shots); assert.deepEqual(e.grid, model.grid);
        });
        assert.equal(e.status, 'won'); assert.equal(e.specialUses, 0);
        results.push({ game: 'bubble', level: level + 1, status: e.status, shots: e.shots, attempts, remainingBubbles: e.grid.length });
    }
}
check('bubble tactical special pair', () => {
    for (const special of [false, true]) {
        const e = new Bubble(); e.load([{ row: 0, col: 4, color: 1 }, { row: 1, col: 4, color: 1 }, { row: 1, col: 5, color: 0 }], 0, 28);
        if (special) assert(e.special()); e.aim(Math.atan2(Math.sin(.05) * 400 + 3 / (390 / 360), Math.cos(.05) * 400 + 4 / (390 / 360)));
        step(e, 150); assert.equal(e.shots, 0); assert(e.shoot()); while (e.flight) step(e, STEP);
        assert.equal(e.shots, 1); assert.equal(e.status, special ? 'won' : 'playing');
        results.push({ game: 'bubble-special', special, status: e.status, shots: e.shots });
    }
});
check('first landing assistance preserves dangerous approaches', () => {
    for (const level of [0, 9]) {
        const e = new Lander(); e.loadLevel(level); const p = e.terrain.pads[0];
        e.loadState({ x: p.x + p.width / 2, y: p.y - 45, vx: 0, vy: .5, angle: .225 });
        step(e, 150); assert.equal(e.state.angle < .225, level === 0);
        e.loadState({ y: p.y - 20, vy: 4, angle: 0 }); step(e, 150); assert.equal(e.status, 'lost');
    }
});
check('capture and touch regression source guards', () => {
    const s = readFileSync('tests/e2e/character-finger-2.spec.ts', 'utf8');
    assert.doesNotMatch(s, /cdp.send\('Input.dispatchTouchEvent'/);
    assert.doesNotMatch(s, /\.advance\(/);
    assert.match(readFileSync('src/style.css', 'utf8'), /#serpentin-special, body\.empilo #touch-controls #empilo-special \{ font-size: 16px; letter-spacing: -0\.06em; \}/);
    assert.doesNotMatch(readFileSync('tests/e2e/habillage.spec.ts', 'utf8'), /setTimeout\(2000\)/);
});
const report = { pass: 80, browserRun: false, simulatedClock: '60 Hz engine steps', latencyMs: 150, noisePx: 12, seeds: { buttons: 70, canvas: 72, engines: 28, snake: 454 }, results, timings };
if (!process.argv.includes('--checks-only')) writeFileSync('docs/pass80-validation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
