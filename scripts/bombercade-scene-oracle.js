import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { mutationModule } from './mutation-module.js';
import { Engine, WIDTH, HEIGHT } from '../src/engines/bombercade/engine.ts';
import { GameCharacter } from '../src/characters/game.ts';
import { ArenaLayer } from '../src/games/bombercade/arena.ts';

/** Run the actual scene draw, replacing only Phaser's platform and GPU objects. */
export async function checkBombercadeScene() {
    const source = readFileSync(new URL('../src/games/bombercade/scene.ts', import.meta.url), 'utf8');
    assert.match(source, /body\.bombercade #touch-controls\{[^}]*margin-bottom:max\(12px,env\(safe-area-inset-bottom\)\)/,
        'Touch controls reserve at least 12 px below the joystick and bomb');
    assert.match(source, /this\.inputs\.on\(stick, 'click', \(\) => \{\}\)/,
        'Joystick participates in touch adjustment with a disposed no-op click listener');
    const { module: { BombercadeScene } } = await mutationModule('../src/games/bombercade/scene.ts',
        "import Phaser from 'phaser';", 'const Phaser = { Scene: class {} };');
    const liveGraphics = new Set(), textures = new Set(), images = new Set();
    let bakes = 0;
    function graphics() {
        const commands = [];
        const g = new Proxy({ commandBuffer: commands }, { get(target, name) {
            if (name === 'commandBuffer') return target.commandBuffer;
            return (...args) => {
                if (name === 'destroy') liveGraphics.delete(g);
                else if (name === 'clear') commands.length = 0;
                else if (name === 'generateTexture') { assert(!textures.has(args[0])); textures.add(args[0]); bakes++; }
                else commands.push([name, ...args]);
                return g;
            };
        } });
        liveGraphics.add(g); return g;
    }
    const platform = {
        make: { graphics },
        textures: { remove(key) { assert(textures.delete(key), 'Texture released exactly once'); } },
        add: { image(x, y, key) {
            assert(textures.has(key));
            const image = { x, y, key, setOrigin() { return image; }, setDepth() { return image; }, destroy() { images.delete(image); } };
            images.add(image); return image;
        } },
    };
    const arena = new ArenaLayer(platform), dynamic = graphics();
    const engine = new Engine();
    const context = { engine, arena, graphics: dynamic, visualTime: 0, cast: [] };
    const scene = BombercadeScene.prototype;
    // DOM updates are irrelevant to command replay; no browser is instantiated.
    const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const oldMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { querySelector: () => null } });
    try {
        for (const level of [0, 8, 16, 24, 29]) {
            arena.reset(); engine.loadLevel(level, 28);
            context.cast = engine.actors.map(a => new GameCharacter(a.character));
            // Keep actors fixed when comparing full and empty arenas.
            engine.danger = () => new Map();
            engine.board.blocks = Array.from({ length: WIDTH * HEIGHT }, (_, at) => ({ at, hp: 2, kind: 'normal' }));
            scene.draw.call(context);
            const full = dynamic.commandBuffer.length, baked = bakes;
            assert(full > 100 && full < 1200, `Dynamic Graphics budget: ${full}`);
            assert.equal(liveGraphics.size, 1, 'All baking Graphics destroyed');
            scene.draw.call(context); assert.equal(bakes, baked, 'No baking on ordinary frames');
            const before = images.size;
            engine.board.blocks.pop(); scene.draw.call(context);
            assert.equal(images.size, before - 1, 'Broken block removed individually');
            assert.equal(bakes, baked);
            engine.board.blocks = []; scene.draw.call(context);
            assert.equal(dynamic.commandBuffer.length, full, 'Replay independent of arena occupancy');
            engine.board.blocks = [{ at: 15, hp: 2, kind: 'ice' }]; scene.draw.call(context);
            engine.board.blocks[0].at = 16; scene.draw.call(context);
            assert([...images].some(i => i.x === 165 && i.y === 170), 'Ice image follows its cell');
            engine.board.blocks[0].hp = 1; scene.draw.call(context);
            const current = bakes; scene.draw.call(context); assert.equal(bakes, current);
            engine.board.walls.push(15); scene.draw.call(context);
            assert(bakes > current, 'Sudden-death walls invalidate baked background');
            arena.reset(); assert.equal(textures.size, 0); assert.equal(images.size, 0);
        }
        arena.destroy(); arena.destroy(); assert.equal(textures.size, 0);
    } finally {
        arena.destroy(); dynamic.destroy();
        if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
        else delete globalThis.document;
        if (oldMedia) Object.defineProperty(globalThis, 'matchMedia', oldMedia);
        else delete globalThis.matchMedia;
    }
    assert.equal(liveGraphics.size, 0);
}
