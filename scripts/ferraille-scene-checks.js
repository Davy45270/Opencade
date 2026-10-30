import './ts-loader.js';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
registerHooks({ resolve(name, context, next) {
    if (name === 'phaser') return { shortCircuit: true, url: 'data:text/javascript,export default { Scene: class {} };' };
    if (/\/shell\/services(?:\.ts)?$/.test(name)) return { shortCircuit: true, url: 'data:text/javascript,export const sound={playEffect(){}};' };
    return next(name, context);
} });
const { selectCharacter } = await import('../src/characters/selection.ts');
const { ActionPaint } = await import('../src/characters/action-phaser.ts');
const { LEVELS, DT } = await import('../src/engines/ferraille/engine.ts');
const { replayLevel } = await import('../tests/ferraille-levels.ts');
export const { FerrailleScene } = await import('../src/games/ferraille/scene.ts');
export function replaySample() {
    const records = JSON.parse(readFileSync('tests/fixtures/ferraille-levels-103.json', 'utf8'));
    let seed = 105;
    return Array.from({ length: 30 }, (_, level) => {
        seed = seed * 16807 % 2147483647;
        const candidates = records.filter(r => r.level === level);
        return { character: ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'][level % 5], record: candidates[seed % candidates.length] };
    });
}
export function sceneChecks(Scene = FerrailleScene, campaign = false, exhaustive = true) {
    const sample = campaign ? replaySample() : [];
    // Only platform ports are replaced. The scene draw body, actors and atlas are real.
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.matchMedia = globalThis.window.matchMedia;
    globalThis.document = { querySelector: () => null };
    for (const id of (exhaustive ? ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'] : ['panda'])) {
        selectCharacter(id, undefined);
        const scene = new Scene(), calls = [], sprites = [];
        scene.session.send('start');
        const g = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return g; } });
        scene.graphics = g; scene.specialGraphics = g;
        scene.textures = { exists: () => true };
        scene.add = { image: () => {
            const sprite = { texture: { key: '' }, visible: false };
            for (const method of ['setTexture', 'setPosition', 'setDisplaySize', 'setRotation', 'setAlpha', 'setDepth', 'setVisible', 'destroy']) sprite[method] = (...args) => {
                if (method === 'setTexture') sprite.texture.key = args[0];
                if (method === 'setVisible') sprite.visible = args[0];
                return sprite;
            };
            sprites.push(sprite); return sprite;
        } };
        scene.art = new ActionPaint(scene, 224);
        scene.discovery = { text: '', setText(text) { this.text = text; } };
        scene.hud = { text: '', setText(text) { this.text = text; } };
        for (let level = 0; level < (exhaustive ? 30 : 1); level++) {
            if (campaign && sample[level].character !== id) continue;
            scene.engine.loadLevel(level, 28); const s = scene.engine.state;
            // Freeze position through ordinary input, while real engine steps advance the entry clock.
            s.vehicle = false;
            for (let step = 0; step < 120; step++) {
                assert.equal(s.ticks, step);
                // All 120 frames once; both boundaries for every level and actor.
                if (step === 0 || step === 119 || id === 'panda' && level === 0) {
                    scene.draw();
                    assert.equal(scene.discovery.text, LEVELS[level].discovery, `${id}/${level}/entry ${step}`);
                    assert(scene.hud.text.includes(LEVELS[level].name));
                }
                scene.engine.step(DT);
            }
            scene.draw(); assert.equal(scene.discovery.text, 'CAP SUR LA PORTE · GARDEZ VOTRE ÉLAN');
            const preview = s.modules.find(m => m.preview);
            s.hero.x = 160; calls.length = 0; scene.draw();
            // Actual visible module outline, not a source-text assertion.
            const camera = 84;
            assert(calls.some(c => c[0] === 'strokeRoundedRect' && c[1] === (preview.x - camera) * 1.4 && c[2] === 390.4 && c[3] === 134.39999999999998 && c[4] === 82), 'visible introduction');
            if (preview.kind === 'piston') {
                s.ticks = 100; calls.length = 0; scene.draw();
                assert(calls.some(c => c[0] === 'fillRect' && c[1] === 84 && c[2] === 361.2 && c[3] === 89.6 && c[4] === 109.19999999999999), 'piston drawing uses physical box');
            }
            for (const checkpoint of s.checkpoints) {
                s.hero.x = checkpoint; calls.length = 0; scene.draw();
                assert(calls.some(c => c[0] === 'lineBetween' && c[1] === 106.39999999999999 && c[2] === 420 && c[3] === 106.39999999999999 && c[4] === 470.4), 'visible checkpoint mast');
                assert(calls.some(c => c[0] === 'fillTriangle' && c[1] === 106.39999999999999 && c[2] === 420 && c[3] === 125.99999999999999 && c[4] === 428.4 && c[5] === 106.39999999999999 && c[6] === 436.79999999999995), 'visible checkpoint flag');
            }
        }
        assert.equal(scene.hero.snapshot().id, id); assert.equal(scene.art.stats().character, id);
        if (campaign) {
            for (const { record } of sample.filter(row => row.character === id)) {
                replayLevel(record, id, scene.engine); scene.draw();
                assert.equal(scene.hero.snapshot().id, id); assert.equal(scene.hero.snapshot().expression, 'joie');
                const visible = sprites.filter(s => s.visible).map(s => s.texture.key);
                assert(visible.some(key => key.includes(`-${id}-`)), 'selected character atlas submitted by scene');
                assert(!visible.some(key => ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'].filter(other => other !== id).some(other => key.includes(`-${other}-`))), 'no other character in atlas');
            }
        }
        scene.art.destroy(); scene.inputs.dispose();
    }
}
