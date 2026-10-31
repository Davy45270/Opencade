import { createDemo } from '../../engines/pepites/demo';
import { W, H } from '../../engines/pepites/engine';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); rect(c, 0, 0, 160, 120, '#15110d');
        // Whole 12 × 16 mine, 7 px cells.
        c.translate(38, 4);
        const e = demo.engine, colors: Record<string, string> = { '.': '#6b4a2b', '#': '#3b3f4a', '=': '#8a3f2c', m: '#4a3d7a', a: '#3fbf5a', w: '#2f7fd6', x: '#c0392b', E: e.open ? '#64e4cc' : '#2c3a44' };
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const t = e.at(x, y), fill = colors[t];
            if (fill) rect(c, x * 7, y * 7, 7, 7, fill);
            if (t === 'o') circle(c, x * 7 + 3.5, y * 7 + 3.5, 3, '#9a948a');
            if (t === '*' || t === 'g') circle(c, x * 7 + 3.5, y * 7 + 3.5, (t === 'g' ? 3.5 : 2.5) - ((frame + x + y) % 7 === 0 ? 1 : 0), '#ffd34d');
        }
        for (const n of e.state.enemies) rect(c, n.x * 7 + 1, n.y * 7 + 1, 5, 5, n.kind === 'f' ? '#ff8a3d' : '#7fd4ff');
        circle(c, e.state.player.x * 7 + 3.5, e.state.player.y * 7 + 3.5, 3, '#e5fff7');
        // Nugget glint (period 7) and a lantern sweeping the mine roof (period 84): two frames a few
        // steps apart never match even while the miner waits for a boulder to settle.
        circle(c, (frame * 5) % 84, 1.5, 1.5, '#ffe9a0');
        c.restore();
    } };
}
