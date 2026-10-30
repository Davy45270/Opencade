import { Random } from '../shared/random';
import { STRATA, TILE, type Stratum, type Conveyor } from './levels';
export { STRATA, TILE };
export type { Stratum, Conveyor };
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
    // 8: the bomb, a single cell that blasts its 3 × 3 neighbourhood on landing.
    [{ x: 0, y: 0 }],
];
export const BOMB = 8;
export function stratum(level: number): Stratum {
    const data = Number.isInteger(level) ? STRATA[level] : undefined;
    if (!data) throw new RangeError('Niveau invalide');
    return data;
}
export function difficulty(level: number) {
    const l = stratum(level);
    return { gravity: l.gravity, goal: l.goal, objective: l.objective, rubble: l.rubble, holes: l.holes, sealed: l.sealed, gems: l.gems, locks: l.locks, shapes: l.shapes, bomb: l.bomb, conveyors: l.conveyors.length, rise: l.rise, preview: l.preview, timeMs: l.timeMs };
}
export const LEVELS = STRATA.map((l, i) => ({ name: `${String(i + 1)}. ${l.name}` }));
/** Conveyor rows slide one column (wrapping) after each lock. Pure. */
export function slide(board: number[][], conveyors: readonly Conveyor[]): number[][] {
    if (!conveyors.length) return board;
    const next = board.map(row => [...row]);
    for (const belt of conveyors) {
        const row = board[belt.y];
        if (row) next[belt.y] = row.map((_, x) => row[(x - belt.direction + 9) % 9] ?? 0);
    }
    return next;
}
export interface Settled { board: number[][]; cleared: number; gems: number; key: boolean }
/** Lock `cells` at (x, y) and resolve one landing: bomb blast, then full rows.
 * A full row with a padlock stays; a full sealed row keeps only its seals
 * (as crystals); any other full row disappears. Gems and the key count when
 * their cell is removed; the key turns every padlock into a crystal. Pure:
 * the engine and the placement policies share it. */
