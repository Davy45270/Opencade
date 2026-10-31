/* global process, console, performance, Event, EventTarget, window, URLSearchParams */
import './ts-loader.js';
import { registerHooks } from 'node:module';
import { setMaxListeners } from 'node:events';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpile } from './transpile.js';

// Only platform ports are doubled: scene, inputs, actor, engines and session are real.
const phaser = `export default { Scene: class {} };`;
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
    style = {}; classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; textContent = ''; children = [];
    matches() { return false; }
    setAttribute() {} setPointerCapture() {} remove() {}
    append(child) { this.children.push(child); if (child.id) elements.set('#' + child.id, child); }
    replaceChildren() { this.children = []; }
}
// Execute main's production route/update installation with platform ports supplied.
const mainSource = transpile(readFileSync('src/main.ts', 'utf8'))
    .replace(/^import .*;$/gm, '').replace(/export \{\};?/g, '');
let elements;
function emit(target, type, fields = {}) { const e = new Event(type, { cancelable: true }); Object.assign(e, fields); target.dispatchEvent(e); }
export function key(code) { emit(globalThis.document, 'keydown', { code, repeat: false }); }
export function tap(id) { const node = elements.get('#' + id); assert(node, id); emit(node, 'pointerdown', { pointerId: 1, pointerType: 'touch' }); emit(node, 'pointerup', { pointerId: 1 }); }
function click(id) { emit(elements.get('#' + id), 'click'); }
export async function mount(game, id, SceneOverride) {
    elements = new Map();
    for (const name of ['game', 'touch-controls', 'play-area', 'pause', 'resume', 'restart', 'retry-level', 'replay-level', 'status']) elements.set('#' + name, new Element());
    const doc = new Element(); doc.querySelector = selector => elements.get(selector) ?? null; doc.createElement = () => new Element(); doc.body = new Element();
    doc.querySelectorAll = () => []; doc.createTextNode = () => new Element();
    globalThis.document = doc; globalThis.window = new Element(); globalThis.location = { search: '?test=1' }; globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: false });
    globalThis.addEventListener = globalThis.window.addEventListener.bind(globalThis.window);
    globalThis.removeEventListener = globalThis.window.removeEventListener.bind(globalThis.window);
    selectCharacter(id, undefined);
    const module = await import(`../src/games/${game}/scene.ts`);
    const Scene = SceneOverride ?? module[`${game[0].toUpperCase()}${game.slice(1)}Scene`];
    const session = new PlaySession(game !== 'caisses'); session.send('start');
    const inputs = new Inputs(); setupPause(inputs, session);
    const scene = new Scene(session), calls = [];
    const g = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return g; } });
    scene.add = { graphics: () => g, text: () => ({ text: '', setText(text) { this.text = text; }, setY() {} }) };
    scene.textures = { createCanvas: () => ({ context: new Proxy({}, { get: () => () => {} }), refresh() {} }) };
    scene.add.image = () => ({ setOrigin() {} });
    scene.events = { once() {} }; scene.scale = { refresh() {} }; scene.game = { canvas: new Element() };
    if(game==='alunir') {
        const textures=new Set();
        scene.textures.exists=key=>textures.has(key);
        scene.make={graphics:()=>new Proxy({}, {get:(_,method)=>(...args)=>{if(method==='generateTexture')textures.add(args[0]);return g;}})};
        scene.add.image=()=>{const sprite={};for(const method of ['setTexture','setPosition','setDisplaySize','setDepth','setVisible','destroy'])sprite[method]=()=>sprite;return sprite;};
    }
    scene.create(); inputs.dispose();
    runInNewContext(mainSource, {
        document: doc, window: globalThis.window, location: { search: '?test=1', hash: '#/' + game },
        URLSearchParams, matchMedia: globalThis.matchMedia, Inputs, PlaySession, setupPause, bindSessionUpdate,
        setupSound() {}, setupGameMenu() {}, setupCharacters() {}, startThumbnail() {}, browserThumbnailPorts() {},
        browserStorage: () => undefined, readSave() {}, sound: {}, device: { setFinished() {}, setVisible() {}, setPlaying() {} },
        games: [{ id: game, name: game, realtime: game !== 'caisses', createScene(value) { scene.session = value; return scene; } }],
        Phaser: { AUTO: 0, Scale: { FIT: 0, CENTER_BOTH: 0 }, Game: class { scale = { getParentBounds() {}, refresh() {} }; destroy() {} } },
        ResizeObserver: class { observe() {} disconnect() {} },
    });
    const draw = scene.hero.draw.bind(scene.hero), draws = [];
    scene.hero.draw = (...args) => {
        draws.push(args.slice(1));
        const begin = calls.length; draw(...args); const actual = calls.slice(begin), expected = [];
        const port = new Proxy({}, { get: (_, method) => (...values) => { expected.push([method, ...values]); return port; } });
        renderCharacter(port, drawList(scene.hero.id, scene.hero.pose, scene.hero.expression, scene.hero.animation, scene.hero.time), ...args.slice(1, 4), scene.hero.flip, args[4] ?? 0);
        assert.deepEqual(actual, expected, 'Scene submits the selected actor geometry');
    };
    const frame = (ms = 0) => { calls.length = 0; draws.length = 0; scene.update(0, ms); };
    const cleanup = () => { scene.inputs.dispose(); inputs.dispose(); };
    return { scene, session: scene.session, frame, draws, calls, cleanup, engine: scene.engine, hero: scene.hero };
}
setMaxListeners(0);
if (process.argv[1]?.endsWith('validate-character-scenes.js')) {
for (const game of ['caisses', 'traverse', 'alunir']) {
    const start = performance.now();
    for (const id of ids) {
        const h = await mount(game, id), { scene, engine, hero, frame, draws, calls } = h;
        try {
            frame(); assert.equal(hero.id, id); assert(draws.length); assert(calls.some(c => c[0] === 'fillPoints'));
            // Alunir's 40px pilot sits inside the canopy; the module owns its rotation.
            const expectedSize = game === 'caisses' ? Math.min(336 / engine.board.width, 490 / engine.board.height) * 1.2 : 40;
            assert.equal(draws[0][2], expectedSize, `${game}: actual rendered size`);
            if (game === 'caisses') { key('ArrowRight'); assert.equal(hero.pose, 'profil'); assert.equal(hero.flip, false); key('ArrowLeft'); assert.equal(hero.flip, true); key('ArrowUp'); assert.equal(hero.expression, 'surprise'); }
            // Advance in coarse intervals: the real engine retains its fixed simulation steps.
            if (game === 'traverse') { tap('traverse-left'); for (let i = 0; i < 7 && engine.state.player.x === 4; i++) frame(100); assert.equal(hero.pose, 'profil'); assert(hero.flip); assert.equal(hero.animation, 'saut'); tap('traverse-right'); for (let i = 0; i < 7 && engine.state.player.x === 3; i++) frame(100); assert.equal(hero.flip, false); }
            if (game === 'alunir') { engine.loadState({ angle: .2 }); frame(); assert.deepEqual(draws[0], [-20, -33, 40]); assert.deepEqual(calls.filter(c => c[0] === 'rotateCanvas'), [['rotateCanvas', engine.state.angle]]); tap('alunir-thrust'); emit(globalThis.document, 'keydown', { code: 'ArrowUp' }); frame(16); assert.equal(hero.pose, 'face'); assert.equal(hero.animation, 'saut'); emit(globalThis.document, 'keyup', { code: 'ArrowUp' }); }
            // Pause through the production UI and main's exact update binding.
            h.session.menuOpen = true; frame(); assert.equal(hero.expression, 'dodo'); assert(draws.length); assert(calls.some(c => c[0] === 'fillPoints'));
            h.session.menuOpen = false;
            if (game !== 'caisses') { click('pause'); assert.equal(hero.expression, 'dodo'); const actor = hero.snapshot(), state = engine.snapshot(); frame(1000); assert.deepEqual(hero.snapshot(), actor); assert.deepEqual(engine.snapshot(), state); click('resume'); }
            frame(); assert.notEqual(hero.expression, 'dodo');
            if (game === 'caisses') {
                for (const retry of ['restart', 'retry-level', 'replay-level', 'keyboard']) {
                    window.__CAISSES_TEST__.loadLevel(0, 28); tap('caisses-special'); assert.match(scene.hud.text, /direction/);
                    if (retry === 'keyboard') key('KeyR'); else click(retry);
                    assert.doesNotMatch(scene.hud.text, /direction/); tap('caisses-right'); assert.equal(engine.state.player, 9); assert.equal(engine.state.moves, 1);
                }
                engine.loadPuzzle('#######\n# .$@ #\n#     #\n#######'); tap('caisses-special'); tap('caisses-left'); assert.match(scene.hud.text, /TIRER 0\/1/); assert.equal(hero.flip, false, 'Pull faces the actual displacement'); frame(); assert.equal(hero.animation, 'special');
                engine.loadPuzzle('#####\n#@$.#\n#####'); tap('caisses-right'); assert.equal(engine.status, 'won'); assert.equal(hero.expression, 'joie'); assert.equal(hero.animation, 'celebration');
            } else if (game === 'traverse') {
                window.__TRAVERSE_TEST__.loadLevel(0, 1); tap('traverse-special'); click('restart'); assert.deepEqual(engine.snapshot().queue, []); assert.equal(engine.specialUses, 1); tap('traverse-special'); frame(); assert.match(scene.hud.text, /BOND 0\/1/); frame(500); assert.equal(hero.animation, 'special'); click('restart'); frame(); assert.match(scene.hud.text, /BOND 1\/1/);
                window.__TRAVERSE_TEST__.scenario('danger'); scene.testManual = false; tap('traverse-up'); for (let i = 0; i < 16 && engine.status === 'playing'; i++) frame(100); assert.equal(engine.status, 'lost'); assert.equal(hero.expression, 'surprise'); frame(600); assert.equal(hero.expression, 'triste');
                window.__TRAVERSE_TEST__.scenario('finish'); scene.testManual = false; tap('traverse-up'); frame(500); assert.equal(engine.status, 'won'); assert.equal(hero.expression, 'joie');
            } else {
                window.__ALUNIR_TEST__.loadLevel(0, 28); tap('alunir-special'); frame(); assert.match(scene.hud.text, /STAB 1\/2/); assert.equal(hero.animation, 'special'); click('restart'); frame(); assert.match(scene.hud.text, /STAB 2\/2/);
                window.__ALUNIR_TEST__.scenario('danger'); for (let i = 0; i < 100 && engine.status === 'playing'; i++) frame(16); assert.equal(engine.status, 'lost'); assert.equal(hero.expression, 'surprise'); frame(600); assert.equal(hero.expression, 'triste');
                window.__ALUNIR_TEST__.scenario('finish'); emit(globalThis.document, 'keydown', { code: 'ArrowUp' }); frame(100); assert.equal(engine.status, 'won'); assert.equal(hero.expression, 'joie');
            }
        } finally { h.cleanup(); }
    }
    const ms = performance.now() - start; timings.push({ game, ms: Math.round(ms) });
}
console.log(JSON.stringify({ sceneChecks: timings }));

}
