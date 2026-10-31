import { createDemo } from '../../engines/bombercade/demo';
import { WIDTH, HEIGHT } from '../../engines/bombercade/engine';
import { drawList, ids } from '../../characters/model';
import { renderCharacter } from '../../characters/canvas';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    const portraits = new Map(ids.map(id => [id, drawList(id, 'face', 'concentre', 'repos', 0)]));
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, unit = 8;
        c.save(); rect(c, 0, 0, 160, 120, '#103e39'); c.translate(36, 8);
        for (let at = 0; at < WIDTH * HEIGHT; at++) {
            const x = at % WIDTH * unit, y = Math.floor(at / WIDTH) * unit;
            rect(c, x, y, 7, 7, e.board.walls.includes(at) ? '#89c65b' : '#247653');
            if (e.board.blocks.some(b => b.at === at)) rect(c, x + 1, y + 1, 5, 5, '#dab164');
        }
        for (const f of e.fires) { const x = f.at % WIDTH * unit, y = Math.floor(f.at / WIDTH) * unit; rect(c, x, y + 2, 8, 4, '#ffb248'); rect(c, x + 2, y, 4, 8, '#fff1a1'); }
        for (const b of e.bombs) { const x = b.at % WIDTH * unit + 4, y = Math.floor(b.at / WIDTH) * unit + 4; circle(c, x, y, 3, '#14262d'); circle(c, x + 1, y - 3, 1 + .5 * Math.sin(e.time / 70), '#ffdf68'); }
        for (const a of e.actors.filter(a => a.hearts)) {
            const x = (a.at % WIDTH * (1 - a.travel) + a.from % WIDTH * a.travel) * unit;
            const y = (Math.floor(a.at / WIDTH) * (1 - a.travel) + Math.floor(a.from / WIDTH) * a.travel) * unit;
            renderCharacter(c, portraits.get(a.character) ?? [], x - 4, y - 5, 16);
        }
        c.restore();
    } };
}
