import './ts-loader.js';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
registerHooks({ resolve(name, context, next) {
    if (name === 'phaser') return { shortCircuit: true, url: 'data:text/javascript,export default { Scene: class {} };' };
    if (/\/shell\/services(?:\.ts)?$/.test(name)) return { shortCircuit: true, url: 'data:text/javascript,export const sound={playEffect(){},stop(){}};' };
    return next(name, context);
} });
const { selectCharacter } = await import('../src/characters/selection.ts');
const { FerraillePaint: ActionPaint } = await import('../src/games/ferraille/paint.ts');
const { Engine, LEVELS, DT } = await import('../src/engines/ferraille/engine.ts');
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
            // A filled mechanism surface must actually intersect the viewport. This
            // excludes the identical challenge further right and the old empty outline.
            const colors = { bridge: 0xf1b969, gate: 0xc99c55, secret: 0xa7a6b7, crate: 0xe6a14c, tower: 0xa97236, hut: 0xa97236 };
            const color = colors[preview.kind] ?? 0x83a7ac;
            let selected = false, visible = false;
            for (const c of calls) {
                if (c[0] === 'fillStyle') selected = c[1] === color;
                if (selected && (c[0] === 'fillRect' || c[0] === 'fillRoundedRect') && c[1] < 360 && c[1] + c[3] > 0 && c[2] < 640 && c[2] + c[4] > 112) visible = true;
            }
            assert(visible, `filled visible introduction: ${preview.kind}`);
            const top = Math.max(88, s.hero.y - 146);
            for (const checkpoint of s.checkpoints) {
                s.hero.x = checkpoint; calls.length = 0; scene.draw();
                const x = (checkpoint - scene.rendering.camera) * 2.6;
                assert(calls.some(c => c[0] === 'lineBetween' && c[1] === x && c[2] === (220 - top) * 2.6 + 112 && c[3] === x && c[4] === (256 - top) * 2.6 + 112), 'visible checkpoint mast');
            }

        }
        assert.equal(scene.hero.snapshot().id, id); assert.equal(scene.art.stats().character, id);
        if (campaign) {
            for (const record of JSON.parse(readFileSync('tests/fixtures/ferraille-levels-103.json', 'utf8'))) {
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

// Coarse software raster of actual Graphics calls, excluding uniform backdrop and HUD.
// Pixel centres are sampled at 2px; triangles/ellipses use their real interiors.
export function decorationMeasure(calls) {
    const pixels = new Uint32Array(180 * 264), elements = new Set();
    let serial = 0;
    let alpha = 1;
    for (const [method, ...a] of calls) {
        if (method === 'fillStyle') { alpha = a[1] ?? 1; continue; }
        if (alpha < .8) continue;
        let left, top, width, height, inside = () => true;
        if (method === 'fillRect' || method === 'fillRoundedRect') [left, top, width, height] = a;
        else if (method === 'fillCircle' || method === 'fillEllipse') {
            width = method === 'fillCircle' ? a[2] * 2 : a[2]; height = method === 'fillCircle' ? a[2] * 2 : a[3];
            left = a[0] - width / 2; top = a[1] - height / 2;
            inside = (x, y) => ((x - a[0]) / (width / 2)) ** 2 + ((y - a[1]) / (height / 2)) ** 2 <= 1;
        } else if (method === 'fillTriangle') {
            left = Math.min(a[0], a[2], a[4]); top = Math.min(a[1], a[3], a[5]); width = Math.max(a[0], a[2], a[4]) - left; height = Math.max(a[1], a[3], a[5]) - top;
            inside = (x, y) => {
                const signs = [0, 2, 4].map((i, j) => { const k = (j + 1) % 3 * 2; return (x - a[k]) * (a[i + 1] - a[k + 1]) - (a[i] - a[k]) * (y - a[k + 1]); });
                return signs.every(v => v >= 0) || signs.every(v => v <= 0);
            };
        } else continue;
        if (top + height < 112 || left + width < 0 || left > 360 || top > 640) continue;
        const owner = width * height >= 360 * 528 * .8 ? 0 : ++serial;
        // Large distinct silhouettes only: bolts, windows and stroke details do not count.
        if (width >= 24 && height >= 24 && width * height < 360 * 528 * .3) elements.add(owner);
        for (let y = Math.max(0, Math.floor((top - 112) / 2)); y < Math.min(264, Math.ceil((top + height - 112) / 2)); y++) for (let x = Math.max(0, Math.floor(left / 2)); x < Math.min(180, Math.ceil((left + width) / 2)); x++) {
            if (inside(x * 2 + 1, 113 + y * 2)) pixels[y * 180 + x] = owner;
        }
    }
    return { coverage: pixels.reduce((sum, p) => sum + Number(p > 0), 0) / pixels.length, elements: [...new Set(pixels)].filter(p => p && elements.has(p)).length };
}

export function visualChecks(Scene = FerrailleScene, enforce = true, Paint = ActionPaint) {
    const rows = [];
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.document = { querySelector: () => null };
    for (const id of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne']) {
        selectCharacter(id, undefined);
        const scene = new Scene(), calls = [], sprites = [], textures = new Map();
        let generations = 0;
        const g = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return g; } });
        scene.graphics = g; scene.specialGraphics = g;
        scene.textures = { exists: key => textures.has(key) };
        scene.make = { graphics: () => {
            let min = 192, max = 0; const drawing = [];
            const port = new Proxy({}, { get: (_, method) => (...args) => {
                if (method !== 'generateTexture') drawing.push([method, ...globalThis.structuredClone(args)]);
                if (method === 'fillPoints' || method === 'strokePoints') for (const p of args[0]) { min = Math.min(min, p.y); max = Math.max(max, p.y); }
                if (method === 'generateTexture') { assert(!textures.has(args[0])); textures.set(args[0], { min: Math.max(0, min), max: Math.min(192, max), drawing: JSON.stringify(drawing) }); generations++; }
                return port;
            } }); return port;
        } };
        scene.add = { image: () => {
            const sprite = { visible: false };
            for (const method of ['setTexture', 'setPosition', 'setDisplaySize', 'setRotation', 'setAlpha', 'setDepth', 'setVisible', 'destroy']) sprite[method] = (...a) => {
                if (method === 'setTexture') sprite.key = a[0];
                if (method === 'setDisplaySize') sprite.height = a[1];
                if (method === 'setVisible') sprite.visible = a[0];
                return sprite;
            };
            sprites.push(sprite); return sprite;
        } };
        scene.art = new Paint(scene, 224);
        const baked = generations, budget = sprites.length;
        // A new painter on the same texture manager must also reuse the atlas.
        const again = new Paint(scene, 1); again.destroy();
        assert.equal(generations, baked);
        for (let level = 0; level < 30; level++) {
            scene.engine.loadLevel(level, 28);
            const before = scene.engine.snapshot(); calls.length = 0; scene.draw();
            assert.deepEqual(scene.engine.snapshot(), before, 'drawing never changes world/replay');
            const hero = sprites.find(p => p.visible && p.key.includes('-fighter-'));
            const actor = hero ?? sprites.find(p => p.visible && p.key.includes('-vehicles-'));
            assert(actor, 'player or active vehicle is drawn');
            if (actor) {
                const bounds = textures.get(actor.key);
                // FIT at 390×844: 48px top bar + 120px reserved touch row.
                const phoneScale = Math.min(390 / 360, (844 - 48 - 120) / 640);
                const height = (bounds.max - bounds.min) / 192 * actor.height * phoneScale;
                if (enforce) assert(height >= 56, `${id}/${level + 1}: hero ${height}`);
                if (id === 'panda' && [0, 2, 7, 13, 5, 23].includes(level)) {
                    const measure = decorationMeasure(calls);
                    if (enforce) assert(measure.coverage >= .6, `level ${level + 1}: coverage ${measure.coverage}`);
                    if (enforce) assert(measure.elements >= 12, `level ${level + 1}: elements ${measure.elements}`);
                    rows.push({ level: level + 1, heroPixels: +height.toFixed(1), coveragePercent: +(measure.coverage * 100).toFixed(1), elements: measure.elements });
                }
            }
            if (enforce && scene.engine.state.enemies.length) {
                const state = scene.engine.state, top = Math.max(88, state.hero.y - 146);
                const visible = state.enemies.filter(e => e.x >= scene.rendering.camera && e.x + e.w <= scene.rendering.camera + 360 / 2.6);
                assert(visible.length, 'authored physical enemy in initial viewport');
                for (const e of visible) assert(calls.some(c => c[0] === 'fillRoundedRect' && c[3] === 39 && Math.abs(c[1] - ((e.x - scene.rendering.camera) * 2.6 - 10)) < .001 && Math.abs(c[2] - ((e.y - top) * 2.6 + 112 - 10)) < .001 && c[1] < 360 && c[2] < 640 && c[2] + c[4] > 112), 'enemy drawn at physical position in viewport');
            }
            if (enforce && level === 0) {
                const s = scene.engine.state; s.hero.vx = 120; s.ticks = 0;
                const fighterKey = () => sprites.find(p => p.visible && p.key.includes('-fighter-'))?.key;
                scene.draw(); const first = fighterKey(); s.ticks = 6; scene.draw();
                assert.notEqual(fighterKey(), first, 'running feet use successive baked frames');
                assert.notEqual(textures.get(fighterKey()).drawing, textures.get(first).drawing, 'running frames contain different geometry');
                s.input.fire = true; s.ticks = 0; scene.draw(); const shooting = fighterKey();
                assert.notEqual(textures.get(shooting).drawing, textures.get(first).drawing, 'shooting upper-body pose differs from ordinary run');
                s.ticks = 6; scene.draw();
                assert.notEqual(textures.get(fighterKey()).drawing, textures.get(shooting).drawing, 'running while firing changes leg geometry');
                for (const [x, y] of [[0, -1], [1, -1], [-1, -1], [-1, 0]]) {
                    s.input.x = x; s.input.y = y; s.crouched = false; s.grounded = true;
                    calls.length = 0; scene.draw();
                    const rotation = calls.find(c => c[0] === 'rotateCanvas');
                    assert(rotation && Math.abs(rotation[1] - Math.atan2(y, x)) < .001, 'scene submits real aim to weapon and flame');
                }
                s.weapon = 'grenade'; s.input.x = 1; s.input.y = 0;
                calls.length = 0; scene.draw();
                assert(calls.some(c => c[0] === 'rotateCanvas' && Math.abs(c[1] - Math.atan2(-260, 170)) < .001), 'grenade barrel follows initial launch velocity');
                s.weapon = 'single';
                s.input.x = 0; s.input.y = 0;
                s.input.fire = false;
                globalThis.window.matchMedia = () => ({ matches: true });
                s.ticks = 12; calls.length = 0; scene.draw(); const frozen = JSON.stringify(calls), key = fighterKey();
                s.ticks = 18; calls.length = 0; scene.draw();
                assert.equal(JSON.stringify(calls), frozen, 'reduced motion freezes decorative cycles'); assert.equal(fighterKey(), key);
                globalThis.window.matchMedia = () => ({ matches: false });
            }
            scene.draw(); assert.equal(generations, baked); assert.equal(sprites.length, budget + 1);
        }
        scene.art.destroy(); scene.inputs.dispose();
    }
    return rows;
}

