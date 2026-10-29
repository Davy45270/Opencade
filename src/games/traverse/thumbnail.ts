import { createDemo } from '../../engines/traverse/demo';
import { filled } from '../../engines/traverse/engine';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); rect(c, 0, 0, 160, 120, '#101827');
        const e = demo.engine;
        for (let y = 0; y < 15; y++) {
            const lane = e.board.lanes.find(l => l.y === y);
            rect(c, 35, y * 8, 90, 7, lane?.kind === 'river' ? '#184f73' : lane ? '#32394e' : '#235448');
            if (lane) for (let x = 0; x < 9; x++) if (filled(lane, x, e.state.phase, e.level)) rect(c, 36 + x * 10, y * 8 + 1, 9, 5, lane.kind === 'road' ? '#ff876b' : '#c49b67');
        }
        for (const x of e.board.shelters) rect(c, 36 + x * 10, 0, 8, 7, '#64e4cc');
        circle(c, 40 + e.state.player.x * 10, e.state.player.y * 8 + 4, 4, '#fff1b8'); c.restore();
    } };
}
