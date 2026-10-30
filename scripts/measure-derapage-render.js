/* global console, process, URL */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transpile } from './transpile.js';
process.argv.push('--harness-only');
const { mount, useSceneModule } = await import('./derapage-mobile-scene.js');
process.argv.pop();
const currentRoot = new URL('../', import.meta.url);
const cache = new Map();
function historicalModule(root, file) {
    const key = new URL(file, root).href;
    if (cache.has(key)) return cache.get(key);
    const source = readFileSync(new URL(file, root), 'utf8');
    const rewritten = source.replace(/from '([^']+)'/g, (_, name) => {
        if (!name.startsWith('.')) return `from '${name}'`;
        const url = new URL(`${name}.ts`, new URL(file, root));
        const path = fileURLToPath(url).slice(fileURLToPath(root).length);
        const target = path.startsWith('src/games/derapage/') ? historicalModule(root, path) : url.href;
        return `from ${JSON.stringify(target)}`;
    });
    const url = 'data:text/javascript,' + encodeURIComponent(transpile(rewritten));
    cache.set(key, url);
    return url;
}
// Same current physical circuits, seed, driver and camera for all renderers.
// Report warm-frame maxima over all centre-line samples; baking is separate.
console.log('| Renderer | Circuit 1 | Circuit 10 | K03 |');
console.log('| --- | ---: | ---: | ---: |');
// Optional comparison trees are supplied as directory arguments.
for (const [index, root] of [currentRoot, ...process.argv.slice(2).map(path => pathToFileURL(resolve(path) + '/'))].entries()) {
    useSceneModule(index === 0 ? undefined : await import(historicalModule(root, 'src/games/derapage/scene.ts')));
    const maxima = [];
    for (const level of [0, 9, 26]) {
        const h = await mount('derapage', 'dragon');
        h.session.send('start');
        try {
            h.engine.loadLevel(level, 28);
            h.frame();
            let maximum = 0;
            for (const p of h.engine.track.points) {
                Object.assign(h.engine.karts[0], p);
                h.frame();
                maximum = Math.max(maximum, h.calls.length);
            }
            maxima.push(maximum);
        } finally { h.cleanup(); }
    }
    console.log(`| ${index === 0 ? 'current' : `reference ${index}`} | ${maxima.join(' | ')} |`);
}
useSceneModule(undefined);
