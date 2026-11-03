/* global URL, URLSearchParams, console */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
import { GameCharacter } from '../src/characters/game.ts';
import { readDriver } from '../src/games/collier/driver.ts';
import { Engine, FIXED_MS } from '../src/engines/collier/engine.ts';
import { GAME_NAME, LEVELS } from '../src/engines/collier/levels.ts';
import { policy } from '../src/engines/collier/policy.ts';
import { canvasSize, fieldView, logicalPoint, shooterLayout, themeIndex, themes } from '../src/games/collier/presentation.ts';
import { compareBakedActors } from './collier-baked-oracle.js';
import { actorLayers } from '../src/games/collier/actor-art.ts';
import { graphicsMeter } from './collier-graphics-meter.js';
import { renderCharacter } from '../src/characters/phaser.ts';
import { drawList } from '../src/characters/model.ts';
import { drawDecor, drawMotif, drawBonus } from '../src/games/collier/art.ts';
const sceneFile = new URL('../src/games/collier/scene.ts', import.meta.url);
const sceneCode = transpile(readFileSync(sceneFile, 'utf8'))
    .replace(/^import .*;\s*$/gm, '')
    .replace(/\bexport (class|const) /g, '$1 ');
let sceneFactory;

/** Execute the delivered scene's listeners and drawing calls, without a browser.
 * Only platform services are doubled; the scene and the engine are the real sources. */
