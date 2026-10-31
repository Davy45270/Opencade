/* global URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
import { Engine, chooseShot, WEAPONS } from '../src/engines/artificiers/engine.ts';
import { LEVELS, GAME_NAME } from '../src/engines/artificiers/levels.ts';
import { CELL, COLS } from '../src/engines/artificiers/terrain.ts';
import { characters, ids, drawList } from '../src/characters/model.ts';
import { renderCharacter } from '../src/characters/phaser.ts';
import { fingerReceipts } from '../src/games/finger-receipts.ts';
import { AimDriver } from '../src/games/artificiers/driver.ts';
import { countedGraphics, drawDynamic, drawScenery, themes, WORLD_SCALE, screenY } from '../src/games/artificiers/art.ts';
import { Progression } from '../src/shell/progression.ts';
export function sceneChecks(source = readFileSync(new URL('../src/games/artificiers/scene.ts', import.meta.url), 'utf8')) {
    const code = transpile(source).replace(/^import .*;\s*$/gm, '').replace(/\bexport (class|const) /g, '$1 ');
    const listeners = new Map(), dom = new Map(), once = new Map(), clears = [], effects = [];
    let action, disposed = 0, refreshed = 0, generated = 0;
    const images = [];
    const graphics = new Proxy({}, { get: (_, method) => () => { if (method === 'generateTexture') generated++; return graphics; } });
    const image = (x, y, key) => {
        const sprite = { x, y, key, visible: true, alpha: 1, sx: 1, sy: 1,
            get texture() { return { key: this.key }; },
            getBounds() { return { x: this.x, y: this.y, width: 42 * this.sx, height: 42 * this.sy }; },
            setOrigin() { return this; }, setDepth() { return this; },
            setScale(sx, sy) { this.sx = sx; this.sy = sy; return this; },
            setPosition(x, y) { this.x = x; this.y = y; return this; },
            setVisible(value) { this.visible = value; return this; },
            setTexture(key) { this.key = key; return this; }, setFlipX() { return this; } };
        images.push(sprite); return sprite;
    };
    const text = () => ({ text: '', setText(value) { this.text = value; return this; } });
    const context = { clearRect: (...args) => clears.push(args), fillRect() {} };
    const texture = { context, refresh() { refreshed++; }, destroy() {} };
    class BaseScene {
        input = { on: (key, fn) => listeners.set(key, fn), removeAllListeners() {} };
        add = { graphics: () => graphics, image, text };
        textures = { createCanvas: () => texture, remove() {} };
        events = { on() {}, once: (key, fn) => once.set(key, fn), removeAllListeners() {} };
        game = { canvas: { setAttribute() {} }, events: { on() {}, off() {} } };
    }
    class Inputs {
        on(target, event, listener) { dom.set(`${target?.id ?? 'host'}:${event}`, listener); }
        dispose() { disposed++; }
    }
    class PlaySession { paused = false; }
    class Element { id = ''; }
    const elements = new Map();
    const document = { body: { classList: { add() {}, remove() {} } }, querySelector(id) { if (!elements.has(id)) elements.set(id, { id }); return elements.get(id); } };
    const window = {}, session = new PlaySession();
    const bindings = { Phaser: { Scene: BaseScene }, Engine, chooseShot, WEAPONS, LEVELS, GAME_NAME, CELL, COLS,
        ids, drawList, renderCharacter, WORLD_SCALE, screenY, selectedCharacter: () => 'pandaroux', characters, Inputs, PlaySession, Progression,
        browserStorage: () => undefined, readSave: () => ({ unlocked: 30, best: 0 }), writeSave() {}, renderPanels() {}, renderLevels() {},
        fingerReceipts: inputs => {
            const prior = ['window', 'location'].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
            Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
            Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '?test=1' } });
            try { return fingerReceipts(inputs); }
            finally { ['window', 'location'].forEach((key, i) => { if (prior[i]) Object.defineProperty(globalThis, key, prior[i]); else Reflect.deleteProperty(globalThis, key); }); }
        },
        sound: { playEffect: name => effects.push(name), stop() {} }, AimDriver, countedGraphics, drawDynamic, drawScenery, themes,
        renderTouchControls: (_inputs, buttons, callback) => { action = callback; assert.equal(buttons.length, 6); assert.ok(buttons.every(b => b.size >= 48)); },
        matchMedia: () => ({ matches: false }), document, window, location: { search: '?test=1' }, URLSearchParams: globalThis.URLSearchParams, HTMLElement: Element,
    };
    const Scene = new Function(...Object.keys(bindings), `${code}\nreturn ArtificiersScene;`)(...Object.values(bindings));
    const scene = new Scene(session); scene.create();
    const hook = window.__ARTIFICIERS_TEST__; assert.ok(hook); assert.equal(hook.read().units[0].hero, 'pandaroux');
    assert.throws(() => hook.advance(-1), RangeError); assert.throws(() => hook.advance(Infinity), RangeError);
    assert.equal(generated, 18); // Three landscapes and five companions × three poses.
    const terrain = images.find(i => i.key === 'artificiers-terrain'); assert.ok(terrain);
    assert.equal(terrain.sy, WORLD_SCALE); assert.ok(640 * terrain.sy < 531);
    const hero = images[2], initialActor = hook.read().units[0]; assert.ok(hero);
    assert.equal(hero.x, initialActor.x - 21); assert.equal(hero.y, screenY(initialActor.y - 29));
    assert.ok(hook.heroBounds()[0].visible); assert.equal(hook.heroBounds()[0].y, hero.y);
    assert.equal(hero.sy, WORLD_SCALE); assert.equal(hero.visible, true);
    assert.equal(hook.renderBudget().terrainPixels, 360 * 640); assert.equal(refreshed, 1);
    scene.update(0, 20); assert.equal(hook.renderBudget().terrainPixels, 0); assert.equal(refreshed, 1);
    hook.loadLevel(0); const s = hook.read(), a = s.units[0], shot = hook.suggestion();
    for (let n = 0; n < 6 && hook.read().weapon !== shot.weapon; n++) action('artificiers-weapon', true);
    assert.equal(hook.read().weapon, shot.weapon);
    const end = { x: a.x + Math.cos(shot.angle) * shot.power / 1.25, y: a.y + Math.sin(shot.angle) * shot.power / 1.25, id: 2 };
    listeners.get('pointerdown')({ ...a, y: screenY(a.y), id: 2 }); listeners.get('pointerup')({ x: 180, y: 250, id: 9 });
    assert.equal(hook.read().shots, 0);
    assert.deepEqual(hook.read().fingerInput.aiming, { id: 2, x: a.x, y: screenY(a.y) });
    const received = hook.read().fingerInput.receipts.sequence;
    dom.get('host:pointermove')({ pointerType: 'touch', clientX: 123, clientY: 234 });
    assert.deepEqual(hook.read().fingerInput.receipts.events.at(-1), { sequence: received + 1, type: 'pointermove', x: 123, y: 234 });
    listeners.get('pointermove')({ ...end, y: screenY(end.y) }); listeners.get('pointerup')({ ...end, y: screenY(end.y) });
    assert.equal(hook.read().shots, 1); assert.equal(hook.read().phase, 'flight');
    assert.equal(hook.read().fingerInput.aiming, null);
    const requested = Math.atan2(end.y - a.y, end.x - a.x); assert.equal(hook.read().angle, requested);
    hook.advance(5000); assert.ok(effects.includes('shot')); assert.ok(effects.includes('blast'));
    // The real draw() consumes only crater rectangles after the initial texture.
    assert.ok(clears.some(r => r[2] < 360 && r[3] < 640));
    hook.loadLevel(1); action('artificiers-mode', true); assert.equal(hook.read().mode, 'duo');
    hook.advance(25000); assert.equal(hook.read().units[hook.read().active].team, 1); hook.advance(1200); assert.equal(hook.read().shots, 0);
    hook.loadLevel(0); const before = hook.read().units[0].x;
    dom.get('host:keydown')({ code: 'ArrowRight', target: null, preventDefault() {} }); hook.advance(130);
    dom.get('host:keyup')({ code: 'ArrowRight' }); assert.ok(hook.read().units[0].x > before);
    const rightX = hook.read().units[0].x;
    dom.get('host:keydown')({ code: 'ArrowLeft', target: null, preventDefault() {} }); hook.advance(130);
    dom.get('host:keyup')({ code: 'ArrowLeft' }); assert.ok(hook.read().units[0].x < rightX);
    dom.get('host:keydown')({ code: 'KeyX', target: null, preventDefault() {} }); assert.equal(hook.read().weapon, 5);
    const key = code => dom.get('host:keydown')({ code, target: null, preventDefault() {} });
    const angle = hook.read().angle, power = hook.read().power;
    key('ArrowUp'); assert.equal(hook.read().angle, angle - .04);
    key('ArrowDown'); assert.equal(hook.read().angle, angle);
    key('KeyW'); assert.equal(hook.read().power, power + 8);
    key('KeyS'); assert.equal(hook.read().power, power);
    key('KeyJ'); assert.ok(hook.read().units[hook.read().active].vy < 0);
    key('Space'); assert.equal(hook.read().shots, 1); assert.equal(hook.read().phase, 'flight');
    hook.loadLevel(0);
    scene.engine.actor.x = 50; scene.engine.actor.y = 320;
    scene.engine.terrain.rect(82, 250, 60, 12, 3); scene.engine.aim(-.9, 100);
    key('KeyG'); assert.ok(hook.read().rope);
    for (let move = 0; move < 9; move++) assert.ok(scene.engine.move(-1));
    assert.equal(hook.read().moveLeft, 0); key('KeyG'); assert.equal(hook.read().rope, null);
    // Eliminate team one through real blast damage and inspect the delivered panel.
    hook.loadLevel(1);
    for (const u of scene.engine.units.filter(u => u.team === 0)) for (let hit = 0; hit < 3; hit++) scene.engine.explode(u.x, u.y, 2);
    hook.advance(20); assert.equal(hook.read().status, 'lost'); assert.equal(hook.read().winner, 1);
    assert.equal(document.querySelector('#result-title').textContent, 'Équipe 2 gagnante !');
    hook.loadLevel(0);
    // Exercise the delivered scene, not only the pure drawing function, on every map.
    for (let level = 0; level < 30; level++) {
        hook.loadLevel(level);
        const render = hook.renderBudget(); assert.equal(render.limit, 500);
        assert.ok(render.calls > 0 && render.calls <= 500);
        for (const body of hook.heroBounds()) {
            assert.ok(body.visible); assert.ok(body.y + body.height < 531);
        }
    }
    session.paused = true; const frozen = hook.read().time; scene.update(0, 100); assert.equal(hook.read().time, frozen);
    assert.equal(generated, 18, 'Caches conservés entre niveaux et images');
    once.get('shutdown')(); once.get('destroy')(); assert.equal(disposed, 1); assert.equal(window.__ARTIFICIERS_TEST__, undefined);
}
