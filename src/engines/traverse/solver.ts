import { generate, transition, difficulty, type Action, type Cell } from './engine';
export interface Proof { path: Action[]; waits: number; visited: number }
/** Bounded space-time BFS: each layer is a real traffic quantum, including carry and diving. */
export function solve(level: number, seed: number, target: number, startPhase = 0): Proof | null {
    const board = generate(level, seed), limit = Math.floor(difficulty(level).timeMs / (difficulty(level).flowFrames * 1000 / 60));
    const nodes: { p: Cell; time: number; parent: number; action: Action }[] = [{ p: { x: 4, y: 14 }, time: startPhase, parent: -1, action: 'wait' }];
    const seen = new Set<string>([`4,14,${String(startPhase)}`]);
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]; if (!n || n.time - startPhase >= limit) continue;
        for (const action of ['up', 'wait', 'left', 'right', 'down'] as const) {
            const p = transition(board, n.p, n.time, action, level);
            if (!p || (p.y === 0 && p.x !== target)) continue;
            const time = n.time + 1, key = `${String(p.x)},${String(p.y)},${String(time)}`;
            if (seen.has(key)) continue;
            seen.add(key); const index = nodes.length; nodes.push({ p, time, parent: i, action });
            if (p.y === 0) {
                const path: Action[] = []; let cursor = index;
                while (cursor > 0) { const node = nodes[cursor]; if (!node) break; path.push(node.action); cursor = node.parent; }
                path.reverse(); return { path, waits: path.filter(a => a === 'wait').length, visited: seen.size };
            }
        }
    }
    return null;
}
