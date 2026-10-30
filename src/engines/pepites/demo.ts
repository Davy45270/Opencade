import { Engine, W, type Direction } from './engine';
import { demo } from '../shared/demo';
/** Attract mode: walk towards the nearest nugget (then the exit), never under a boulder. */
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, e => {
        const s = e.state, p = s.player, open = e.open;
        let best: { x: number; y: number } | null = null, bd = Infinity;
        s.grid.forEach((t, i) => { if (t === (open ? 'E' : '*')) { const x = i % W, y = Math.floor(i / W), d = Math.abs(x - p.x) + Math.abs(y - p.y); if (d < bd) { bd = d; best = { x, y }; } } });
        const target = best as { x: number; y: number } | null; if (!target) return;
        const options: Direction[] = target.x !== p.x ? [target.x > p.x ? 'right' : 'left', target.y > p.y ? 'down' : 'up'] : [target.y > p.y ? 'down' : 'up', 'left', 'right'];
        const ok = (d: Direction) => { const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]; const dx = v[0] ?? 0, x = p.x + dx, y = p.y + (v[1] ?? 0), t = e.at(x, y); return (t === ' ' || t === '.' || t === '*' || t === 'g' || (t === 'E' && open) || (t === 'o' && dx !== 0 && e.at(x + dx, y) === ' ')) && e.at(x, y - 1) !== 'o'; };
        // Never stand still: fall back to any open step so the preview keeps moving.
        e.hold(options.find(ok) ?? (['left', 'right', 'down', 'up'] as Direction[]).find(ok) ?? null);
    }, e => { e.step(1000 / 15); });
}
