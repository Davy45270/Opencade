import { Random } from '../shared/random';
import { geometry, gridText, type Difficulty, type Size, type SudokuLevel } from './grid';
import { rate, type Rating } from './logic';
import { provedUnique, solve } from './solver';
/**
 * Seeded generator (dossier § Génération): a full random grid, then clues removed one by one (with a symmetry) while
 * the solver still proves a single solution; only proved-unique grids leave this module (AC09). Same seed and same
 * versions give the same puzzle and solution (AC10). The record keeps seed and versions.
 */
export const GENERATOR_VERSION = '1.0.0';
export interface Profile {
    size: Size;
    /** Hardest technique tier wanted, inclusive (1 hidden single … 5 X-wing). */
    minTier: number;
    maxTier: number;
    /** Stop removing clues at this count. */
    minGivens: number;
    difficulty: Difficulty;
    symmetry?: Symmetry;
}
export const PROFILES = {
    easy: { size: 9, minTier: 1, maxTier: 2, minGivens: 32, difficulty: 'easy' },
    medium: { size: 9, minTier: 3, maxTier: 3, minGivens: 26, difficulty: 'medium' },
    hard: { size: 9, minTier: 4, maxTier: 5, minGivens: 24, difficulty: 'hard' },
} as const satisfies Record<string, Profile>;
export interface Generated { level: SudokuLevel; solution: number[]; rating: Rating; attempts: number; text: string }
function shuffle<T>(random: Random, items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(random.next() * (i + 1)); const a = items[i], b = items[j]; if (a !== undefined && b !== undefined) { items[i] = b; items[j] = a; } }
    return items;
}
/** A full valid grid: the digits of the first row shuffled, the rest filled by the solver's own search on a shuffled relabelling. */
export function fullGrid(size: Size, random: Random): number[] {
    const g = geometry(size), cells = size * size;
    const first = shuffle(random, Array.from({ length: size }, (_, i) => i + 1));
    const givens = Array<number>(cells).fill(0);
    first.forEach((v, c) => { givens[c] = v; });
    const base = solve({ ...g, givens }, { countLimit: 1 });
    if (base.status !== 'solved') throw new Error('Grille complète introuvable');
    // Relabel rows inside each band and bands themselves: the same digits, a grid that does not start from ascending search order.
    const bands = shuffle(random, Array.from({ length: size / g.boxRows }, (_, b) => b));
    const rows = bands.flatMap(b => shuffle(random, Array.from({ length: g.boxRows }, (_, r) => b * g.boxRows + r)));
    const stacks = shuffle(random, Array.from({ length: size / g.boxCols }, (_, s) => s));
    const cols = stacks.flatMap(s => shuffle(random, Array.from({ length: g.boxCols }, (_, c) => s * g.boxCols + c)));
    return Array.from({ length: cells }, (_, i) => base.solution[(rows[Math.floor(i / size)] ?? 0) * size + (cols[i % size] ?? 0)] ?? 0);
}
export type Symmetry = 'point' | 'mirror' | 'diagonal' | 'none';
/** The cells a clue removal takes together: the cell and its image by the symmetry. */
export function mirrorOf(size: Size, symmetry: Symmetry, i: number): number {
    const r = Math.floor(i / size), c = i % size;
    return symmetry === 'point' ? size * size - 1 - i : symmetry === 'mirror' ? r * size + size - 1 - c : symmetry === 'diagonal' ? c * size + r : i;
}
/** Clues removed by symmetric groups while the solver still proves a single solution. */
export function dig(size: Size, solution: readonly number[], random: Random, minGivens: number, symmetry: Symmetry = 'point'): number[] {
    const g = geometry(size), cells = size * size, givens = [...solution];
    const groups = shuffle(random, Array.from({ length: cells }, (_, i) => i).filter(i => i <= mirrorOf(size, symmetry, i))).map(i => [...new Set([i, mirrorOf(size, symmetry, i)])]);
    let count = cells;
    for (const group of groups) {
        if (count - group.length < minGivens) continue;
        const kept = group.map(i => givens[i] ?? 0);
        for (const i of group) givens[i] = 0;
        if (provedUnique({ ...g, givens }, { maxNodes: 20_000 })) count -= group.length;
        else group.forEach((i, k) => { givens[i] = kept[k] ?? 0; });
    }
    return givens;
}
/** Deterministic: the seed alone (with these versions) fixes the result. Falls back to the closest proved-unique grid. */
export function generate(profile: Profile, seed: number, id = `SDK-GEN-${String(seed >>> 0)}`, maxAttempts = 40): Generated {
    const random = new Random(seed), g = geometry(profile.size);
    let best: { givens: number[]; solution: number[]; rating: Rating; distance: number } | null = null, attempts = 0;
    while (attempts < maxAttempts) {
        attempts++;
        const solution = fullGrid(profile.size, random), givens = dig(profile.size, solution, random, profile.minGivens, profile.symmetry ?? 'point');
        const proof = provedUnique({ ...g, givens });
        if (!proof) continue;
        const rating = rate(g, givens);
        const tier = rating.solved ? rating.tier : 99;
        const distance = tier < profile.minTier ? profile.minTier - tier : tier > profile.maxTier ? tier - profile.maxTier : 0;
        if (!best || distance < best.distance) best = { givens, solution: proof, rating, distance };
        if (distance === 0) break;
    }
    if (!best) throw new Error('Aucune grille unique prouvée');
    const level: SudokuLevel = { schemaVersion: '1.0.0', id, mode: 'classic', origin: 'generated', seed: seed >>> 0, ...g, givens: best.givens, difficulty: profile.difficulty, generatorVersion: GENERATOR_VERSION };
    return { level, solution: best.solution, rating: best.rating, attempts, text: gridText(g, best.givens) };
}
/** Seed of the daily grid: the local date as YYYYMMDD (the scene reads the date, the engine only gets the number). */
export function dailySeed(year: number, month: number, day: number): number { return year * 10000 + month * 100 + day; }
