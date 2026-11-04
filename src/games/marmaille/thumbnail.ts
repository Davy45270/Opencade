import { createDemo } from '../../engines/marmaille/demo';
import { COLS, Engine, ROWS, TICK_MS, type Tile } from '../../engines/marmaille/engine';
import { drawList } from '../../characters/model';
import { backdrop, CARD, dirtyCells, paintCell, portals, roleProp, worldOf } from './art';
import { CELL, FIELD_Y } from './layout';
import { bakeArt, canvasGraphics, sprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's board at its own scale (360 × 640), framed on the troop: the world backdrop and the
 * board's terrain are baked once per level with the game's art; cells the troop dug or built are
 * repainted with the same `paintCell`, and the kids are the game's sprites of the chosen companion. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2;
export function createThumbnail(seed = 0): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let camera = -1, level = -1, fresh = new Engine(0, seed);
    return {
        step: () => { demo.step(); },
        get restarts() { return demo.restarts; },
        read: () => demo.engine.snapshot(),
        draw(c) {
            const e = demo.engine, def = e.def, world = worldOf(e.level), time = e.tick * TICK_MS;
            if (e.level !== level) { level = e.level; fresh = new Engine(e.level, seed); }
            const initial = fresh.tiles.map(r => r.join(''));
            const live = e.kids.filter(k => k.state !== 'saved' && k.state !== 'dead');
            const focus = live.length ? live.reduce((s, k) => s + k.y, 0) / live.length : def.spawn.y;
            const target = Math.max(0, Math.min(FIELD_Y + ROWS * CELL + 20 - VIEW, FIELD_Y + focus * CELL - VIEW * .5));
            camera = camera < 0 ? target : camera + (target - camera) * .2;
            c.save(); c.scale(K, K); c.translate(0, -Math.round(camera));
            const terrain = (g: Parameters<typeof paintCell>[0], x: number, y: number, at: (x: number, y: number) => Tile): void => {
                const t = at(x, y), built = t === '#' && (def.map[y]?.[x] ?? '.') === '.';
                paintCell(g, world, t, { up: y > 0 ? at(x, y - 1) : ' ', left: at(x - 1, y), right: at(x + 1, y) }, built, x, y, CELL, FIELD_Y);
            };
            const scenery = `marmaille-${world}-${hero}-${String(e.level)}`;
            const paintBoard = (g: Parameters<typeof paintCell>[0]): void => {
                backdrop(g, world, CARD[hero] ?? CARD.panda ?? 0, FIELD_Y + ROWS * CELL);
                for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) terrain(g, x, y, (cx, cy) => fresh.tile(cx, cy));
                portals(g, def.spawn, def.exit, def.dir ?? 1, CELL, FIELD_Y);
            };
            bakeArt(c, scenery, 0, 0, 360, 640, RES, paintBoard);
            // Cells the troop changed: the baked board shows through a clip, then the same cell art on top.
            const dirty = dirtyCells(initial, e.tiles);
            if (dirty.length) {
                c.save(); c.beginPath();
                for (const [x, y] of dirty) c.rect(x * CELL, FIELD_Y + y * CELL, CELL, CELL);
                c.clip();
                bakeArt(c, `${scenery}-backdrop`, 0, 0, 360, 640, RES, g => { backdrop(g, world, CARD[hero] ?? CARD.panda ?? 0, FIELD_Y + ROWS * CELL); });
                const g = canvasGraphics(c);
                for (const [x, y] of dirty) terrain(g, x, y, (cx, cy) => e.tile(cx, cy));
                portals(g, def.spawn, def.exit, def.dir ?? 1, CELL, FIELD_Y);
                c.restore();
            }
            const frameOf = (phase: number): number => Math.floor(phase / 110) % 6;
            const kid = (pose: 'face' | 'profil', mood: 'joie' | 'surprise', anim: 'repos' | 'marche' | 'special', phase: number, x: number, y: number, size: number, flip: boolean): void => {
                const frame = frameOf(phase);
                sprite(c, `marmaille-${hero}-${pose}-${mood}-${anim}-${String(frame)}`, () => drawList(hero, pose, mood, anim, frame * 110), x - size / 2, y - size / 2, size, RES, flip);
            };
            kid('face', 'joie', 'repos', time, def.spawn.x * CELL + CELL / 2 - (def.dir ?? 1) * 26, FIELD_Y + def.spawn.y * CELL - 26, 60, false);
            const g = canvasGraphics(c);
            for (const k of live) {
                const animation = k.state === 'walk' || k.state === 'climb' ? 'marche' : k.state === 'block' || k.state === 'fall' ? 'repos' : 'special';
                const cx = k.x * CELL + CELL / 2, top = FIELD_Y + k.y * CELL + CELL;
                kid(k.state === 'block' ? 'face' : 'profil', k.state === 'fall' && k.fall > 3 && !k.float ? 'surprise' : 'joie', animation, time + k.id * 90, cx, top - 18, 40, k.dir < 0);
                roleProp(g, k.state, k.float, k.state === 'fall', cx, top - 16, k.dir, time);
            }
            c.restore();
        },
    };
}
