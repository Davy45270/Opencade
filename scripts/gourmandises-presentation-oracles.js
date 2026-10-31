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
    for (let world = 0; world < 9; world++) {
        const commands = [];
        const context = new Proxy({}, { get(target, key) {
            if (key === 'createLinearGradient') return () => ({ addColorStop: (...args) => commands.push(args) });
            return target[key] ?? ((...args) => commands.push([key, ...args]));
        } });
        module.drawScenery(context, world);
        scenery.push(commands);
        drawings.push(JSON.stringify(commands));
    }
    assert.equal(new Set(drawings).size, 9, 'Neuf décors distincts');
    assert.equal(scenery[3].filter(c => c[0] === 'quadraticCurveTo' && c[2] === 210).length, 7, 'Sept filets de cascade');
    assert.equal(scenery[3].filter(c => c[0] === 'arc' && c[3] === 9).length, 24, 'Galets de rayon visible');
    assert.equal(scenery[4].filter(c => c[0] === 'moveTo' && [420, 450, 480, 510].includes(c[2])).length, 16, 'Quatre étages pour chaque sapin');
    assert.equal(scenery[5].filter(c => c[0] === 'ellipse' && c[3] === 3 * .28 && c[4] === 3 * .15).length, 9, 'Neuf cristaux visibles');
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
    assert.equal(scenery[6].filter(c => c[0] === 'quadraticCurveTo').length, 3, 'Fontaine chocolat');
    assert.ok(scenery[6].some(c => JSON.stringify(c) === JSON.stringify(['fillRect', 0, 170, 360, 120])), 'Mur du château visible');
    const hedge = [];
    const hedgeContext = new Proxy({}, { get(target, key) {
        if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
        return target[key] ?? ((...args) => hedge.push([key, ...args]));
    } });
    module.drawHedge(hedgeContext, 10, 20, 40);
    assert.ok(hedge.some(c => c[0] === 'translate' && c[1] === 30 && c[2] === 40), 'Fleur au centre de la haie');
    assert.equal(hedge.filter(c => c[0] === 'arc' && c[3] === 40 * .18 * .5).length, 5, 'Cinq pétales visibles');
    assert.ok(scenery[7].filter(c => c[0] === 'ellipse').length >= 30, 'Prairie fleurie');
    assert.equal(scenery[8].filter(c => c[0] === 'rotate').length, 0, 'Aucun badge hors plateau');
    const belt = phase => {
        const commands = [];
        const context = new Proxy({}, { get: (target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : target[key] ?? ((...args) => commands.push([key, ...args])) });
        module.drawBelt(context, 0, 0, 40, 'right', phase);
        return commands;
    };
    assert.notDeepEqual(belt(0), belt(.5), 'Flèches réellement déplacées');
    // Exercise every objective renderer, including kinds absent in the current HUD.
    for (const icon of [0, 1, 2, 3, 4, 5, 6, 'score', 'crate', 'ice', 'drop', 'flower', 'chocolate']) {
        const commands = [];
        const context = new Proxy({}, { get: (target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : target[key] ?? ((...args) => commands.push([key, ...args])) });
        module.drawObjective(context, icon, 100, 51);
        assert.ok(commands.some(c => c[0] === 'fill'), `Objectif dessiné : ${icon}`);
        assert.ok(!commands.some(c => ['fillText', 'strokeText'].includes(c[0])), 'Aucun objectif par glyphe');
        if (icon === 'ice') assert.ok(commands.some(c => c[0] === 'strokeRect'), 'Glaçon avec reflets');
    }
    const luminance = hex => {
        const channels = hex.slice(1).match(/../g).map(h => Number.parseInt(h, 16) / 255)
            .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    for (let world = 0; world < 9; world++) {
        const commands = [];
        const context = new Proxy({}, { get: (target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : target[key] ?? ((...args) => commands.push([key, ...args, target.fillStyle])) });
        module.drawWorldRibbon(context, world);
        const text = commands.find(c => c[0] === 'fillText');
        assert.equal(text[1], module.WORLDS[world]);
        const background = commands.find(c => c[0] === 'fill').at(-1);
        const a = luminance(background), b = luminance(text.at(-1));
        assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, 'Contraste ruban ≥ 4,5');
    }
    for (const stars of [0, 1, 2, 3]) {
        const commands = [];
        const context = new Proxy({}, { get: (target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : target[key] ?? ((...args) => commands.push([key, ...args, target.fillStyle])) });
        module.drawScoreGauge(context, stars);
        assert.equal(commands.filter(c => c[0] === 'translate').length, 3, 'Jauge de trois étoiles');
        assert.ok(module.SCORE_STAR_RADIUS * 2 >= 20, 'Étoiles au moins 20 px');
        assert.equal(commands.filter(c => c[0] === 'fill' && c.at(-1) === '#aaa4a4').length, 3 - stars, 'Remplissage selon score');
    }
    assert.ok(module.CHANDELIER_BOTTOM < 105, 'Cristaux au-dessus du personnage');
    const crystals = scenery[5].filter(c => c[0] === 'translate' && [242, 252, 262, 284, 294, 304, 326, 336, 346].includes(c[1]));
    assert.equal(crystals.length, 9);
    assert.ok(crystals.every(c => c[1] - 3 > 238 && c[2] - 3 > 93 && c[2] + 3 < 105), 'Cristaux hors des cartes HUD et du ruban');
    for (const direction of ['right', 'left', 'down', 'up']) for (const phase of [0, .5, 1]) {
        const commands = [];
        const context = new Proxy({}, { get: (target, key) => target[key] ?? ((...args) => commands.push([key, ...args, target.strokeStyle])) });
        module.drawBelt(context, 10, 20, 40, direction, phase);
        const clip = commands.findIndex(c => c[0] === 'clip');
        assert.ok(clip >= 0 && clip < commands.findIndex(c => c[0] === 'stroke'), 'Chevrons découpés dans la bande');
        assert.deepEqual(commands.find(c => c[0] === 'rect').slice(1, 5), [-19.2, -18.400000000000002, 38.4, 36.800000000000004]);
        assert.ok(commands.filter(c => c[0] === 'stroke').every(c => c.at(-1) === '#ffe59b99'), 'Chevrons translucides');
    }
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
        scene.add = { graphics: () => ({ clear() {}, generateTexture() {} }), image: () => ({ setOrigin() {}, setTexture() {} }),
            text: () => ({ setVisible() {}, setText() {} }) };
        scene.textures = { createCanvas: () => ({ context, refresh() {} }), remove() {} };
        scene.children = { bringToTop() {} };
        scene.input = { on: (event, listener) => pointerHandlers.set(event, listener) };
        scene.events = { once() {} };
        scene.game = { canvas: new Element() };
        scene.drawHero = () => {};
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
        for (const scenario of ['drop', 'belt']) for (const gesture of ['drag', 'two taps']) {
            const pair = hook.scenario(scenario);
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
            if (scenario === 'drop') assert.ok(hook.read().dropped > (before.dropped ?? 0), gesture);
            else {
                assert.deepEqual(hook.read().cells.map(c => c.belt), before.cells.map(c => c.belt));
                const transport = hook.transport();
                assert.ok(transport.length > 0, 'Le geste déclenche le tapis');
                for (const move of transport) {
                    const belt = before.cells[move.from].belt;
                    const band = before.cells.flatMap((cell, i) => cell.belt?.band === belt.band ? [i] : []);
                    const step = belt.direction === 'left' || belt.direction === 'up' ? -1 : 1;
                    assert.equal(move.to, band[(band.indexOf(move.from) + step + band.length) % band.length], 'Rotation réelle après geste');
                }
            }
            assert.equal(hook.read().moves, before.moves + 1);
            assert.ok(scene.engine.events.some(event => event.type === scenario));
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
