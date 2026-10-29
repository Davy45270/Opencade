import { createDemo } from '../../engines/orbite/demo';
import { rect, circle, colors, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const s = demo.engine.state;
        for (const p of s.probes) { rect(c, p.x - 12, p.y - 8, 24, 16, colors[p.row % 6] ?? '#f080ab'); circle(c, p.x, p.y, 4, '#101827'); }
            for (const p of s.shields) rect(c, p.x, p.y, 6, 6, '#65e4d0');
            rect(c, s.cannon - 15, 588, 30, 14, '#65e4d0'); rect(c, s.cannon - 4, 573, 8, 20, '#ffee91');
            for (const p of s.shots) rect(c, p.x - 2, p.y, 4, 18, p.owner === 'player' ? '#ffee91' : '#f080ab');
        c.restore();
    } };
}
