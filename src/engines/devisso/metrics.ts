import { initial, legal, unscrew, won, type Board } from './rules';
/** A naive player: a screw that fits a box if any (first in board order), otherwise the first free one. */
export function greedy(board: Board): { won: boolean; moves: number } {
    let s = initial(board), moves = 0;
    for (;;) {
        if (won(s)) return { won: true, moves };
        const options = legal(board, s); if (!options.length) return { won: false, moves };
        const direct = options.find(i => !unscrew(board, s, i)?.events.includes('buffer'));
        const moved = unscrew(board, s, direct ?? options[0] ?? -1); if (!moved) return { won: false, moves };
        s = moved.state; moves++;
    }
}
