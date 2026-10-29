import { Engine, neighbor, same, difficulty, type Direction } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e) => {
        const s = e.state, head = s.segments[0];
        if (!head) return;
        const directions: Direction[] = ['up', 'right', 'down', 'left'];
        const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const choices = directions.filter(d => d !== opposite[s.direction]).map(d => ({ d, p: neighbor(head, d, difficulty(e.level).walls) }))
            .filter(c => c.p && ![...s.obstacles, ...s.segments.slice(0, -1)].some(b => same(b, c.p ?? head)))
            .sort((a, b) => (Math.abs((a.p ?? head).x - s.apple.x) + Math.abs((a.p ?? head).y - s.apple.y)) - (Math.abs((b.p ?? head).x - s.apple.x) + Math.abs((b.p ?? head).y - s.apple.y)));
        e.input(choices[0]?.d ?? s.direction);
    }, e => { e.step(1000 / 15); });
}
