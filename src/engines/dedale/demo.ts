import { Engine, neighbor, index, PRIORITY } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e) => {
        const s = e.state;
        const queue = [{ p: s.hero, first: s.hero.direction }], seen = new Set([index(s.hero)]);
        for (let i = 0; i < queue.length; i++) {
            const node = queue[i]; if (!node) continue;
            if (i > 0 && (s.seeds.includes(index(node.p)) || s.suns.includes(index(node.p)))) { e.input(node.first); break; }
            for (const d of PRIORITY) {
                const p = neighbor(s.maze, node.p, d);
                if (p && !seen.has(index(p))) { seen.add(index(p)); queue.push({ p: { ...p, direction: d }, first: i === 0 ? d : node.first }); }
            }
        }
    }, e => { e.step(1000 / 15); });
}