const actorDrawing = await import('../src/games/ferraille/actors-art.ts');
const moduleDrawing = await import('../src/games/ferraille/modules-art.ts');
const { moduleAt } = await import('../src/engines/ferraille/modules.ts');
function capture(draw) {
    const calls = [];
    const g = new Proxy({}, { get: (_, method) => (...a) => { calls.push([method, ...a]); return g; } });
    draw(g); return calls;
}
function transformedFills(calls) {
    let matrix = [1, 0, 0, 1, 0, 0]; const stack = [], shapes = [];
    for (const [method, ...args] of calls) {
        const [a, b, c, d, tx, ty] = matrix;
        if (method === 'save') stack.push([...matrix]);
        else if (method === 'restore') matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (method === 'translateCanvas') matrix = [a, b, c, d, tx + a * args[0] + c * args[1], ty + b * args[0] + d * args[1]];
        else if (method === 'rotateCanvas') {
            const cos = Math.cos(args[0]), sin = Math.sin(args[0]);
            matrix = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, tx, ty];
        } else if (['fillTriangle', 'fillEllipse', 'arc'].includes(method)) {
            const point = (x, y) => [a * x + c * y + tx, b * x + d * y + ty];
            shapes.push({ method, points: method === 'fillTriangle' ? [point(args[0], args[1]), point(args[2], args[3]), point(args[4], args[5])] : [point(args[0], args[1])] });
        }
    }
    return shapes;
}
export function artChecks(actors = actorDrawing, modules = moduleDrawing) {
    for (const id of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne']) {
        for (const [x, y, grounded] of [[0, -1, true, false], [1, -1, true, false], [-1, -1, true, false], [1, 0, true, false], [-1, 0, true, false], [1, -1, false, false], [1, 1, true, true]]) {
            const e = new Engine(); e.loadLevel(0, 28); const s = e.state;
            s.enemies = []; s.modules = []; s.hero.x = 40; s.hero.y = grounded ? 234 : 190; s.grounded = grounded;
            e.input({ x, y, fire: true, jump: false }); e.step(DT);
            const shot = s.shots.find(p => p.friendly); assert(shot, 'real shot');
            let dx = x, dy = y;
            if ((!s.grounded || s.crouched) && dx && dy) dy = 0;
            const angle = Math.atan2(dy, dx);
            const calls = capture(g => actors.weaponArt(g, id, 80, 300, x < 0 ? -1 : 1, true, 6, false, angle));
            assert(calls.some(c => c[0] === 'translateCanvas' && c[1] === 80 && c[2] === 300), 'weapon physical anchor');
            const rotation = calls.find(c => c[0] === 'rotateCanvas'); assert(rotation, 'weapon orientation');
            assert(Math.abs(Math.cos(rotation[1]) - shot.vx / Math.hypot(shot.vx, shot.vy)) < .001 && Math.abs(Math.sin(rotation[1]) - shot.vy / Math.hypot(shot.vx, shot.vy)) < .001, 'weapon direction equals projectile direction');
            assert(calls.some(c => id === 'licorne' ? c[0] === 'arc' : c[0] === 'fillEllipse' && c[1] === 72 && c[3] === 9), 'reinforced weapon barrel or bow');
            assert(calls.some(c => c[0] === 'fillTriangle' && c[1] === 77 && c[3] > 100 && c[4] === 0), 'flame extends along barrel axis');
            const shapes = transformedFills(calls);
            const barrel = shapes.find(p => p.method === (id === 'licorne' ? 'arc' : 'fillEllipse'));
            const flame = shapes.find(p => p.method === 'fillTriangle');
            assert(barrel && flame);
            const axis = [Math.cos(angle), Math.sin(angle)];
            for (const vector of [[barrel.points[0][0] - 80, barrel.points[0][1] - 300], [flame.points[1][0] - (flame.points[0][0] + flame.points[2][0]) / 2, flame.points[1][1] - (flame.points[0][1] + flame.points[2][1]) / 2]]) {
                assert(Math.abs(vector[0] * axis[1] - vector[1] * axis[0]) < .001 && vector[0] * axis[0] + vector[1] * axis[1] > 0, 'transformed barrel and flame point along actual shot');
            }
            const idle = capture(g => actors.weaponArt(g, id, 80, 300, 1, false, 6, false, angle));
            assert(!idle.some(c => c[0] === 'fillTriangle'), 'no muzzle flame without firing');
        }
    }
    for (const kind of ['armored', 'kamikaze']) {
        const calls = capture(g => actors.enemyArt(g, kind, 50, 200));
        assert(calls.some(c => c[0] === 'fillRect' && c[1] === 63 && c[2] === 223 && c[3] === 15 && c[4] === 8), 'robot chest plate');
        assert(calls.some(c => c[0] === 'lineBetween' && c[1] === 91 && c[2] === 218 && c[3] === 98 && c[4] === 235), 'robot articulated arm');
    }
    const draw = (kind, value = 0, ticks = 0, reduced = false) => capture(g => modules.drawModule(g, { ...moduleAt(kind, 100), value }, x => x * 2, y => y * 2, 2, ticks, reduced));
    for (const kind of ['conveyor', 'rails', 'wind']) {
        assert.notDeepEqual(draw(kind, 0, 0), draw(kind, 0, 12), `${kind} animated geometry`);
        assert.deepEqual(draw(kind, 0, 0, true), draw(kind, 0, 12, true), `${kind} reduced motion`);
    }
    const planks = value => draw('bridge', value).filter(c => c[0] === 'fillRect' && c[4] === 11);
    const intact = planks(0), broken = planks(1); assert.equal(intact.length, 10); assert.equal(broken.length, 10);
    for (let i = 0; i < 10; i++) assert.equal(broken[i][2] - intact[i][2], i > 2 && i < 8 ? 38 + i % 3 * 17 : 0, 'broken planks fall');
    for (const value of [0, 40, 80]) assert(draw('lava', value).some(c => c[0] === 'fillRect' && c[1] === 200 && c[2] === (296 - value) * 2 && c[3] === 192 && c[4] === (24 + value) * 2), 'lava surface and depth follow physical value');
    assert.notDeepEqual(draw('piston', 0, 99), draw('piston', 1, 100), 'piston closes');
    for (const kind of ['gate', 'secret']) assert(draw(kind, 0).length > draw(kind, 30).length, `${kind} opens`);
    assert.notDeepEqual(draw('crate', 0), draw('crate', 48), 'crate moves');
    assert.notDeepEqual(draw('spotlight', 0), draw('spotlight', 1), 'spotlight lights');
    const covered = Array.from({ length: 12 }, (_, i) => ['fillRect', i * 30, 112, 30, 528]);
    assert(decorationMeasure(covered).coverage > .99);
    assert.deepEqual(decorationMeasure([...covered, ['fillRect', 0, 112, 360, 528]]), { coverage: 0, elements: 0 }, 'opaque covering erases prior details');
}

