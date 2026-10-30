import { createDemo } from '../../engines/traverse/demo';
import { filled, difficulty } from '../../engines/traverse/engine';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    let traffic = 0;
    return { step: () => { demo.step(); traffic += 0.35; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); rect(c, 0, 0, 160, 120, '#101827');
        const e = demo.engine;
        for (let y = 0; y < 15; y++) {
            const lane = e.board.lanes.find(l => l.y === y);
            rect(c, 35, y * 8, 90, 7, lane?.kind === 'river' ? '#184f73' : lane ? '#32394e' : '#235448');
            if (lane) {
                const spacing = difficulty(e.level).spacing;
                // Continuous vehicles and logs survive deaths, restarts and shelter waits.
                for (let x = -spacing; x < 9 + spacing; x++) if (filled(lane, x, lane.kind === 'road' ? 0 : e.state.phase, e.level)) {
                    const left = 36 + (x + (traffic * lane.direction % spacing)) * 10;
                    const start = Math.max(35, left), end = Math.min(125, left + 9);
                    if (end > start) rect(c, start, y * 8 + 1, end - start, 5, lane.kind === 'road' ? '#ff876b' : '#c49b67');
                }
            }
        }
        for (const x of e.board.shelters) rect(c, 36 + x * 10, 0, 8, 7, '#64e4cc');
        circle(c, 40 + e.state.player.x * 10, e.state.player.y * 8 + 4, 4, '#fff1b8'); c.restore();
    } };
}
