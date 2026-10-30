/* global console, performance, Event, EventTarget, URLSearchParams */
import './ts-loader.js';
import { registerHooks } from 'node:module';
import { setMaxListeners } from 'node:events';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpile } from './transpile.js';

// Only platform ports are doubled: scene, inputs, actor, engines and session are real.
const phaser = `export default { Scene: class {}, Math: { Distance: { BetweenPoints: (a,b) => Math.hypot(a.x-b.x,a.y-b.y) } } };`;
const services = `export const sound = { playEffect(){}, stop(){} }; export const device = { setFinished(){} };`;
registerHooks({
    resolve(name, context, next) {
        if (name === 'phaser') return { url: 'data:text/javascript,' + encodeURIComponent(phaser), shortCircuit: true };
        if (name.endsWith('/shell/services.ts') || name.endsWith('/shell/services') || name === './services') return { url: 'data:text/javascript,' + encodeURIComponent(services), shortCircuit: true };
        return next(name, context);
    },
});
const { PlaySession, setupPause } = await import('../src/shell/pause.ts');
const { Inputs } = await import('../src/shell/input.ts');
const { bindSessionUpdate } = await import('../src/shell/scene-update.ts');
const { selectCharacter } = await import('../src/characters/selection.ts');
const { renderCharacter } = await import('../src/characters/phaser.ts');
const { drawList } = await import('../src/characters/model.ts');
const { ids } = await import('../src/characters/model.ts');
const timings = [];
class Element extends EventTarget {
    dataset = {}; style = {}; classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; textContent = ''; children = [];
    getContext() { return null; }
    setAttribute() {} setPointerCapture() {} remove() {} closest() { return null; }
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 360, height: 640 }; }
    append(child) { this.children.push(child); if (child.id) elements.set('#' + child.id, child); }
    replaceChildren() { this.children = []; }
}
// Execute main's production route/update installation with platform ports supplied.
const mainSource = transpile(readFileSync('src/main.ts', 'utf8'))
    .replace(/^import .*;$/gm, '').replace(/export \{\};?/g, '');
