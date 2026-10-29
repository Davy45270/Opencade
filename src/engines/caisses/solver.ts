import { directions, neighbor, type Board, type Direction } from './engine';
/** Exact A*: push cost uses a canonical reachable region; step cost keeps
 * the exact player cell and counts BFS walking paths plus pushes. Reverse-pull
 * dead squares and admissible target bounds prune both searches. */
export function solve(board: Board, objective: 'pushes' | 'steps' = 'pushes'): { pushes: number; inputs: Direction[]; visited: number } | null {
    const walls = new Set(board.walls), live = new Set(board.targets), queue = [...live];
    for (let i = 0; i < queue.length; i++) for (const d of directions) {
        const p = neighbor(board, (queue[i] ?? board.player), d), behind = neighbor(board, p, d);
        if (!walls.has(p) && !walls.has(behind) && !live.has(p)) { live.add(p); queue.push(p); }
    }
    if (board.boxes.some(p => !live.has(p))) return null;
    const flood = (player: number, boxes: number[]) => {
        const paths = new Map<number, Direction[]>([[player, []]]), cells = [player];
        for (let i = 0; i < cells.length; i++) for (const d of directions) {
            const next = neighbor(board, (cells[i] ?? player), d);
            if (!walls.has(next) && !boxes.includes(next) && !paths.has(next)) { paths.set(next, [...(paths.get((cells[i] ?? player)) ?? []), d]); cells.push(next); }
        }
        return paths;
    };
    const distance = (p: number, t: number) => Math.abs(p % board.width - t % board.width) + Math.abs(Math.floor(p / board.width) - Math.floor(t / board.width));
    const targetDistances = objective === 'steps' ? board.targets.map(target => {
        const distances = new Map<number, number>([[target, 0]]), cells = [target];
        for (let i = 0; i < cells.length; i++) for (const d of directions) {
            const cell = cells[i] ?? target, p = neighbor(board, cell, d), behind = neighbor(board, p, d);
            if (!walls.has(p) && !walls.has(behind) && !distances.has(p)) {
                distances.set(p, (distances.get(cell) ?? 0) + 1); cells.push(p);
            }
        }
        return distances;
    }) : [];
    const bounds = new Map<string, number>();
    const bound = (boxes: number[]) => {
        if (objective === 'pushes') return boxes.reduce((sum, p) => sum + Math.min(...board.targets.map(t => distance(p, t))), 0);
        const key = [...boxes].sort((a, b) => a - b).join(',');
        const cached = bounds.get(key); if (cached !== undefined) return cached;
        // One distinct target per box is an admissible walking-search bound.
        let costs = new Map<number, number>([[0, 0]]);
        for (const p of boxes) {
            const next = new Map<number, number>();
            for (const [mask, cost] of costs) for (let i = 0; i < board.targets.length; i++) {
                if (mask & (1 << i)) continue;
                const m = mask | (1 << i), value = cost + (targetDistances[i]?.get(p) ?? Infinity);
                if (value < (next.get(m) ?? Infinity)) next.set(m, value);
            }
            costs = next;
        }
        const value = Math.min(...costs.values()); bounds.set(key, value); return value;
    };
    const open = [{ player: board.player, boxes: [...board.boxes], g: 0, order: 0, pushes: 0, f: bound(board.boxes), inputs: [] as Direction[] }];
    // Binary heap preserves the former stable-sort tie order (newest first).
    type Node = (typeof open)[number];
    let order = 0;
    const compare = (a: Node, b: Node) => a.f - b.f || b.g - a.g || b.order - a.order;
    const enqueue = (node: Node) => {
        open.push(node); let i = open.length - 1;
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2), p = open[parent];
            if (!p || compare(p, node) <= 0) break;
            open[i] = p; i = parent;
        }
        open[i] = node;
    };
    const dequeue = () => {
        const first = open[0], tail = open.pop();
        if (open.length && tail) {
            let i = 0;
            while (i * 2 + 1 < open.length) {
                let child = i * 2 + 1;
                const left = open[child], right = open[child + 1];
                if (left && right && compare(right, left) < 0) child++;
                const next = open[child];
                if (!next || compare(tail, next) <= 0) break;
                open[i] = next; i = child;
            }
            open[i] = tail;
        }
        return first;
    };
    const seen = new Map<string, number>();
    while (open.length) {
        const node = dequeue(); if (!node) break;
        const paths = flood(node.player, node.boxes);
        const key = `${[...node.boxes].sort((a,b) => a-b).join(',')}:${String(objective === 'steps' ? node.player : Math.min(...paths.keys()))}`;
        if ((seen.get(key) ?? Infinity) <= node.g) continue;
        seen.set(key, node.g);
        if (node.boxes.every(p => board.targets.includes(p))) return { pushes: node.pushes, inputs: node.inputs, visited: seen.size };
        for (const [i, p] of node.boxes.entries()) for (const d of directions) {
            const next = neighbor(board, p, d), behind = p - (next - p), path = paths.get(behind);
            if (!path || !live.has(next) || node.boxes.includes(next)) continue;
            const boxes = [...node.boxes]; boxes[i] = next;
            const g = node.g + (objective === 'steps' ? path.length + 1 : 1);
            enqueue({ player: p, boxes, g, order: ++order, pushes: node.pushes + 1, f: g + bound(boxes), inputs: [...node.inputs, ...path, d] });
        }
    }
    return null;
}
