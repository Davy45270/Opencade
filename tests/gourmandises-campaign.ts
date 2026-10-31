import { Engine, greedyMove } from '../src/engines/gourmandises/engine';
import { levelAt } from '../src/engines/gourmandises/levels';
import { Random } from '../src/engines/shared/random';

export const CAMPAIGN_SEEDS = [8, 19, 37, 65, 101] as const;
export function median(values: number[]): number {
    const ordered = [...values].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    const upper = ordered[middle] ?? 0;
    return ordered.length % 2 ? upper : ((ordered[middle - 1] ?? 0) + upper) / 2;
}
export function bounds(index: number): [number, number] {
    return index >= 120 ? [0.60, 0.88] : index < 10 ? [0.25, 0.5] : index < 40 ? [0.4, 0.7] : [0.55, 0.85];
}
/** Both policies use ordinary valid swaps, no tools and the same seeded board. */
export function measureLevel(index: number, seeds: readonly number[] = CAMPAIGN_SEEDS) {
    const used: number[] = [];
    let randomLosses = 0;
    for (const seed of seeds) {
        const greedy = new Engine('arcade');
        greedy.loadLevel(index, seed);
        if (greedy.matches().length) throw new Error('Alignement initial');
        while (greedy.status === 'playing') {
            const move = greedyMove(greedy);
            if (!move) throw new Error('Glouton sans coup');
            greedy.swap(...move);
        }
        if (greedy.status !== 'won') throw new Error(`Glouton niveau ${String(index + 1)}, graine ${String(seed)}`);
        used.push(greedy.state.moves);
        const random = new Engine('arcade');
        random.loadLevel(index, seed);
        const policy = new Random(seed + index);
        while (random.status === 'playing') {
            const moves = random.validMoves();
            const move = moves[Math.floor(policy.next() * moves.length)];
            if (!move) throw new Error('Aléatoire sans coup');
            random.swap(...move);
        }
        if (random.status === 'lost') randomLosses++;
    }
    const level = levelAt(index);
    return {
        level: index + 1,
        moves: level.moves,
        used,
        median: median(used) / level.moves,
        randomLosses,
        randomLossRate: randomLosses / seeds.length,
    };
}
export function checkBalance(result: ReturnType<typeof measureLevel>): void {
    const [low, high] = bounds(result.level - 1);
    if (result.median < low || result.median > high || result.used.some(n => n > result.moves)) {
        throw new Error(`Pression niveau ${String(result.level)} : ${String(result.median)}`);
    }
}
