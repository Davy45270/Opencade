import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { mutationModule } from './mutation-module.js';
import { Engine, WIDTH, HEIGHT } from '../src/engines/bombercade/engine.ts';
import { GameCharacter } from '../src/characters/game.ts';
import { drawBomb, powerIcon, tile, cellHash } from '../src/games/bombercade/art.ts';
import { ids } from '../src/characters/model.ts';
import { ArenaLayer } from '../src/games/bombercade/arena.ts';

/** Run the actual scene draw, replacing only Phaser's platform and GPU objects. */
export async function checkBombercadeScene() {
    const source = readFileSync(new URL('../src/games/bombercade/scene.ts', import.meta.url), 'utf8');
    assert.match(source, /body\.bombercade #touch-controls\{[^}]*margin-bottom:max\(12px,env\(safe-area-inset-bottom\)\)/,
        'Touch controls reserve at least 12 px below the joystick and bomb');
    assert.match(readFileSync(new URL('../src/shell/input.ts', import.meta.url), 'utf8'), /inputs\.on\(stick, 'click', \(\) => \{\}\)/,
        'Joystick participates in touch adjustment with a disposed no-op click listener');
    const { module: { BombercadeScene } } = await mutationModule('../src/games/bombercade/scene.ts',
        "import Phaser from 'phaser';", 'const Phaser = { Scene: class {} };');
    const liveGraphics = new Set(), textures = new Set(), images = new Set();
    let bakes = 0;
    const bakedCommands = new Map(), arenaPrints = new Set();
    function graphics() {
        const commands = [];
        const g = new Proxy({ commandBuffer: commands }, { get(target, name) {
            if (name === 'commandBuffer') return target.commandBuffer;
            return (...args) => {
                if (name === 'destroy') liveGraphics.delete(g);
                else if (name === 'clear') commands.length = 0;
                else if (name === 'generateTexture') { assert(!textures.has(args[0])); textures.add(args[0]); bakedCommands.set(args[0], JSON.stringify(commands)); bakes++; }
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
    const status = { textContent: '' }, hud = { text: '', setText(text) { this.text = text; } };
    const context = { hud, engine, explosionOrigins: new WeakMap(), arena, graphics: dynamic, visualTime: 0, cast: [], debris: { breaks: 0, blocks: new Set(), particles: [] } };
    const scene = BombercadeScene.prototype;
    // The scene reads the engine's events (without sound) before drawing, as its feedback() does after each step or action.
    const observed = () => scene.observe.call(context).map(event => event.type);
    // DOM updates are irrelevant to command replay; no browser is instantiated.
    const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const oldMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { querySelector: selector => selector === '#status' ? status : null } });
    try {
        for (const level of [0, 8, 16, 24, 29]) {
            arena.reset(); engine.loadLevel(level, 28);
            context.cast = engine.actors.map(a => new GameCharacter(a.character));
            // Keep actors fixed when comparing full and empty arenas.
            engine.danger = () => new Map();
            engine.board.blocks = Array.from({ length: WIDTH * HEIGHT }, (_, at) => ({ at, hp: 2, kind: 'normal' }));
            scene.draw.call(context);
            if (level !== 29) arenaPrints.add(bakedCommands.get([...textures][0]));
            assert.equal(status.textContent, hud.text, 'Accessible status and hudText source stay identical');
            if (level === 0) assert.equal(hud.text, 'Bombercade · 1/30 · SCORE 0\nBoubou · ♥♥ · 1 rival(aux) · 150 s\njungle · Clairières 1\nPluie de bambous : 0');
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
        assert.equal(arenaPrints.size, 4, 'Four distinct baked arena materials');
        context.cast = [];
        engine.fires = [{ at: 35, owner: 0, character: 'dragon', left: 500 }, { at: 36, owner: 0, character: 'dragon', left: 500 }];
        scene.draw.call(context);
        assert(dynamic.commandBuffer.some(([name, , alpha]) => name === 'fillStyle' && alpha === .22), 'Explosion halo');
        const ribbons = dynamic.commandBuffer.filter(([name, points]) => name === 'fillPoints' && points.length === 10 && points.every(p => p.y >= 140)).map(([, points]) => points);
        assert.equal(ribbons.length, 2, 'A straight two-cell flame has two ribbons and no repeated starbursts');
        for (const y of [239, 251]) assert.equal(ribbons.filter(points => points.some(p => p.x === 105 && p.y === y)).length, 2, 'Both ribbons meet at equal width');
        const cores = dynamic.commandBuffer.filter(([name, points]) => name === 'fillPoints' && points.length === 6);
        assert.equal(cores.length, 2, 'Each flame segment has a continuous pale axial core');
        engine.fires.push(...[25, 37, 47].map(at => ({ at, owner: 0, character: 'dragon', left: 500 }))); scene.draw.call(context);
        assert.equal(dynamic.commandBuffer.filter(([name, points]) => name === 'fillPoints' && points.length === 10 && points.every(p => p.y >= 140)).length, 7, 'Only the cross center adds a starburst to the six axis ribbons');
        engine.fires.splice(2);
        engine.fires.forEach(f => { f.left = 90; }); scene.draw.call(context);
        assert(dynamic.commandBuffer.some(([name, , alpha]) => name === 'fillStyle' && alpha === .11), 'Explosion fades with remaining life');
        engine.fires = [];
        arena.reset();

        // Real engine explosions: confined horizontal blast and an open cross.
        const boardStars = () => dynamic.commandBuffer
            .filter(([name, points]) => name === 'fillPoints' && points.length === 10 && points.every(p => p.y >= 140))
            .filter(([, points]) => Math.abs(points[0].x - points[5].x) < .001);
        for (const confined of [true, false]) {
            engine.loadLevel(0, 28);
            engine.board.blocks = [];
            engine.board.walls = confined ? [...engine.board.walls, 1, 23] : [];
            engine.actors.forEach((a, i) => { a.at = i ? 120 : 100; a.from = a.at; a.think = 100000; });
            engine.bombs = [{ id: 1001, at: 12, owner: 0, character: 'panda', fuse: 1, range: confined ? 2 : 1 }];
            engine.step(20); observed();
            if (confined) assert.deepEqual(engine.fires.map(f => f.at), [12, 13, 14], 'Confined blast reproduction');
            scene.draw.call(context);
            const stars = boardStars();
            assert.equal(stars.length, 1, `${confined ? 'Confined blast' : 'Open cross'} has exactly one star`);
            const points = stars[0][1];
            assert(Math.abs(points.reduce((sum, p) => sum + p.x, 0) / points.length - 60) < .001, 'Star centered on column of cell 12');
            assert(Math.abs(points.reduce((sum, p) => sum + p.y, 0) / points.length - 185) < .001, 'Star centered on row of cell 12');
        }
        engine.loadLevel(0, 28); engine.board.blocks = [];
        engine.board.walls.push(1, 23);
        engine.actors.forEach((a, i) => { a.at = i ? 120 : 100; a.from = a.at; a.think = 100000; });
        engine.bombs = [12, 13].map((at, i) => ({ id: 1100 + i, at, owner: 0, character: 'panda', fuse: i ? 2500 : 1, range: 2 }));
        engine.step(20); const chained = observed(); scene.draw.call(context);
        assert(chained.includes('chain'), 'Real chained explosion');
        assert.equal(boardStars().length, 2, 'Each chained bomb retains its own star');
        engine.fires = [];

        const candyColors = at => {
            dynamic.clear(); tile(dynamic, 'sucré', 0, 0, at, false, false);
            return dynamic.commandBuffer.filter(([name, tint]) => name === 'fillStyle' && [0xffd7e9, 0xf6b1d8].includes(tint))[0][1];
        };
        assert.notEqual(candyColors(12), candyColors(23), 'Candy checker alternates vertically');
        assert.notEqual(candyColors(12), candyColors(13), 'Candy checker alternates horizontally');
        const cracks = [];
        const forms = new Set();
        for (let at = 0; at < WIDTH * HEIGHT; at++) {
            dynamic.clear(); tile(dynamic, 'volcan', 0, 0, at, false, false);
            const paths = dynamic.commandBuffer.filter(([name]) => name === 'strokePoints');
            if (paths.length) { cracks.push(at); forms.add(JSON.stringify(paths[0][1])); }
            const first = JSON.stringify(dynamic.commandBuffer);
            dynamic.clear(); tile(dynamic, 'volcan', 0, 0, at, false, false);
            assert.equal(JSON.stringify(dynamic.commandBuffer), first, 'Cell variation is deterministic');
            dynamic.clear(); tile(dynamic, 'volcan', 0, 0, at, true, false);
            assert.equal(dynamic.commandBuffer.some(([name]) => name === 'strokePoints'), cellHash(at) % 3 === 0, 'Only selected walls receive cracks');
        }
        assert(cracks.length > WIDTH * HEIGHT * .25 && cracks.length < WIDTH * HEIGHT * .42, 'About one third of floor cells have cracks');
        assert(forms.size >= 4, 'At least four distinct crack geometries');
        engine.loadLevel(18, 28); engine.board.blocks = [{ at: 15, kind: 'ice', hp: 1 }];
        engine.board.walls = engine.board.walls.filter(at => ![14, 15, 16].includes(at));
        engine.actors.forEach((a, i) => { a.at = i ? 120 : 12; a.from = a.at; a.think = 100000; });
        engine.bombs = [{ id: 999, at: 14, owner: 0, character: 'panda', fuse: 1, range: 1 }];
        context.debris = { breaks: 0, blocks: new Set(engine.board.blocks), particles: [] };
        scene.draw.call(context); engine.step(20); const slid = observed(); scene.draw.call(context);
        assert(slid.includes('slide'), 'Level 19 scenario really slides ice');
        assert.equal(engine.board.blocks[0].at, 16);
        assert.equal(context.debris.particles.length, 0, 'Sliding ice never emits break debris');
        engine.board.blocks = [{ at: 15, kind: 'normal', hp: 1 }];
        context.debris.blocks = new Set(engine.board.blocks);
        engine.bombs = [{ id: 1000, at: 14, owner: 0, character: 'panda', fuse: 1, range: 1 }];
        engine.step(20); const broken = observed(); scene.draw.call(context);
        assert(broken.includes('block'), 'Control really breaks a crate');
        assert.equal(context.debris.particles.length, 1, 'Real break emits debris');
        for (const kind of ['normal', 'gold']) {
            engine.loadLevel(0, 28);
            engine.player.character = 'dragon'; engine.player.at = 12; engine.player.from = 12;
            engine.player.direction = 'right'; engine.player.charges = 2;
            engine.board.blocks = [{ at: 13, kind, hp: 1 }];
            context.debris = { breaks: 0, blocks: new Set(engine.board.blocks), particles: [] };
            scene.draw.call(context);
            assert(engine.special(), 'Dragon breath succeeds');
            assert.equal(engine.time, 0, 'No time advance before drawing');
            assert(observed().includes('block'), 'Breath really destroys the block');
            scene.draw.call(context);
            assert.equal(context.debris.particles.length, 1, `Time-zero dragon breath emits ${kind} debris`);
            scene.draw.call(context);
            assert.equal(context.debris.particles.length, 1, 'Repeated draws consume each break only once');
            engine.board.blocks = [{ at: 13, kind, hp: 1 }]; scene.draw.call(context);
            engine.special(); observed(); scene.draw.call(context);
            assert.equal(context.debris.particles.length, 2, 'A second break at time zero, after a drain, is consumed');
        }
        engine.fires = []; engine.time = 0; engine.drain(); context.debris.particles = [];
        scene.draw.call(context);
        assert(!dynamic.commandBuffer.some(([name, x, y]) => name === 'lineBetween' && x === 308 && y === 77), 'Fixed clock hands absent from dynamic replay');
        assert(!dynamic.commandBuffer.some(([name, x, y]) => name === 'fillRoundedRect' && x === 24 && y === 115), 'Empty gauge background absent from dynamic replay');
        assert([...bakedCommands.values()].some(commands => commands.includes('["lineBetween",308,77,308,71]') && commands.includes('["fillRoundedRect",24,115,312,3,1]')), 'Clock and gauge background baked into texture');
        assert(!dynamic.commandBuffer.some(([name, x, y]) => name === 'strokeCircle' && x === 308 && y === 77), 'Normal clock outline absent from dynamic replay');
        engine.time = 999999; engine.player.charges = 1; scene.draw.call(context);
        assert(dynamic.commandBuffer.some(([name, x, y]) => name === 'strokeCircle' && x === 308 && y === 77), 'Clock alert remains dynamic');
        assert(dynamic.commandBuffer.some(([name, x, y]) => name === 'fillRoundedRect' && x === 24 && y === 115), 'Charged gauge value remains dynamic');


        const silhouettes = new Set();
        for (const id of ids) {
            dynamic.clear(); drawBomb(dynamic, id, 15, 15, 9, 0);
            // Ignore colors: the five bombs must differ by geometry as well.
            silhouettes.add(JSON.stringify(dynamic.commandBuffer.filter(([name]) => name !== 'fillStyle' && name !== 'lineStyle')));
            const first = JSON.stringify(dynamic.commandBuffer);
            dynamic.clear(); drawBomb(dynamic, id, 15, 15, 9, 100);
            assert.notEqual(JSON.stringify(dynamic.commandBuffer), first, 'Fuse spark animates');
        }
        assert.equal(silhouettes.size, 5, 'Five distinct bomb silhouettes');
        const icons = new Set();
        for (const kind of ['range', 'capacity', 'speed', 'special']) {
            dynamic.clear(); powerIcon(dynamic, kind, 15, 15);
            icons.add(JSON.stringify(dynamic.commandBuffer));
        }
        assert.equal(icons.size, 4, 'Four distinct pickup symbols');
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
