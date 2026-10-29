import { createDemo } from '../../engines/ferraille/demo';
import { rect, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 1000): Thumbnail {
    const demo = createDemo(seed);
    // Seed 1000 opens with a moving platform over a gap.
    // Seek an actual gap near the hero using the demo, without moving world objects.
    for (let i = 0; i < 280; i++) {
        const s = demo.engine.state;
        if (s.blocks.some(b => b.gap > 0 && (b.start + 7) * 16 > s.hero.x && (b.start + 7) * 16 < s.hero.x + 72)) break;
        demo.step();
    }
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 120, 120 / 90);
        const s = demo.engine.state;
        const camera = Math.max(0, Math.min(s.columns * 16 - 120, s.hero.x - 40));
        const top = Math.max(0, Math.min(230, s.hero.y - 40));
            c.translate(-camera, -top);
            for (let y = 0; y < 20; y++) for (let x = Math.max(0, Math.floor(camera / 16)); x < Math.min(s.columns, Math.ceil((camera + 120) / 16)); x++) if (s.tiles[y * s.columns + x]) rect(c, x * 16, y * 16, 15, 15, '#455773');
            for (const p of s.platforms) rect(c, p.x, p.y, p.w, p.h, '#65e4d0');
            for (const p of s.enemies) rect(c, p.x, p.y, p.w, p.h, '#f080ab');
            for (const p of s.shots) rect(c, p.x, p.y, 5, 3, p.friendly ? '#ffee91' : '#f080ab');
            rect(c, s.hero.x, s.hero.y, s.hero.w, s.hero.h, '#ffb867'); rect(c, s.hero.x + 6, s.hero.y + 3, 8, 6, '#65e4d0');
        c.restore();
    } };
}