let elements;
function emit(target, type, fields = {}) { const e = new Event(type, { cancelable: true }); Object.assign(e, fields); target.dispatchEvent(e); }
function tap(id) { const node = elements.get('#' + id); assert(node, id); emit(node, 'pointerdown', { pointerId: 1, pointerType: 'touch' }); emit(node, 'pointerup', { pointerId: 1 }); }
async function mount(game, id) {
    elements = new Map();
    for (const name of ['game', 'touch-controls', 'play-area', 'pause', 'resume', 'restart', 'retry-level', 'replay-level', 'status']) elements.set('#' + name, new Element());
    const doc = new Element(); doc.querySelector = selector => elements.get(selector) ?? null; doc.createElement = () => new Element(); doc.body = new Element();
    doc.querySelectorAll = () => [];
    globalThis.document = doc; globalThis.window = new Element(); globalThis.HTMLElement = Element; globalThis.window.matchMedia = () => ({ matches: false }); globalThis.location = { search: '?test=1' }; globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: false });
    selectCharacter(id, undefined);
    const module = await import(`../src/games/${game}/scene.ts`);
    const Scene = module[game === 'bubble' ? 'LabScene' : `${game[0].toUpperCase()}${game.slice(1)}Scene`];
    const session = new PlaySession(game !== 'bubble'); session.send('start');
    const inputs = new Inputs(); setupPause(inputs, session);
    const scene = new Scene(session), calls = [];
    const g = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return g; } });
    const textures = new Set();
    scene.textures = { exists: key => textures.has(key) };
    scene.make = { graphics: () => new Proxy({}, { get: (_, method) => (...args) => {
        if (method === 'generateTexture') textures.add(args[0]);
        return g;
    } }) };
    const image = () => {
        const sprite = { texture: { key: '' } };
        for (const method of ['setTexture', 'setPosition', 'setDisplaySize', 'setRotation', 'setAlpha', 'setDepth', 'setVisible', 'destroy']) sprite[method] = (...args) => {
            if (method === 'setTexture') sprite.texture.key = args[0];
            return sprite;
        };
        return sprite;
    };
    scene.add = { graphics: () => g, image, text: () => ({ text: '', setText(text) { this.text = text; }, setY() {}, setDepth() { return this; } }) };
    scene.events = { once() {} }; scene.scale = { refresh() {} }; scene.game = { canvas: new Element() };
    scene.input = { handlers: new Map(), on(name, callback) { this.handlers.set(name, callback); } }; scene.create(); inputs.dispose();
    runInNewContext(mainSource, {
        document: doc, window: globalThis.window, location: { search: '?test=1', hash: '#/' + game },
        URLSearchParams, matchMedia: globalThis.matchMedia, Inputs, PlaySession, setupPause, bindSessionUpdate,
        setupSound() {}, setupGameMenu() {}, setupCharacters() {}, startThumbnail() {}, browserThumbnailPorts() {},
        browserStorage: () => undefined, readSave() {}, sound: {}, device: { setFinished() {}, setVisible() {}, setPlaying() {} },
        games: [{ id: game, name: game, realtime: game !== 'bubble', createScene(value) { scene.session = value; return scene; } }],
        Phaser: { AUTO: 0, Scale: { FIT: 0, CENTER_BOTH: 0 }, Game: class { scale = { getParentBounds() {}, refresh() {} }; destroy() {} } },
        ResizeObserver: class { observe() {} disconnect() {} },
    });
    const draws = [], actors = [], drawOffsets = [];
    for (const actor of [scene.hero, ...(scene.rivals ?? [])]) {
        const draw = actor.draw.bind(actor);
        actor.draw = (...args) => {
            drawOffsets.push(calls.length); actors.push(actor.id); if (actor === scene.hero) draws.push(args.slice(1));
            const begin = calls.length; draw(...args); const actual = calls.slice(begin), expected = [];
            const port = new Proxy({}, { get: (_, method) => (...values) => { expected.push([method, ...values]); return port; } });
            renderCharacter(port, drawList(actor.id, actor.pose, actor.expression, actor.animation, actor.time), ...args.slice(1, 4), actor.flip, args[4] ?? 0);
            assert.deepEqual(actual, expected, 'Scene submits each actor own geometry');
        };
    }
    const frame = (ms = 0) => { calls.length = 0; draws.length = 0; actors.length = 0; drawOffsets.length = 0; scene.update(0, ms); };
    const cleanup = () => { scene.paint?.destroy(); scene.inputs.dispose(); inputs.dispose(); };
    return { scene, session: scene.session, frame, draws, actors, drawOffsets, calls, cleanup, engine: scene.engine, hero: scene.hero };
}
setMaxListeners(0);
for (const game of ['derapage', 'bubble', 'serpentin']) {
    let total = 0;
    for (const id of ids) {
        const h = await mount(game, id), { scene, engine, hero, frame, draws } = h;
        const start = performance.now();
        try {
            frame(); assert.equal(hero.id, id);
            if (game === 'serpentin') assert(draws.length);
            else assert(scene.paint.keys().length, 'Procedural sprites are submitted');
            if (game === 'derapage') {
                assert.equal(scene.rivals.length, 4);
                assert.deepEqual(scene.rivals.map(r => r.id), ids.filter(other => other !== id));
                // Put all six karts inside the camera, then verify every submitted identity.
                for (const k of engine.karts) { k.x = engine.karts[0].x; k.y = engine.karts[0].y; }
                frame();
                assert.deepEqual(scene.paint.keys().filter(key => key.includes('-kart-')).map(key => key.split('-kart-')[1].split('-')[0]), [id, ...ids.filter(other => other !== id)]);
                assert(h.calls.some(c => c[0] === 'fillCircle' && c[1] === 0 && c[2] === 0 && c[3] === 5), 'neutral driver geometry');
                assert.match(scene.hud.children.map(n => n.textContent).join(''), /ÉLAN 1\/1/);
                assert(scene.paint.keys().includes(`arcade-vector-75-kart-${id}-${hero.expression}`)); tap('derapage-special');
            } else if (game === 'bubble') {
                assert(scene.paint.keys().includes(`arcade-vector-75-launcher-${id}-face-${hero.expression}`)); assert.match(scene.hud.text, /JOKER 1\/1/); tap('bubble-special');
            } else {
                assert.equal(draws[0][2], 26); assert.match(scene.hud.text, /ESQUIVE 1\/1/); tap('serpentin-special');
            }
            frame(); assert.equal(hero.animation, 'special');
            const hud = game === 'derapage' ? scene.hud.children.map(n => n.textContent).join('') : scene.hud.text;
            assert.match(hud, new RegExp(`${game === 'derapage' ? 'ÉLAN' : game === 'bubble' ? 'JOKER' : 'ESQUIVE'} 0/1`));
            const node = elements.get('#' + game + '-special'); assert(node);
            if (h.session.realtime) { h.session.send('toggle'); assert.equal(hero.expression, 'dodo', 'pause is synchronous'); const sleeping = hero.snapshot(); frame(1000); assert.deepEqual(hero.snapshot(), sleeping); h.session.send('start'); frame(); }
            h.session.menuOpen = true; frame(); assert.equal(hero.expression, 'dodo');
            const state = engine.snapshot(); frame(1000); assert.deepEqual(engine.snapshot(), state);
            h.session.menuOpen = false; frame(); assert.notEqual(hero.expression, 'dodo');
            engine.status = 'won'; frame(); assert.equal(hero.expression, 'joie'); assert.equal(hero.animation, 'celebration');
            hero.impact = 0; engine.status = 'lost'; frame(); assert.equal(hero.expression, 'triste');

        } finally { h.cleanup(); }
        const ms = performance.now() - start; total += ms;
    }
    timings.push({ game, ms: Math.round(total) });
}
console.log(JSON.stringify({ sceneChecks: timings }));

