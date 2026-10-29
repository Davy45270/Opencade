import { createDemo } from '../../engines/serpentin/demo';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const s = demo.engine.state;
        for (const p of s.obstacles) rect(c, p.x * 24, p.y * 30, 22, 28, '#455773');
            for (const [i, p] of s.segments.entries()) rect(c, p.x * 24 + 2, p.y * 30 + 2, 20, 26, i === 0 ? '#e5fff7' : '#64e4cc');
            circle(c, s.apple.x * 24 + 12, s.apple.y * 30 + 15, 12, '#ffb867');
            if (s.crystal) circle(c, s.crystal.x * 24 + 12, s.crystal.y * 30 + 15, 9, '#92a8ff');
        c.restore();
    } };
}
