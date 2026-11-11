/** Dévisso rules: one pure transition shared by the engine, the solver and the validators.
 *   A screw can be unscrewed when no plate of a higher layer (and no crate) covers it, and when
 *   its own lock, ice and chain allow it. It goes to the first active box of its colour with room,
 *   otherwise to the buffer; a full buffer refuses it. A full box (3/3) is validated and replaced
 *   by the next box of the queue, which first takes its screws from the buffer. A plate without
 *   any screw left falls. The level is won when every box of the queue is full.
 *   Specials: key (opens every lock), lock, tnt (blast: crates, ice and chains around it), rainbow
 *   (completes the box whose colour lacks a screw; it waits in the buffer until that box is open), gold (bonus coins, unlocks the sixth buffer slot), ice
 *   (thaws one step per move), gear (slides a plate when removed), portal (removing one of a pair
 *   brings the other out too), chain (held while its anchor screw is in place).
 *   Crates sit above every plate; each screw removed next to one cracks it, a blast breaks it. */
import { rotate, shape, shapeDistance } from './shapes';

export const COLOR_LETTERS = 'RBYGVPOC';
export const RAINBOW = 8;
export const BASE_BUFFER = 5;
export const BOX_SIZE = 3;
/** Boxes open side by side (measured against one: see GAME_SPEC, Dévisso). */
export const ACTIVE = 1;
export const CRATE_REACH = 1.6;
export const BLAST = 2.2;
export type Theme = 'atelier' | 'usine' | 'jouets' | 'nature' | 'espace' | 'glace';
export type Material = 'plastique' | 'bois' | 'metal' | 'caoutchouc' | 'verre' | 'cristal';
export type Special = 'key' | 'lock' | 'tnt' | 'rainbow' | 'gold' | { ice: number } | { gear: readonly [number, number, number] } | { portal: string } | { chain: string };
/** [shape, x, y, layer, tint (colour index of the plate), material?, quarter turns?, holes without screw?] */
export type PlateDef = readonly [string, number, number, number, number, Material?, number?, string?];
export interface LevelDef {
    name: string; en: string; theme: Theme; picture: string;
    plates: readonly PlateDef[];
    crates?: readonly (readonly [number, number, number])[];
    /** By screw position `x,y` (the topmost screw there). */
    specials?: Readonly<Record<string, Special>>;
    /** One letter per screw (RBYGVPOC, `*` rainbow), in plate then hole order. */
    colors: string;
    /** Box colours in arrival order. */
    queue: string;
    /** Undo, hint, hammer, blast, drill. */
    boosts: readonly [number, number, number, number, number];
    /** Moves of the recorded win (one per tap; a portal pair counts once). */
    moves: number;
    /** Moves of the shortest recorded dead end ("Aucun coup possible !") without boosts. */
    trap: number;
}
export interface Plate { shape: string; x: number; y: number; z: number; tint: number; material: Material; rot: number }
export interface Screw {
    plate: number; lx: number; ly: number; color: number;
    key: boolean; lock: boolean; tnt: boolean; gold: boolean; ice: number;
    gear: readonly [number, number, number] | null; portal: number; chain: number;
}
/** `wild[c]`: rainbow screws that complete a box of colour `c` (the screws of that colour it lacks). */
export interface Board { plates: Plate[]; screws: Screw[]; crates: { x: number; y: number; hp: number }[]; queue: number[]; wild: number[] }
export interface Box { color: number; filled: number }
export interface State {
    present: boolean[]; plates: boolean[]; shift: [number, number][];
    slots: (Box | null)[]; next: number; buffer: number[]; cap: number;
    ice: number[]; chained: boolean[]; unlocked: boolean; crates: number[];
    moves: number; boxes: number; gold: number; coins: number;
    /** Rainbow screws already given to boxes of each colour. */
    wild: number[];
}
export function colorOf(letter: string): number {
    if (letter === '*') return RAINBOW;
    const c = COLOR_LETTERS.indexOf(letter); if (c < 0) throw new Error(`Couleur inconnue : ${letter}`);
    return c;
}
export function parse(level: LevelDef): Board {
    const plates: Plate[] = level.plates.map(([name, x, y, z, tint, material = 'plastique', rot = 0]) => { shape(name); return { shape: name, x, y, z, tint, material, rot }; });
    const screws: Screw[] = [];
    level.plates.forEach(([name, , , , , , rot = 0, empty = ''], p) => {
        shape(name).holes.forEach(([hx, hy], h) => {
            if (empty.includes(String.fromCharCode(97 + h))) return;
            const [lx, ly] = rotate(hx, hy, rot);
            screws.push({ plate: p, lx, ly, color: 0, key: false, lock: false, tnt: false, gold: false, ice: 0, gear: null, portal: -1, chain: -1 });
        });
    });
    // An empty colouring gives the bare layout (offline search, layout checks): every screw red, rainbows kept.
    const layout = level.colors === '';
    if (!layout && level.colors.length !== screws.length) throw new Error(`${level.name} : ${String(screws.length)} vis, ${String(level.colors.length)} couleurs`);
    screws.forEach((s, i) => { s.color = layout ? 0 : colorOf(level.colors[i] ?? ''); });
    const at = (where: string): number => {
        const [x, y] = where.split(',').map(Number);
        let best = -1;
        screws.forEach((s, i) => {
            const p = plates[s.plate];
            if (p && Math.abs(p.x + s.lx - (x ?? NaN)) < 0.01 && Math.abs(p.y + s.ly - (y ?? NaN)) < 0.01 && (best < 0 || p.z > (plates[screws[best]?.plate ?? 0]?.z ?? 0))) best = i;
        });
        if (best < 0) throw new Error(`${level.name} : aucune vis en ${where}`);
        return best;
    };
    const rainbows = new Set<number>();
    for (const [where, special] of Object.entries(level.specials ?? {})) {
        const i = at(where), s = screws[i]; if (!s) continue;
        if (special === 'key') s.key = true; else if (special === 'lock') s.lock = true; else if (special === 'tnt') s.tnt = true;
        else if (special === 'gold') s.gold = true; else if (special === 'rainbow') rainbows.add(i);
        else if ('ice' in special) s.ice = special.ice; else if ('gear' in special) s.gear = special.gear;
        else if ('portal' in special) { const j = at(special.portal); s.portal = j; const t = screws[j]; if (t) t.portal = i; } else s.chain = at(special.chain);
    }
    plates.forEach((_, p) => { if (!screws.some(s => s.plate === p)) throw new Error(`${level.name} : plaque ${String(p)} sans vis`); });
    if (layout) rainbows.forEach(i => { const s = screws[i]; if (s) s.color = RAINBOW; });
    screws.forEach((s, i) => { if ((s.color === RAINBOW) !== rainbows.has(i)) throw new Error(`${level.name} : vis ${String(i)} arc-en-ciel`); });
    const queue = Array.from(level.queue, colorOf);
    if (layout) return { plates, screws, crates: (level.crates ?? []).map(([x, y, hp]) => ({ x, y, hp })), queue, wild: Array<number>(8).fill(0) };
    // Exact accounting: every box is filled by its colour, rainbows fill what is missing.
    const counts = Array.from({ length: 9 }, (_, c) => screws.filter(s => s.color === c).length);
    const wanted = Array.from({ length: 8 }, (_, c) => queue.filter(q => q === c).length * BOX_SIZE);
    if (queue.length * BOX_SIZE !== screws.length || wanted.some((w, c) => (counts[c] ?? 0) > w)) throw new Error(`${level.name} : file de boîtes incohérente`);
    return { plates, screws, crates: (level.crates ?? []).map(([x, y, hp]) => ({ x, y, hp })), queue, wild: wanted.map((w, c) => w - (counts[c] ?? 0)) };
}
export function initial(board: Board, active = ACTIVE): State {
    return {
        present: board.screws.map(() => true), plates: board.plates.map(() => true), shift: board.plates.map(() => [0, 0]),
        slots: Array.from({ length: active }, (_, i) => board.queue[i] === undefined ? null : { color: board.queue[i] ?? 0, filled: 0 }), next: Math.min(active, board.queue.length),
        buffer: [], cap: BASE_BUFFER, ice: board.screws.map(s => s.ice), chained: board.screws.map(s => s.chain >= 0), unlocked: false,
        crates: board.crates.map(c => c.hp), moves: 0, boxes: 0, gold: 0, coins: 0, wild: board.wild.map(() => 0),
    };
}
export function clone(s: State): State {
    return { ...s, present: [...s.present], plates: [...s.plates], shift: s.shift.map(([x, y]) => [x, y]), slots: s.slots.map(b => b ? { ...b } : null),
        buffer: [...s.buffer], ice: [...s.ice], chained: [...s.chained], crates: [...s.crates], wild: [...s.wild] };
}
/** Board position of a screw (its plate may have slid). */
export function screwXY(board: Board, s: State, i: number): [number, number] {
    const screw = board.screws[i]; const plate = screw ? board.plates[screw.plate] : undefined;
    if (!screw || !plate) return [0, 0];
    const [dx, dy] = s.shift[screw.plate] ?? [0, 0];
    return [plate.x + dx + screw.lx, plate.y + dy + screw.ly];
}
/** Signed distance from a board point to plate `p` in its current place (negative inside). */
export function plateDistance(board: Board, s: State, p: number, x: number, y: number): number {
    const plate = board.plates[p]; if (!plate) return Infinity;
    const [dx, dy] = s.shift[p] ?? [0, 0];
    const [lx, ly] = rotate(x - plate.x - dx, y - plate.y - dy, 4 - plate.rot);
    return shapeDistance(shape(plate.shape), lx, ly);
}
export const CRATE_HALF = 0.75;
export function crateCovers(c: { x: number; y: number }, x: number, y: number): boolean { return Math.abs(x - c.x) < CRATE_HALF && Math.abs(y - c.y) < CRATE_HALF; }
/** Plates and crates in place above screw `i`. */
/** For each screw, the plates of higher layers and the crates that sit over it, for one set of plate
 * shifts. Boards never change after parse(): computed once per board and per shift set. */
