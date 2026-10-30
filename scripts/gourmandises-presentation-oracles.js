/* global EventTarget, Event, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEVELS } from '../src/engines/gourmandises/levels.ts';
import { Engine } from '../src/engines/gourmandises/engine.ts';

export function presentationChecks(module) {
    for (const level of LEVELS) {
        const b = module.boardLayout(level.width, level.height);
        assert.ok(b.width >= 360 * .85, 'Largeur utile couverte');
        assert.equal(b.x + b.width / 2, 180);
        assert.equal(b.y + b.height / 2, 394, 'Centrage HUD / outils');
        assert.ok(b.y >= 194 && b.y + b.height <= 594);
    }
    const state = new Engine('arcade').state;
    for (let color = 0; color < 7; color++) {
        state.objectives = [{ kind: 'collect', color, target: 20 }];
        assert.equal(module.presentation(state, null).objectives[0].icon, color);
    }
    for (const [score, stars] of [[0, 0], [1499, 1], [1500, 2], [3000, 3]]) {
        state.score = score;
        assert.equal(module.presentation(state, null).stars, stars);
    }
    state.budget = 28;
    for (const [moves, orange] of [[23, false], [24, true], [28, true]]) {
        state.moves = moves;
        assert.equal(module.presentation(state, null).movesColor === '#ff9c36', orange);
    }
    state.mode = 'discovery';
    assert.equal(module.presentation(state, null).moves, '∞');
    assert.notEqual(module.presentation(state, null).movesColor, '#ff9c36');
    for (const tool of ['hammer', 'rocket', 'rainbow']) {
        for (const count of [0, 1, 3]) {
            state.tools[tool] = count;
            const item = module.presentation(state, tool).tools.find(item => item.tool === tool);
            assert.equal(item.count, count);
            assert.equal(item.disabled, count === 0);
            assert.equal(item.armed, count > 0);
        }
    }
    const drawings = [];
    const scenery = [];
    for (let world = 0; world < 6; world++) {
        const commands = [];
        const context = new Proxy({}, { get(target, key) {
            if (key === 'createLinearGradient') return () => ({ addColorStop: (...args) => commands.push(args) });
            return target[key] ?? ((...args) => commands.push([key, ...args]));
        } });
        module.drawScenery(context, world);
        scenery.push(commands);
        drawings.push(JSON.stringify(commands));
    }
    assert.equal(new Set(drawings).size, 6, 'Six décors distincts');
    assert.equal(scenery[3].filter(c => c[0] === 'quadraticCurveTo' && c[2] === 210).length, 7, 'Sept filets de cascade');
    assert.equal(scenery[3].filter(c => c[0] === 'arc' && c[3] === 9).length, 24, 'Galets de rayon visible');
    assert.equal(scenery[4].filter(c => c[0] === 'moveTo' && [420, 450, 480, 510].includes(c[2])).length, 16, 'Quatre étages pour chaque sapin');
    assert.equal(scenery[5].filter(c => c[0] === 'ellipse' && c[3] === 8 * .28 && c[4] === 8 * .15).length, 9, 'Neuf cristaux visibles');
    state.objectives = [{ kind: 'drop', target: 3 }];
    assert.equal(module.presentation(state, null).objectives[0].icon, 'drop');
    const iceDrawings = [];
    for (const layers of [1, 2]) {
        const commands = [];
        const context = new Proxy({}, { get(target, key) {
            return target[key] ?? ((...args) => commands.push([key, ...args]));
        } });
        module.drawIce(context, 0, 0, 40, layers);
        iceDrawings.push(JSON.stringify(commands));
        const lines = commands.filter(c => c[0] === 'lineTo');
        assert.deepEqual(lines, layers === 2 ? [['lineTo', 26, 7], ['lineTo', 28, 11]]
            : [['lineTo', 20, 16], ['lineTo', 14, 24], ['lineTo', 26, 36], ['lineTo', 36, 12]],
        'Glace double pleine, simple craquelée');
    }
    assert.notEqual(...iceDrawings, 'Glace pleine et glace craquelée distinctes');
    assert.equal(module.WORLDS.length, 15);
}

/** Minimal event ports; create() installs the production listeners and tool renderer. */
export function sceneListeners(module) {
    const names = ['document', 'location', 'matchMedia', 'window'];
    const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
    const commands = [];
    const context = new Proxy({}, { get(target, key) {
        if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
        return target[key] ?? ((...args) => commands.push([key, ...args]));
    } });
    class Element extends EventTarget {
        style = {};
        children = [];
        attributes = {};
        classList = { add() {}, remove() {}, contains() { return false; } };
        isConnected = true;
        setAttribute(name, value) { this.attributes[name] = value; }
        getAttribute(name) { return this.attributes[name]; }
        append(...children) { this.children.push(...children); }
        replaceChildren(...children) { this.children = children; }
        querySelector(selector) { return this.children.find(c => `.${c.className}` === selector) ?? null; }
        getContext() { return context; }
        click() { this.dispatchEvent(new Event('click')); }
        remove() {}
    }
    const elements = new Map();
    const created = [];
    const doc = new Element();
    doc.body = new Element();
    doc.createElement = () => {
        const element = new Element();
        created.push(element);
        return element;
    };
    doc.querySelector = selector => {
        const element = created.find(item => `#${item.id}` === selector);
        if (element) return element;
        if (!elements.has(selector)) elements.set(selector, new Element());
        return elements.get(selector);
    };
    Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
    Object.defineProperty(globalThis, 'location', { configurable: true, value: { search: '?test=1' } });
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
    const pointerHandlers = new Map();
    let scene;
    try {
        scene = new module.GourmandisesScene();
        scene.add = { graphics: () => ({ clear() {} }), image: () => ({ setOrigin() {} }),
            text: () => ({ setVisible() {}, setText() {} }) };
        scene.textures = { createCanvas: () => ({ context, refresh() {} }), remove() {} };
        scene.children = { bringToTop() {} };
        scene.input = { on: (event, listener) => pointerHandlers.set(event, listener) };
        scene.events = { once() {} };
        scene.game = { canvas: new Element() };
        scene.hero.draw = () => {};
        scene.create();
        // Ready gate is real: click its actual listener before keyboard input.
        doc.querySelector('#resume').click();
        // Reproduce a slow rendering host: the visual animation is still running.
        scene.animation = 280;
        const key = code => {
            const event = new Event('keydown', { cancelable: true });
            Object.assign(event, { code, repeat: false });
            doc.dispatchEvent(event);
        };
        for (const [code, expected] of [['Digit1', 'hammer'], ['Digit2', 'rocket'], ['Digit3', 'rainbow'], ['Escape', null]]) {
            scene.animation = 280;
            key(code);
            assert.equal(scene.tool, expected, `Outil armé : ${code}`);
            for (const tool of ['hammer', 'rocket', 'rainbow']) {
                assert.equal(doc.querySelector(`#gourmandises-${tool}`).getAttribute('aria-pressed'), String(tool === expected), `${code}/${tool}`);
            }
        }
        scene.engine.state.tools.hammer = 0;
        key('Digit1');
        assert.equal(scene.tool, null, 'Impossible d’armer un outil épuisé');
        const hammer = doc.querySelector('#gourmandises-hammer');
        assert.equal(hammer.disabled, true);
        assert.equal(hammer.querySelector('.tool-count').textContent, '0');
        for (const tool of ['rocket', 'rainbow']) {
            assert.equal(doc.querySelector(`#gourmandises-${tool}`).querySelector('.tool-count').textContent,
                String(scene.engine.state.tools[tool]));
        }
        const hook = globalThis.window.__GOURMANDISES_TEST__;
        hook.loadLevel(119, 8);
        assert.equal(hook.read().objectives.length, 2);
        assert.ok(hook.read().cells.some(cell => cell.ice === 2));
        for (const gesture of ['drag', 'two taps']) {
            const pair = hook.scenario('drop');
            assert.ok(pair, 'Sortie atteignable par permutations ordinaires');
            const before = hook.read();
            const b = hook.board();
            const point = index => ({ x: b.x + (index % before.width + .5) * b.unit,
                y: b.y + (Math.floor(index / before.width) + .5) * b.unit });
            const down = pointerHandlers.get('pointerdown');
            const up = pointerHandlers.get('pointerup');
            if (gesture === 'drag') {
                down(point(pair[0]));
                up(point(pair[1]));
            } else {
                for (const index of pair) {
                    down(point(index));
                    up(point(index));
                }
            }
            assert.ok(hook.read().dropped > (before.dropped ?? 0), gesture);
            assert.equal(hook.read().moves, before.moves + 1);
            assert.ok(scene.engine.events.some(event => event.type === 'drop'));
        }
    } finally {
        scene?.inputs.dispose();
        names.forEach((name, i) => {
            if (previous[i]) Object.defineProperty(globalThis, name, previous[i]);
            else Reflect.deleteProperty(globalThis, name);
        });
    }
}

