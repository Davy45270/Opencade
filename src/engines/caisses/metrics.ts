import { neighbor, type Board, type Direction } from './engine';
/** Stable box identities follow each push. A turn is a change between two
 * pushes of that same box (including reversal). A detour is >=2 walking
 * inputs between consecutive pushes, excluding the initial approach. */
export function solutionMetrics(board: Board, inputs: Direction[]) {
    const boxes = [...board.boxes], last = new Map<number, Direction>();
    let player = board.player, turns = 0, detours = 0, walking = 0, pushed = false;
    for (const d of inputs) {
        const next = neighbor(board, player, d), id = boxes.indexOf(next);
        if (id >= 0) {
            if (last.has(id) && last.get(id) !== d) turns++;
            if (pushed && walking >= 2) detours++;
            last.set(id, d); boxes[id] = neighbor(board, next, d); pushed = true; walking = 0;
        } else walking++;
        player = next;
    }
    return { turns, detours };
}
