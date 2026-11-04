/* global console, EventTarget, Event */
import assert from 'node:assert/strict';
import { Engine, FIXED, LEVELS, IDLE } from '../src/engines/petits-pompiers/engine.ts';
import { Pilot } from '../src/engines/petits-pompiers/pilot.ts';
import { ids } from '../src/characters/model.ts';
import { ArenaLayer } from '../src/games/petits-pompiers/arena.ts';
import { dynamicArt, firefighter } from '../src/games/petits-pompiers/art.ts';
import { contextualAction, stickDirection, sectorDirection, forkEngine } from '../src/games/petits-pompiers/controls.ts';
import { cameraView, edgeGuide, hudLayout, onScreen, tutorialAction, waterEnd, worldBox } from '../src/games/petits-pompiers/view.ts';
import { fingerProof } from '../src/games/petits-pompiers/finger.ts';
import { TouchPilot } from '../src/games/petits-pompiers/driver.ts';
import { mutationModule } from './mutation-module.js';
const { module: { PetitsPompiersScene } } = await mutationModule('../src/games/petits-pompiers/scene.ts', "import Phaser from 'phaser';", 'const Phaser = { Scene: class {} };');
const scene = new PetitsPompiersScene(); assert(scene);
let bakes = 0; const textures = new Set();
function graphics() {
    const commandBuffer = [];
    return new Proxy({ commandBuffer }, { get(object, key) {
        if (key === 'commandBuffer') return commandBuffer;
        return (...args) => { if (key === 'clear') commandBuffer.length = 0;
            else if (key === 'generateTexture') { bakes++; assert(!textures.has(args[0])); textures.add(args[0]); }
            else if (key !== 'destroy') commandBuffer.push([key, ...args]);
            return object;
        };
    } });
}
// Chainable GPU stand-ins: exercise real baking and real draw functions.
function chainGraphics() { const g = graphics(); const p = new Proxy(g, { get(t, k) { const v = t[k]; return typeof v === 'function' ? (...a) => { v(...a); return p; } : v; } }); return p; }
const platform = { make: { graphics: chainGraphics }, textures: { remove: key => { assert(textures.delete(key)); } }, add: { image() { const image = { setOrigin: () => image, setDepth: () => image, setPosition: () => image, setScale: () => image, destroy() {} }; return image; } } };
const arena = new ArenaLayer(platform), e = new Engine(), g = chainGraphics();
const oldMedia = globalThis.matchMedia, oldDocument = globalThis.document;
globalThis.matchMedia = () => ({ matches: false }); globalThis.document = { querySelector: () => null };
try {
    const commands = new Set();
    const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    for (let level = 0; level < LEVELS.length; level++) for (const mode of ['detente', 'defi']) {
        e.loadLevel(level, 28, mode);
        const cells = hudLayout(e);
        for (const [i, cell] of cells.entries()) {
            assert(cell.box.width > 0 && cell.box.y + cell.box.height <= worldBox.y);
            for (const other of cells.slice(i + 1)) assert(!overlaps(cell.box, other.box), `${cell.id}/${other.id}`);
        }
        assert.equal(cells.some(c => c.id === 'hearts'), mode === 'defi');
        assert.equal(cells.some(c => c.id === 'time'), mode === 'defi');
        assert.equal(cells.some(c => c.id === 'heal'), Boolean(e.level.objectives.heal));
        const view = cameraView(e); assert(view.scale * 24 * (358 / 360) >= 36); assert(view.scale * 48 * (358 / 360) >= 64);
        assert(view.x <= -12 * view.scale); assert(view.x + 348 * view.scale >= 360);
        const guide = edgeGuide(e, view); assert(guide.x >= 22 && guide.x <= 338 && guide.y >= 138 && guide.y <= 614);
        const p = onScreen(view, { x: 12 + e.player.x / 32 * 24, y: 190 + e.player.y / 32 * 24 }); assert(p.x >= 0 && p.x <= 360 && p.y >= worldBox.y && p.y <= 640);
    }
    // Sweep the map edges and convergence: the cached map always covers the camera.
    e.loadLevel(0);
    for (const y of [16, 144, 272]) for (const x of [16, 224, 432]) {
        e.player.x = x; e.player.y = y;
        const target = cameraView(e, undefined, true), previous = cameraView(e, { x: target.x + 30, y: target.y, scale: 2.2 });
        assert(previous.x > target.x && previous.x < target.x + 30);
        assert.deepEqual(cameraView(e, previous, true), target);
        const p = onScreen(target, { x: 12 + x / 32 * 24, y: 190 + y / 32 * 24 });
        assert(p.y - 48 * .77 * target.scale >= 112, 'helmet clears HUD');
        assert(p.y + 48 * .23 * target.scale <= 640, 'feet clear controls');
    }
    // The Start press is received before the shell changes state on release.
    assert(fingerProof.fingerReceived('#resume', {}, { fingerInput: { paused: true } }));
    e.loadLevel(0); e.fires = []; e.victims = []; e.pickups = [];
    assert.equal(e.nextObjective().type, 'exit'); assert.equal(tutorialAction(e), false);
    e.player.x = 48; e.player.y = 48; e.player.dx = 1; e.player.dy = 0;
    e.tiles.fill('g'); e.tiles[16] = 'W'; e.fires = [{ at: 17, intensity: 1, units: 0 }];
    assert.equal(waterEnd(e).at, 16); assert.equal(tutorialAction(e), false);
    e.tiles[16] = 'g'; assert.equal(waterEnd(e).at, 17); assert.equal(tutorialAction(e), true);
    e.player.dy = 1; e.player.dx = 0; assert.equal(tutorialAction(e), false);
    e.player.dx = 1; e.player.dy = 0; e.tools.push('foam'); e.selected = 1; e.charges = 0; assert.equal(tutorialAction(e), false, 'empty foam never asks for action');
    for (let level = 0; level < LEVELS.length; level++) {
        e.loadLevel(level); const previousBakes = arena.bakes; arena.load(e); assert.equal(arena.bakes, previousBakes + 1); const before = bakes, backgrounds = arena.bakes;
        for (let frame = 0; frame < 3; frame++) { arena.sync(e); g.clear(); dynamicArt(g, e); assert(g.commandBuffer.length < 2500, `dynamic replay ${g.commandBuffer.length}`); }
        assert.equal(bakes, before); assert.equal(arena.bakes, backgrounds);
        const state = JSON.stringify(e.snapshot()), expected = forkEngine(e); expected.previous = { ...IDLE }; expected.input({ ...IDLE, action: true }); expected.step(FIXED);
        assert.equal(contextualAction(e), expected.job?.kind ?? 'spray'); assert.equal(JSON.stringify(e.snapshot()), state);
        const context = { engine: e, graphics: g, arena, index: level, actionContext: () => contextualAction(e) };
        PetitsPompiersScene.prototype.draw.call(context); assert(g.commandBuffer.length < 2600);
    }
    for (const id of ids) { g.clear(); firefighter(g, id, 100, 100, 48, 0, 0, 1, false, false, false); commands.add(JSON.stringify(g.commandBuffer)); }
    assert.equal(commands.size, ids.length);
    for (const [x, y, dx, dy] of [[0, 0, 0, 0], [11, 0, 0, 0], [42, 12, 1, 0], [-42, -12, -1, 0], [12, 42, 0, 1], [12, -42, 0, -1]]) assert.deepEqual(stickDirection(x, y), { dx, dy });
    assert.deepEqual(sectorDirection(null), { dx: 0, dy: 0 });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let nx = -12; nx <= 12; nx++) for (let ny = -12; ny <= 12; ny++) assert.deepEqual(stickDirection(dx * 44 + nx, dy * 44 + ny), { dx, dy });
    const contexts = new Set();
    for (let level = 0; level < LEVELS.length; level++) {
        e.loadLevel(level); const pilot = new Pilot();
        for (let tick = 0; tick < 36000 && e.status === 'playing'; tick++) {
            const intent = pilot.readAction(e);
            if (intent.action) {
                const snapshot = JSON.stringify(e.snapshot()), action = contextualAction(e), clone = forkEngine(e);
                clone.previous.action = false; clone.input({ ...IDLE, action: true }); clone.step(FIXED);
                assert.equal(action, clone.job?.kind ?? 'spray');
                const tutorial = tutorialAction(e); if (['exit', 'tool'].includes(e.nextObjective().type)) assert.equal(tutorial, false);
                if (tutorial) assert.equal(clone.job?.kind, action);
                assert.equal(JSON.stringify(e.snapshot()), snapshot); contexts.add(action);
            }
            e.input(intent); e.step(FIXED);
        }
        assert.equal(e.status, 'won');
    }
    for (const required of ['spray', 'pickup', 'deposit', 'break', 'heal', 'climb', 'call']) assert(contexts.has(required), `Context exercised: ${required}`);
    for (const level of [0, 4]) {
        e.loadLevel(level, 28, 'detente'); const pilot = new TouchPilot(), trace = [];
        for (let n = 0; n < 2400 && e.status === 'playing'; n++) {
            const intent = pilot.readAction(e); trace.push([e.at, Math.round(e.player.x), Math.round(e.player.y), intent]); e.step(150); e.input(intent);
        }
        assert.equal(e.status, 'won', `150ms pilot level ${level + 1}: ${JSON.stringify({ p: e.player, guide: e.nextObjective(), progress: e.progress, trace: trace.slice(-12) })}`);
    }
    arena.destroy(); arena.destroy(); assert.equal(textures.size, 0);
    // Build the actual scene and its DOM controls without a browser or GPU.
    const oldWindow = globalThis.window, oldLocation = globalThis.location;
    const elements = [];
    class ElementStub extends EventTarget {
        constructor(tag = 'div') { super(); this.tagName = tag; this.style = {}; this.children = []; this.className = ''; this.id = ''; this.classList = { add() {}, remove() {}, contains: () => false }; elements.push(this); }
        setAttribute() {}
        append(...children) { this.children.push(...children); }
        prepend(...children) { this.children.unshift(...children); }
        getContext() { return null; }
        replaceChildren(...children) { this.children = children; }
        remove() { const i = elements.indexOf(this); if (i >= 0) elements.splice(i, 1); }
    }
    const nodes = Object.fromEntries(['touch-controls', 'play-area', 'level-list', 'level-select', 'status', 'levels', 'close-levels'].map(id => { const element = new ElementStub(); element.id = id; return [id, element]; }));
    globalThis.document = Object.assign(new EventTarget(), { body: new ElementStub('body'), head: new ElementStub('head'), createElement: tag => new ElementStub(tag),
        querySelector: selector => selector === '#touch-controls .left' ? elements.find(e => e.className === 'touch-slot left') : selector.startsWith('#') ? nodes[selector.slice(1)] ?? elements.find(e => e.id === selector.slice(1)) ?? null : null });
    globalThis.window = new EventTarget(); globalThis.location = { search: '?test=1' };
    const cleanups = [];
    const text = (x, y) => { const t = { x, y, text: '', setText(value) { t.text = value; return t; }, setDepth() { return t; }, setOrigin() { return t; }, setPosition(x, y) { t.x = x; t.y = y; return t; } }; return t; };
    Object.assign(scene, { make: platform.make, textures: platform.textures, add: { ...platform.add, graphics: chainGraphics, text },
        events: { once: (name, callback) => { if (name === 'shutdown') cleanups.push(callback); } }, game: { canvas: new ElementStub('canvas') } });
    try {
        scene.create(); assert.equal(scene.session.state, 'playing'); assert.equal(scene.session.menuOpen, false);
        const hook = globalThis.window.__PETITS_POMPIERS_TEST__; assert(hook);
        hook.load(0, 28, 'detente'); scene.session.send('start'); hook.advance(FIXED);
        assert.equal(hook.read().ticks, 1); assert(!('fingerReceipts' in hook.read()));
        const bakes = hook.renderStats().backgroundBakes; scene.draw(); scene.draw(); assert.equal(hook.renderStats().backgroundBakes, bakes);
        assert(hook.renderStats().dynamicCommands < 2600);
        hook.advance(250); const ongoing = hook.read(), baked = hook.renderStats().backgroundBakes;
        nodes.levels.dispatchEvent(new Event('click')); assert.equal(scene.selecting, true);
        nodes['close-levels'].dispatchEvent(new Event('click')); assert.equal(scene.selecting, false);
        const resumed = hook.read();
        for (const field of ['ticks', 'time', 'player', 'progress', 'fires', 'victims', 'random']) assert.deepEqual(resumed[field], ongoing[field], `close preserves ${field}`);
        assert.equal(hook.renderStats().backgroundBakes, baked);
        hook.scenario('timeout'); assert.equal(hook.read().status, 'playing');
        assert(scene.engine.objectivesDone());
        for (let i = 0; i < 20; i++) scene.draw(); assert.equal(hook.renderStats().backgroundBakes, baked + 1);
        // Exercise the built view, including drawn boxes and the water/hearts gap.
        for (const mode of ['defi', 'detente']) {
            hook.load(0, 28, mode); scene.draw();
            const cells = hook.hudCells();
            assert.equal(cells.some(c => c.id === 'hearts'), mode === 'defi');
            assert.equal(cells.some(c => c.id === 'time'), mode === 'defi');
            for (const [i, cell] of cells.entries()) {
                const { x, y, width, height } = cell.box;
                assert(scene.hud.commandBuffer.some(c => c[0] === 'fillRoundedRect' && c[1] === x && c[2] === y && c[3] === width && c[4] === height), `drawn ${mode}/${cell.id}`);
                assert.equal(scene.hudLabels[i].text, cell.text);
                for (const other of cells.slice(i + 1)) assert(!overlaps(cell.box, other.box), `built ${mode}: ${cell.id}/${other.id}`);
            }
            const water = cells.find(c => c.id === 'water').box;
            assert(water.x + water.width < 170, 'water clears hearts at x=170 in both modes');
            assert.equal(scene.hudLabels.some(label => /[♥⏱]/u.test(label.text)), mode === 'defi');
        }
        hook.load(0, 28, 'defi');
        assert(scene.hudLabels.some(label => label.text.includes('♥'))); assert(scene.hudLabels.some(label => label.text.includes('⏱')));
        hook.scenario('timeout'); assert(scene.engine.objectivesDone()); hook.advance(100); assert.equal(hook.read().status, 'lost');
        hook.load(0, 28, 'detente'); hook.scenario('timeout'); hook.advance(60000);
        assert.equal(hook.read().status, 'playing'); assert.equal(hook.read().player.hearts, 3);
        assert(!scene.hudLabels.some(label => /[♥⏱]/u.test(label.text)));
        const pilot = new Pilot();
        for (let i = 0; i < 36000 && scene.engine.status === 'playing'; i++) { scene.engine.input(pilot.readAction(scene.engine)); scene.engine.step(FIXED); }
        assert.equal(scene.engine.status, 'won');
        // Count actual uniform helmets in both drawing layers, for every mascot.
        const helmets = graphics => graphics.commandBuffer.filter(c => c[0] === 'fillRoundedRect' && Math.abs(c[3] / c[4] - 106 / 45) < 1e-9 && Math.abs(c[5] / c[4] - 22 / 45) < 1e-9);
        for (const id of ids) {
            scene.engine.character = id; scene.draw();
            assert.equal(helmets(scene.graphics).length, 0, 'no mascot left on the truck');
            const celebration = helmets(scene.hud); assert.equal(celebration.length, 1, 'one celebration mascot');
            const helmet = celebration[0], size = 110, scale = size / 240;
            assert.equal(helmet[1], 180 - size / 2 + 69 * scale, 'celebration centered');
            assert.equal(scene.instruction.x, 180); assert(scene.instruction.y < helmet[2], 'stars above mascot');
            assert.equal(scene.instruction.text, '⭐'.repeat(scene.engine.stars));
        }
        assert(hook.renderStats().dynamicCommands < 2600, 'victory render bounded');
    } finally { for (const cleanup of cleanups) cleanup(); globalThis.window = oldWindow; globalThis.location = oldLocation; }
    assert.equal(textures.size, 0);
    console.log(`Petits Pompiers : construction, ${LEVELS.length} décors cuits, rendu borné, cinq mascottes, contexte pur et stick vérifiés.`);
} finally { globalThis.matchMedia = oldMedia; globalThis.document = oldDocument; arena.destroy(); }