export function createScene(character = 'panda', measure = false, source, dimensions = canvasSize) {
    const meter = graphicsMeter();
    const handlers = new Map();
    const domHandlers = new Map();
    const textures = new Set();
    const textureCommands = new Map();
    const drawings = [];
    const texts = [];
    const images = [];
    let textureBuilds = 0;
    const circles = [];
    const sounds = [];
    const calls = [];
    let fill;
    const graphics = new Proxy({}, {
        get: (_, name) => (...args) => {
            calls.push({ name, args });
            if (name === 'generateTexture') { textures.add(args[0]); textureBuilds++; }
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
    class Actor extends GameCharacter {
        pose = 'face'; expression = 'concentre'; animation = 'repos'; time = 0; flip = false;
        constructor(id = character) {
            super(id);
        }
        snapshot() {
            return super.snapshot();
        }
        advance(...args) { super.advance(...args); }
        draw(_g, x, y, size) {
            if (measure) renderCharacter(_g, drawList(this.id, 'face', this.expression ?? 'concentre', this.animation ?? 'repos', this.time ?? 0), x, y, size);
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
            if (_element === host) domHandlers.set(event, callback);
            else handlers.set(event, callback);
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
        scale = { canvasBounds: { left: 0, top: 0 }, displayScale: { x: 1, y: 1 }, width: 360, height: 640, setGameSize(width, height) { this.width = width; this.height = height; } };
        input = {
            on(event, callback) {
                handlers.set(event, callback);
            },
            removeAllListeners() {
            },
        };
        textures = { exists: key => textures.has(key), remove: key => textures.delete(key) };
        add = { graphics: () => measure ? meter.create((key, commands) => { textures.add(key); if (key.startsWith('collier-pearl-')) textureCommands.set(key, Array.from(commands)); textureBuilds++; }) : graphics, image: (_x, _y, key) => {
            const image = { key, visible: true, x: 0, y: 0,
                setOrigin() { return this; }, setDepth() { return this; }, destroy() { images.splice(images.indexOf(this), 1); },
                setRotation(value) { this.rotation = value; return this; }, setAlpha() { return this; },
                setSize(width, height) { this.width = width; this.height = height; return this; },
                setTexture(value) { this.key = value; return this; },
                setPosition(x, y) { this.x = x; this.y = y; return this; },
                setDisplaySize() { return this; }, setScale(value) { this.scale = value; return this; },
                setVisible(value) { this.visible = value; return this; }
            };
            images.push(image);
            return image;
        }, text: (x, y, value, style) => {
            const label = { x, y, text: value, style, setText(value) { this.text = value; return this; }, setColor(value) { this.style.color = value; return this; }, setOrigin() { return this; } };
            texts.push(label);
            return label;
        } };
        events = { once() {
            } };
        game = { canvas: { setAttribute() {
                } } };
    }
    // A TileSprite repeats the 12px cell with its first dot six pixels in.
    BaseScene.prototype.addTile = function(x, y, width, height, key) {
        return this.add.image(x, y, key).setSize(width, height);
    };
    const page = { querySelector: () => null };
    const host = {};
    const bindings = {
        fingerProof: { fingerReceived: () => true },
        Phaser: { Scene: BaseScene },
        canvasSize: dimensions, fieldView, logicalPoint, shooterLayout, themeIndex, themes, drawDecor, drawMotif, drawBonus, actorLayers, renderCharacter,
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
        readDriver,
        fingerReceipts: new Function('window', 'location', 'URLSearchParams', `${transpile(readFileSync(new URL('../src/games/finger-receipts.ts', import.meta.url), 'utf8')).replace(/^import .*;\s*$/gm, '').replace('export function', 'function')}\nreturn fingerReceipts;`)(host, { search: '?test=1' }, URLSearchParams)
    };
    sceneFactory ??= new Function(...Object.keys(bindings), `${sceneCode}\nreturn CollierScene;`);
    const factory = source ? new Function(...Object.keys(bindings), `${transpile(source).replace(/^import .*;\s*$/gm, '').replace(/\bexport (class|const) /g, '$1 ')}\nreturn CollierScene;`) : sceneFactory;
    const Scene = factory(...Object.values(bindings));
    const scene = new Scene();
    scene.add.tileSprite = (...args) => scene.addTile(...args);
    const drawActor = scene.drawActor;
    scene.drawActor = function(actor, x, y, size) {
        calls.push({ name: 'actor', args: [actor.id, x, y, size] });
        drawings.push({ id: actor.id, x, y, size });
        return drawActor.call(this, actor, x, y, size);
    };
    const draw = scene.draw;
    scene.draw = function() {
        draw.call(this);
        const guide = this.sight;
        if (!guide?.visible) return;
        const view = fieldView(this.engine.config), angle = guide.rotation;
        for (let i = 0; i < guide.width / 12; i++) {
            const offset = (6 + i * 12 - guide.width / 2) * guide.scale;
            circles.push({ x: (guide.x + Math.cos(angle) * offset - view.x) / view.scale,
                y: (guide.y + Math.sin(angle) * offset - view.y) / view.scale, radius: 2, fill: 0xf8f1cd });
        }
    };
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
        domHandlers,
        handlers,
        replay: meter.replay,
        objects: () => images.filter(i => i.visible).length + texts.filter(t => t.text).length + meter.displayed(),
        images,
        textureBuilds: () => textureBuilds,
        textureCommands,
        engine: scene.engine,
        drawings,
        texts,
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
                send('pointermove', { id: 1, x: origin.x + excursion / fieldView(e.config).scale, y: origin.y, wasTouch });
            send('pointerup', { id: 1, x: origin.x + distance / fieldView(e.config).scale, y: origin.y, upTime: 1000 + duration, wasTouch });
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
        const size = 80 / fieldView(engine.config).scale;
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
/** Delivered HUD content, first-shot help and gauge are observed on the scene. */
export function C34() {
    const { scene, engine, hook, texts } = createScene();
    assert.match(hook.hudText(), /Niveau 1/);
    assert.match(hook.hudText(), /Perles\n18 \/ 24/);
    assert.match(hook.hudText(), /Score {2}☆☆☆\n0/);
    assert.match(hook.hudText(), /Ovale croissant/);
    assert.match(hook.hudText(), /Viser partout/);
    engine.shoot();
    scene.draw();
    assert.doesNotMatch(hook.hudText(), /Viser partout/);
    hook.loadLevel(29);
    assert.match(hook.hudText(), /Niveau 30/);
    assert.doesNotMatch(hook.hudText(), /Viser partout/);
    assert.ok(scene.hudPanel && scene.quotaBar, 'Baked cards and quota gauge');
    assert.ok(texts.find(t => t.text.startsWith('Score')).y >= 638);
    assert.equal(texts.find(t => t.y === 565).style.fontStyle, 'bold');
    assert.ok(texts.find(t => t.y === 565).style.strokeThickness >= 6);
    assert.equal(texts.find(t => t.y === 565).style.color, '#fca2ce');
}
/** Actual cast silhouettes, including the substitute leader, fit the phone. */
export function C35() {
    for (const id of ['panda', 'singe']) {
        const { scene, hook, drawings } = createScene(id);
        for (let level = 0; level < 30; level++) {
            hook.loadLevel(level);
            drawings.length = 0;
            scene.draw();
            const leader = drawings.find(d => d.id === (id === 'singe' ? 'panda' : 'singe'));
            const ys = drawList(leader.id, 'face', 'concentre', 'repos', 0, 'reduce').flatMap(p => {
                if (p.kind === 'circle') return [p.y - p.r, p.y + p.r];
                if (p.kind === 'ellipse') return [p.y - p.ry, p.y + p.ry];
                if (p.kind === 'path') return p.commands.flatMap(c => c.op === 'C' ? [c.a[1], c.b[1], c.p[1]] : [c.p[1]]);
                return p.points.map(q => q[1]);
            });
            const cssScale = Math.min(358 / 360, 736 / scene.scale.height);
            assert.ok((Math.max(...ys) - Math.min(...ys)) / 240 * leader.size * hook.view().scale * cssScale >= 44);
        }
    }
}
export function C36() {
    const { scene, hook, calls } = createScene();
    hook.loadLevel(29);
    calls.length = 0;
    scene.paintTrack(scene.graphics, false);
    assert.ok(calls.filter(c => c.name === 'fillTriangle').length >= 8, 'Twin tent roofs and parted curtains');
    assert.ok(calls.filter(c => c.name === 'strokeRoundedRect').length >= 2, 'Finished entrance frames');
    assert.ok(calls.filter(c => c.name === 'fillEllipse').length >= 12, 'Cloud volume and recessed mouths');
    calls.length = 0;
    scene.draw();
    assert.ok(!calls.some(c => c.name === 'lineStyle' && c.args[0] === 26), 'No live tunnel painting');
}
export function C37() {
    const { scene, engine, hook, texts } = createScene();
    assert.equal(scene.scale.height, 736);
    assert.ok(Math.max(...texts.map(t => t.y)) >= scene.scale.height - 20, 'Pass 307 HUD reaches the canvas bottom');
    // Shell: 16px gutters, 44px topbar, 64px row, centred 56px button.
    for (const { width, height } of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 390, height: 600 }]) {
        const available = height - 44 - 64;
        const cssScale = Math.min((width - 32) / 360, available / scene.scale.height);
        const canvasTop = 44 + (available - scene.scale.height * cssScale) / 2;
        const useful = hook.usefulArea();
        const bottom = canvasTop + (useful.y + useful.height) * scene.scale.height * cssScale / 640;
        const rowTop = height - 64;
        assert.ok(bottom <= rowTop, `Useful area above controls row ${width}×${height}`);
        assert.ok(bottom <= rowTop + (64 - 56) / 2, 'M01 swap button outside useful area');
        assert.ok(scene.scale.height * cssScale >= available * .98, 'Pass 307 vertical coverage');
        assert.ok(Math.max(...texts.map(t => t.y + 8)) <= (useful.y + useful.height) * scene.scale.height / 640, 'HUD inside useful area');
    }
    for (let level = 0; level < 30; level++) {
        hook.loadLevel(level);
        const view = hook.view();
        const points = engine.config.paths.flatMap(p => p.samples);
        const ys = points.map(p => p.y * view.scale + view.y);
        assert.ok(Math.min(...ys) >= 20 && Math.max(...ys) < 583, `Rails clear HUD ${level + 1}`);
    }
}
export function C38() {
    // Measured before pass 307, using Phaser 3.90's actual command-producing methods.
    const before = [4478,4478,4474,4474,4474,4474,4478,4474,4478,4478,4474,4474,4474,4474,4478,4474,4478,4478,4474,4474,4535,4535,4539,4535,4539,4535,4531,4531,6747,6747];
    const after = [];
    for (let level = 0; level < 30; level++) {
        const { scene, hook, replay } = createScene('panda', true);
        hook.loadLevel(level);
        scene.draw();
        after.push(replay());
        assert.ok(after[level] <= before[level], `Graphics replay budget level ${level + 1}: ${after[level]} > ${before[level]}`);
        scene.draw();
        assert.equal(replay(), after[level], 'Retained static Graphics would also be counted');
    }
    console.log(`Commandes Graphics/image : avant ${before.join(',')} ; après ${after.join(',')}`);
}
/** Phaser command buffers include retained Graphics, not only fresh draw calls.
 * Visible objects = nonempty Graphics/Text plus visible Images; hidden pool slots
 * and baked textures are excluded. Baseline: c3982c0, seed 300, warm initial frame.
 */
export function C39() {
    const beforeCommands = [4302,4278,4286,4306,4302,4302,4302,4298,4302,4278,4286,4306,4302,4302,4302,4298,4302,4278,4286,4306,4302,4302,4302,4298,4298,4278,4286,4306,6465,6465];
    const beforeObjects = [18,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,23,23];
    const afterCommands = [], afterObjects = [];
    const measured = createScene('panda', true);
    const { scene, engine, hook, replay, textureBuilds, textureCommands, objects, images } = measured;
    for (let level = 0; level < 30; level++) {
        scene.leader.time = 0;
        hook.loadLevel(level);
        scene.draw();
        afterCommands.push(replay());
        afterObjects.push(objects());
        assert.ok(replay() < 600, `C39: level ${level + 1} Graphics commands ${replay()}`);
        assert.ok(objects() <= beforeObjects[level] + 4, 'Bounded display objects');
        const builds = textureBuilds(), allocated = images.length;
        scene.draw();
        assert.equal(textureBuilds(), builds, 'No texture rebuilt per frame');
        assert.equal(images.length, allocated, 'Warm frame reuses image pools');
        assert.equal(replay(), afterCommands[level]);
        // Walking layers and burst atlases must stay warm while positions change.
        engine.bursts = [0, 1, 2, 3, 4, 5].map(color => ({ x: 100 + color * 20, y: 120, color, time: engine.time }));
        scene.leader.animation = 'marche';
        scene.leader.time = 317;
        scene.draw();
        const animatedBuilds = textureBuilds();
        scene.leader.time = 1234;
        engine.time += 117;
        scene.draw();
        assert.equal(textureBuilds(), animatedBuilds, 'Animation and bursts move baked images');
        assert.ok(replay() < 600, 'Burst frame Graphics budget');
        engine.bursts = [];
    }
    for (const id of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne']) {
        scene.hero.id = id;
        scene.hero.animation = 'celebration';
        scene.hero.time = 317;
        engine.reverseMs = 100;
        scene.draw();
        assert.ok(replay() < 600, `${id}: animated cast and helper budget`);
    }
    // Every pearl variant retains the exact direct paint commands, including
    // the radial gradient, shadow, contour, motif, highlight and bonus overlay.
    const meter = graphicsMeter();
    for (let color = 0; color < 6; color++) for (const bonus of [undefined, 'slow', 'reverse', 'bomb', 'aim']) {
        const direct = meter.create(() => {});
        scene.paintBead(direct, 20, 18, color, 11.5);
        if (bonus) {
            direct.fillStyle([0x65e4d0,0xffb867,0xf080ab,0x92a8ff,0xd8a4ff,0xffee91][color]);
            direct.fillCircle(20, 18, 9);
            drawBonus(direct, 20, 18, bonus);
        }
        assert.deepEqual(textureCommands.get(`collier-pearl-${color}-${bonus ?? 'plain'}`), Array.from(direct.commandBuffer));
        direct.destroy();
    }
    assert.equal(compareBakedActors(), 45, 'Software captures of all five casts and three animations');
    const stats = values => {
        const sorted = [...values].sort((a, b) => a - b);
        return { min: sorted[0], median: (sorted[14] + sorted[15]) / 2, max: sorted.at(-1) };
    };
    console.log('C39 mesures Node (30 niveaux): ' + JSON.stringify({
        commands: { before: stats(beforeCommands), after: stats(afterCommands) },
        objects: { before: stats(beforeObjects), after: stats(afterObjects) },
        levels: afterCommands.map((commands, i) => ({ level: i + 1, beforeCommands: beforeCommands[i], commands, beforeObjects: beforeObjects[i], objects: afterObjects[i] }))
    }));
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
    C33, C34, C35, C36, C37, C38, C39
};
