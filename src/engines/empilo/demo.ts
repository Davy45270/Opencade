import { Engine } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e, frame) => {
        const s = e.state;
        const width = Math.max(...s.active.cells.map(c => c.x)) + 1;
        let target = 0, best = Infinity;
        for (let x = 0; x <= 9 - width; x++) {
            const height = Math.max(...Array.from({ length: width }, (_, i) => 16 - s.board.findIndex(row => (row[x + i] ?? 0) !== 0)).map(h => h === 17 ? 0 : h));
            if (height < best) { best = height; target = x; }
        }
        if (frame % 12 === 11) e.input('drop');
        else if (s.active.x !== target) e.input(s.active.x < target ? 'right' : 'left');
    }, e => { e.step(1000 / 15); });
}
