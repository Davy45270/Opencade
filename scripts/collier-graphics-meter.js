/* global URL */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const file = new URL('../node_modules/phaser/src/gameobjects/graphics/Graphics.js', import.meta.url);
const require = createRequire(file);
// Load Phaser's actual drawing methods without its DOM, renderer or Scene.
const module = { exports: {} };
new Function('require', 'module', readFileSync(file, 'utf8'))(name => {
    if (name === '../../cameras/2d/BaseCamera') return function Camera() { return {}; };
    if (name === '../../utils/Class') return function(definition) { return definition; };
    if (['../components', '../GameObject', './GraphicsRender'].includes(name)) return {};
    return require(name);
}, module);
const methods = module.exports;
export function graphicsMeter() {
    const live = new Set();
    return {
        create(onTexture) {
            let commands = 0;
            const buffer = [];
            buffer.push = (...values) => { commands++; return Array.prototype.push.apply(buffer, values); };
            const g = Object.assign({}, methods, {
                commandBuffer: buffer, defaultFillColor: -1, defaultStrokeColor: -1,
                clear() { buffer.length = 0; commands = 0; return this; },
                destroy() { live.delete(g); },
                generateTexture(key) { onTexture(key, buffer); }, setDepth() { return this; }, setPosition() { return this; }, setScale() { return this; },
                count: () => commands
            });
            live.add(g);
            return g;
        },
        displayed: () => [...live].filter(g => g.count() > 0).length,
        replay: () => [...live].reduce((sum, g) => sum + g.count(), 0)
    };
}