// Reactions must originate in real engine events, never an injected actor timer.
for (const game of ['derapage', 'bubble', 'serpentin']) {
    const h = await mount(game, ids[0]), { engine, hero, frame, scene } = h;
    const start = performance.now();
    try {
        h.session.send('start');
        if (game === 'derapage') {
            const k = engine.karts[0];
            engine.track.trees = [{ x: k.x + 2.4, y: k.y, radius: 1 }];
            Object.assign(k, { angle: 0, vx: 24, vy: 0 });
            const hits = k.hits; frame(1000 / 60); assert(k.hits > hits, 'real collision');
        } else if (game === 'bubble') {
            engine.load([{ row: 0, col: 4, color: 1 }, { row: 0, col: 0, color: 0 }], 0);
            engine.aim(0.05); assert(engine.shoot());
            for (let i = 0; i < 120 && !engine.last.attached; i++) frame(1000 / 60);
            assert(engine.last.attached); assert.equal(engine.last.popped.length, 0);
        } else {
            engine.loadState({ segments: [{ x: 14, y: 10 }], direction: 'right', apple: { x: 2, y: 2 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0 });
            for (let i = 0; i < 10; i++) frame(1000 / 60);
            assert.equal(engine.status, 'lost');
        }
        assert.equal(hero.expression, 'surprise', `${game}: real event reaction`);
        if (game === 'serpentin') {
            // Genuine body crossing with two segments sharing the head cell.
            engine.loadState({ segments: [{ x: 7, y: 10 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 9, y: 10 }], direction: 'right', apple: { x: 2, y: 2 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0 });
            tap('serpentin-special'); frame(167); assert.equal(engine.status, 'playing');
            assert.deepEqual(engine.state.segments[0], engine.state.segments.at(-1));
            const rectangles = h.calls.filter(c => c[0] === 'fillRoundedRect' && c[3] === 18 && c[4] === 18);
            assert.equal(rectangles.length, 5);
            assert.equal(rectangles.at(-1)[5], 7, 'head rectangle after all body rectangles');
            const headIndex = h.calls.indexOf(rectangles.at(-1));
            assert(h.drawOffsets[0] > headIndex, 'actor drawn after head');
            assert(!h.calls.slice(headIndex + 1).some(c => c[0] === 'fillRoundedRect' && c[3] === 18 && c[4] === 18), 'no body over actor');
        }
        assert(scene.hero.impact > 0);
        assert(performance.now() - start < 2000, `${game}: event and drawing checks < 2 s`);
    } finally { h.cleanup(); }
}

// The displayed noisy drag is the committed shot, even if lift coordinates jitter.
{
    const h = await mount('bubble', ids[0]);
    try {
        h.session.send('start');
        const pointer = { id: 1, wasTouch: true, x: 190, y: 180 };
        h.scene.input.handlers.get('pointerdown')(pointer);
        h.scene.input.handlers.get('pointermove')({ ...pointer, x: 215, y: 210 });
        const angle = h.engine.angle, target = h.engine.trace().target;
        h.scene.input.handlers.get('pointerup')({ ...pointer, x: 203, y: 222 });
        assert.equal(h.engine.shots, 1);
        assert.equal(h.engine.angle, angle);
        assert.deepEqual(h.engine.flight.trajectory.target, target);
    } finally { h.cleanup(); }
}
