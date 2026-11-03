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
        c.save(); rect(c, 0, 0, 160, 120, '#102e30');
        for (let n = 0; n < 12; n++) { circle(c, n * 37 % 160, n * 29 % 120, 7, '#193f39'); }
        rect(c, 33, 6, 94, 109, '#071b24'); c.translate(36, 8);
        for (let at = 0; at < WIDTH * HEIGHT; at++) {
            const x = at % WIDTH * unit, y = Math.floor(at / WIDTH) * unit;
            rect(c, x, y, 8, 8, '#173b35');
            rect(c, x + .5, y + .5, 7, 7, (at + Math.floor(at / WIDTH)) % 3 ? '#376d4d' : '#407c55');
            if (e.board.walls.includes(at)) {
                rect(c, x + 1, y + 2, 7, 6, '#172d30');
                rect(c, x + .5, y + .5, 7, 5.5, '#a0bc79');
                rect(c, x + 1, y + .5, 6, 1, '#c6d7a3');
                circle(c, x + 2, y + 2, 1.3, '#537b40');
            }
            if (e.board.blocks.some(b => b.at === at)) {
                rect(c, x + 1, y + 2, 6, 6, '#754421');
                rect(c, x + 1, y + 1, 6, 5, '#d9a45e');
                c.strokeStyle = '#85542b'; c.lineWidth = .8; c.beginPath();
                c.moveTo(x + 2, y + 2); c.lineTo(x + 6, y + 6); c.moveTo(x + 6, y + 2); c.lineTo(x + 2, y + 6); c.stroke();
            }
        }
        for (const f of e.fires) { const x = f.at % WIDTH * unit, y = Math.floor(f.at / WIDTH) * unit; rect(c, x, y + 1, 8, 6, '#df8139'); rect(c, x + 2, y, 4, 8, '#ffd55d'); circle(c, x + 4, y + 4, 2, '#ffffd7'); }
        for (const b of e.bombs) { const x = b.at % WIDTH * unit + 4, y = Math.floor(b.at / WIDTH) * unit + 4; circle(c, x + .5, y + 1, 3.5, '#091a23'); circle(c, x, y, 3, b.character === 'panda' ? '#92b94c' : '#ed8a43'); circle(c, x - 1, y - 1, 1, '#fff1a1'); circle(c, x + 1, y - 3, 1 + .5 * Math.sin(e.time / 70), '#ffdf68'); }
        for (const a of e.actors.filter(a => a.hearts)) {
            const x = (a.at % WIDTH * (1 - a.travel) + a.from % WIDTH * a.travel) * unit;
            const y = (Math.floor(a.at / WIDTH) * (1 - a.travel) + Math.floor(a.from / WIDTH) * a.travel) * unit;
            renderCharacter(c, portraits.get(a.character) ?? [], x - 4, y - 5, 16);
        }
        c.restore();
    } };
}
