import assert from 'node:assert/strict';
import { actorLayers } from '../src/games/collier/actor-art.ts';
import { drawList } from '../src/characters/model.ts';
import { renderCharacter } from '../src/characters/phaser.ts';

/** Software capture of the polygons actually emitted by the Phaser adapter. */
function polygons(list, size, flip, transform = p => p) {
    const result = [];
    let fill, stroke, width;
    const g = {
        fillStyle(color) { fill = color; },
        lineStyle(value, color) { width = value; stroke = color; },
        fillPoints(points) { result.push({ points: points.map(transform), fill }); },
        strokePoints(points, closed) { result.push({ points: points.map(transform), stroke, width, closed }); }
    };
    renderCharacter(g, list, 0, 0, size, flip);
    return result;
}
function raster(shapes, size) {
    const pixels = new Uint32Array(size * size);
    for (const s of shapes) {
        const ps = s.points, margin = (s.width ?? 0) / 2;
        const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
        const minX = Math.max(0, Math.floor(Math.min(...xs) - margin));
        const maxX = Math.min(size - 1, Math.ceil(Math.max(...xs) + margin));
        const minY = Math.max(0, Math.floor(Math.min(...ys) - margin));
        const maxY = Math.min(size - 1, Math.ceil(Math.max(...ys) + margin));
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
            const px = x + .5, py = y + .5;
            let inside = false;
            for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
                const a = ps[j], b = ps[i];
                if (s.fill !== undefined && (a.y > py) !== (b.y > py)
                    && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside;
                if (s.stroke !== undefined && (i > 0 || s.closed)) {
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)));
                    if ((px - a.x - t * dx) ** 2 + (py - a.y - t * dy) ** 2 <= margin ** 2) { inside = true; break; }
                }
            }
            if (inside) pixels[y * size + x] = 0xff000000 | (s.fill ?? s.stroke);
        }
    }
    return pixels;
}
export function compareBakedActors() {
    let captures = 0;
    for (const id of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'])
        for (const animation of ['repos', 'marche', 'celebration'])
            for (const time of [0, 317, 1234]) {
                const size = 96, flip = time === 317;
                const actor = { id, pose: 'face', expression: 'concentre', animation, time, flip };
                const { layers, live } = actorLayers(actor, false);
                const direct = polygons(drawList(id, 'face', 'concentre', animation, time), size, flip);
                const baked = layers.flatMap(layer => {
                    const angle = flip ? -layer.rotation : layer.rotation;
                    return polygons(layer.list, size, flip, p => {
                        const dx = p.x - size / 2, dy = p.y - size / 2;
                        return { x: size / 2 + dx * Math.cos(angle) - dy * Math.sin(angle) + (flip ? -layer.x : layer.x) * size / 240,
                            y: size / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) + layer.y * size / 240 };
                    });
                });
                baked.push(...polygons(live, size, flip));
                assert.deepEqual(raster(baked, size), raster(direct, size), `${id}/${animation}/${time}: cooked primitives match direct capture`);
                captures++;
            }
    return captures;
}
