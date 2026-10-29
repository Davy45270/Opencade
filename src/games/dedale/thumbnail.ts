import { createDemo } from '../../engines/dedale/demo';
import { rect, circle, colors, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const s = demo.engine.state;
        for (let i = 0; i < s.maze.length; i++) if (!s.maze[i]) rect(c, (i % 19) * 18 + 9, Math.floor(i / 19) * 27 + 8, 16, 25, '#344c80');
            for (const i of s.seeds) circle(c, (i % 19) * 18 + 18, Math.floor(i / 19) * 27 + 21, 2, '#ffee91');
            for (const i of s.suns) circle(c, (i % 19) * 18 + 18, Math.floor(i / 19) * 27 + 21, 6, '#ffb867');
            circle(c, s.hero.x * 18 + 18, s.hero.y * 27 + 21, 9, '#ffee91');
            for (const [i, p] of s.wisps.entries()) { circle(c, p.x * 18 + 18, p.y * 27 + 21, 9, colors[(i + 2) % 6] ?? '#f080ab'); circle(c, p.x * 18 + 20, p.y * 27 + 18, 3, '#ffffff'); }
        c.restore();
    } };
}