export function settle(board: number[][], cells: readonly Cell[], x: number, y: number, bomb = false): Settled {
    let next = board.map(row => [...row]);
    const got = { gems: 0, key: false };
    const take = (v: number) => { if (v === TILE.gem) got.gems++; if (v === TILE.key) got.key = true; };
    if (bomb) {
        const cx = x + (cells[0]?.x ?? 0), cy = y + (cells[0]?.y ?? 0);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const row = next[cy + dy], v = row?.[cx + dx];
            if (row && v !== undefined && v !== TILE.lock) { take(v); row[cx + dx] = 0; }
        }
    } else for (const c of cells) { const row = next[c.y + y]; if (row) row[c.x + x] = TILE.crystal; }
    let cleared = 0;
    const retained: number[][] = [];
    for (const row of next) {
        if (!row.every(v => v > 0) || row.includes(TILE.lock)) { retained.push(row); continue; }
        if (row.includes(TILE.sealed)) { row.forEach(v => { if (v !== TILE.sealed) take(v); }); retained.push(row.map(v => v === TILE.sealed ? TILE.crystal : 0)); }
        else { row.forEach(take); cleared++; }
    }
    while (retained.length < 16) retained.unshift(Array<number>(9).fill(0));
    next = got.key ? retained.map(row => row.map(v => v === TILE.lock ? TILE.crystal : v)) : retained;
    return { board: next, cleared, gems: got.gems, key: got.key };
}
export const emptyBoard = (): number[][] => Array.from({ length: 16 }, () => Array<number>(9).fill(0));
export function rotate(cells: readonly Cell[], direction: 1 | -1): Cell[] {
    const rotated = cells.map(c => ({ x: -direction * c.y, y: direction * c.x }));
    const minX = Math.min(...rotated.map(c => c.x)), minY = Math.min(...rotated.map(c => c.y));
    return rotated.map(c => ({ x: c.x - minX, y: c.y - minY }));
}
export interface Piece { id: number; cells: Cell[]; x: number; y: number }
export interface State {
    board: number[][]; active: Piece; next: number[]; score: number; lines: number; lockMs: number; resets: number;
    /** Gems freed, pieces locked, countdown: optional for older constructed positions. */
    gems?: number; locked?: number; timeLeft?: number;
}
export type Action = 'left' | 'right' | 'clockwise' | 'counterclockwise' | 'soft' | 'drop' | 'special';
export class Engine {
    level = 0;
    seed = 456;
    status: 'playing' | 'won' | 'lost' = 'playing';
    state!: State;
    reserve: number | null = null; specialUses = 1; specialTicks = 0;
    private random = new Random(456);
    private bag: number[] = [];
    private remainder = 0;
    private fall = 0;
    constructor(level = 0, seed = 456) { this.loadLevel(level, seed); }
    private dealt = 0;
    private take(): number {
        const every = stratum(this.level).bomb;
        if (every && ++this.dealt % every === 0) return BOMB;
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
        this.reserve = null; this.specialUses = 1; this.specialTicks = 0; this.reason = null; this.events = [];
        const d = stratum(level);
        this.level = level; this.seed = seed; this.random = new Random(seed); this.bag = []; this.dealt = 0; this.remainder = 0; this.fall = 0; this.status = 'playing';
        const board = emptyBoard();
        for (let y = 16 - d.rubble; y < 16; y++) {
            const holes: number[] = [];
            while (holes.length < d.holes) { const h = Math.floor(this.random.next() * 9); if (!holes.includes(h)) holes.push(h); }
            for (let x = 0; x < 9; x++) if (!holes.includes(x)) { const row = board[y]; if (row) row[x] = x < d.sealed ? TILE.sealed : TILE.crystal; }
        }
        // The key sits in the top rubble row, padlocks and gems strictly below it, never on seals.
        // Gems stay within five rows of the rubble surface: a dig, never a mine shaft.
        const top = 16 - d.rubble, plain = (rows: number, depth = 16) => board.flatMap((row, y) => y >= top + rows && y < top + rows + depth ? row.flatMap((v, x) => v === TILE.crystal ? [{ x, y }] : []) : []);
        const place = (value: number, cells: Cell[], count: number) => {
            for (let i = 0; i < count && cells.length; i++) {
                const [c] = cells.splice(Math.floor(this.random.next() * cells.length), 1);
                const row = c ? board[c.y] : undefined; if (c && row) row[c.x] = value;
            }
        };
        if (d.locks) place(TILE.key, plain(0).filter(c => c.y === top), 1);
        place(TILE.lock, plain(1), d.locks);
        place(TILE.gem, plain(d.locks ? 1 : 0, 5), d.gems);
        this.state = { board, active: this.piece(this.take()), next: [this.take(), this.take(), this.take()], score: 0, lines: 0, lockMs: 0, resets: 0, gems: 0, locked: 0, timeLeft: d.timeMs };
    }
    /** Why the stratum ended, and the last landing's events (sound, HUD). */
    reason: 'top' | 'time' | 'rise' | null = null;
    events: string[] = [];
    /** Position construite ; les actions suivantes utilisent toutes les règles normales. */
    loadState(state: State & { specialUses?: number; specialTicks?: number; reserve?: number | null }): void {
        this.specialUses = state.specialUses ?? 1; this.specialTicks = state.specialTicks ?? 0; this.reserve = state.reserve ?? null; this.reason = null;
        this.state = { gems: 0, locked: 0, timeLeft: stratum(this.level).timeMs, ...structuredClone(state) };
        for (const key of ['specialUses', 'specialTicks', 'lightPath', 'reserve']) Reflect.deleteProperty(this.state, key); this.status = 'playing'; this.remainder = 0; this.fall = 0; }
    /** Store only the shape; every retrieval respawns in its original orientation. */
    special(): boolean {
        if (this.status !== 'playing' || this.specialUses === 0) return false;
        const outgoing = this.state.active.id;
        const incoming = this.reserve ?? this.state.next.shift() ?? this.take();
        if (this.reserve === null) this.state.next.push(this.take());
        this.reserve = outgoing; this.state.active = this.piece(incoming);
        this.specialUses = 0; this.specialTicks = 30;
        this.state.lockMs = 0; this.state.resets = 0; this.fall = 0;
        if (!this.fits(this.state.active)) { this.status = 'lost'; this.reason = 'top'; }
        return true;
    }
    advance(ms: number): void { this.step(ms); }
    fits(piece: Piece): boolean {
        return piece.cells.every(c => { const x = c.x + piece.x, y = c.y + piece.y; return x >= 0 && x < 9 && y >= 0 && y < 16 && this.state.board[y]?.[x] === 0; });
    }
    private grounded(): boolean { return !this.fits({ ...this.state.active, y: this.state.active.y + 1 }); }
    input(action: Action): boolean {
        if (this.status !== 'playing') return false;
        if (action === 'special') return this.special();
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
        this.specialUses = 1;
        const a = this.state.active, l = stratum(this.level);
        const result = settle(this.state.board, a.cells, a.x, a.y, a.id === BOMB);
        this.events = [...(a.id === BOMB ? ['bomb'] : []), ...(result.gems ? ['gem'] : []), ...(result.key ? ['key'] : [])];
        this.state.board = result.board;
        const cleared = result.cleared;
        this.state.lines += cleared; this.state.gems = (this.state.gems ?? 0) + result.gems;
        this.state.score += ((cleared <= 4 ? [0, 100, 300, 600, 1000][cleared] ?? 0 : 1500 + (cleared - 5) * 600) + 250 * result.gems) * (this.level + 1);
        if (l.objective === 'lines' ? this.state.lines >= l.goal : (this.state.gems ?? 0) >= l.goal) { this.status = 'won'; return; }
        const locked = (this.state.locked ?? 0) + 1; this.state.locked = locked;
        this.state.board = slide(this.state.board, l.conveyors);
        if (l.conveyors.length) this.events.push('conveyor');
        if (l.rise && locked % l.rise === 0) {
            if (this.state.board[0]?.some(v => v !== 0)) { this.status = 'lost'; this.reason = 'rise'; return; }
            const hole = Math.floor(this.random.next() * 9);
            this.state.board = [...this.state.board.slice(1), Array.from({ length: 9 }, (_, x) => x === hole ? 0 : TILE.crystal)];
            this.events.push('rise');
        }
        this.state.active = this.piece(this.state.next.shift() ?? this.take()); this.state.next.push(this.take());
        this.state.lockMs = 0; this.state.resets = 0; this.fall = 0;
        if (!this.fits(this.state.active)) { this.status = 'lost'; this.reason = 'top'; }
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= 1000 / 60 && this.status === 'playing') {
            this.remainder -= 1000 / 60;
            if (this.specialTicks > 0) this.specialTicks--;
            if (stratum(this.level).timeMs) {
                const left = (this.state.timeLeft ?? 0) - 1000 / 60;
                this.state.timeLeft = left < 1e-7 ? 0 : left;
                if (!this.state.timeLeft) { this.status = 'lost'; this.reason = 'time'; break; }
            }
            this.fall += stratum(this.level).gravity / 60;
            while (this.fall + 1e-8 >= 1) {
                this.fall -= 1;
                if (this.fits({ ...this.state.active, y: this.state.active.y + 1 })) this.state.active.y++;
            }
            if (this.grounded()) { this.state.lockMs += 1000 / 60; if (this.state.lockMs + 1e-8 >= 500) this.lock(); }
        }
        if (this.status !== 'playing') this.remainder = 0;
    }
    snapshot() { return { ...structuredClone(this.state), reason: this.reason, dealt: this.dealt, reserve: this.reserve, specialUses: this.specialUses, specialTicks: this.specialTicks, level: this.level, seed: this.seed, status: this.status, bag: [...this.bag], random: this.random.state, fall: this.fall, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
}
