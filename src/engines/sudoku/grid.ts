/** Sudoku geometry, units and the strict level contract (dossier v1.0, `contracts/level.schema.json`). Pure: no DOM, no clock. */
export type Size = 4 | 6 | 9;
export type Difficulty = 'intro' | 'easy' | 'medium' | 'hard' | 'expert';
export interface Grid { size: Size; boxRows: number; boxCols: number }
export interface Puzzle extends Grid { id: string; givens: readonly number[] }
/** The level record of the dossier, field for field (`schemaVersion` 1.0.0). */
export interface SudokuLevel extends Puzzle {
    schemaVersion: '1.0.0';
    mode: 'kids' | 'classic';
    origin: 'curated' | 'generated';
    seed: number | null;
    difficulty: Difficulty;
    generatorVersion: string | null;
}
export const SIZES: readonly Size[] = [4, 6, 9];
/** Regions: 4 × 4 in 2 × 2 blocks, 6 × 6 in blocks of 2 rows × 3 columns, 9 × 9 in 3 × 3 blocks. */
export function geometry(size: Size): Grid {
    return size === 4 ? { size, boxRows: 2, boxCols: 2 } : size === 6 ? { size, boxRows: 2, boxCols: 3 } : { size, boxRows: 3, boxCols: 3 };
}
export type UnitKind = 'row' | 'col' | 'box';
export interface Topology extends Grid {
    cells: number;
    /** Every unit: rows 0..n-1, columns n..2n-1, blocks 2n..3n-1. */
    units: readonly (readonly number[])[];
    kinds: readonly UnitKind[];
    /** The three units of each cell: [row, column, block]. */
    unitsOf: readonly (readonly [number, number, number])[];
    peers: readonly (readonly number[])[];
    full: number;
}
const topologies = new Map<string, Topology>();
export function topology(g: Grid): Topology {
    const key = `${String(g.size)}:${String(g.boxRows)}x${String(g.boxCols)}`;
    const known = topologies.get(key); if (known) return known;
    const n = g.size, cells = n * n, units: number[][] = [], kinds: UnitKind[] = [];
    for (let r = 0; r < n; r++) { units.push(Array.from({ length: n }, (_, c) => r * n + c)); kinds.push('row'); }
    for (let c = 0; c < n; c++) { units.push(Array.from({ length: n }, (_, r) => r * n + c)); kinds.push('col'); }
    const across = n / g.boxCols;
    for (let b = 0; b < n; b++) {
        const r0 = Math.floor(b / across) * g.boxRows, c0 = b % across * g.boxCols, unit: number[] = [];
        for (let r = 0; r < g.boxRows; r++) for (let c = 0; c < g.boxCols; c++) unit.push((r0 + r) * n + c0 + c);
        units.push(unit); kinds.push('box');
    }
    const unitsOf = Array.from({ length: cells }, (_, i): [number, number, number] => [Math.floor(i / n), n + i % n, 2 * n + boxOf(g, i)]);
    const peers = Array.from({ length: cells }, (_, i) => [...new Set(unitsOf[i]?.flatMap(u => units[u] ?? []))].filter(p => p !== i).sort((a, b) => a - b));
    const t: Topology = { ...g, cells, units, kinds, unitsOf, peers, full: (1 << n) - 1 };
    topologies.set(key, t);
    return t;
}
export function boxOf(g: Grid, i: number): number {
    const r = Math.floor(i / g.size), c = i % g.size;
    return Math.floor(r / g.boxRows) * (g.size / g.boxCols) + Math.floor(c / g.boxCols);
}
export const bit = (v: number): number => 1 << (v - 1);
export function bitCount(m: number): number { let c = 0; for (let x = m; x; x &= x - 1) c++; return c; }
export function digits(m: number): number[] { const out: number[] = []; for (let v = 1; m >> (v - 1); v++) if (m & bit(v)) out.push(v); return out; }
/** Candidates of every empty cell from the placed values alone (0 for a filled cell). */
export function candidates(g: Grid, values: readonly number[]): number[] {
    const t = topology(g);
    return Array.from({ length: t.cells }, (_, i) => {
        if (values[i]) return 0;
        let m = t.full;
        for (const p of t.peers[i] ?? []) { const v = values[p] ?? 0; if (v) m &= ~bit(v); }
        return m;
    });
}
/** Cells whose value is repeated in one of their units (AC03): the player's entries may conflict, the givens never do. */
export function conflicts(g: Grid, values: readonly number[]): number[] {
    const t = topology(g), out: number[] = [];
    for (let i = 0; i < t.cells; i++) {
        const v = values[i] ?? 0;
        if (v && (t.peers[i] ?? []).some(p => values[p] === v)) out.push(i);
    }
    return out;
}
/** Won (AC04): every cell filled and every row, column and block holds 1..N once. */
export function complete(g: Grid, values: readonly number[]): boolean {
    const t = topology(g);
    return t.units.every(unit => unit.reduce((m, i) => m | bit(values[i] ?? 0), 0) === t.full) && values.every(v => v >= 1 && v <= g.size);
}
export function rowOf(g: Grid, i: number): number { return Math.floor(i / g.size); }
export function colOf(g: Grid, i: number): number { return i % g.size; }
/** "L3·C5": row and column from 1, as the HUD and the hints write them. */
export function cellName(g: Grid, i: number): string { return `L${String(rowOf(g, i) + 1)}·C${String(colOf(g, i) + 1)}`; }
export function unitName(t: Topology, u: number): string {
    const kind = t.kinds[u], n = t.size;
    return kind === 'row' ? `la ligne ${String(u + 1)}` : kind === 'col' ? `la colonne ${String(u - n + 1)}` : `le bloc ${String(u - 2 * n + 1)}`;
}
/** Text form of a grid: one row per line, '.' for an empty cell. */
export function gridText(g: Grid, values: readonly number[]): string {
    return Array.from({ length: g.size }, (_, r) => values.slice(r * g.size, (r + 1) * g.size).map(v => v ? String(v) : '.').join('')).join('/');
}
export function parseGrid(text: string): number[] {
    return Array.from(text.replace(/\//g, '')).map(ch => ch === '.' ? 0 : Number(ch));
}
const DIFFICULTIES: readonly Difficulty[] = ['intro', 'easy', 'medium', 'hard', 'expert'];
const KEYS = ['schemaVersion', 'id', 'mode', 'origin', 'seed', 'size', 'boxRows', 'boxCols', 'givens', 'difficulty', 'generatorVersion'];
const REQUIRED = ['schemaVersion', 'id', 'mode', 'origin', 'size', 'boxRows', 'boxCols', 'givens', 'difficulty'];
/** Bounded input: a level file never exceeds this many characters once serialised. */
export const MAX_LEVEL_CHARS = 4096;
/**
 * Strict validation before any level is loaded (dossier § Sécurité): the schema (closed object, enums, types), then the
 * semantics the schema cannot say (geometry of the size, size² givens within 1..N, no repeated given). Data only:
 * nothing in a level is ever executed. Throws a RangeError naming the first fault.
 */
export function validateLevel(input: unknown): SudokuLevel {
    const fail = (why: string): never => { throw new RangeError(`Niveau Sudoku invalide : ${why}`); };
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return fail('objet attendu');
    if (JSON.stringify(input).length > MAX_LEVEL_CHARS) fail('trop volumineux');
    const o = input as Record<string, unknown>;
    for (const key of Object.keys(o)) if (!KEYS.includes(key)) fail(`propriété inconnue ${key}`);
    for (const key of REQUIRED) if (!(key in o)) fail(`propriété manquante ${key}`);
    if (o.schemaVersion !== '1.0.0') fail('schemaVersion');
    if (typeof o.id !== 'string' || o.id.length < 1 || o.id.length > 64) fail('id');
    if (o.mode !== 'kids' && o.mode !== 'classic') fail('mode');
    if (o.origin !== 'curated' && o.origin !== 'generated') fail('origin');
    if ('seed' in o && o.seed !== null && !(typeof o.seed === 'number' && Number.isSafeInteger(o.seed))) fail('seed');
    if (o.size !== 4 && o.size !== 6 && o.size !== 9) fail('size');
    const size = o.size as Size, g = geometry(size);
    if (!Number.isInteger(o.boxRows) || !Number.isInteger(o.boxCols) || (o.boxRows as number) < 2 || (o.boxCols as number) < 2) fail('boxRows/boxCols');
    if (o.boxRows !== g.boxRows || o.boxCols !== g.boxCols) fail('régions incompatibles avec la taille');
    if (!Array.isArray(o.givens) || o.givens.length !== size * size) fail('givens : size² cases attendues');
    const givens = o.givens as unknown[];
    if (!givens.every(v => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= size)) fail('givens : entiers de 0 à N');
    if (typeof o.difficulty !== 'string' || !DIFFICULTIES.includes(o.difficulty as Difficulty)) fail('difficulty');
    if ('generatorVersion' in o && o.generatorVersion !== null && typeof o.generatorVersion !== 'string') fail('generatorVersion');
    const values = givens as number[];
    if (conflicts(g, values).length) fail('chiffres donnés en conflit');
    return {
        schemaVersion: '1.0.0', id: o.id as string, mode: o.mode as 'kids' | 'classic', origin: o.origin as 'curated' | 'generated',
        seed: (o.seed ?? null) as number | null, size, boxRows: g.boxRows, boxCols: g.boxCols, givens: [...values],
        difficulty: o.difficulty as Difficulty, generatorVersion: (o.generatorVersion ?? null) as string | null,
    };
}
