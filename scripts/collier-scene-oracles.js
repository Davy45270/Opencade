/* global URL, URLSearchParams, console */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
import { readDriver } from '../src/games/collier/driver.ts';
import { Engine, FIXED_MS } from '../src/engines/collier/engine.ts';
import { GAME_NAME, LEVELS } from '../src/engines/collier/levels.ts';
import { policy } from '../src/engines/collier/policy.ts';
import { fieldView, logicalPoint, shooterLayout, themeIndex, themes } from '../src/games/collier/presentation.ts';
import { drawList } from '../src/characters/model.ts';
import { drawDecor, drawMotif, drawBonus } from '../src/games/collier/art.ts';
const sceneFile = new URL('../src/games/collier/scene.ts', import.meta.url);
const sceneCode = transpile(readFileSync(sceneFile, 'utf8'))
    .replace(/^import .*;\s*$/gm, '')
    .replace(/\bexport (class|const) /g, '$1 ');
let sceneFactory;

/** Execute the delivered scene's listeners and drawing calls, without a browser.
 * Only platform services are doubled; the scene and the engine are the real sources. */
export function createScene(character = 'panda') {
    const handlers = new Map();
    const textures = new Set();
    const drawings = [];
    const circles = [];
    const sounds = [];
    const calls = [];
    let fill;
    const graphics = new Proxy({}, {
        get: (_, name) => (...args) => {
            calls.push({ name, args });
            if (name === 'generateTexture') textures.add(args[0]);
            if (name === 'clear')
                circles.length = 0;
            if (name === 'fillStyle')
                fill = args[0];
            if (name === 'fillCircle')
                circles.push({
                    x: args[0],
                    y: args[1],
                    radius: args[2],
                    fill
                });
        },
    });
    class Actor {
        constructor(id = character) {
            this.id = id;
        }
        snapshot() {
            return { id: this.id };
        }
        advance() {
        }
        draw(_g, x, y, size) {
            calls.push({ name: 'actor', args: [this.id, x, y, size] });
            drawings.push({
                id: this.id,
                x,
                y,
                size
            });
        }
    }
    class Inputs {
        on(_element, event, callback) {
            handlers.set(event, callback);
        }
        dispose() {
        }
    }
    class Progression {
        state = 'playing';
        save = {};
        start() {
            this.state = 'playing';
        }
        finish(status) {
            this.state = status;
        }
    }
    class BaseScene {
        input = {
            on(event, callback) {
                handlers.set(event, callback);
            },
            removeAllListeners() {
            },
        };
        textures = { exists: key => textures.has(key) };
        add = { graphics: () => graphics, image: (_x, _y, key) => {
            const image = { key, visible: true, x: 0, y: 0,
                setOrigin() { return this; }, setDepth() { return this; }, destroy() {},
                setTexture(value) { this.key = value; return this; },
                setPosition(x, y) { this.x = x; this.y = y; return this; },
                setDisplaySize() { return this; }, setScale() { return this; },
                setVisible(value) { this.visible = value; return this; }
            };
            return image;
        }, text: () => ({ setText() {}, setOrigin() { return this; } }) };
        events = { once() {
            } };
        game = { canvas: { setAttribute() {
                } } };
    }
    const page = { querySelector: () => null };
    const host = {};
    const bindings = {
        Phaser: { Scene: BaseScene },
        fieldView, logicalPoint, shooterLayout, themeIndex, themes, drawDecor, drawMotif, drawBonus,
        matchMedia: () => ({ matches: false }),
        Engine,
        DIAMETER: 20,
        GAME_NAME,
        LEVELS,
        GameCharacter: Actor,
        Inputs,
        renderTouchControls() {
        },
        PlaySession: class {
            paused = false;
        },
        Progression,
        browserStorage() {
        },
        readSave() {
        },
        writeSave() {
        },
        renderPanels() {
        },
        renderLevels() {
        },
        sound: { stop() {
            }, playEffect(name, combo) {
                sounds.push({ name, combo });
            } },
        window: host,
        document: page,
        location: { search: '?test=1' },
        HTMLElement: class {
            closest() { return null; }
        },
        URLSearchParams,
        readDriver
    };
    sceneFactory ??= new Function(...Object.keys(bindings), `${sceneCode}\nreturn CollierScene;`);
    const Scene = sceneFactory(...Object.values(bindings));
    const scene = new Scene();
    scene.create();
    const dispatch = (name, point) => {
        assert.ok(handlers.has(name), `Écouteur ${name}`);
        if (name.startsWith('pointer') && point.x !== undefined) {
            const view = fieldView(scene.engine.config);
            point = { ...point, x: point.x * view.scale + view.x, y: point.y * view.scale + view.y };
        }
        handlers.get(name)(point);
    };
    function tap(x, y) {
        dispatch('pointerdown', {
            id: 1,
            x,
            y,
            downTime: 0,
            wasTouch: true
        });
        dispatch('pointerup', {
            id: 1,
            x,
            y,
            upTime: 100,
            wasTouch: true
        });
    }
    return {
        scene,
        engine: scene.engine,
        drawings,
        circles,
        calls,
        sounds,
        tap,
        dispatch,
        hook: host.__COLLIER_TEST__
    };
}
export function C16() {
    const snapshots = [];
    for (const id of [
        'panda',
        'pandaroux',
        'dragon',
        'singe',
        'licorne'
    ]) {
        const { engine, hook } = createScene(id);
        engine.loadLevel(4, 300);
        for (let n = 0; n < 300; n++) {
            if (n % 9 === 0)
                policy(engine);
            engine.step(FIXED_MS);
        }
        const view = hook.read();
        assert.equal(view.character.id, id);
        assert.equal(view.leader.id, id === 'singe' ? 'panda' : 'singe');
        snapshots.push(engine.snapshot());
    }
    for (const snapshot of snapshots)
        assert.deepEqual(snapshot, snapshots[0]);
}
export function C21() {
    const { engine, tap, dispatch } = createScene();
    // Both targets must exchange without shooting, independently of the button.
    engine.loadState([{
            id: 1,
            color: 0,
            s: 100
        }, {
            id: 2,
            color: 1,
            s: 120
        }], 24, 0, 1);
    const o = engine.config.shooter;
    tap(o.x + 44, o.y + 35);
    assert.equal(engine.current, 1);
    assert.equal(engine.shots, 0);
    tap(o.x, o.y);
    assert.equal(engine.current, 0);
    dispatch('pointerdown', {
        id: 1,
        x: 100,
        y: 100,
        downTime: 0,
        wasTouch: true
    });
    const before = engine.angle;
    dispatch('pointermove', {
        id: 1,
        x: 300,
        y: 200,
        wasTouch: true
    });
    assert.notEqual(engine.angle, before);
    assert.equal(engine.angle, Math.atan2(200 - o.y, 300 - o.x));
    assert.equal(engine.shots, 0);
    dispatch('pointerup', {
        id: 1,
        x: 300,
        y: 200,
        upTime: 100,
        wasTouch: true
    });
    assert.equal(engine.shots, 1);
    assert.ok(Math.abs(Math.atan2(engine.flight.dy, engine.flight.dx) - engine.angle) < .000001);
    engine.flight = null;
    dispatch('pointermove', {
        id: 2,
        x: 50,
        y: 150,
        wasTouch: false
    });
    assert.equal(engine.angle, Math.atan2(150 - o.y, 50 - o.x));
    const key = (code, repeat = false) => dispatch('keydown', {
        code,
        repeat,
        preventDefault() {
        }
    });
    key('Space');
    assert.equal(engine.shots, 2);
    engine.flight = null;
    key('Space', true);
    assert.equal(engine.shots, 2);
    engine.loadState([{id: 1, color: 0, s: 100}, {id: 2, color: 1, s: 120}], 24, 0, 1);
    const current = engine.current, next = engine.next;
    key('KeyX');
    assert.equal(engine.current, next);
    assert.equal(engine.next, current);
    key('ArrowRight');
    assert.equal(engine.angle, Math.atan2(150 - o.y, 50 - o.x) + .06);

    // Both input devices must use release coordinates, even without a move event.
    for (const wasTouch of [true, false]) {
        for (const withMove of [true, false]) {
            const { engine: e, dispatch: send } = createScene();
            send('pointerdown', { id: 1, x: 100, y: 100, downTime: 0, wasTouch });
            if (withMove)
                send('pointermove', { id: 1, x: 240, y: 150, wasTouch });
            send('pointerup', { id: 1, x: 300, y: 200, upTime: 300, wasTouch });
            const expected = Math.atan2(200 - e.config.shooter.y, 300 - e.config.shooter.x);
            assert.equal(e.shots, 1);
            assert.equal(e.angle, expected);
            assert.ok(Math.abs(Math.atan2(e.flight.dy, e.flight.dx) - expected) < .000001);
        }
    }

    // Strict distance boundary; holding an exchange target never turns into a shot.
    for (const wasTouch of [true, false]) {
        for (const [distance, duration, excursion, swaps] of [
            [4.999, 100, 0, true],
            [5, 100, 0, true],
            [9.999, 100, 0, true],
            [10, 100, 0, false],
            [0, 199, 0, true],
            [0, 200, 0, true],
            [0, 249.999, 0, true],
            [0, 250, 0, true],
            [0, 600, 0, true],
            [40, 600, 0, false],
            [0, 100, 9.999, true],
            [0, 100, 10, false],
            [0, 100, 40, false],
        ]) {
            const { engine: e, dispatch: send } = createScene();
            e.loadState([{ id: 1, color: 0, s: 100 }, { id: 2, color: 1, s: 120 }], 24, 0, 1);
            const origin = e.config.shooter;
            send('pointerdown', { id: 1, ...origin, downTime: 1000, wasTouch });
            if (excursion)
                send('pointermove', { id: 1, x: origin.x + excursion, y: origin.y, wasTouch });
            send('pointerup', { id: 1, x: origin.x + distance, y: origin.y, upTime: 1000 + duration, wasTouch });
            assert.equal(e.shots, swaps ? 0 : 1, `${wasTouch}: ${distance}px / ${duration}ms / excursion ${excursion}`);
            if (swaps) {
                assert.equal(e.current, 1);
                assert.equal(e.next, 0);
            }
        }
    }

    // Long holds on both exchange targets, and elsewhere, use the real listeners.
    for (const target of ['reserve', 'shooter', 'elsewhere']) {
        const { engine: e, dispatch: send } = createScene();
        e.loadState([{ id: 1, color: 0, s: 100 }, { id: 2, color: 1, s: 120 }], 24, 0, 1);
        const origin = target === 'reserve' ? { x: o.x + 44, y: o.y + 35 }
            : target === 'shooter' ? o : { x: 80, y: 100 };
        send('pointerdown', { id: 1, ...origin, downTime: 0, wasTouch: true });
        send('pointerup', { id: 1, ...origin, upTime: 600, wasTouch: true });
        assert.equal(e.shots, target === 'elsewhere' ? 1 : 0, target);
        if (target !== 'elsewhere') assert.equal(e.current, 1, target);
    }

    for (const cancel of ['touchcancel', 'pointerupoutside']) {
        for (const nextId of [1, 2]) {
            const { engine: e, dispatch: send } = createScene();
            send('pointerdown', { id: 1, x: 100, y: 100, downTime: 0, wasTouch: true });
            send(cancel, {});
            assert.equal(e.shots, 0, `${cancel}: no shot on cancellation`);
            send('pointerdown', { id: nextId, x: 80, y: 100, downTime: 400, wasTouch: true });
            assert.equal(e.angle, Math.atan2(100 - e.config.shooter.y, 80 - e.config.shooter.x), `${cancel}: new press aims`);
            send('pointerup', { id: nextId, x: 250, y: 180, upTime: 700, wasTouch: true });
            assert.equal(e.shots, 1, `${cancel}: next gesture`);
            assert.equal(e.angle, Math.atan2(180 - e.config.shooter.y, 250 - e.config.shooter.x));
        }
    }
}
export function C22() {
    const { scene, engine, drawings, circles } = createScene();
    engine.loadState([{
            id: 1,
            color: 0,
            s: 240
        }, {
            id: 2,
            color: 1,
            s: 260
        }], 24, 0, 1);
    const path = engine.config.paths[0];
    function leaderAt(s) {
        drawings.length = 0;
        scene.draw();
        const leader = drawings.find(d => d.id === 'singe');
        assert.ok(leader);
        const position = path.pointAt(s + 24);
        const size = 64 / fieldView(engine.config).scale;
        assert.equal(leader.x, position.x - size / 2);
        assert.equal(leader.y, position.y - size * .7);
        return leader;
    }
    const before = leaderAt(260);
    engine.step(1000);
    const after = leaderAt(engine.chains[0].beads.at(-1).s);
    assert.notDeepEqual(after, before);
    const bead = path.pointAt(engine.chains[0].beads.at(-1).s);
    const o = engine.config.shooter;
    engine.aim(Math.atan2(bead.y - o.y, bead.x - o.x));
    engine.activate('aim');
    scene.draw();
    const distance = Math.hypot(engine.trace().x - o.x, engine.trace().y - o.y);
    assert.ok(distance < 800 && distance > 30);
    const guide = circles.filter(p => p.radius === 2 && p.fill === 16314829);
    assert.ok(guide.length > 0);
    for (const p of guide)
        assert.ok(Math.hypot(p.x - o.x, p.y - o.y) < distance);
    const last = guide.at(-1);
    assert.ok(distance - Math.hypot(last.x - o.x, last.y - o.y) <= 12);
}
export function C23() {
    const { scene, engine, sounds } = createScene();
    const path = engine.config.paths[0];
    engine.loadState([{ id: 1, color: 0, s: path.length * .85 }], engine.config.quota);
    engine.events.length = 0;
    scene.update(0, FIXED_MS);
    assert.deepEqual(sounds, [{ name: 'danger', combo: 1 }]);
    scene.update(0, FIXED_MS);
    assert.equal(sounds.length, 1);
    engine.activate('slow');
    scene.update(0, 0);
    assert.deepEqual(sounds.at(-1), { name: 'bonus', combo: 1 });
    scene.update(0, 0);
    assert.equal(sounds.length, 2);
    engine.loadState([{ id: 1, color: 0, s: path.length - .01 }], engine.config.quota);
    scene.update(0, FIXED_MS);
    assert.deepEqual(sounds.slice(2), [{ name: 'life', combo: 1 }, { name: 'lost', combo: 1 }]);
    scene.update(0, FIXED_MS);
    assert.equal(sounds.length, 4);
    assert.deepEqual(engine.events, []);

    const inserted = createScene();
    const insertionPath = inserted.engine.config.paths[0];
    const s = insertionPath.length * .85 - 1;
    inserted.engine.loadState([{ id: 1, color: 0, s }], inserted.engine.config.quota);
    const position = insertionPath.pointAt(s);
    const tangent = insertionPath.tangent(s);
    inserted.engine.insert(0, 0, { x: position.x + tangent.x, y: position.y + tangent.y }, 1);
    inserted.scene.update(0, 0);
    assert.deepEqual(inserted.sounds, [{ name: 'insertion', combo: 1 }, { name: 'danger', combo: 1 }]);
    inserted.scene.update(0, FIXED_MS);
    assert.equal(inserted.sounds.length, 2);
}
/** Rendered shooter primitives must never enter the conservative head ellipse. */
export function C24() {
    for (const id of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne']) {
        const { scene, engine, calls } = createScene(id);
        for (let i = 0; i < 16; i++) {
            engine.aim(i * Math.PI / 8);
            calls.length = 0;
            scene.drawShooter();
            const view = fieldView(engine.config);
            const h = shooterLayout(engine.config.shooter, engine.angle, fieldView(engine.config).scale).head;
            const outside = (x, y, margin = 0) =>
                ((x - h.x) / (h.rx + margin)) ** 2 + ((y - h.y) / (h.ry + margin)) ** 2 > 1;
            for (const image of scene.beadImages.slice(-2)) {
                assert.ok(outside((image.x - view.x) / view.scale, (image.y - view.y) / view.scale, 11.5 / view.scale), `${id}: textured bead covers face`);
            }
            let width = 0;
            for (const { name, args: a } of calls) {
                if (name === 'lineStyle') width = a[0];
                if (name === 'fillCircle') assert.ok(outside(a[0], a[1], a[2]), `${id}: bead covers face`);
                if (name === 'strokeCircle')
                    for (let n = 0; n < 64; n++)
                        assert.ok(outside(a[0] + Math.cos(n * Math.PI / 32) * a[2], a[1] + Math.sin(n * Math.PI / 32) * a[2], width / 2));
                if (name === 'lineBetween' || name === 'fillTriangle') {
                    const edges = name === 'lineBetween' ? [[0, 2]] : [[0, 2], [2, 4], [4, 0]];
                    for (const [from, to] of edges)
                        for (let n = 0; n <= 32; n++) {
                            const t = n / 32;
                            assert.ok(outside(a[from] * (1 - t) + a[to] * t, a[from + 1] * (1 - t) + a[to + 1] * t, name === 'lineBetween' ? width / 2 : 0), `${id}: cannon covers face`);
                        }
                }
            }
        }
    }
}
export function C25() {
    const signatures = [];
    for (const level of [0, 8, 16, 24]) {
        const { scene, hook, calls } = createScene();
        calls.length = 0;
        hook.loadLevel(level);
        assert.equal(scene.universe, level / 8);
        signatures.push(JSON.stringify(calls.filter(c => ['fillTriangle', 'fillEllipse', 'strokeCircle'].includes(c.name)).slice(0, 60)));
        calls.length = 0;
        scene.draw();
        assert.equal(calls.filter(c => c.name === 'generateTexture').length, 0, 'Static texture reused');
    }
    assert.equal(new Set(signatures).size, 4, 'Four different universes');
}
export function C26() {
    const { scene, calls } = createScene();
    const signatures = [];
    for (let color = 0; color < 6; color++) {
        calls.length = 0;
        scene.paintBead(scene.graphics, 180, 300, color, 11.5);
        const shape = calls.filter(c => !['fillStyle', 'lineStyle'].includes(c.name));
        assert.ok(shape.length > 4, 'Visible motif besides disc, outline and reflection');
        signatures.push(JSON.stringify(shape));
    }
    assert.equal(new Set(signatures).size, 6, 'Six distinct silhouettes');
}
export function C27() {
    const { scene, engine, hook, calls } = createScene();
    // The phone canvas fits in 390 × (844 - 220), hence scale 624 / 640.
    const cssScale = 624 / 640;
    for (let level = 0; level < 30; level++) {
        hook.loadLevel(level);
        const view = hook.view();
        calls.length = 0;
        scene.draw();
        assert.deepEqual(calls.find(c => c.name === 'setScale')?.args, [view.scale]);
        assert.deepEqual(calls.find(c => c.name === 'setPosition')?.args, [view.x, view.y]);
        const points = engine.config.paths.flatMap(p => p.samples);
        const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
        const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
        assert.ok(width * height * view.scale ** 2 / (360 * 510) >= .55, `Field coverage ${level + 1}`);
        const leader = calls.find(c => c.name === 'actor' && c.args[0] === 'singe');
        assert.ok(leader.args[3] * .75 * view.scale * cssScale >= 44);
        assert.ok(23 * cssScale >= 22);
        assert.ok(scene.beadImages.some(image => image.visible));
        const o = engine.config.shooter;
        assert.deepEqual(logicalPoint({ x: o.x * view.scale + view.x, y: o.y * view.scale + view.y }, view), o);
    }
}
export function C28() {
    const { scene, engine, calls } = createScene();
    engine.combo = 2;
    engine.bursts = [{ x: 80, y: 100, color: 0, time: engine.time }];
    scene.reducedMotion = true;
    calls.length = 0;
    scene.draw();
    assert.equal(calls.filter(c => c.name === 'setPosition').length, 1, 'No shake with reduced motion');
    engine.combo = 1;
    const shapes = [];
    for (const bonus of ['slow', 'reverse', 'bomb', 'aim']) {
        calls.length = 0;
        drawBonus(scene.graphics, 0, 0, bonus);
        shapes.push(JSON.stringify(calls));
    }
    assert.equal(new Set(shapes).size, 4, 'Four distinct bonus icons');
}
export function C29() {
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    assert.match(css, /\.card-content strong \{ font-size: 20px; line-height: 1\.2; \}/);
    assert.match(css, /\.card-content strong \{ min-height: 2\.4em; max-height: 2\.4em; overflow: hidden; \}/);
    const font = Number(css.match(/strong \{ font-size: (\d+)px/)?.[1]);
    const lineHeight = Number(css.match(/strong \{ font-size: \d+px; line-height: ([\d.]+)/)?.[1]);
    const reserve = Number(css.match(/strong \{ min-height: ([\d.]+)em/)?.[1]) * font;
    const heights = [1, 2].map(lines => Math.max(lines * font * lineHeight, reserve));
    assert.deepEqual(heights, [48, 48]);
    // Before the reservation, centred content differed by half a line: 12px.
    assert.equal(font * lineHeight / 2, 12);
}
/** Real cast geometry, rather than the nominal square passed to draw(). */
export function C31() {
    const cssScale = 624 / 640;
    for (const id of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne']) {
        const { scene, engine, hook, calls } = createScene(id);
        const ys = drawList(id, 'face', 'concentre', 'repos', 0, 'reduce').flatMap(p => {
            if (p.kind === 'circle') return [p.y - p.r, p.y + p.r];
            if (p.kind === 'ellipse') return [p.y - p.ry, p.y + p.ry];
            if (p.kind === 'path') return p.commands.flatMap(c => c.op === 'C' ? [c.a[1], c.b[1], c.p[1]] : [c.p[1]]);
            return p.points.map(q => q[1]);
        });
        for (let level = 0; level < 30; level++) {
            hook.loadLevel(level);
            calls.length = 0;
            scene.drawShooter();
            const size = calls.find(c => c.name === 'actor').args[3];
            const view = fieldView(engine.config);
            assert.ok((Math.max(...ys) - Math.min(...ys)) / 240 * size * view.scale * cssScale >= 56, `${id}: visible height at 390×844`);
            const o = engine.config.shooter;
            const ring = size * .56;
            const distance = Math.min(...engine.config.paths.flatMap(p => p.samples.map(q => Math.hypot(q.x - o.x, q.y - o.y))));
            assert.ok(distance > ring + 8, `${id}: ring clear of rail, level ${level + 1}`);
        }
    }
}
export function C32() {
    const { scene, calls } = createScene();
    calls.length = 0;
    scene.paintBead(scene.graphics, 20, 18, 0, 11.5);
    assert.ok(calls.some(c => c.name === 'fillEllipse' && c.args[2] === 11.5 * .48 && c.args[3] === 11.5 * .24), 'Specular pearl highlight');
    assert.ok(calls.filter(c => c.name === 'fillCircle').length >= 16, 'Radial shading');
}
/** Warm-frame draw primitives: fills, strokes, character paints and image quads.
 * Pass 305 baseline measured in Node with the same 30 initial level states.
 * Texture generation is excluded; each texture is built only once.
 */
export function C33() {
    const before = [256,256,255,255,255,255,256,255,255,255,254,254,254,254,255,254,255,255,254,254,255,255,256,255,250,250,249,249,349,349];
    const after = [];
    for (let level = 0; level < 30; level++) {
        const { scene, hook, calls } = createScene();
        hook.loadLevel(level);
        calls.length = 0;
        scene.draw();
        assert.equal(calls.filter(c => c.name === 'generateTexture').length, 0, 'Warm frame reuses textures');
        const primitives = calls.reduce((n, c) => n + (c.name === 'actor'
            ? drawList(c.args[0], 'face', 'concentre', 'repos', 0).reduce((v, p) => v + Number(Boolean(p.fill)) + Number(p.width > 0), 0)
            : /^(fill(?!Style)|stroke)/.test(c.name) ? 1 : 0), 0)
            + scene.beadImages.filter(image => image.visible).length + 2; // decor and track quads
        after.push(primitives);
        assert.ok(primitives <= (before[level] + 1) * 1.2, `Primitive budget level ${level + 1}`);
    }
    console.log(`Primitives/image (30 niveaux, décor inclus) : avant ${before.map(n => n + 1).join(',')} ; après ${after.join(',')}`);
}
export function C30() {
    const { engine, hook } = createScene();
    engine.step(150);
    const expected = readDriver(engine);
    engine.snapshot = () => { throw new Error('Le pilote ne doit pas construire le snapshot'); };
    assert.deepEqual(hook.readDriver(), expected);
    assert.deepEqual(Object.keys(expected).sort(), [
        'angle', 'chains', 'current', 'flight', 'gameTimeMs', 'next', 'shooter', 'shots', 'status'
    ]);
    assert.equal(expected.gameTimeMs, engine.time);
    assert.ok(expected.gameTimeMs > 0);
    assert.equal(expected.chains[0].head, expected.chains[0].beads.at(-1).s);
    assert.equal(LEVELS[0].name, 'Ovale croissant');
    assert.equal(LEVELS[3].name, 'Arche arrondie');
    assert.equal(LEVELS[7].name, 'Ovale ouvert');
}
export const sceneCases = {
    C16,
    C21,
    C22,
    C23,
    C24,
    C25,
    C26,
    C27,
    C28,
    C29,
    C30,
    C31,
    C32,
    C33
};