/** Resolve the relevant authored lengths, including the shared mobile override.
 * This is a box calculation, not a substitute for the host's layout E2E. */
export function toolBoxes(css = readFileSync(new URL('../src/games/gourmandises/style.css', import.meta.url), 'utf8')) {
    const shared = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    assert.match(shared, /\*\s*\{\s*box-sizing: border-box/);
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
    const declarations = selector => Object.fromEntries(rules.filter(r => r[1].trim() === selector)
        .flatMap(r => r[2].split(';').filter(d => d.includes(':')).map(d => d.trim().split(/:\s*/))));
    const button = declarations('body.gourmandises #touch-controls button');
    const canvas = declarations('body.gourmandises #touch-controls button canvas');
    const badge = declarations('body.gourmandises .tool-count');
    const px = value => Number.parseFloat(value);
    for (const [width, height] of [[390, 844], [360, 640], [390, 600]]) {
        for (const tool of ['hammer', 'rocket', 'rainbow']) {
            // Shared body.playing selector wins on mobile; its 56px box has 3px borders.
            assert.match(shared, /body.playing #touch-controls button \{ width: 56px; height: 56px;[^}]*font-size: 16px/);
            assert.equal(button['font-size'], '16px');
            const outer = 56;
            const inner = outer - 2 * px(button.border);
            const iconWidth = canvas.width.endsWith('%') ? inner * px(canvas.width) / 100 : px(canvas.width);
            const iconHeight = canvas.height.endsWith('%') ? inner * px(canvas.height) / 100 : px(canvas.height);
            assert.equal(canvas.display, 'block', 'Aucune hauteur de ligne sous le canvas');
            assert.ok(iconWidth <= inner && iconHeight <= inner, `${tool} ${width}×${height}: pictogramme contenu`);
            assert.equal(badge.position, 'absolute');
            assert.ok(px(badge.right) >= 0 && px(badge.bottom) >= 0, 'Pastille intérieure');
            assert.ok(px(badge['min-width']) <= inner && px(badge.height) <= inner);
            const lineHeight = px(badge.font.split('/')[1]);
            assert.ok(lineHeight <= px(badge.height) - 2 * px(badge.border), 'Ligne du compteur contenue');
            assert.ok(outer >= 56 && 3 * outer + 2 * 8 <= width - 32, 'Surface tactile et rangée');
        }
    }
}
