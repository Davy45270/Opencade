import { createDemo } from '../../engines/serpentin/demo';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    // Grow through ordinary demo inputs before the first visible frame.
    for (let i = 0; i < 180 && demo.engine.state.segments.length < 8; i++) demo.step();
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120);
        // Entire 15 × 21 board, square 5 px cells and a visible border.
        rect(c, 40, 6, 79, 109, '#455773');
        rect(c, 42, 8, 75, 105, '#172438');
        c.translate(42, 8);
        const s = demo.engine.state;
        for (const p of s.obstacles) rect(c, p.x * 5, p.y * 5, 5, 5, '#455773');
        for (const [i, p] of s.segments.entries()) rect(c, p.x * 5, p.y * 5, 5, 5, i === 0 ? '#e5fff7' : '#64e4cc');
        circle(c, s.apple.x * 5 + 2.5, s.apple.y * 5 + 2.5, 2.5, '#ffb867');
        if (s.crystal) circle(c, s.crystal.x * 5 + 2.5, s.crystal.y * 5 + 2.5, 2, '#92a8ff');
        c.restore();
    } };
}