const covers = new WeakMap<Board, Map<string, { plates: number[][]; crates: number[][] }>>();
function coverage(board: Board, s: State): { plates: number[][]; crates: number[][] } {
    let byShift = covers.get(board);
    if (!byShift) { byShift = new Map(); covers.set(board, byShift); }
    const shiftKey = s.shift.some(([x, y]) => x || y) ? s.shift.map(([x, y]) => `${String(x)},${String(y)}`).join(';') : '';
    let c = byShift.get(shiftKey);
    if (!c) {
        const plates: number[][] = [], crates: number[][] = [];
        board.screws.forEach((screw, i) => {
            const z = board.plates[screw.plate]?.z ?? 0, [x, y] = screwXY(board, s, i);
            plates.push(board.plates.flatMap((p, k) => p.z > z && plateDistance(board, s, k, x, y) < 0 ? [k] : []));
            crates.push(board.crates.flatMap((cr, k) => crateCovers(cr, x, y) ? [k] : []));
        });
        c = { plates, crates }; byShift.set(shiftKey, c);
    }
    return c;
}
/** Plates and crates in place above screw `i`. */
export function coveredBy(board: Board, s: State, i: number): { plates: number[]; crates: number[] } {
    const c = coverage(board, s);
    return { plates: (c.plates[i] ?? []).filter(k => s.plates[k]), crates: (c.crates[i] ?? []).filter(k => (s.crates[k] ?? 0) > 0) };
}
function covered(board: Board, s: State, i: number): boolean {
    const c = coverage(board, s);
    return (c.plates[i] ?? []).some(k => s.plates[k]) || (c.crates[i] ?? []).some(k => (s.crates[k] ?? 0) > 0);
}
export type Blocker = 'covered' | 'lock' | 'ice' | 'chain' | null;
export function blocker(board: Board, s: State, i: number): Blocker {
    const screw = board.screws[i]; if (!screw || !s.present[i]) return 'covered';
    if (covered(board, s, i)) return 'covered';
    if (screw.lock && !s.unlocked) return 'lock';
    if ((s.ice[i] ?? 0) > 0) return 'ice';
    if (s.chained[i] && s.present[screw.chain]) return 'chain';
    return null;
}
/** The queue travels with the state only during a transition (it never changes). */
type Working = State & { queue?: readonly number[]; need?: readonly number[] };
/** A rainbow screw completes only a box whose colour lacks a screw: elsewhere it waits in the buffer. */
function takesRainbow(s: Working, box: Box | null, need: readonly number[] | undefined = s.need): boolean {
    return box !== null && box.filled < BOX_SIZE && (s.wild[box.color] ?? 0) < (need?.[box.color] ?? 0);
}
/** Into a box or the buffer; false when the buffer is full. Events are appended. */
function place(s: Working, color: number, events: string[]): boolean {
    const slot = color === RAINBOW ? s.slots.findIndex(b => takesRainbow(s, b)) : s.slots.findIndex(b => b !== null && b.color === color && b.filled < BOX_SIZE);
    const box = color === RAINBOW ? s.slots[slot] : null;
    if (box) s.wild[box.color] = (s.wild[box.color] ?? 0) + 1;
    if (slot < 0) {
        if (s.buffer.length >= s.cap) return false;
        s.buffer.push(color); events.push('buffer'); return true;
    }
    fill(s, slot, events); return true;
}
function fill(s: Working, slot: number, events: string[]): void {
    const box = s.slots[slot]; if (!box) return;
    box.filled++; events.push('box');
    if (box.filled < BOX_SIZE) return;
    s.boxes++; s.coins += 25; events.push('complete');
    const color = s.queue?.[s.next];
    s.slots[slot] = color === undefined ? null : { color, filled: 0 };
    if (color !== undefined) s.next++;
    pull(s, slot, events);
}
/** A box that arrives takes its screws (and rainbows) from the buffer, oldest first. */
function pull(s: Working, slot: number, events: string[]): void {
    for (;;) {
        const box = s.slots[slot]; if (!box || box.filled >= BOX_SIZE) return;
        const at = s.buffer.findIndex(c => c === box.color || (c === RAINBOW && takesRainbow(s, box)));
        if (at < 0) return;
        if (s.buffer[at] === RAINBOW) s.wild[box.color] = (s.wild[box.color] ?? 0) + 1;
        s.buffer.splice(at, 1); events.push('pull'); fill(s, slot, events);
    }
}
export interface Moved { state: State; events: string[]; removed: number[]; fell: number[] }
/** Removes screw `i` (and its portal partner). `force` (the drill) ignores what blocks it. */
export function unscrew(board: Board, s0: State, i: number, force = false): Moved | null {
    const screw = board.screws[i];
    if (!screw || !s0.present[i] || (!force && blocker(board, s0, i) !== null)) return null;
    const s: Working = clone(s0); s.queue = board.queue; s.need = board.wild;
    const events: string[] = [], removed = [i];
    const partner = screw.portal >= 0 && s.present[screw.portal] ? screw.portal : -1;
    if (partner >= 0) removed.push(partner);
    const positions = removed.map(k => screwXY(board, s0, k));
    for (const k of removed) {
        s.present[k] = false;
        if (!place(s, board.screws[k]?.color ?? 0, events)) return null;
        s.coins += 10;
    }
    if (partner >= 0) events.push('portal');
    s.moves++;
    for (let k = 0; k < s.ice.length; k++) if (s.present[k] && (s.ice[k] ?? 0) > 0) { s.ice[k] = (s.ice[k] ?? 1) - 1; if (s.ice[k] === 0) events.push('thaw'); }
    removed.forEach((k, n) => {
        const sk = board.screws[k], [x, y] = positions[n] ?? [0, 0];
        if (!sk) return;
        board.crates.forEach((c, j) => { if ((s.crates[j] ?? 0) > 0 && Math.hypot(c.x - x, c.y - y) <= CRATE_REACH) { s.crates[j] = (s.crates[j] ?? 1) - 1; events.push(s.crates[j] ? 'crack' : 'crate'); } });
        if (sk.key && !s.unlocked) { s.unlocked = true; events.push('unlock'); }
        if (sk.gold) { s.gold++; s.coins += 50; if (s.cap === BASE_BUFFER) { s.cap++; events.push('slot'); } else events.push('gold'); }
        if (sk.tnt) { blast(board, s, x, y, BLAST); events.push('tnt'); }
        if (sk.gear && s.plates[sk.gear[0]]) {
            const shift = s.shift[sk.gear[0]];
            if (shift) { shift[0] += sk.gear[1]; shift[1] += sk.gear[2]; events.push('gear'); }
        }
    });
    const fell = drop(board, s);
    if (fell.length) events.push('fall');
    delete s.queue; delete s.need;
    return { state: s, events, removed, fell };
}
/** Clears crates, ice and chains within `radius` of (x, y). */
export function blast(board: Board, s: State, x: number, y: number, radius: number): void {
    board.crates.forEach((c, j) => { if (Math.hypot(c.x - x, c.y - y) <= radius) s.crates[j] = 0; });
    board.screws.forEach((_, k) => {
        if (!s.present[k]) return;
        const [sx, sy] = screwXY(board, s, k);
        if (Math.hypot(sx - x, sy - y) <= radius) { s.ice[k] = 0; s.chained[k] = false; }
    });
}
/** Plates left without any screw fall. */
export function drop(board: Board, s: State): number[] {
    const fell: number[] = [];
    board.plates.forEach((_, p) => {
        if (s.plates[p] && !board.screws.some((sc, k) => sc.plate === p && s.present[k])) { s.plates[p] = false; fell.push(p); }
    });
    return fell;
}
export function won(s: State): boolean { return s.slots.every(b => b === null); }
/** Screws a tap would legally unscrew now. */
export function legal(board: Board, s: State): number[] {
    const out: number[] = [];
    const room = s.buffer.length < s.cap;
    for (let i = 0; i < board.screws.length; i++) {
        if (!s.present[i] || blocker(board, s, i) !== null) continue;
        const screw = board.screws[i];
        // Without a portal partner, a screw fits when the buffer has room or an active box takes it.
        const fits = room || s.slots.some(b => b !== null && b.filled < BOX_SIZE && (screw?.color === RAINBOW ? takesRainbow(s, b, board.wild) : b.color === screw?.color));
        if (screw && screw.portal >= 0 && s.present[screw.portal] ? unscrew(board, s, i) : fits) out.push(i);
    }
    return out;
}
/** "Aucun coup possible !": not won, and no screw can be unscrewed. */
export function stuck(board: Board, s: State): boolean { return !won(s) && legal(board, s).length === 0; }
/** Compact key of a position (solver memo). */
export function key(s: State): string {
    const bits = s.present.map(p => p ? '1' : '0').join('');
    return `${bits}|${s.slots.map(b => b ? `${String(b.color)}.${String(b.filled)}` : '-').join(',')}|${String(s.next)}|${[...s.buffer].sort().join('')}|${String(s.cap)}|${s.ice.join('')}|${s.crates.join('')}|${s.chained.map(c => c ? 1 : 0).join('')}|${s.unlocked ? '1' : '0'}|${s.wild.join('')}|${s.shift.map(([x, y]) => `${String(x)},${String(y)}`).join(';')}`;
}
