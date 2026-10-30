import { generate, transition, difficulty, castawayAt, type Action, type Cell } from './engine';
export interface Proof { path: Exclude<Action, 'bond'>[]; waits: number; visited: number }
/** Bounded space-time BFS: each layer is a real traffic quantum, including carry and diving. */
export function solve(level: number, seed: number, target: number, startPhase = 0, rescued = false): Proof | null {
    const board = generate(level, seed), limit = Math.floor(difficulty(level).timeMs / (difficulty(level).flowFrames * 1000 / 60));
    // Pass 404: with a castaway aboard the level, shelters accept the player only once rescued.
    const need = !!board.castaway && !rescued;
    const nodes: { p: Cell; time: number; aboard: boolean; parent: number; action: Exclude<Action, 'bond'> }[] = [{ p: { x: 4, y: 14 }, time: startPhase, aboard: !need, parent: -1, action: 'wait' }];
    const seen = new Set<string>([`4,14,${String(startPhase)},${String(!need)}`]);
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]; if (!n || n.time - startPhase >= limit) continue;
        for (const action of ['up', 'wait', 'left', 'right', 'down'] as const) {
            const p = transition(board, n.p, n.time, action, level);
            if (!p || (p.y === 0 && (p.x !== target || !n.aboard))) continue;
            const c = n.aboard ? null : castawayAt(board, n.time + 1), aboard = n.aboard || (!!c && c.x === p.x && c.y === p.y);
            const time = n.time + 1, key = `${String(p.x)},${String(p.y)},${String(time)},${String(aboard)}`;
            if (seen.has(key)) continue;
            seen.add(key); const index = nodes.length; nodes.push({ p, time, aboard, parent: i, action });
            if (p.y === 0) {
                const path: Exclude<Action, 'bond'>[] = []; let cursor = index;
                while (cursor > 0) { const node = nodes[cursor]; if (!node) break; path.push(node.action); cursor = node.parent; }
                path.reverse(); return { path, waits: path.filter(a => a === 'wait').length, visited: seen.size };
            }
        }
    }
    return null;
}

/** Optional proof requiring exactly one bond, kept separate from the historical BFS. */
export function solveWithBond(level: number, seed: number, target: number, startPhase = 0, rescued = false): { path: Action[]; visited: number } | null {
    const board = generate(level, seed), need = !!board.castaway && !rescued, limit = Math.floor(difficulty(level).timeMs / (difficulty(level).flowFrames * 1000 / 60));
    const nodes: { p: Cell; time: number; used: boolean; aboard: boolean; parent: number; action: Action }[] = [{ p: { x: 4, y: 14 }, time: startPhase, used: false, aboard: !need, parent: -1, action: 'wait' }];
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]; if (!n || n.time - startPhase >= limit) continue;
        for (const action of ['bond', 'up', 'wait', 'left', 'right', 'down'] as const) {
            if (action === 'bond' && n.used) continue;
            const used = n.used || action === 'bond', p = transition(board, n.p, n.time, action, level);
            if (!p || (p.y === 0 && (p.x !== target || !used || !n.aboard))) continue;
            const c = n.aboard ? null : castawayAt(board, n.time + 1), aboard = n.aboard || (!!c && c.x === p.x && c.y === p.y);
            const time = n.time + 1, key = `${String(p.x)},${String(p.y)},${String(time)},${String(used)},${String(aboard)}`;
            if (seen.has(key)) continue;
            seen.add(key); const index = nodes.length; nodes.push({ p, time, used, aboard, parent: i, action });
            if (p.y === 0) {
                const path: Action[] = []; let cursor = index;
                while (cursor > 0) { const node = nodes[cursor]; if (!node) break; path.push(node.action); cursor = node.parent; }
                return { path: path.reverse(), visited: seen.size };
            }
        }
    }
    return null;
}
