import { Random } from '../shared/random';
import { LEVELS } from './levels';
export { LEVELS };
export type Direction = 'up' | 'down' | 'left' | 'right';
export const directions: Direction[] = ['up', 'right', 'down', 'left'];
export interface Board { width: number; height: number; walls: number[]; targets: number[]; boxes: number[]; player: number }
export function parse(text: string): Board {
    const rows = text.split('\n'), width = rows[0]?.length ?? 0;
    if (width < 3 || rows.length < 3 || rows.some(r => r.length !== width || /[^# .$*@+]/.test(r))) throw new Error('Dimensions ou symbole');
    const board: Board = { width, height: rows.length, walls: [], targets: [], boxes: [], player: -1 };
    let players = 0;
    rows.forEach((r, y) => { Array.from(r).forEach((c, x) => {
        const i = y * width + x;
        if ((x === 0 || y === 0 || x === width - 1 || y === rows.length - 1) && c !== '#') throw new Error('Grille ouverte');
        if (c === '#') board.walls.push(i);
        if ('.*+'.includes(c)) board.targets.push(i);
        if ('$*'.includes(c)) board.boxes.push(i);
        if ('@+'.includes(c)) { board.player = i; players++; }
    }); });
    if (players !== 1 || !board.boxes.length || board.boxes.length !== board.targets.length) throw new Error('Occupants invalides');
    return board;
}
export function neighbor(board: Board, p: number, d: Direction): number { return p + ({ up: -board.width, down: board.width, left: -1, right: 1 })[d]; }
export function deadlocked(board: Board, boxes: number[]): boolean {
    const wall = (p: number, d: Direction) => board.walls.includes(neighbor(board, p, d));
    return boxes.some(p => !board.targets.includes(p) && (wall(p, 'up') || wall(p, 'down')) && (wall(p, 'left') || wall(p, 'right')));
}
export function difficulty(level: number) {
    const data = LEVELS[level]; if (!data) throw new RangeError('Niveau');
    return { boxes: parse(data.text).boxes.length, minimumPushes: data.minimumPushes };
}
interface State { player: number; boxes: number[]; moves: number; pushes: number; score: number }
export class Engine {
    level = 0; seed = 28; board = parse(LEVELS[0].text);
    state: State = { player: this.board.player, boxes: [...this.board.boxes], moves: 0, pushes: 0, score: 0 };
    status: 'playing' | 'won' = 'playing';
    private history: State[] = [];
    private remainder = 0;
    private random = new Random(28);
    loadLevel(index: number, seed = 28): void {
        const data = LEVELS[index]; if (!data) throw new RangeError('Niveau');
        this.level = index; this.seed = seed; this.random = new Random(seed); this.board = parse(data.text); this.restart();
    }
    /** Load an ordinary validated board; useful for small rule examples. */
    loadPuzzle(text: string): void { this.board = parse(text); this.restart(); }
    restart(): void { this.state = { player: this.board.player, boxes: [...this.board.boxes], moves: 0, pushes: 0, score: 0 }; this.status = 'playing'; this.history = []; this.remainder = 0; }
    undo(): void { const previous = this.history.pop(); if (previous) { this.state = previous; this.status = 'playing'; } }
    input(d: Direction): void {
        if (this.status !== 'playing') return;
        const next = neighbor(this.board, this.state.player, d), box = this.state.boxes.indexOf(next), beyond = neighbor(this.board, next, d);
        if (this.board.walls.includes(next) || (box >= 0 && (this.board.walls.includes(beyond) || this.state.boxes.includes(beyond)))) return;
        this.history.push({ ...this.state, boxes: [...this.state.boxes] });
        this.state.player = next; this.state.moves++;
        if (box >= 0) { this.state.boxes[box] = beyond; this.state.pushes++; }
        if (this.state.boxes.every(p => this.board.targets.includes(p))) {
            this.status = 'won';
            this.state.score = Math.max(1, Math.round(1000 * (LEVELS[this.level]?.minimumSteps ?? 1) / this.state.moves));
        }
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps');
        this.remainder += dtMs; const fixed = 1000 / 60;
        while (this.remainder + 1e-9 >= fixed) this.remainder = Math.max(0, this.remainder - fixed);
    }
    snapshot() { return { level: this.level, seed: this.seed, status: this.status, ...this.state, boxes: [...this.state.boxes], history: this.history.map(s => ({ ...s, boxes: [...s.boxes] })), remainder: this.remainder, random: this.random.state, deadlocked: deadlocked(this.board, this.state.boxes) }; }
}
