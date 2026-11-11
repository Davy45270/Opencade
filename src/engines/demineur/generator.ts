import { Random } from '../shared/random';
import { counts, neighbours, GENERATOR_VERSION, SCHEMA_VERSION, type LevelDefinition } from './rules';
import { proveBoard, type Proof } from './solver';
/** No-guess generation (spec: "generate candidates, run the solver without guessing, publish only proven ones").
 * A candidate keeps a 3 × 3 opening free around `start`, scatters the other mines with the shared seeded generator
 * (a drawing's mines are fixed), and is published only if `proveBoard` returns `solvable`. Otherwise: null, never
 * an unproven board. */
export interface Candidate { layout: string[]; start: { x: number; y: number }; proof: Proof; attempt: number }
export function rows(w: number, mines: readonly boolean[], drawing: ReadonlySet<number> = new Set()): string[] {
    const out: string[] = [];
    for (let i = 0; i < mines.length; i += w) out.push(mines.slice(i, i + w).map((m, k) => m ? drawing.has(i + k) ? '#' : '*' : '.').join(''));
    return out;
}
export function curated(id: string, mode: LevelDefinition['mode'], layout: readonly string[], start: { x: number; y: number }, seed: number, questionMarks = false): LevelDefinition {
    const width = layout[0]?.length ?? 0, height = layout.length, mineCount = layout.join('').replace(/\./g, '').length;
    return {
        schemaVersion: SCHEMA_VERSION, id, mode, width, height, mineCount,
        generation: { type: 'curated', generatorVersion: GENERATOR_VERSION, seed, noGuess: true },
        rules: { firstClickSafe: true, firstClickZeroPreferred: true, chordEnabled: true, questionMarks }, layout: [...layout], start: { ...start },
    };
}
export function noGuessBoard(w: number, h: number, mineCount: number, seed: number, options: { start?: { x: number; y: number }; drawing?: ReadonlySet<number>; attempts?: number } = {}): Candidate | null {
    const drawing = options.drawing ?? new Set<number>(), start = options.start ?? { x: Math.floor(w / 2), y: Math.floor(h / 2) };
    const first = start.y * w + start.x, zone = new Set([first, ...neighbours(w, h, first)]);
    const pool = Array.from({ length: w * h }, (_, i) => i).filter(i => !zone.has(i) && !drawing.has(i));
    const extra = mineCount - drawing.size;
    if (extra < 0 || extra > pool.length || [...drawing].some(i => zone.has(i))) return null;
    for (let attempt = 0; attempt < (options.attempts ?? 400); attempt++) {
        const random = new Random((seed * 7919 + attempt * 104729) >>> 0), cells = pool.slice(), mines = Array.from({ length: w * h }, (_, i) => drawing.has(i));
        for (let k = 0; k < extra; k++) {
            const j = k + Math.floor(random.next() * (cells.length - k)), a = cells[k] ?? 0, b = cells[j] ?? 0;
            cells[k] = b; cells[j] = a; mines[b] = true;
        }
        if (counts(w, h, mines)[first] !== 0) continue;
        const layout = rows(w, mines, drawing);
        const proof = proveBoard(curated('candidat', 'learning', layout, start, seed));
        if (proof.status === 'solvable') return { layout, start, proof, attempt };
    }
    return null;
}
