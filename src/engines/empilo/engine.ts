import { Random } from '../shared/random';
export interface Cell { x: number; y: number }
// Silhouettes originales : tailles variées, aucun nom de lettre.
export const SHAPES: readonly (readonly Cell[])[] = [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
];
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return { gravity: 1 + 17 * level / 29, goal: 5 + Math.floor(35 * level / 29), rubble: Math.floor(8 * level / 29), sealed: Math.floor(4 * level / 29), shapes: 4 + Math.min(4, Math.floor(level / 5)) };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Strate ${String(i + 1)}` }));
export const emptyBoard = (): number[][] => Array.from({ length: 16 }, () => Array<number>(9).fill(0));
export function rotate(cells: readonly Cell[], direction: 1 | -1): Cell[] {
    const rotated = cells.map(c => ({ x: -direction * c.y, y: direction * c.x }));
    const minX = Math.min(...rotated.map(c => c.x)), minY = Math.min(...rotated.map(c => c.y));
    return rotated.map(c => ({ x: c.x - minX, y: c.y - minY }));
}
export interface Piece { id: number; cells: Cell[]; x: number; y: number }
export interface State { board: number[][]; active: Piece; next: number[]; score: number; lines: number; lockMs: number; resets: number }
export type Action = 'left' | 'right' | 'clockwise' | 'counterclockwise' | 'soft' | 'drop';
export class Engine {
    level = 0;
    seed = 456;
    status: 'playing' | 'won' | 'lost' = 'playing';
    state!: State;
    private random = new Random(456);
    private bag: number[] = [];
    private remainder = 0;
    private fall = 0;
    constructor(level = 0, seed = 456) { this.loadLevel(level, seed); }
    private take(): number {
        if (!this.bag.length) {
            this.bag = Array.from({ length: difficulty(this.level).shapes }, (_, i) => i);
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(this.random.next() * (i + 1));
                const a = this.bag[i] ?? 0; this.bag[i] = this.bag[j] ?? 0; this.bag[j] = a;
            }
        }
        return this.bag.shift() ?? 0;
    }
    private piece(id: number): Piece { return { id, cells: structuredClone([...(SHAPES[id] ?? SHAPES[0] ?? [])]), x: 3, y: 0 }; }
    loadLevel(level: number, seed = 456): void {
        const d = difficulty(level);
        this.level = level; this.seed = seed; this.random = new Random(seed); this.bag = []; this.remainder = 0; this.fall = 0; this.status = 'playing';
        const board = emptyBoard();
        for (let y = 16 - d.rubble; y < 16; y++) {
            const hole = Math.floor(this.random.next() * 9);
            for (let x = 0; x < 9; x++) if (x !== hole) { const row = board[y]; if (row) row[x] = x < d.sealed ? 2 : 1; }
        }
        this.state = { board, active: this.piece(this.take()), next: [this.take(), this.take(), this.take()], score: 0, lines: 0, lockMs: 0, resets: 0 };
    }
    /** Position construite ; les actions suivantes utilisent toutes les règles normales. */
    loadState(state: State): void { this.state = structuredClone(state); this.status = 'playing'; this.remainder = 0; this.fall = 0; }
    fits(piece: Piece): boolean {
        return piece.cells.every(c => { const x = c.x + piece.x, y = c.y + piece.y; return x >= 0 && x < 9 && y >= 0 && y < 16 && this.state.board[y]?.[x] === 0; });
    }
    private grounded(): boolean { return !this.fits({ ...this.state.active, y: this.state.active.y + 1 }); }
    input(action: Action): boolean {
        if (this.status !== 'playing') return false;
        if (action === 'drop') {
            while (this.fits({ ...this.state.active, y: this.state.active.y + 1 })) { this.state.active.y++; this.state.score += 2; }
            this.lock(); return true;
        }
        const active = this.state.active;
        const grounded = this.grounded();
        if (action === 'soft') {
            if (!this.fits({ ...active, y: active.y + 1 })) return false;
            active.y++; this.state.score++; return true;
        }
        const cells = action === 'clockwise' || action === 'counterclockwise' ? rotate(active.cells, action === 'clockwise' ? 1 : -1) : active.cells;
        const offsets = action === 'left' ? [-1] : action === 'right' ? [1] : [0, -1, 1, -2, 2];
        for (const offset of offsets) {
            const candidate = { ...active, cells, x: active.x + offset };
            if (!this.fits(candidate)) continue;
            this.state.active = candidate;
            if (grounded && this.state.resets < 15) { this.state.lockMs = 0; this.state.resets++; }
            return true;
        }
        return false;
    }
    private lock(): void {
        for (const c of this.state.active.cells) { const row = this.state.board[c.y + this.state.active.y]; if (row) row[c.x + this.state.active.x] = 1; }
        let cleared = 0;
        const retained: number[][] = [];
        for (const row of this.state.board) {
            if (row.every(v => v > 0)) {
                if (row.some(v => v === 2)) retained.push(row.map(v => v === 2 ? 1 : 0));
                else cleared++;
            } else retained.push(row);
        }
        while (retained.length < 16) retained.unshift(Array<number>(9).fill(0));
        this.state.board = retained;
        this.state.lines += cleared;
        this.state.score += (cleared <= 4 ? [0, 100, 300, 600, 1000][cleared] ?? 0 : 1500 + (cleared - 5) * 600) * (this.level + 1);
        if (this.state.lines >= difficulty(this.level).goal) { this.status = 'won'; return; }
        this.state.active = this.piece(this.state.next.shift() ?? this.take()); this.state.next.push(this.take());
        this.state.lockMs = 0; this.state.resets = 0; this.fall = 0;
        if (!this.fits(this.state.active)) this.status = 'lost';
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= 1000 / 60 && this.status === 'playing') {
            this.remainder -= 1000 / 60;
            this.fall += difficulty(this.level).gravity / 60;
            while (this.fall + 1e-8 >= 1) {
                this.fall -= 1;
                if (this.fits({ ...this.state.active, y: this.state.active.y + 1 })) this.state.active.y++;
            }
            if (this.grounded()) { this.state.lockMs += 1000 / 60; if (this.state.lockMs + 1e-8 >= 500) this.lock(); }
        }
        if (this.status !== 'playing') this.remainder = 0;
    }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, bag: [...this.bag], random: this.random.state, fall: this.fall, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
}