export function startingEnemyChecks(E = Engine, Scene = FerrailleScene) {
    const rows = [];
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    globalThis.document = { querySelector: () => null };
    for (const seed of [28, 1, 2026]) for (let level = 0; level < 30; level++) {
        const scene = new Scene(), e = new E(); scene.engine = e; e.loadLevel(level, seed);
        const s = e.state, calls = [];
        const g = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return g; } });
        scene.graphics = g;
        if (!LEVELS[level].enemies.length) { assert(!s.enemies.some(p => p.opening)); continue; }
        const enemy = s.enemies.find(p => p.x > s.hero.x + 48 && p.x + p.w < 360 / 2.6);
        assert(enemy, `level ${level + 1}: authored enemy in initial viewport`);
        assert.equal(s.enemies.filter(p => p.opening).length, 1);
        scene.draw();
        const top = Math.max(88, s.hero.y - 146);
        assert(calls.some(c => c[0] === 'fillRoundedRect' && c[3] === 39 && Math.abs(c[1] - (enemy.x * 2.6 - 10)) < .001 && Math.abs(c[2] - ((enemy.y - top) * 2.6 + 102)) < .001), 'physical opening enemy drawn');
        const frozen = s.enemies.filter(p => p !== enemy).map(p => ({ p, before: globalThis.structuredClone(p) }));
        const lives = s.lives; let firstShot = 0, visibleShots = 0;
        // Hold the first screen for the AI/render check (vehicle auto-scroll is tested by replays).
        s.vehicle = false;
        for (let tick = 1; tick <= 180; tick++) {
            e.step(DT);
            const shots = s.shots.filter(p => !p.friendly);
            if (!shots.length) continue;
            if (!firstShot) {
                firstShot = tick;
                assert.equal(s.lives, lives, 'time to see and respond before first volley');
                calls.length = 0; scene.draw();
                for (const shot of shots) {
                    const x = (shot.x - scene.rendering.camera) * 2.6 + 3;
                    const y = (shot.y - Math.max(88, s.hero.y - 146)) * 2.6 + 115;
                    assert(x >= 7 && x <= 353 && y >= 119 && y <= 633, 'hostile shot physically in viewport');
                    assert(calls.some(c => c[0] === 'fillCircle' && Math.abs(c[1] - x) < .001 && Math.abs(c[2] - y) < .001 && c[3] === 5), 'hostile shot drawn at physical coordinates');
                    visibleShots++;
                }
            }
        }
        assert(firstShot > 0 && firstShot <= 180, 'initial AI fires within three seconds');
        assert(firstShot >= 90, 'at least 1.5 seconds to react');
        for (const { p, before } of frozen) assert.deepEqual(p, before, 'only opening enemy exempted from introduction freeze');
        const target = new E(); target.loadLevel(level, seed); target.input({ fire: true });
        for (let tick = 0; tick < 120 && target.state.enemies.some(p => p.opening && p.hp > 0); tick++) target.step(DT);
        assert(!target.state.enemies.some(p => p.opening && p.hp > 0), 'initial target can be shot before its volley');
        assert.equal(target.state.lives, lives, 'firing response survives, including authored vehicles');
        rows.push({ level: level + 1, seed, firstShotFrame: firstShot, visibleShots });
        scene.inputs.dispose();
    }
    // An unmarked enemy in an old save must retain the ordinary introduction freeze.
    const old = new E(); old.loadLevel(0, 28);
    const state = globalThis.structuredClone(old.state), ordinary = state.enemies.find(p => p.opening);
    assert(ordinary); delete ordinary.opening;
    old.loadState(state);
    for (let tick = 0; tick < 180; tick++) old.step(DT);
    assert.equal(old.state.enemies.find(p => p.x === ordinary.x)?.clock, 0, 'unmarked saved enemy stays frozen');
    assert(!old.state.shots.some(p => !p.friendly), 'unmarked saved enemy cannot fire in introduction');
    return rows;
}
