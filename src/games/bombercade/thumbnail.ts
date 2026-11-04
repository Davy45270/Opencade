import { createDemo } from '../../engines/bombercade/demo';
import { WIDTH, LEVELS } from '../../engines/bombercade/engine';
import { crate, drawBomb, fireCell, type Arena } from './art';
import { arenaBackdrop, arenaBase, arenaOverlay } from './arena';
import { bakeArt, canvasGraphics, castSprite } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's arena (baked floor, walls, crates), its bombs, flames and cast, framed on the board. */
const K = 120 / 400, X = 80 - 180 * K, Y = -136 * K, RES = K * 2;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, arena = (LEVELS[e.level]?.arena ?? 'jungle') as Arena;
        const key = `bombercade-${String(e.level)}-${JSON.stringify([e.board.walls, e.board.conveyors, e.board.portals])}`;
        c.save();
        // The arena's own backdrop, stretched, fills the card's sides.
        bakeArt(c, `bombercade-sky-${arena}`, 0, 0, 160, 120, 2, g => { g.scaleCanvas(160 / 360, 120 / 640); arenaBackdrop(g, arena); });
        c.translate(X, Y); c.scale(K, K);
        bakeArt(c, key, 0, 0, 360, 640, RES, g => { arenaBase(g, e); });
        bakeArt(c, `${key}-overlay`, 0, 0, 360, 640, RES, g => { arenaOverlay(g, e); });
        for (const block of e.board.blocks) bakeArt(c, `bombercade-crate-${arena}-${block.kind}-${String(block.hp)}`, 15 + block.at % WIDTH * 30, 140 + Math.floor(block.at / WIDTH) * 30, 32, 34, RES, g => { crate(g, arena, block); });
        const g = canvasGraphics(c);
        const burning = new Set(e.fires.map(f => `${String(f.owner)}/${String(f.at)}`));
        for (const fire of e.fires) {
            const neighbors = [1, -1, WIDTH, -WIDTH].map(step => Math.abs(step) !== 1 || Math.floor((fire.at + step) / WIDTH) === Math.floor(fire.at / WIDTH) ? burning.has(`${String(fire.owner)}/${String(fire.at + step)}`) : false);
            fireCell(g, fire.character, 30 + fire.at % WIDTH * 30, 155 + Math.floor(fire.at / WIDTH) * 30, neighbors, e.time + fire.at * 65, Math.min(1, fire.left / 180));
        }
        for (const bomb of e.bombs) drawBomb(g, bomb.character, 30 + bomb.at % WIDTH * 30, 156 + Math.floor(bomb.at / WIDTH) * 30, 9, e.time);
        for (const a of e.actors) {
            if (!a.hearts) continue;
            const x = (a.at % WIDTH) * (1 - a.travel) + (a.from % WIDTH) * a.travel, y = Math.floor(a.at / WIDTH) * (1 - a.travel) + Math.floor(a.from / WIDTH) * a.travel;
            const pose = a.direction === 'up' ? 'dos' : a.direction === 'down' ? 'face' : 'profil';
            castSprite(c, a.character, pose, 'concentre', a.travel ? 'marche' : 'repos', frame / 2, 15 + x * 30 - 21, 140 + y * 30 - 35, 72, RES, a.direction === 'left');
        }
        c.restore();
    } };
}
