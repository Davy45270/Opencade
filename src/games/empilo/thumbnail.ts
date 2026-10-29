import { createDemo } from '../../engines/empilo/demo';
import { rect, colors, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const s = demo.engine.state;
        rect(c, 74, 12, 212, 610, '#24344d');
            for (let y = 0; y < 16; y++) for (let x = 0; x < 9; x++) { const v = s.board[y]?.[x]; if (v) rect(c, 77 + x * 23, 16 + y * 37, 21, 35, colors[(v - 1) % 6] ?? '#92a8ff'); }
            for (const p of s.active.cells) rect(c, 77 + (p.x + s.active.x) * 23, 16 + (p.y + s.active.y) * 37, 21, 35, colors[s.active.id % 6] ?? '#65e4d0');
        c.restore();
    } };
}
