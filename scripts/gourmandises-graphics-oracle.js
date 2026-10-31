/* global console, URL */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { GameCharacter } from '../src/characters/game.ts';
import { ids } from '../src/characters/model.ts';

/** Execute Phaser's actual buffer-writing methods without a browser or renderer.
 * Each push in these methods writes one opcode followed by its numeric operands.
 * Count opcodes, not operands, triangles, or high-level fillPoints calls. */
function retainedGraphics() {
    const source = readFileSync(new URL('../node_modules/phaser/src/gameobjects/graphics/Graphics.js', import.meta.url), 'utf8');
    const require = createRequire(import.meta.url);
    const Commands = require('phaser/src/gameobjects/graphics/Commands.js');
    const graphics = { defaultFillColor: -1, defaultStrokeColor: -1, commandBuffer: [] };
    for (const name of ['lineStyle', 'fillStyle', 'beginPath', 'closePath', 'fillPath', 'strokePath', 'moveTo', 'lineTo', 'fillPoints', 'strokePoints', 'clear']) {
        const start = source.indexOf('function', source.indexOf(`${name}: function`));
        const body = source.indexOf('{', start);
        let end = body + 1, depth = 1;
        while (depth) {
            if (source[end] === '{') depth++;
            if (source[end] === '}') depth--;
            end++;
        }
        graphics[name] = new Function('Commands', `return (${source.slice(start, end)});`)(Commands);
    }
    return graphics;
}

export function graphicsReplayChecks(module) {
    const previous = ['document', 'matchMedia'].map(name => Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { querySelector: () => null, createElement: () => ({ getContext: () => null }) } });
    Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
    try {
        for (const id of ids) {
            const g = retainedGraphics();
            // Record each actual opcode as a single entry; clear() still resets it.
            g.commandBuffer.push = function (...args) { return Array.prototype.push.call(this, args); };
            const hero = new GameCharacter(id);
            hero.draw(g, 264, 105, 84);
            const before = g.commandBuffer.length;
            const scene = new module.GourmandisesScene();
            scene.hero = hero;
            g.clear();
            scene.add = { graphics: () => g };
            let baked = 0;
            const context = new Proxy({}, { get: (target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : target[key] ?? (() => {}) });
            scene.texture = { context, refresh() {} };
            scene.scenery = { context, refresh() { baked++; } };
            scene.draw();
            assert.equal(baked, 1, 'Décor cuit au chargement');
            const after = g.commandBuffer.length;
            assert.equal(after, 0, 'Aucune commande Graphics retenue sur le rendu dynamique');
            scene.draw();
            assert.equal(baked, 1, 'Aucune cuisson par image');
            scene.engine.loadLevel(119, 8);
            scene.draw();
            assert.equal(baked, 2, 'Nouvelle cuisson au changement de niveau');
            assert.equal(g.commandBuffer.length, 0);
            console.log(`Graphics ${id} : ${before} → ${after} commandes/image (méthodes Phaser réelles)`);
        }
    } finally {
        ['document', 'matchMedia'].forEach((name, i) => {
            if (previous[i]) Object.defineProperty(globalThis, name, previous[i]);
            else Reflect.deleteProperty(globalThis, name);
        });
    }
}
