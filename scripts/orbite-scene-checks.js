/* global window */
import assert from 'node:assert/strict';
import { mutationModule } from './mutation-module.js';
import { test } from './node-test-assertions.js';
const data = source => 'data:text/javascript,' + encodeURIComponent(source);
// Only the platform is replaced: the real scene's create(), draw() and HUD run.
const phaser = data('export default { Scene: class {} };');
// World boundaries of the baked backdrops: ten levels per world.
export async function worldChecks() {
    const { worldOf } = await import('../src/games/orbite/art.ts');
    assert.deepEqual([0, 9, 10, 19, 20, 29].map(worldOf), ['bambou', 'bambou', 'ecarlate', 'ecarlate', 'etoiles', 'etoiles']);
}
export async function sceneChecks(before = "import Phaser from 'phaser';", after = before) {
    const { module: { OrbiteScene } } = await mutationModule('../src/games/orbite/scene.ts', before, after, { phaser, '../../shell/input': data('export class Inputs { on() {} dispose() {} } export function renderTouchControls() {}') });
    const previous = Object.fromEntries(['document', 'window', 'location', 'matchMedia'].map(key => [key, globalThis[key]]));
    const triangles = [];
    const graphics = new Proxy({}, { get: (_, name) => (...args) => { if (name === 'fillTriangle') triangles.push(args); } });
    const element = () => ({ append() {}, addEventListener() {}, setAttribute() {}, classList: { add() {}, remove() {} } });
    globalThis.document = { body: element(), createElement: element, createTextNode: () => ({}), querySelector: () => null };
    globalThis.matchMedia = () => ({ matches: false });
    globalThis.window = {};
    globalThis.location = { search: '?test=1' };
    try {
        const scene = new OrbiteScene();
        const image = { setOrigin() { return image; }, setDepth() { return image; }, setTexture() { return image; } };
        scene.add = { graphics: () => graphics, image: () => image, text: () => ({ text: '', setText(text) { this.text = text; } }) };
        scene.textures = { exists: () => true };
        scene.events = { once() {} }; scene.game = { canvas: element() };
        scene.create();
        const hook = window.__ORBITE_TEST__;
        const labels = { rotor: 'Rotors', split: 'Scindées', asteroid: 'Astéroïdes', gravity: 'Gravité', stealth: 'Furtives', repair: 'Réparateurs', satellite: 'Protéger le satellite', spiral: 'Essaim' };
        for (let level = 0; level < 30; level++) {
            hook.loadLevel(level);
            const s = hook.read(), text = hook.hudText();
            const present = new Set(s.probes.map(p => p.kind));
            if (s.asteroids.length) present.add('asteroid');
            if (s.wells.length) present.add('gravity');
            if (s.satellite) present.add('satellite');
            if (s.swarm) present.add('spiral');
            for (const [kind, label] of Object.entries(labels)) if (text.includes(label)) assert.ok(present.has(kind), `level ${level + 1}: misleading ${label}`);
            if (s.boss) assert.ok(text.includes('GARDIEN'));
            else if (present.size === 1 && present.has(undefined)) assert.ok(text.includes('Défendre les quatre abris'));
            else assert.ok(Object.entries(labels).some(([kind, label]) => present.has(kind) && text.includes(label)), `level ${level + 1}: missing instruction`);
            if ([5, 10, 16, 20, 25].includes(level)) assert.ok(text.includes('RESPIRATION'));
        }
        hook.loadLevel(15);
        const stealth = scene.engine.state.probes.find(p => p.kind === 'stealth');
        for (const ticks of [0, 100, 150]) {
            scene.engine.state.ticks = ticks; triangles.length = 0; scene.draw();
            const expected = ticks !== 100;
            assert.equal(hook.renderedProbeIds().includes(stealth.id), expected, `render hook at ${ticks}`);
            // Observe the real graphics calls too: a false hook cannot mask a drawn probe.
            assert.equal(triangles.some(args => args[0] === stealth.x - 3 && args[1] === stealth.y - 2), expected, `actual drawing at ${ticks}`);
            // Two wings per probe, six triangles for the player's ship (flames, wings, wing tips).
            assert.equal(triangles.length, hook.renderedProbeIds().length * 2 + 6);
        }
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) Reflect.deleteProperty(globalThis, key); else globalThis[key] = value;
        }
    }
}
export async function registerSceneChecks() {
    test('O-RENDER actual hidden/visible graphics and truthful HUD on all 30 levels', sceneChecks);
}
