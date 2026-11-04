import { createDemo } from '../../engines/artificiers/demo';
import { drawDynamic, drawHero, drawScenery, paintTerrain, terrainColour, themes, HERO_SIZE, HERO_X, HERO_Y, WORLD_SCALE } from './art';
import { bakeArt, canvasGraphics, surface, type Surface } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own layers: baked scenery, the destructible terrain kept up to date from the
 * engine's dirty rectangles, baked heroes and the game's dynamic drawing (water, aim, shots). */
const K = 160 / 360, VIEW = 120 / K, TOP = 512 - VIEW, RES = K * 2;
export function createThumbnail(seed = 220): Thumbnail {
    const demo = createDemo(seed);
    let terrain: Surface | null | undefined, painted: unknown = null;
    return {
        step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(),
        draw(c) {
            const e = demo.engine, world = e.config.world, theme = themes[world] ?? themes[0];
            if (!theme) return;
            c.save(); c.scale(K, K); c.translate(0, -TOP);
            bakeArt(c, `artificiers-scenery-${String(world)}`, 0, 0, 360, 640, RES, g => { drawScenery(g, world); });
            if (terrain === undefined) terrain = surface(360, 640, 'artificiers-terrain');
            if (terrain) {
                // A new level replaces the terrain object: repaint it whole.
                if (painted !== e.terrain) { painted = e.terrain; paintTerrain(terrain.context, e.terrain, theme, { x: 0, y: 0, width: 360, height: 640 }); e.terrain.dirty.length = 0; }
                for (const rect of e.terrain.dirty.splice(0)) paintTerrain(terrain.context, e.terrain, theme, rect);
                c.drawImage(terrain.image(), 0, 0, 360, 640 * WORLD_SCALE);
            } else {
                // No surface installed: coarse vertical runs of the same cell colours.
                c.save(); c.scale(1, WORLD_SCALE);
                for (let x = 0; x < 360; x += 8) {
                    let start = 300, previous: string | null = null;
                    for (let y = 300; y <= 640; y += 4) {
                        const colour = y < 640 ? terrainColour(e.terrain, theme, x, y) : null;
                        if (colour === previous) continue;
                        if (previous) { c.fillStyle = previous; c.fillRect(x, start, 8, y - start); }
                        previous = colour; start = y;
                    }
                }
                c.restore(); e.terrain.dirty.length = 0;
            }
            for (const u of e.units) if (u.hp > 0) {
                const pose = e.status === 'won' ? 'celebration' : u.vy ? 'saut' : 'repos';
                c.save(); c.translate(u.x - HERO_X + (u.team === 1 ? HERO_SIZE : 0), (u.y - HERO_Y) * WORLD_SCALE); c.scale(u.team === 1 ? -1 : 1, WORLD_SCALE);
                bakeArt(c, `artificiers-${u.hero}-${pose}`, 0, 0, HERO_SIZE, HERO_SIZE, RES, g => { drawHero(g, u.hero, pose); });
                c.restore();
            }
            // drawDynamic ends with the control panel below y = 531: outside this frame.
            drawDynamic(canvasGraphics(c), e, false, true);
            c.restore();
        },
    };
}
