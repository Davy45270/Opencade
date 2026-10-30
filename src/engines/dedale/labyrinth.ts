import { Random } from '../shared/random';

export const SHAPES = ['corridors', 'rooms', 'ring', 'spiral', 'mirror'] as const;
export type Shape = typeof SHAPES[number];
export type Heading = 'up' | 'left' | 'down' | 'right';
export interface Journey {
    shape: Shape; keys: { at: number; color: number }[]; doors: { at: number; color: number }[];
    arrows: { at: number; direction: Heading }[]; portals: [number, number][];
    switches: number[]; gates: number[]; moving: number[]; ice: number[]; dark: number[];
    held: number; toggled: number; turn: number; remaining: number;
}
export interface Walker { pos: number; held: number; toggled: number; phase: number; direction: Heading }
const width = 19;
const offsets: Record<Heading, number> = { up: -19, left: -1, down: 19, right: 1 };
export const gallery = [
    ...Array.from({ length: 9 }, (_, i) => 17 * width + 9 - i),
    ...Array.from({ length: 4 }, (_, i) => (18 + i) * width + 1),
    ...Array.from({ length: 16 }, (_, i) => 21 * width + 2 + i),
    ...Array.from({ length: 6 }, (_, i) => (20 - i) * width + 17),
];
const point = (i: number): number => { const p = gallery[i]; if (p === undefined) throw new RangeError('Case absente'); return p; };
export function createLabyrinth(level: number, seed: number): { maze: boolean[]; journey: Journey; seeds: number[]; suns: number[] } {
    const random = new Random((seed + level * 7919) >>> 0), shape = SHAPES[level % 5] ?? 'corridors';
    const maze = Array<boolean>(437).fill(false);
    const open = (x: number, y: number): void => { maze[y * width + x] = true; };
    if (shape === 'corridors' || shape === 'mirror') {
        const stack: [number, number][] = [[1, 1]]; open(1, 1);
        while (stack.length) {
            const [x, y] = stack[stack.length - 1] ?? [1, 1];
            const candidates: [number, number][] = [[x - 2, y], [x + 2, y], [x, y - 2], [x, y + 2]];
            const options = candidates.filter(([a, b]) => a > 0 && a < 18 && b > 0 && b < 16 && !maze[b * width + a]);
            if (!options.length) { stack.pop(); continue; }
            const [a, b] = options[Math.floor(random.next() * options.length)] ?? [x, y];
            open(a, b); open((x + a) / 2, (y + b) / 2); stack.push([a, b]);
        }
        if (shape === 'mirror') for (let y = 1; y <= 15; y++) for (let x = 1; x <= 9; x++) maze[y * width + 18 - x] = (maze[y * width + x] ?? false);
        // Connect the reflected halves along the central axis.
        if (shape === 'mirror') for (let y = 1; y <= 15; y++) open(9, y);
    } else if (shape === 'rooms') {
        for (let y = 1; y <= 15; y++) for (let x = 1; x <= 17; x++) if (y % 5 !== 0 && x % 6 !== 0) open(x, y);
        for (let x = 1; x <= 17; x++) { open(x, 3); open(x, 8); open(x, 13); }
        for (let y = 1; y <= 15; y++) { open(3, y); open(9, y); open(15, y); }
        // Seeded alcoves change actual passages, not a signature label.
        for (let y = 5; y <= 10; y += 5) open([2, 4, 7, 10, 13, 16][Math.floor(random.next() * 6)] ?? 2, y);
    } else if (shape === 'ring') {
        for (let y = 1; y <= 15; y++) for (let x = 1; x <= 17; x++) {
            const r = ((x - 9) / 8) ** 2 + ((y - 8) / 7) ** 2;
            if (r >= 0.35 && r <= 1.15) open(x, y);
        }
        for (let x = 9; x <= 17; x++) open(x, 8);
        for (let y = 8; y <= 15; y++) { open(17, y); open(9, y); }
        const spoke = 4 + Math.floor(random.next() * 4);
        for (let x = 1; x <= 9; x++) open(x, spoke);
    } else {
        let x = 1, y = 1; open(x, y);
        let left = 1, right = 17, top = 1, bottom = 15;
        while (left <= right && top <= bottom) {
            while (x < right) open(++x, y);
            while (y < bottom) open(x, ++y);
            left += 2; top += 2;
            if (left > right || top > bottom) break;
            while (x > left) open(--x, y);
            while (y > top) open(x, --y);
            right -= 2; bottom -= 2;
        }
        // One seeded radial shortcut per spiral.
        const y0 = 3 + 2 * Math.floor(random.next() * 5);
        open(16, y0);
    }
    for (const p of gallery) maze[p] = true;
    // All shapes attach to the gallery at its only upper entrance.
    for (let x = 1; x <= 17; x++) open(x, 15);
    const journey: Journey = {
        shape, keys: level >= 3 ? [{ at: point(2), color: 0 }, ...(level >= 27 ? [{ at: point(14), color: 1 }] : [])] : [],
        doors: level >= 3 ? [{ at: point(4), color: 0 }, ...(level >= 27 ? [{ at: point(18), color: 1 }] : [])] : [],
        arrows: level >= 4 ? [{ at: point(6), direction: 'left' }] : [],
        portals: level >= 8 ? [[point(10), point(12)]] : [],
        switches: level >= 12 ? [point(15)] : [], gates: level >= 12 ? [point(17)] : [],
        moving: level >= 15 ? [point(20)] : [], ice: level >= 18 ? gallery.slice(23, 26) : [], dark: level >= 21 ? gallery.slice(29, 34) : [],
        held: 0, toggled: 0, turn: 0, remaining: (level + 1) % 5 === 0 ? (level === 29 ? 40000 : 25000) : 0,
    };
    const upper = maze.flatMap((v, i) => v && i < 15 * width ? [i] : []);
    const far = upper[Math.floor(random.next() * upper.length)] ?? 20;
    return { maze, journey, suns: [point(1), point(14), point(28), far], seeds: [point(7), point(18), point(26), point(34)] };
}
export function walk(maze: readonly boolean[], j: Journey, from: Walker, requested: Heading): { next: Walker; visited: number[]; events: string[] } {
    const next = { ...from, phase: (from.phase + 1) % 4 }, visited: number[] = [], events: string[] = [];
    const allowed = (pos: number, d: Heading): boolean => {
        const dest = pos + offsets[d];
        if (!maze[dest] || (d === 'left' && pos % width === 0) || (d === 'right' && pos % width === 18)) return false;
        const door = j.doors.find(v => v.at === dest);
        if (door && !(next.held & (1 << door.color))) return false;
        if (j.arrows.some(a => (a.at === dest || a.at === pos) && a.direction !== d)) return false;
        if (j.gates.includes(dest) && !next.toggled) return false;
        if (j.moving.includes(dest) && from.phase < 2) return false;
        return true;
    };
    const direction = allowed(from.pos, requested) ? requested : from.direction;
    if (!allowed(from.pos, direction)) { if (j.moving.includes(from.pos + offsets[direction])) events.push('wall-wait'); return { next, visited, events }; }
    next.direction = direction;
    const enter = (): void => {
        next.pos += offsets[direction]; visited.push(next.pos);
        for (const key of j.keys) if (key.at === next.pos && !(next.held & (1 << key.color))) { next.held |= 1 << key.color; events.push('key'); }
        if (j.doors.some(v => v.at === next.pos)) events.push('door');
        if (j.arrows.some(v => v.at === next.pos)) events.push('one-way');
        if (j.switches.includes(next.pos)) { next.toggled = 1 - next.toggled; events.push('switch'); }
        if (j.gates.includes(next.pos)) events.push('gate');
        if (j.moving.includes(next.pos)) events.push('moving-wall');
        if (j.dark.includes(next.pos)) events.push('darkness');
    };
    enter();
    if (j.ice.includes(next.pos)) while (allowed(next.pos, direction)) { events.push('slide'); enter(); }
    const pair = j.portals.find(p => p.includes(next.pos));
    if (pair) { next.pos = pair[0] === next.pos ? pair[1] : pair[0]; visited.push(next.pos); events.push('portal'); }
    return { next, visited, events };
}
export function visible(j: Journey | undefined, hero: number, at: number): boolean {
    return !j?.dark.includes(hero) || Math.abs(hero % width - at % width) + Math.abs(Math.floor(hero / width) - Math.floor(at / width)) <= 3;
}
