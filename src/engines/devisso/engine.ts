import { LEVELS, GAME_NAME } from './levels';
import { blast, blocker, clone, coveredBy, crateCovers, initial, parse, plateDistance, screwXY, stuck, unscrew, won, type Board, type State } from './rules';
import { solve } from './solver';
export { LEVELS, GAME_NAME };
export type Boost = 'undo' | 'hint' | 'hammer' | 'bomb' | 'drill';
export const BOOSTS: readonly Boost[] = ['undo', 'hint', 'hammer', 'bomb', 'drill'];
export const HEARTS = 5;
/** Moves a heart takes back when no move is left. */
export const RESCUE_STEPS = 3;
export const BOMB_RADIUS = 1.6;
/** Stars: three without help, two with at most two helps (boosts or hearts), one otherwise. */
export function stars(helps: number): number { return helps === 0 ? 3 : helps <= 2 ? 2 : 1; }
export class Engine {
    level = 0; seed = 28;
    board: Board = parse(LEVELS[0] ?? (() => { throw new Error('Niveaux'); })());
    state: State = initial(this.board);
    status: 'playing' | 'won' | 'lost' = 'playing';
    hearts = HEARTS;
    boosts: Record<Boost, number> = { undo: 0, hint: 0, hammer: 0, bomb: 0, drill: 0 };
    /** Boosts used and hearts spent in this attempt. */
    helps = 0;
    score = 0;
    /** Events of the last action, for sound and animation. */
    events: string[] = [];
    /** Screws and plates that left the board in the last action. */
    removed: number[] = []; fell: number[] = [];
    /** Screw suggested by the last hint, until the next action. */
    hint = -1;
    /** Animation clock (ms); never read by the rules. */
    time = 0;
    private history: State[] = [];
    constructor() { this.loadLevel(0); }
    loadLevel(index: number, seed = 28): void {
        const data = LEVELS[index]; if (!data) throw new RangeError('Niveau');
        this.level = index; this.seed = seed; this.board = parse(data); this.restart();
    }
    restart(): void {
        const data = LEVELS[this.level];
        this.state = initial(this.board); this.status = 'playing'; this.hearts = HEARTS; this.helps = 0; this.score = 0;
        this.boosts = data ? { undo: data.boosts[0], hint: data.boosts[1], hammer: data.boosts[2], bomb: data.boosts[3], drill: data.boosts[4] } : { undo: 0, hint: 0, hammer: 0, bomb: 0, drill: 0 };
        this.history = []; this.events = []; this.removed = []; this.fell = []; this.hint = -1;
    }
    get stuck(): boolean { return this.status === 'playing' && stuck(this.board, this.state); }
    get stars(): number { return stars(this.helps); }
    /** The one coin figure the player sees: coins so far, then the level score (with the star bonus) once won. */
    get purse(): number { return this.status === 'won' ? this.score : this.state.coins; }
    blocker(i: number) { return blocker(this.board, this.state, i); }
    position(i: number): [number, number] { return screwXY(this.board, this.state, i); }
    /** The screw a finger at board point (x, y) means: the nearest present, uncovered one within 0.5. */
    screwAt(x: number, y: number, any = false): number {
        let best = -1, distance = 0.5;
        this.board.screws.forEach((_, i) => {
            if (!this.state.present[i] || (!any && coveredBy(this.board, this.state, i).plates.length + coveredBy(this.board, this.state, i).crates.length > 0)) return;
            const [sx, sy] = this.position(i), d = Math.hypot(sx - x, sy - y);
            if (d < distance) { distance = d; best = i; }
        });
        return best;
    }
    private commit(next: State, events: string[], removed: number[] = [], fell: number[] = []): void {
        this.history.push(this.state); this.state = next; this.events = events; this.removed = removed; this.fell = fell; this.hint = -1;
        this.settle();
    }
    private settle(): void {
        if (won(this.state)) {
            this.status = 'won'; this.score = this.state.coins + 100 * this.stars; this.events.push('won');
        } else if (stuck(this.board, this.state)) {
            this.events.push('stuck');
            if (this.hearts === 0 && BOOSTS.every(b => b === 'hint' || this.boosts[b] === 0)) { this.status = 'lost'; this.events.push('lost'); }
        }
    }
    /** One ordinary tap on screw `i`. */
    tap(i: number): boolean {
        if (this.status !== 'playing') return false;
        const moved = unscrew(this.board, this.state, i);
        if (!moved) { this.events = [this.state.present[i] ? (this.blocker(i) ?? 'full') : 'none']; return false; }
        this.commit(moved.state, moved.events, moved.removed, moved.fell); return true;
    }
    private spend(b: Boost): boolean {
        if (this.status !== 'playing' || this.boosts[b] <= 0) return false;
        this.boosts[b]--; this.helps++; return true;
    }
    /** Annuler: back one action (boosts already spent stay spent). */
    undo(): boolean {
        if (!this.history.length || this.status !== 'playing' || this.boosts.undo <= 0) return false;
        this.spend('undo'); this.state = this.history.pop() ?? this.state; this.events = ['undo']; this.removed = []; this.fell = []; this.hint = -1;
        return true;
    }
    /** Indice: the next screw of a winning line from here (bounded search), or -1. */
    useHint(): number {
        if (this.status !== 'playing' || this.boosts.hint <= 0) return -1;
        const proof = solve(this.board, this.state, 20000);
        const next = proof?.moves[0] ?? -1;
        if (next < 0) { this.events = ['nohint']; return -1; }
        this.spend('hint'); this.hint = next; this.events = ['hint']; return next;
    }
    /** Marteau: shatters the topmost crate or plate at board point (x, y); its screws stay where they are. */
    hammer(x: number, y: number): boolean {
        if (this.status !== 'playing' || this.boosts.hammer <= 0) return false;
        const next = clone(this.state);
        const crate = this.board.crates.findIndex((c, j) => (next.crates[j] ?? 0) > 0 && crateCovers(c, x, y));
        let plate = -1;
        if (crate >= 0) next.crates[crate] = 0;
        else this.board.plates.forEach((p, k) => { if (next.plates[k] && plateDistance(this.board, next, k, x, y) < 0 && (plate < 0 || p.z >= (this.board.plates[plate]?.z ?? 0))) plate = k; });
        if (crate < 0 && plate < 0) return false;
        if (plate >= 0) next.plates[plate] = false;
        this.spend('hammer'); this.commit(next, [crate >= 0 ? 'crate' : 'shatter'], [], plate >= 0 ? [plate] : []); return true;
    }
    /** Explosion: around board point (x, y), crates, ice and chains go, and every plate covering a screw there shatters. */
    bomb(x: number, y: number): boolean {
        if (this.status !== 'playing' || this.boosts.bomb <= 0) return false;
        const next = clone(this.state);
        blast(this.board, next, x, y, BOMB_RADIUS);
        const fell: number[] = [];
        this.board.screws.forEach((_, i) => {
            const [sx, sy] = screwXY(this.board, next, i);
            if (!next.present[i] || Math.hypot(sx - x, sy - y) > BOMB_RADIUS) return;
            for (const p of coveredBy(this.board, next, i).plates) if (next.plates[p]) { next.plates[p] = false; fell.push(p); }
        });
        this.spend('bomb'); this.commit(next, ['tnt'], [], fell); return true;
    }
    /** Perçage: any screw out, whatever covers or holds it, if a box or the buffer takes it. */
    drill(i: number): boolean {
        if (this.status !== 'playing' || this.boosts.drill <= 0) return false;
        const moved = unscrew(this.board, this.state, i, true);
        if (!moved) return false;
        this.spend('drill'); this.commit(moved.state, ['drill', ...moved.events], moved.removed, moved.fell); return true;
    }
    /** A heart takes back the last moves when none is possible. */
    rescue(): boolean {
        if (this.status !== 'playing' || this.hearts <= 0 || !stuck(this.board, this.state)) return false;
        this.hearts--; this.helps++;
        for (let k = 0; k < RESCUE_STEPS && this.history.length; k++) this.state = this.history.pop() ?? this.state;
        this.events = ['rescue']; this.removed = []; this.fell = []; this.hint = -1;
        this.settle(); return true;
    }
    advance(ms: number): void { if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps'); this.time += ms; }
    step(ms: number): void { this.advance(ms); }
    snapshot() {
        const s = this.state;
        return {
            level: this.level, seed: this.seed, status: this.status, stuck: this.stuck, hearts: this.hearts, helps: this.helps, stars: this.stars, score: this.score, purse: this.purse,
            boosts: { ...this.boosts }, events: [...this.events], hint: this.hint, moves: s.moves, coins: s.coins, boxes: s.boxes, gold: s.gold,
            present: [...s.present], plates: [...s.plates], slots: s.slots.map(b => b ? { ...b } : null), next: s.next, buffer: [...s.buffer], cap: s.cap,
            ice: [...s.ice], unlocked: s.unlocked, crates: [...s.crates], shift: s.shift.map(([x, y]) => [x, y]),
            remaining: s.present.filter(Boolean).length, total: this.board.screws.length, history: this.history.length,
        };
    }
}
