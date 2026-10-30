/* global console, performance, window */
import assert from 'node:assert/strict';
import { mount, tap, key } from './validate-character-scenes.js';
import { mutationModule } from './mutation-module.js';
const { ids, drawList } = await import('../src/characters/model.ts');
const { renderCharacter } = await import('../src/characters/phaser.ts');
const { emptyBoard } = await import('../src/engines/empilo/engine.ts');
const timings = [];
// Layout oracle: derive the actor's box from the board/cannon, never draw's arguments.
function placement(game, engine, draws) {
    const expected = game === 'dedale'
        ? [5.2 + (engine.state.hero.x + .5) * 18.4 - 14, 64 + (engine.state.hero.y + .5) * 18.4 - 14, 28]
        : game === 'orbite' ? [engine.state.cannon - 24, 588 - 35, 48]
            : [270 + 4, 230, 84];
    assert(draws.length, 'actor actually drawn');
    assert.deepEqual(draws[0].slice(0, 3), expected, `${game}: layout position`);
    if (game === 'empilo') {
        const [x, y, size] = draws[0];
        assert(x >= 18 + 9 * 28 && x + size <= 360 && y >= 34 && y + size <= 482, 'mascot outside the entire well');
    }
}
function particles(h) {
    const { engine, hero, frame, calls } = h;
    // A short known path; test its geometry independently of received effect coordinates.
    const maze = Array(437).fill(false); for (const at of [20, 21, 22]) maze[at] = true;
    engine.loadState({ ...engine.state, journey: undefined, maze, hero: { x: 1, y: 1, direction: 'up' }, requested: 'up', seeds: [21], suns: [22], wisps: [] });
    tap('dedale-special'); frame(60);
    assert.deepEqual(engine.lightPath, [20, 21, 22]);
    const shapes = drawList(hero.id, 'face', 'joie', 'special', hero.time).filter(p => p.effect);
    assert(shapes.length, 'selected identity has particles');
    const expected = [], g = new Proxy({}, { get: (_, method) => (...args) => { expected.push([method, ...args]); return g; } });
    for (const at of [20, 21, 22]) {
        const x = 5.2 + (at % 19 + .5) * 18.4, y = 64 + (Math.floor(at / 19) + .5) * 18.4;
        renderCharacter(g, shapes, x - 10, y - 10, 20);
    }
    // Each complete particle draw must occur, not just the marker circles or HUD.
    let cursor = 0;
    for (const call of calls) if (JSON.stringify(call) === JSON.stringify(expected[cursor])) cursor++;
    assert.equal(cursor, expected.length, 'Lueur draws all selected character particles on the path');
}
function reserve(h) {
    const { engine, frame, calls } = h;
    for (const id of [0, 1]) {
        engine.loadState({ ...engine.state, reserve: null, active: { ...engine.state.active, id } });
        tap('empilo-special'); frame(60); assert.equal(engine.reserve, id);
        const cells = id === 0 ? [[0, 0], [1, 0], [2, 0]] : [[0, 0], [0, 1], [1, 1]];
        const actual = calls.filter(c => c[0] === 'fillRoundedRect' && c[2] >= 370 && c[2] < 410 && c[1] >= 282);
        assert.deepEqual(actual, cells.map(([x, y]) => ['fillRoundedRect', 282 + x * 13, 370 + y * 13, 11, 11, 3]), 'reserved piece really painted');
    }
}
function events(game, h) {
    const { engine, hero, frame } = h;
    if (game === 'dedale') {
        for (const lives of [3, 1]) {
            window.__DEDALE_TEST__.scenario('danger'); engine.state.lives = lives;
            key('ArrowUp'); frame(167);
            assert(engine.events.includes('life'), 'real wisp collision');
            assert.equal(engine.state.lives, lives - 1); assert.equal(hero.expression, 'surprise');
            if (lives === 1) { assert.equal(engine.status, 'lost'); frame(600); assert.equal(hero.expression, 'triste'); }
            else assert.equal(engine.status, 'playing');
        }
        window.__DEDALE_TEST__.scenario('finish'); key('ArrowUp'); frame(167);
    } else if (game === 'orbite') {
        for (const lives of [3, 1]) {
            engine.loadLevel(0); engine.loadState({ ...engine.state, lives, shields: [], enemyTimer: 1e6, shots: [{ x: 180, y: 580, owner: 'enemy' }] });
            frame(1000 / 60); assert(engine.events.includes('life'), 'real shot collision');
            assert.equal(engine.state.lives, lives - 1); assert.equal(hero.expression, 'surprise');
            if (lives === 1) { assert.equal(engine.status, 'lost'); frame(600); assert.equal(hero.expression, 'triste'); }
            else assert.equal(engine.status, 'playing');
        }
        window.__ORBITE_TEST__.loadLevel(0, 28);
        engine.loadState({ ...engine.state, shields: [], probes: [{ id: 0, x: 180, y: 200, row: 0, column: 0, hp: 1 }], shots: [{ x: 180, y: 216, owner: 'player' }], enemyTimer: 1e6 });
        frame(1000 / 60); assert(engine.events.includes('probe'), 'last probe destroyed by a real shot');
    } else {
        // Clear a line without finishing, then finish with the same real input route.
        for (const lines of [0, 4]) {
            window.__EMPILO_TEST__.scenario('finish'); engine.state.lines = lines;
            tap('empilo-drop'); frame(16);
            assert.equal(engine.state.lines, lines + 1); assert.equal(hero.animation, 'celebration');
            if (!lines) assert.equal(engine.status, 'playing');
        }
    }
    assert.equal(engine.status, 'won'); assert.equal(hero.expression, 'joie'); assert.equal(hero.animation, 'celebration');
    if (game === 'empilo') {
        window.__EMPILO_TEST__.scenario('blocked'); tap('empilo-drop'); frame(16);
        assert.equal(engine.status, 'lost'); assert.equal(hero.expression, 'surprise'); frame(600); assert.equal(hero.expression, 'triste');
        // Gravity path also celebrates a line, independently from the input callback.
        window.__EMPILO_TEST__.loadLevel(0, 28);
        const board = emptyBoard(); board[15] = [1, 1, 1, 0, 0, 0, 1, 1, 1];
        engine.loadState({ ...engine.state, board, lines: 0, active: { id: 0, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], x: 3, y: 15 }, lockMs: 499 });
        frame(1000 / 60); assert.equal(engine.state.lines, 1); assert.equal(hero.animation, 'celebration');
    }
}
async function check(game, id, SceneOverride) {
    const h = await mount(game, id, SceneOverride), { engine, hero, frame, scene, draws } = h;
    try {
        h.session.send('start'); frame(60); assert.equal(hero.id, id); placement(game, engine, draws);
        tap(`${game}-special`); frame(); assert.equal(engine.specialUses, 0); assert.equal(hero.animation, 'special');
        assert.match(scene.hud.text, game === 'dedale' ? /LUEUR 0\/1/ : game === 'orbite' ? /RAFALE 0\/1/ : /RÉSERVE 0\/1/);
        const before = engine.snapshot(), time = hero.time;
        h.session.send('toggle'); assert.equal(hero.expression, 'dodo', 'pause is synchronous'); const sleeping = hero.snapshot(); frame(1000); assert.deepEqual(hero.snapshot(), sleeping); h.session.send('start'); frame();
        h.session.menuOpen = true; frame(800); assert.equal(hero.expression, 'dodo'); assert.equal(hero.time, time); assert.deepEqual(engine.snapshot(), before); assert(draws.length);
        h.session.menuOpen = false; frame(100); assert.notEqual(hero.expression, 'dodo');
        if (game === 'dedale') { engine.loadState({ ...engine.state, journey: undefined, maze: Array(437).fill(true), wisps: [], hero: { x: 9, y: 17, direction: 'up' }, requested: 'up' }); key('ArrowLeft'); frame(200); assert.equal(hero.pose, 'profil'); particles(h); }
        if (game === 'orbite') { key('ArrowRight'); frame(200); assert.equal(hero.pose, 'profil'); assert(!hero.flip); }
        if (game === 'empilo') { tap('empilo-left'); frame(); assert.equal(hero.pose, 'profil'); assert(hero.flip); reserve(h); }
        placement(game, engine, draws); events(game, h);
    } finally { h.cleanup(); }
}
for (const game of ['dedale', 'orbite', 'empilo']) for (const id of ids) {
    const started = performance.now(); await check(game, id);
    const ms = performance.now() - started; timings.push({ game, id, ms });
}
for (const [game, before, after] of [
    ['dedale', 'this.hero.draw(g, x - 14, y - 14, 28);', 'this.hero.draw(g, 0, 0, 28);'],
    ['orbite', 'this.hero.draw(g, s.cannon - 24, CANNON_Y - 35, 48);', 'this.hero.draw(g, 0, 0, 48);'],
    ['empilo', 'this.hero.draw(g, 274, 230, 84);', 'this.hero.draw(g, 100, 230, 84);'],
    ...['dedale', 'orbite'].map(game => [game, "if (event === 'life') this.hero.impact = 500;", "if (event === 'life') this.hero.impact = 0;"]),
    ['dedale', 'g.strokeCircle(px, py, 4); this.hero.drawEffect(g, px - 10, py - 10, 20);', 'g.strokeCircle(px, py, 4);'],
    ['empilo', 'if (this.engine.reserve !== null) for (const c of SHAPES[this.engine.reserve] ?? [])', 'if (this.engine.reserve !== null) for (const c of (SHAPES[this.engine.reserve] ?? []).slice(0, 0))'],
]) {
    const { module } = await mutationModule(`../src/games/${game}/scene.ts`, before, after, { phaser: 'data:text/javascript,export default { Scene: class {} };' });
    await assert.rejects(() => check(game, 'panda', module[`${game[0].toUpperCase()}${game.slice(1)}Scene`]), { name: 'AssertionError' });
}
console.log(JSON.stringify({ pass: 83, scenes: timings, killedMutations: 7 }));
