import { createDemo } from '../../engines/briqueterie/demo';
import { rect, circle, colors, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const s = demo.engine.state;
        for (const b of s.bricks) rect(c, b.x, b.y, b.w, b.h, colors[Math.floor(b.y / 23) % 6] ?? '#65e4d0');
            rect(c, s.paddle - s.width / 2, 586, s.width, 12, '#65e4d0');
            for (const b of s.balls) circle(c, b.x, b.y, 9, '#ffffff');
            for (const b of s.bonuses) circle(c, b.x, b.y, 12, '#ffb867');
        c.restore();
    } };
}
