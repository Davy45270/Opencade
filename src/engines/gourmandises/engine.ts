import { Random } from '../shared/random';
import { levelAt, terrain, type Objective, type Terrain } from './levels';
import { ids, type CharacterId } from '../../characters/model';
export type Special = 'row' | 'column' | 'wrapped' | 'color';
export type Mode = 'discovery' | 'arcade';
export type Tool = 'hammer' | 'rocket' | 'rainbow';
export interface Piece { color: number; drop?: boolean; special?: Special }
export interface Cell extends Terrain { piece: Piece | null }
export interface Match { cells: number[]; special?: Special }
export interface Event {
    type: 'swap' | 'refused' | 'match' | 'special' | 'cascade' | 'obstacle' | 'fall' | 'fill' | 'shuffle' | 'drop' | 'won' | 'lost';
    cells: number[];
    multiplier: number;
    from?: number;
    to?: number;
    piece?: Piece;
}
export interface State {
    level: number;
    seed: number;
    rng: number;
    width: number;
    height: number;
    colors: number;
    cells: Cell[];
    objectives: Objective[];
    collected: number[];
    broken: { crate: number; ice: number };
    dropped?: number;
    score: number;
    moves: number;
    budget: number;
    mode: Mode;
    status: 'playing' | 'won' | 'lost';
    tools: Record<Tool, number>;
    idle: number;
    character: CharacterId;
}
export class Engine {
    state!: State;
    events: Event[] = [];
    private recording = true;
    private random = new Random(28);
    private mode: Mode;
    private character: CharacterId;
    constructor(mode: Mode = 'discovery', character: CharacterId = 'panda') {
        this.mode = mode;
        this.character = character;
        this.loadLevel(0, undefined, mode, character);
    }
    get status() { return this.state.status; }
    set status(value: State['status']) { this.state.status = value; }
    get level() { return this.state.level; }
    loadLevel(index: number, seed = levelAt(index).seed, mode = this.mode, character = this.character): void {
        const level = levelAt(index);
        this.mode = mode;
        this.character = character;
        this.random = new Random(seed);
        this.state = {
            level: index, seed, rng: seed, width: level.width, height: level.height,
            colors: level.colors, cells: terrain(level).map(t => ({ ...t, piece: null })),
            objectives: level.objectives.map(o => ({ ...o })), collected: Array<number>(7).fill(0),
            broken: { crate: 0, ice: 0 }, score: 0, moves: 0, budget: level.moves,
            mode, status: 'playing', tools: { hammer: mode === 'discovery' ? 3 : 1,
                rocket: mode === 'discovery' ? 3 : 1, rainbow: mode === 'discovery' ? 3 : 1 },
            idle: 0, character,
        };
        this.events = [];
        this.shuffle();
        if (level.layout % 5 === 1 || level.layout % 5 === 4) {
            const center = Math.floor(this.state.height / 2) * this.state.width + Math.floor(this.state.width / 2);
            const middle = this.state.cells[center]?.piece ? center
                : this.state.cells.findIndex((c, i) => i >= this.state.cells.length / 2 && c.piece);
            const piece = this.state.cells[middle]?.piece;
            if (piece) piece.special = level.finale ? 'color' : 'row';
        }
        if (level.world === 4) {
            this.state.dropped = 0;
            this.supplyDrops();
            if (!this.validMoves(true).length) this.shuffle();
        }
        this.events = [];
    }
    snapshot(): State {
        this.state.rng = this.random.state;
        return structuredClone(this.state);
    }
    restore(state: State): void {
        if (state.cells.length !== state.width * state.height || state.width < 3 || state.height < 3) {
            throw new Error('Plateau invalide');
        }
        const persisted: Partial<State> = state;
        if (!ids.includes(state.character) || !persisted.tools || !persisted.broken
            || !Array.isArray(state.collected) || state.collected.length !== 7
            || state.collected.some(n => !Number.isInteger(n) || n < 0)
            || ['hammer', 'rocket', 'rainbow'].some(key => {
                const count = state.tools[key as Tool];
                return !Number.isInteger(count) || count < 0 || count > 3;
            })
            || (persisted.dropped !== undefined && (!Number.isInteger(persisted.dropped) || persisted.dropped < 0))
            || !Number.isFinite(state.score) || state.score < 0
            || !Number.isFinite(state.idle) || state.idle < 0
            || !Number.isInteger(state.budget) || state.budget < 0
            || !['discovery', 'arcade'].includes(state.mode) || !['playing', 'won', 'lost'].includes(state.status)
            || !Number.isInteger(state.rng) || !Number.isInteger(state.moves) || state.moves < 0
            || !Number.isInteger(state.colors) || state.colors < 5 || state.colors > 7
            || !state.objectives.length || state.objectives.some(o => !Number.isFinite(o.target) || o.target <= 0)
            || state.cells.some(c => typeof c.active !== 'boolean' || ![0, 1, 2].includes(c.crate)
                || ![0, 1, 2].includes(c.ice) || ((!c.active || c.crate > 0) && c.piece !== null)
                || (c.piece !== null && (!Number.isInteger(c.piece.color) || c.piece.color < 0
                    || c.piece.color >= state.colors || (c.piece.drop !== undefined
                        && (!c.piece.drop || c.piece.color !== 2 || c.piece.special !== undefined)))))) {
            throw new Error('État invalide');
        }
        this.state = structuredClone(state);
        this.mode = state.mode;
        this.character = state.character;
        this.random = new Random(state.rng);
        this.events = [];
    }
    clone(recordEvents = true): Engine {
        const engine = Object.create(Engine.prototype) as Engine;
        this.state.rng = this.random.state;
        engine.state = {
            ...this.state,
            cells: this.state.cells.map(cell => ({ ...cell, piece: cell.piece ? { ...cell.piece } : null })),
            objectives: this.state.objectives.map(objective => ({ ...objective })),
            collected: [...this.state.collected],
            broken: { ...this.state.broken },
            tools: { ...this.state.tools },
        };
        engine.recording = recordEvents;
        engine.mode = this.mode;
        engine.character = this.character;
        engine.random = new Random(this.random.state);
        engine.events = [];
        return engine;
    }
    private emit(type: Event['type'], cells: number[], multiplier = 1, motion?: { from?: number; to?: number; piece?: Piece }): void {
        if (!this.recording) return;
        this.events.push({ type, cells: [...cells], multiplier, ...motion });
    }
    adjacent(a: number, b: number): boolean {
        const w = this.state.width;
        return Math.abs(a % w - b % w) + Math.abs(Math.floor(a / w) - Math.floor(b / w)) === 1;
    }
    private nextColor(): number {
        const target = this.state.objectives.find(o => o.kind === 'collect')
            ?? (levelAt(this.state.level).world === 4 ? { kind: 'collect', color: 2 } : undefined);
        const weight = levelAt(this.state.level).targetWeight;
        const draw = this.random.next() * (this.state.colors - 1 + weight);
        if (target?.kind !== 'collect') return Math.floor(draw) % this.state.colors;
        if (draw < weight) return target.color;
        const other = Math.floor(draw - weight);
        return other >= target.color ? other + 1 : other;
    }
    private movable(i: number): boolean {
        const c = this.state.cells[i];
        return !!c?.active && !c.crate && !!c.piece;
    }
    neighbors(i: number): number[] {
        const w = this.state.width;
        return [i - w, i - 1, i + 1, i + w].filter(j => j >= 0 && j < this.state.cells.length && this.adjacent(i, j));
    }
    matches(): Match[] {
        const { cells, width: w, height: h } = this.state;
        const runs: number[][] = [];
        for (const vertical of [false, true]) {
            for (let outer = 0; outer < (vertical ? w : h); outer++) {
                let run: number[] = [];
                const flush = (): void => {
                    if (run.length >= 3) runs.push(run);
                    run = [];
                };
                for (let inner = 0; inner < (vertical ? h : w); inner++) {
                    const i = vertical ? inner * w + outer : outer * w + inner;
                    const p = this.movable(i) && !cells[i]?.piece?.drop ? cells[i]?.piece : null;
                    const previous = cells[run[0] ?? -1]?.piece;
                    if (!p || (previous && previous.color !== p.color)) flush();
                    if (p) run.push(i);
                }
                flush();
            }
        }
        // Merge intersecting runs transitively: an L or T creates one wrapped piece.
        const groups: { cells: Set<number>; longest: number; crossed: boolean }[] = [];
        for (const run of runs) {
            const linked = groups.filter(g => run.some(i => g.cells.has(i)));
            const group = { cells: new Set(run), longest: run.length, crossed: linked.length > 0 };
            for (const old of linked) {
                for (const i of old.cells) group.cells.add(i);
                group.longest = Math.max(group.longest, old.longest);
                groups.splice(groups.indexOf(old), 1);
            }
            groups.push(group);
        }
        return groups.map(g => ({ cells: [...g.cells], special: g.longest >= 5 ? 'color'
            : g.crossed ? 'wrapped' : g.longest === 4 ? 'row' : undefined }));
    }
    private matchedAt(i: number): boolean {
        const color = this.state.cells[i]?.piece?.color;
        if (color === undefined || this.state.cells[i]?.piece?.drop) return false;
        for (const step of [1, this.state.width]) {
            let count = 1;
            for (const direction of [-1, 1]) {
                let previous = i;
                let next = i + step * direction;
                while (this.adjacent(previous, next) && this.movable(next)
                    && !this.state.cells[next]?.piece?.drop && this.state.cells[next]?.piece?.color === color) {
                    count++;
                    previous = next;
                    next += step * direction;
                }
            }
            if (count >= 3) return true;
        }
        return false;
    }
    validMoves(firstOnly = false): [number, number][] {
        const moves: [number, number][] = [];
        for (let a = 0; a < this.state.cells.length; a++) {
            if (!this.movable(a)) continue;
            for (const b of [a + 1, a + this.state.width]) {
                if (!this.adjacent(a, b) || !this.movable(b)) continue;
                const ca = required(this.state.cells[a]);
                const cb = required(this.state.cells[b]);
                if (ca.piece?.special || cb.piece?.special) {
                    moves.push([a, b]);
                    if (firstOnly) return moves;
                    continue;
                }
                [ca.piece, cb.piece] = [cb.piece, ca.piece];
                const valid = this.matchedAt(a) || this.matchedAt(b);
                [ca.piece, cb.piece] = [cb.piece, ca.piece];
                if (valid) {
                    moves.push([a, b]);
                    if (firstOnly) return moves;
                }
            }
        }
        return moves;
    }
    /** Seeded permutation of the inventory; initial boards use run-free filling. */
    shuffle(): void {
        this.deliverDrops();
        const slots = this.state.cells.flatMap((c, i) => c.active && !c.crate && !c.piece?.drop ? [i] : []);
        const inventory = slots.flatMap(i => {
            const piece = this.state.cells[i]?.piece;
            return piece ? [{ ...piece }] : [];
        });
        if (inventory.length === slots.length) {
            for (let attempt = 0; attempt < 10000; attempt++) {
                for (let i = inventory.length - 1; i > 0; i--) {
                    const j = Math.floor(this.random.next() * (i + 1));
                    const piece = required(inventory[i]);
                    inventory[i] = required(inventory[j]);
                    inventory[j] = piece;
                }
                slots.forEach((i, index) => { required(this.state.cells[i]).piece = { ...required(inventory[index]) }; });
                if (!this.matches().length && this.validMoves(true).length) {
                    this.emit('shuffle', []);
                    return;
                }
            }
            throw new Error('Inventaire incompatible avec cette forme');
        }
        const specials = this.state.cells.map(c => c.piece?.special);
        for (let attempt = 0; attempt < 10000; attempt++) {
            for (let i = 0; i < this.state.cells.length; i++) {
                const c = required(this.state.cells[i]);
                if (c.piece?.drop) continue;
                if (!c.active || c.crate) {
                    c.piece = null;
                    continue;
                }
                const excluded = new Set<number>();
                const w = this.state.width;
                if (i % w >= 2 && this.state.cells[i - 1]?.piece && this.state.cells[i - 1]?.piece?.color === this.state.cells[i - 2]?.piece?.color) {
                    excluded.add(required(required(this.state.cells[i - 1]).piece).color);
                }
                if (this.state.cells[i - w]?.piece && this.state.cells[i - w]?.piece?.color === this.state.cells[i - 2 * w]?.piece?.color) {
                    excluded.add(required(required(this.state.cells[i - w]).piece).color);
                }
                let color = this.nextColor();
                while (excluded.has(color)) color = (color + 1) % this.state.colors;
                c.piece = { color, special: specials[i] };
            }
            if (this.validMoves(true).length) {
                this.emit('shuffle', []);
                return;
            }
        }
        throw new Error('Forme sans permutation possible');
    }
    swap(a: number, b: number): boolean {
        this.events = [];
        if (this.status !== 'playing' || !this.adjacent(a, b) || !this.movable(a) || !this.movable(b)) return false;
        const ca = required(this.state.cells[a]);
        const cb = required(this.state.cells[b]);
        [ca.piece, cb.piece] = [cb.piece, ca.piece];
        const groups = this.matches();
        if (!ca.piece?.special && !cb.piece?.special && !groups.some(g => g.cells.includes(a) || g.cells.includes(b))) {
            [ca.piece, cb.piece] = [cb.piece, ca.piece];
            this.emit('refused', [a, b]);
            return false;
        }
        this.state.moves++;
        this.state.idle = 0;
        this.emit('swap', [a, b]);
        if (ca.piece?.special || cb.piece?.special) this.combine(a, b);
        this.resolve(b, a);
        return true;
    }
    private line(i: number, vertical: boolean, radius = 0): number[] {
        const w = this.state.width;
        return this.state.cells.flatMap((_, j) => {
            const distance = vertical ? Math.abs(j % w - i % w) : Math.abs(Math.floor(j / w) - Math.floor(i / w));
            return distance <= radius ? [j] : [];
        });
    }
    private area(i: number): number[] {
        const w = this.state.width;
        return this.state.cells.flatMap((_, j) => Math.abs(j % w - i % w) <= 1
            && Math.abs(Math.floor(j / w) - Math.floor(i / w)) <= 1 ? [j] : []);
    }
    private combine(a: number, b: number): void {
        const pa = required(required(this.state.cells[a]).piece);
        const pb = required(required(this.state.cells[b]).piece);
        const sa = pa.special;
        const sb = pb.special;
        let hit: number[] = sa ? [a] : [b];
        if (sa === 'color' || sb === 'color') {
            const other = sa === 'color' ? pb : pa;
            hit = this.state.cells.flatMap((c, i) => other.special === 'color' || (!c.piece?.drop && c.piece?.color === other.color) ? [i] : []);
            if (other.special === 'row' || other.special === 'column') {
                for (const i of hit) required(required(this.state.cells[i]).piece).special = i % 2 ? 'row' : 'column';
            }
            if (pa.special === 'color') delete pa.special;
            if (pb.special === 'color') delete pb.special;
            hit.push(a, b);
        } else if (sa && sb) {
            if (sa === 'wrapped' || sb === 'wrapped') {
                hit = [...this.line(b, false, 1), ...this.line(b, true, 1)];
            } else hit = [...this.line(b, false), ...this.line(b, true)];
            // The pair has already contributed its combined footprint.
            delete pa.special;
            delete pb.special;
        }
        this.clear(hit, 1);
        this.gravity();
    }
    /** One damage per obstacle per wave; triggered specials join the same wave. */
    private clear(indices: number[], multiplier: number, protectedCells = new Set<number>()): void {
        const hit = new Set(indices);
        const triggered = new Set<number>();
        const second: number[] = [];
        for (const i of hit) {
            const piece = this.state.cells[i]?.piece;
            if (piece?.drop || !piece?.special || triggered.has(i) || protectedCells.has(i)) continue;
            triggered.add(i);
            this.emit('special', [i], multiplier);
            let spread: number[];
            if (piece.special === 'row' || piece.special === 'column') spread = this.line(i, piece.special === 'column');
            else if (piece.special === 'wrapped') {
                spread = this.area(i);
                second.push(...spread);
            } else spread = this.state.cells.flatMap((c, j) => c.piece?.color === piece.color ? [j] : []);
            for (const j of spread) hit.add(j);
        }
        const crates = new Set<number>();
        for (const i of hit) {
            const cell = this.state.cells[i];
            if (!cell?.active) continue;
            if (cell.ice) {
                cell.ice--;
                this.state.broken.ice++;
                this.emit('obstacle', [i], multiplier);
            }
            if (protectedCells.has(i)) continue;
            if (cell.crate) {
                crates.add(i);
                continue;
            }
            if (!cell.piece || cell.piece.drop) continue;
            const color = cell.piece.color;
            this.state.collected[color] = (this.state.collected[color] ?? 0) + 1;
            this.state.score += 10 * multiplier;
            cell.piece = null;
            for (const j of this.neighbors(i)) if (this.state.cells[j]?.crate) crates.add(j);
        }
        for (const i of crates) {
            required(this.state.cells[i]).crate--;
            this.state.broken.crate++;
            this.emit('obstacle', [i], multiplier);
        }
        this.emit('match', [...hit].filter(i => !protectedCells.has(i) && !this.state.cells[i]?.piece?.drop), multiplier);
        if (second.length) {
            this.gravity();
            this.clear(second, multiplier);
        }
    }
    /** Outlets consume objects immediately; objects are never cleared as sweets. */
    private deliverDrops(): void {
        for (let i = 0; i < this.state.cells.length; i++) {
            const cell = required(this.state.cells[i]);
            if (!cell.exit || !cell.piece?.drop) continue;
            cell.piece = null;
            this.state.dropped = (this.state.dropped ?? 0) + 1;
            this.emit('drop', [i]);
        }
    }
    private supplyDrops(): void {
        const goal = this.state.objectives.find(o => o.kind === 'drop');
        if (!goal) return;
        const remaining = goal.target - (this.state.dropped ?? 0);
        const aboard = this.state.cells.filter(c => c.piece?.drop).length;
        const capacity = levelAt(this.state.level).layout === 2 ? 2 : 3;
        const needed = Math.min(capacity, remaining) - aboard;
        if (needed <= 0) return;
        const { width: w, height: h, cells } = this.state;
        const entries: number[] = [];
        for (let x = 0; x < w; x++) {
            // Only feed columns which reach a bottom outlet without interruption.
            let top = 0;
            while (top < h && !cells[top * w + x]?.active) top++;
            const path = Array.from({ length: h - top }, (_, y) => cells[(top + y) * w + x]);
            if (path.length > 2 && path.every(c => c?.active && !c.crate)
                && !path.some(c => c?.piece?.drop)) entries.push(top * w + x);
        }
        for (const i of entries.slice(0, needed)) {
            required(cells[i]).piece = { color: 2, drop: true };
            this.emit('fill', [i], 1, { to: i, from: i - w, piece: { color: 2, drop: true } });
        }
    }
    gravity(): void {
        const { cells, width: w, height: h } = this.state;
        for (let x = 0; x < w; x++) {
            let segment: number[] = [];
            const flush = (): void => {
                const pieces = segment.flatMap(i => {
                    const piece = required(cells[i]).piece;
                    return piece ? [{ piece, from: i }] : [];
                });
                for (let j = segment.length - 1; j >= 0; j--) {
                    const i = required(segment[j]);
                    const piece = pieces.pop();
                    const filled = piece?.piece ?? { color: this.nextColor() };
                    required(cells[i]).piece = filled;
                    const from = piece?.from ?? required(segment[0]) - w;
                    if (from !== i) this.emit(piece ? 'fall' : 'fill', [i], 1, { from, to: i, piece: { ...filled } });
                }
                if (segment.some(i => cells[i]?.exit && cells[i].piece?.drop)) {
                    this.deliverDrops();
                    flush();
                    return;
                }
                segment = [];
            };
            for (let y = 0; y < h; y++) {
                const i = y * w + x;
                if (!required(cells[i]).active || required(cells[i]).crate) flush();
                else segment.push(i);
            }
            flush();
        }
        this.supplyDrops();
    }
    resolve(preferred = -1, origin = -1): void {
        this.deliverDrops();
        for (let cascade = 1; cascade <= 100; cascade++) {
            const groups = this.matches();
            if (!groups.length) break;
            if (cascade > 1) this.emit('cascade', groups.flatMap(g => g.cells), cascade);
            const protectedCells = new Set<number>();
            for (const group of groups) {
                if (!group.special) continue;
                const i = group.cells.includes(preferred) ? preferred : required(group.cells[0]);
                const piece = required(required(this.state.cells[i]).piece);
                piece.special = group.special === 'row' && origin >= 0 && Math.abs(preferred - origin) === this.state.width
                    ? 'column' : group.special;
                protectedCells.add(i);
                this.emit('special', [i], cascade, { piece: { ...piece } });
            }
            this.clear(groups.flatMap(g => g.cells), cascade, protectedCells);
            this.gravity();
            if (cascade === 100) this.shuffle();
        }
        if (!this.validMoves(true).length) this.shuffle();
        this.checkStatus();
    }
    progress(objective: Objective): number {
        if (objective.kind === 'collect') return this.state.collected[objective.color] ?? 0;
        if (objective.kind === 'drop') return this.state.dropped ?? 0;
        if (objective.kind === 'score') return this.state.score;
        return this.state.broken[objective.kind];
    }
    private checkStatus(): void {
        if (this.state.objectives.every(o => this.progress(o) >= o.target)) this.status = 'won';
        else if (this.state.mode === 'arcade' && this.state.moves >= this.state.budget) this.status = 'lost';
        if (this.status !== 'playing') this.emit(this.status, []);
    }
    get stars(): number {
        if (this.status !== 'won') return 0;
        return this.state.score >= 3000 ? 3 : this.state.score >= 1500 ? 2 : 1;
    }
    useTool(tool: Tool, target: number): boolean {
        this.events = [];
        const cell = this.state.cells[target];
        if (this.status !== 'playing' || !cell?.active || this.state.tools[tool] <= 0) return false;
        const piece = cell.piece;
        if (tool === 'rainbow' && !piece) return false;
        this.state.tools[tool]--;
        this.state.idle = 0;
        const hit = tool === 'hammer' ? [target] : tool === 'rocket' ? this.line(target, false)
            : this.state.cells.flatMap((c, i) => piece && c.piece?.color === piece.color ? [i] : []);
        this.clear(hit, 1);
        this.gravity();
        this.resolve();
        return true;
    }
    advance(ms: number): void {
        if (this.status === 'playing') this.state.idle += Math.max(0, ms);
    }
    hint(): [number, number] | null {
        return this.state.mode === 'discovery' && this.state.idle >= 5000 ? this.validMoves()[0] ?? null : null;
    }
}
/** Immediate objective gain; cargo descent breaks ties before score and grid order.
 */
export function greedyMove(engine: Engine): [number, number] | null {
    let best: [number, number] | null = null;
    let value = [-Infinity, -Infinity, -Infinity];
    for (const move of engine.validMoves()) {
        const copy = engine.clone(false);
        copy.swap(...move);
        const gain = engine.state.objectives.reduce((sum, o) => sum
            + Math.min(o.target, copy.progress(o)) - Math.min(o.target, engine.progress(o)), 0);
        const descent = (state: State): number => state.cells.reduce((sum, cell, i) => sum
            + (cell.piece?.drop ? Math.floor(i / state.width) : 0), 0)
            + (state.dropped ?? 0) * state.height;
        const dropGain = engine.state.objectives.some(o => o.kind === 'drop')
            ? descent(copy.state) - descent(engine.state) : 0;
        const rank = [gain, dropGain, copy.state.score - engine.state.score];
        const firstDifference = rank.findIndex((part, i) => part !== value[i]);
        if (firstDifference >= 0 && required(rank[firstDifference]) > required(value[firstDifference])) {
            value = rank;
            best = move;
        }
    }
    return best;
}

function required<T>(value: T | null | undefined): T {
    if (value == null) throw new Error('Valeur attendue');
    return value;
}
