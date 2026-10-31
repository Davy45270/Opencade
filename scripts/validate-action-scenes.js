/* global console, performance, EventTarget, Event, process, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { setMaxListeners } from 'node:events';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
registerHooks({ resolve(name, context, next) {
    if (name === 'phaser') return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`export default { Scene: class {}, Math: { Clamp: (v,a,b) => Math.max(a,Math.min(b,v)) }, Display: { Color: { ValueToColor: v=>({r:v>>16&255,g:v>>8&255,b:v&255}), Interpolate:{ColorWithColor:(a)=>a}, GetColor:(r,g,b)=>(r<<16)|(g<<8)|b } } };`) };
    if (/\/shell\/services(?:\.ts)?$/.test(name)) return { shortCircuit: true, url: 'data:text/javascript,export const sound={playEffect(){},stop(){}};export const device={setFinished(){}};' };
    return next(name, context);
}, load(url, context, next) {
    const keyboardGame = process.argv.find(arg => arg.startsWith('--mutant-c='))?.split('=')[1];
    const before = keyboardGame && url.endsWith(`/games/${keyboardGame}/scene.ts`)
        ? "if (e.code === 'KeyC' && !e.repeat) this.special();"
        : process.argv.includes('--mutant-hud') && url.endsWith('/games/essaim/scene.ts')
            ? "s.specialUsed ? 'UTILISÉ' : 'PRÊT'"
            : process.argv.includes('--mutant-duration') && url.endsWith('/engines/ferraille/engine.ts')
                ? 's.specialCooldown = 600; s.specialTicks = 18;' : undefined;
    if (before) {
        const after = before.includes('KeyC') ? "if (e.code === 'KeyC' && !e.repeat) void 0;"
            : before.includes('UTILISÉ') ? "s.specialUsed ? 'PRÊT' : 'PRÊT'" : 's.specialCooldown = 600; s.specialTicks = 1;';
        const source = readFileSync(new URL(url), 'utf8'); assert.equal(source.split(before).length, 2);
        return { shortCircuit: true, format: 'module', source: transpile(source.replace(before, after)) };
    }
    if (process.argv.includes('--mutant-character') && url.endsWith('/characters/action-phaser.ts')) {
        const source = readFileSync(new URL(url), 'utf8').replace('readonly id: CharacterId = selectedCharacter();', "readonly id: CharacterId = 'panda';");
        return { shortCircuit: true, format: 'module', source: transpile(source) };
    }
    return next(url, context);
} });
const css = readFileSync('src/style.css', 'utf8');
const shipHeight = /body\.essaim #game \{ height: min\((\d+)px, calc\(100svh - (\d+)px\)\); \}/.exec(css);
assert(shipHeight);
assert(Math.min(Number(shipHeight[1]), 901 - Number(shipHeight[2])) + 267 <= 901, 'desktop two-thumb controls fit without scrolling');
assert.match(css, /body\.playing\.essaim #touch-controls \{ height: 64px; min-height: 64px; flex-basis: 64px;/);
for (const rule of css.matchAll(/([^{}]*#touch-controls[^{}]*special[^{}]*)\{([^{}]*)\}/g)) {
    // Lane A games only (Ferraille, Briqueterie, Essaim); other games own their special-button rules.
    if (!/(ferraille|briqueterie|essaim)-special/.test(rule[1])) continue;
    const font = /font-size: (\d+)px/.exec(rule[2]); if (font) assert.equal(Number(font[1]), 16, rule[1]);
}
const { selectCharacter } = await import('../src/characters/selection.ts');
const { ids } = await import('../src/characters/model.ts');
const { bindSessionUpdate } = await import('../src/shell/scene-update.ts');
const { PlaySession } = await import('../src/shell/pause.ts');
const { brickView } = await import('../src/games/briqueterie/presentation.ts');
const { levelCatalogue } = await import('../src/content/level-catalogue.ts');
let elements = new Map();
class Element extends EventTarget {
    style = {}; children = []; classList = { add() {}, remove() {}, contains() { return false; } }; textContent = '';
    constructor() { super(); setMaxListeners(80, this); }
    setAttribute() {} setPointerCapture() {} remove() {} matches() { return false; }
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 360, height: 640 }; }
    append(...items) { for (const item of items) { this.children.push(item); if (item.id) elements.set('#' + item.id, item); if (item.className?.startsWith('touch-slot')) elements.set('#touch-controls .' + item.className.split(' ')[1], item); } }
    replaceChildren() { this.children = []; }
}
for (const game of ['ferraille', 'briqueterie', 'essaim']) for (const id of ids) {
    const start = performance.now(); elements = new Map();
    for (const key of ['touch-controls', 'play-area', 'game', 'status', 'levels', 'restart', 'next-level', 'retry-level', 'replay-level']) elements.set('#' + key, new Element());
    const doc = new Element(); doc.body = new Element(); doc.querySelector = key => elements.get(key) ?? null; doc.createElement = () => new Element(); doc.createTextNode = () => new Element();
    globalThis.document = doc; globalThis.window = new Element(); globalThis.location = { search: '?test=1' };
    globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: false }); globalThis.window.matchMedia = globalThis.matchMedia;
    const platform = new EventTarget(); globalThis.addEventListener = platform.addEventListener.bind(platform); globalThis.removeEventListener = platform.removeEventListener.bind(platform);
    selectCharacter(id, undefined);
    const module = await import(`../src/games/${game}/scene.ts`), Scene = module[`${game[0].toUpperCase()}${game.slice(1)}Scene`];
    const session = new PlaySession(true); session.send('start'); const scene = new Scene(session);
    const textures = new Set(), images = [], cleanup = new Map(); let generations = 0, commands = 0; const calls = [];
    const graphics = new Proxy({}, { get: (_, method) => (...args) => { commands++; calls.push([method, ...args]); if (method === 'generateTexture') { assert(!textures.has(args[0])); textures.add(args[0]); generations++; } return graphics; } });
    const image = () => {
        const object = { texture: { key: '' }, visible: true, destroyed: false, setPosition(x, y) { this.x = x; this.y = y; return this; }, setDisplaySize(w, h) { this.w = w; this.h = h; return this; }, setAlpha(alpha) { this.alpha = alpha; return this; }, setDepth(depth) { this.depth = depth; return this; }, setRotation(rotation) { this.rotation = rotation; return this; }, setTexture(key) { this.texture.key = key; return this; }, setVisible(value) { this.visible = value; return this; }, destroy() { this.destroyed = true; } };
        const proxy = new Proxy(object, { get: (target, key) => target[key] ?? (() => proxy) }); images.push(proxy); return proxy;
    };
    scene.add = { graphics: () => graphics, image, text: () => { const t = { text: '', setText(v) { this.text = v; return this; }, setOrigin() { return this; }, setDepth() { return this; } }; return t; } };
    scene.make = { graphics: () => graphics }; scene.textures = { exists: key => textures.has(key) }; scene.events = { once: (name, callback) => cleanup.set(name, callback) };
    let refreshes = 0; scene.scale = { refresh() { refreshes++; } }; scene.game = { canvas: new Element() }; scene.cameras = { main: { shake() {}, shakeEffect: { reset() {} } } };
    // Inspect one real image at a time; retaining whole-scene histories creates
    // avoidable GC stalls when campaign validators run in sibling workers.
    const originalDraw = scene.draw.bind(scene);
    scene.draw = (...args) => { calls.length = 0; return originalDraw(...args); };
    scene.create();
    if (game === 'essaim') {
        const special = module.essaimButtons.find(b => b.id === 'essaim-special');
        assert.equal(special.ariaLabel, 'Bouclier');
        assert.equal(special.label, 'Écu', 'short visible shield name');
        assert.equal(elements.get('#essaim-special').textContent, 'Écu', 'actual mounted shield label');
        assert.equal(special.size, 56);
        const specialRule = [...css.matchAll(/([^{}]*#touch-controls[^{}]*special[^{}]*)\{([^{}]*)\}/g)].find(rule => rule[1].includes('essaim-special'));
        assert(specialRule);
        assert.match(specialRule[2], /font-size: 16px;/);
        assert.match(specialRule[2], /padding: 2px;/);
        assert.match(specialRule[2], /width: 56px;/);
        // Conservative Latin glyph budget: one full em per glyph, with padding.
        // Host M02b measured Bouclier at 58 > 56; keep 16px and shorten the label.
        assert([...special.label].length * 16 + 4 <= 56, 'shield text fits without clipping');
        const buttons = module.essaimButtons;
        const lane = side => buttons.filter(b => b.placement === side).reduce((sum, b) => sum + b.size, 0) + 4;
        assert(lane('left') + lane('right') + 4 <= 320, 'portrait thumb row fits narrow field');
        assert(Math.max(...buttons.map(b => b.size)) <= 64, 'row at most 64px high');
        assert.match(css, /body\.playing\.essaim #touch-controls \.touch-slot \{ position: absolute; bottom: 8px; width: 120px;/);
        assert(56 + 56 + 4 <= 120, 'landscape lane fits');
        assert(72 + 56 + 4 > 120, '72px shield would overflow landscape lane');
        assert.match(css, /body\.playing\.essaim #play-area \{ margin: 0 124px;/);
        assert(120 < 124, 'landscape controls remain outside field and ship');
        assert.match(css, /body\.playing #touch-controls \{ display: flex; height: 64px; min-height: 64px; flex: 0 0 64px;/);
    }
    const initial = generations, capacity = images.length;
    const hook = globalThis.window[`__${game.toUpperCase()}_TEST__`]; assert(hook);
    for (const entry of levelCatalogue.filter(e => e.game === game)) {
        hook.loadLevel(entry.index, 28);
        if (game === 'ferraille') { hook.scenario('showcase'); hook.inspect({ weapon: 'flame', ammo: 180 }); }
        if (game === 'briqueterie') hook.power('wide');
        if (game === 'essaim' && entry.code === 'G03') hook.lastWave();
        const event = new Event('keydown', { cancelable: true }); Object.assign(event, { code: game === 'ferraille' ? 'KeyX' : 'Space', repeat: false }); doc.dispatchEvent(event);
        hook.advance(200);
        assert.equal(hook.read().level, entry.index); assert.equal(hook.read().status, 'playing');
        const art = game === 'essaim' ? hook.art().livery : hook.art();
        assert.equal(art.character, id); assert(art.used > 1 && art.used <= art.capacity);
        assert.equal(generations, initial); assert.equal(images.length, capacity);
    }
    bindSessionUpdate(scene, session);
    hook.loadLevel(0, 28);
    scene.hero.move(1, true); scene.hero.impact = 300;
    session.send('toggle');
    assert.equal(hook.read().character.expression, 'dodo', 'pause commits before first read');
    assert.equal(hook.read().character.animation, 'repos');
    const paused = hook.read(); hook.advance(1000); scene.update(0, 1000);
    assert.deepEqual(hook.read(), paused, 'manual and realtime pause freeze the complete snapshot');
    session.send('start');
    if (game === 'essaim') {
        const checkbox = new Element(); checkbox.matches = selector => selector === 'input';
        const down = new Event('keydown', { bubbles: true, cancelable: true });
        Object.assign(down, { code: 'ArrowRight', repeat: false });
        Object.defineProperty(down, 'target', { value: checkbox }); doc.dispatchEvent(down);
        hook.advance(200); assert(hook.read().cannon > 215, 'keyboard after checkbox focus');
        const up = new Event('keyup'); Object.assign(up, { code: 'ArrowRight' }); doc.dispatchEvent(up);
    }
    if (game === 'briqueterie') {
        hook.loadLevel(0, 28); scene.engine.move(260);
        const down = new Event('pointerdown', { cancelable: true }); Object.assign(down, { pointerId: 2, pointerType: 'touch' });
        elements.get('#briqueterie-left').dispatchEvent(down);
        const refreshBefore = refreshes;
        hook.advance(200); assert(hook.read().paddle < 240, 'K02 held touch moves in simulation time');
        assert.equal(refreshes, refreshBefore, 'K02 simulation does not repeatedly resize the field');
        const up = new Event('pointerup'); Object.assign(up, { pointerId: 2 }); elements.get('#briqueterie-left').dispatchEvent(up);
    }
    if (game === 'ferraille') {
        hook.loadLevel(0, 28);
        const down = new Event('pointerdown', { cancelable: true }); Object.assign(down, { pointerId: 3, pointerType: 'touch' });
        elements.get('#ferraille-special').dispatchEvent(down);
        assert.equal(hook.read().specialCooldown, 600, 'real touch reaches engine special');
        const up = new Event('pointerup'); Object.assign(up, { pointerId: 3 }); elements.get('#ferraille-special').dispatchEvent(up);
    }
    hook.loadLevel(0, 28);
    // Inspect real draw calls and real engine transitions, with normal motion enabled.
    const visible = fragment => images.filter(i => i.visible && (fragment.startsWith('emblem-') && fragment !== 'emblem-' ? i.texture.key.endsWith(fragment) : i.texture.key.includes(fragment)));
    const one = fragment => { const list = visible(fragment); assert.equal(list.length, 1, fragment); return list[0]; };
    const geometry = (sprite, x, y, w, h, alpha = 1, depth = 2) => {
        assert.equal(sprite.x, x); assert.equal(sprite.y, y); assert.equal(sprite.w, w); assert.equal(sprite.h, h);
        assert.equal(sprite.alpha, alpha); assert.equal(sprite.depth, depth);
    };
    if (game === 'ferraille') {
        hook.loadLevel(13, 28);
        const e = scene.engine;
        e.input({ x: -1, jump: true, fire: true }); e.step(1000 / 60); scene.draw();
        assert(!e.state.grounded); assert.equal(e.state.facing, -1);
        const fighter = one('fighter-' + id + '-saut-gauche');
        const h = e.state.hero;
        geometry(fighter, (h.x + h.w / 2 - scene.rendering.camera) * 2.6, (h.y + h.h - Math.max(88, h.y - 146)) * 2.6 + 112 - 48, 128, 128);
        assert(e.state.shots.some(p => p.friendly && p.vx < 0));
        // Land on the starting floor through physics, then crouch and fire left.
        e.input({ x: 0, jump: false, fire: false }); e.step(800);
        e.input({ x: -1, y: 1, fire: true }); e.step(1000 / 60); scene.draw();
        assert(e.state.crouched); one('fighter-' + id + '-accroupi-gauche');
        e.input({ x: 1, y: 0, jump: true }); e.step(1000 / 60); scene.draw(); one('fighter-' + id + '-saut');
        for (const [input, view] of [
            [{ x: 0, y: 0, fire: false }, 'droite'], [{ x: 0, y: -1 }, 'dos'],
            [{ x: 1, y: 0, fire: false }, 'marche'], [{ x: 1, fire: true }, 'tir'],
            [{ x: -1, fire: true }, 'gauche'], [{ x: 1, y: 1, fire: false }, 'accroupi'],
        ]) {
            e.loadLevel(0, 28); e.input(input); e.step(1000 / 60); scene.draw();
            one('fighter-' + id + '-' + view);
        }
        hook.loadLevel(13, 28);
        // Three opaque scenery planes move independently.
        e.state.hero.x = 200; calls.length = 0; scene.draw();
        const layersBefore = scene.rendering.layers.map(l => l.x);
        assert.deepEqual(scene.rendering.layers.map(l => l.factor), [.15, .3, .55]);
        const sceneryPlanes = () => [1,2,3].map(part => visible(`ferraille-118-jungle-${part}`).sort((a,b)=>a.x-b.x)[0].x);
        const before = sceneryPlanes();
        e.input({ x: 1 }); e.step(100); calls.length = 0; scene.draw();
        const after = sceneryPlanes();
        assert(!calls.some(c=>c[0]==='fillRect'&&c[3]===18&&c[4]===456),'static trees are never redrawn');
        const shifts = scene.rendering.layers.map((l, i) => l.x - layersBefore[i]);
        assert(shifts.every(x => x !== 0)); assert.equal(new Set(shifts).size, 3);
        assert.equal(before.length, 3); assert.equal(after.length, 3);
        assert.equal(new Set([0, 1, 2].map(i => Math.round((after[i] - before[i]) * 1e6))).size, 3);
    }
    if (game === 'briqueterie') {
        for (const level of [18, 24, 29]) {
            hook.loadLevel(level, 28); hook.power('wide'); hook.advance(1000);
            const s = scene.engine.state; assert(s.wideUntil > 0); assert(s.width <= 110); assert.equal(s.balls.length, 1);
            const b = s.balls[0]; geometry(one('-ball-'), b.x, brickView(level).y(b.y), 16, 16);
            const ballMotifs = kind => visible('emblem-' + kind).filter(i => i.w === 18 || i.alpha < .4);
            const motif = ballMotifs(scene.art.theme.special); assert.equal(motif.length, 4);
            geometry(motif.at(-1), b.x, brickView(level).y(b.y), 18, 18);
            geometry(one('-paddles-'), s.paddle, 584, s.width * 1.08, 72);
            // Expiry comes from the engine timer, and changes the drawn motif.
            s.ready = true; s.bonuses = []; scene.engine.step(10000); scene.draw(); assert.equal(s.wideUntil, 0);
            const normal = { panda: 'bao', pandaroux: 'feuille', dragon: 'feu', singe: 'coeur', licorne: 'arc-en-ciel' }[id];
            assert.equal(ballMotifs(normal).length, 4);
            if (normal !== scene.art.theme.special) assert.equal(ballMotifs(scene.art.theme.special).length, 0);
        }
        hook.loadLevel(0, 28);
        for (const [left, right, view] of [[true, false, 'gauche'], [false, true, 'droite'], [false, false, 'face']]) {
            scene.left = left; scene.right = right; scene.tick(16); one('-paddles-' + id + '-' + view);
        }
        const planes = () => [1,2,3].map(part => visible(`brick-118-${id}-0-${part}`).sort((a,b)=>a.x-b.x)[0]);
        calls.length = 0; scene.draw(); assert(planes().every(Boolean));
        const first = planes().map(p=>p.x);
        hook.advance(100); calls.length = 0; scene.draw(); assert(planes().every(Boolean));
        const next=planes().map(p=>p.x);
        assert(next.every((x,i)=>x!==first[i]));
        assert.equal(new Set(next.map((x,i)=>Math.round((x-first[i])*1e6))).size,3,'three cached planes move independently');
        assert(!calls.some(c=>c[0]==='fillStyle'&&[.05,.085,.12000000000000001].includes(c[2])),'static backdrop is never redrawn');
    }
    if (game === 'essaim') {
        hook.loadLevel(14, 28); hook.lastWave();
        const e = scene.engine, art = scene.art;
        const hull = () => { calls.length = 0; art.boss(e.state); return calls.slice(); };
        const phase1 = hull(); assert.equal(e.state.boss.phase, 1);
        assert(phase1.some(c => c[0] === 'fillStyle' && c[1] === 0x8e7bd2));
        // Real collision and damage: a hostile projectile triggers the rear view.
        e.state.shots.push({ owner: 'enemy', x: e.state.cannon, y: 540, vy: 160 });
        e.step(1000 / 60); art.update(e.state, 16, e.events); scene.draw();
        assert(e.state.invulnerable > 0 && e.state.invulnerable <= 1000);
        geometry(one('-ships-' + id + '-dos'), e.state.cannon, 550, 84, 84);
        e.step(1100); art.update(e.state, 1100, []); scene.draw();
        assert.equal(e.state.invulnerable, 0); one('-ships-' + id + '-face');
        e.step((75 - e.state.ticks) * (1000 / 60));
        const aimed = e.state.shots.filter(p => p.owner === 'enemy'); assert.equal(aimed.length, 1);
        assert.equal(aimed[0].vx, (e.state.cannon - e.state.boss.x) * .5);
        // Advance the guardian through its exposure window, shooting via collisions.
        let phaseEvent = false;
        for (let tick = 0; tick < 240 && e.state.boss.phase === 1; tick++) {
            const b = e.state.boss;
            if (b.exposed) e.state.shots.push({ owner: 'player', x: b.x, y: b.y + 25, vy: -600 });
            e.step(1000 / 60); phaseEvent ||= e.events.includes('phase');
        }
        assert(phaseEvent); assert.equal(e.state.boss.phase, 2); assert(e.state.boss.hp > 0);
        assert.notDeepEqual(hull(), phase1);
        const changed = hull(); assert(changed.some(c => c[0] === 'fillStyle' && c[1] === 0xe86998));
        // Phase 1 aims one shot every 75 ticks; phase 2 fires a four-shot fan every 45.
        e.state.shots = []; e.state.ticks = 44; e.step(1000 / 60);
        assert.deepEqual(e.state.shots.filter(p => p.owner === 'enemy').map(p => p.vx), [-100, -35, 35, 100]);
        e.state.invulnerable = 0; e.move(-1); e.step(1000 / 60); art.update(e.state, 100, []); scene.draw(); one('-ships-' + id + '-gauche');
        e.move(1); e.step(1000 / 60); art.update(e.state, 100, []); scene.draw(); one('-ships-' + id + '-droite');
        const stars = () => calls.filter(c => c[0] === 'fillCircle' && [0.5, 0.85, 1.2].includes(c[3]));
        calls.length = 0; scene.draw(); const first = stars(); assert.equal(first.length, 72);
        art.update(e.state, 100, []); calls.length = 0; scene.draw(); const next = stars(); assert.equal(next.length, 72);
        for (const i of [0, 24, 48]) assert(next[i][2] > first[i][2]);
        assert.equal(new Set([0, 24, 48].map(i => Math.round((next[i][2] - first[i][2]) * 100))).size, 3);
    }
    hook.loadLevel(0, 28);
    assert.equal(hook.read().character.id, id, 'P-01 selected identity in live scene');
    let effectCalls = [];
    const originalEffect = scene.hero.drawEffect.bind(scene.hero);
    scene.hero.drawEffect = (...args) => {
        const begin = calls.length; originalEffect(...args); effectCalls = calls.slice(begin);
    };
    const keyC = repeat => { const event = new Event('keydown', { cancelable: true }); Object.assign(event, { code: 'KeyC', repeat }); doc.dispatchEvent(event); };
    const hud = () => scene.hud.text;
    assert(hud().includes(game === 'ferraille' ? 'Super-tir PRÊT' : game === 'essaim' ? 'Bouclier PRÊT' : 'Balle forte PRÊTE'));
    keyC(true); assert.equal(scene.engine.state.specialUsed, undefined); assert.equal(scene.engine.state.specialCooldown, undefined);
    keyC(false);
    assert.equal(game === 'ferraille' ? scene.engine.state.specialCooldown : scene.engine.state.specialUsed, game === 'ferraille' ? 600 : true, 'C activates actual engine special');
    assert.equal(scene.hero.animation, 'special'); assert(effectCalls.some(c => c[0] === 'fillPoints'), 'special actually draws chosen geometry');
    const { drawList } = await import('../src/characters/model.ts');
    const { renderCharacter } = await import('../src/characters/phaser.ts');
    const expected = [], port = new Proxy({}, { get: (_, method) => (...args) => { expected.push([method, ...args]); return port; } });
    const e = scene.engine, s = e.state;
    const size = game === 'ferraille' ? 95 : game === 'briqueterie' ? 65 : 92;
    const camera = game === 'ferraille' ? scene.rendering.camera : 0;
    const x = game === 'ferraille' ? (s.hero.x + s.hero.w / 2 + s.facing * 35 - camera) * 2.6 : game === 'briqueterie' ? s.balls[0].x : s.cannon;
    const y = game === 'ferraille' ? (s.hero.y + s.hero.h / 2 - Math.max(88, s.hero.y - 146)) * 2.6 + 112 : game === 'briqueterie' ? brickView(e.level).y(s.balls[0].y) : 552;
    renderCharacter(port, drawList(id, 'face', 'joie', 'special', scene.hero.time).filter(p => p.effect), x - size / 2, y - size / 2, size);
    assert.deepEqual(effectCalls, expected, 'P-01 chosen effect centered on actual hero/ball/discharge');
    // Check the drawn effect throughout its engine lifetime, not just activation.
    const drawsEffect = () => { effectCalls = []; scene.draw(); return effectCalls.some(c => c[0] === 'fillPoints'); };
    if (game === 'ferraille') {
        assert(hud().includes('Super-tir 10s'), 'Super-tir recharge 10s');
        e.state.enemies = []; e.state.boss = null; e.state.shots = []; e.state.bonuses = [];
        e.step(1000 / 60 * 17); assert.equal(s.specialTicks, 1); assert(drawsEffect(), 'Super-tir visible on tick 17');
        e.step(1000 / 60); assert.equal(s.specialTicks, 0); assert(!drawsEffect(), 'Super-tir expired on tick 18');
        e.step(1000 / 60 * 42); scene.draw(); assert(hud().includes('Super-tir 9s'), 'Super-tir recharge 9s');
        e.step(1000 / 60 * 540); scene.draw(); assert(hud().includes('Super-tir PRÊT'), 'Super-tir PRÊT après 600 ticks');
    }
    if (game === 'essaim') {
        e.state.enemyTimer = 100000; e.state.diveTimer = 100000; e.state.shots = [];
        e.step(1000 / 60 * 119); assert.equal(s.specialTicks, 1); assert(drawsEffect(), 'shield visible until tick 119');
        e.step(1000 / 60); assert(!drawsEffect()); assert(hud().includes('Bouclier UTILISÉ'), 'Bouclier UTILISÉ après expiration');
        e.state.enemies = []; e.step(1000 / 60); scene.draw(); assert(hud().includes('Bouclier PRÊT'), 'new wave ready');
    }
    if (game === 'essaim') for (const special of [false, true]) {
        hook.scenario('special');
        if (special) scene.special();
        for (let frame = 0; frame < 180 && scene.engine.status === 'playing'; frame++) scene.update(0, 1000 / 60);
        assert.equal(scene.engine.status, special ? 'won' : 'lost', 'same realtime scenario outcome');
    }
    // Every projectile has three visible, fading trail images ahead of its head in the pool.
    const painter = game === 'essaim' ? scene.art.paint : scene.art;
    painter.begin(); painter.projectile(180, 300, -600, 0, 20, false, false);
    const trail = visible('emblem-'); assert.equal(trail.length, 4);
    const primary = { panda: 'bambou', pandaroux: 'feuille', dragon: 'feu', singe: 'banane', licorne: 'arc-en-ciel' }[id];
    assert(trail.every(i => i.texture.key.endsWith('emblem-' + primary)));
    [3, 2, 1, 0].forEach((i, index) => geometry(trail[index], 180 + i * 9, 300, 20 * (1 - i * .16), 20 * (1 - i * .16), i ? .42 - i * .08 : 1));
    painter.begin(); painter.projectile(180, 300, -600, 0, 20, false, true); assert.equal(visible('emblem-').length, 1);
    assert(commands > 100); cleanup.get('shutdown')(); assert.equal(globalThis.window[`__${game.toUpperCase()}_TEST__`], undefined);
    assert(images.filter(i => i.destroyed).length >= (game === 'ferraille' ? 224 : game === 'briqueterie' ? 160 : 256));
    const ms = performance.now() - start;
    console.log(`${game}/${id}: real scenes, atlas stable, catalogue drawn, cleanup (${ms.toFixed(1)} ms)`);
}
