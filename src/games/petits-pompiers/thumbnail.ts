import { selectedCharacter } from '../../characters/selection';
import { createDemo as engineDemo } from '../../engines/petits-pompiers/demo';
import { arenaBase, dynamicArt, obstacle, position } from './art';
import { bakeArt, canvasGraphics } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export function createDemo(seed = 28) {
    const demo = engineDemo(seed); demo.engine.character = selectedCharacter(); demo.engine.loadLevel(0, seed); let restarts = 0;
    return { ...demo, get restarts() { return restarts; }, step() { const before = demo.engine.level.id; demo.step(); if (before !== demo.engine.level.id) restarts++; } };
}
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed); let restarts = 0;
    return { step() { const before = demo.engine.level.id; demo.step(); if (before !== demo.engine.level.id) restarts++; }, get restarts() { return restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine;
        c.save(); c.scale(160 / 360, 160 / 360); c.translate(0, -145);
        bakeArt(c, `pompiers-${e.level.id}-${String(seed)}`, 0, 0, 360, 640, 1, g => { arenaBase(g, e); });
        const g = canvasGraphics(c);
        for (const [at, tile] of e.tiles.entries()) if ('XbB#'.includes(tile)) { const p = position(at); obstacle(g, tile, p.x, p.y); }
        dynamicArt(g, e); c.restore();
    } };
}
