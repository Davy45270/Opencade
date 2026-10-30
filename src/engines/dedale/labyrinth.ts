import { Random } from '../shared/random';

export const SHAPES = ['corridors', 'rooms', 'ring', 'spiral', 'mirror'] as const;
export type Shape = typeof SHAPES[number];
export type Heading = 'up' | 'left' | 'down' | 'right';
export interface Journey {
    start?: number; wispStart?: number; principal?: number[]; corridor?: number[]; shape: Shape; keys: { at: number; color: number }[]; doors: { at: number; color: number }[];
    arrows: { at: number; direction: Heading }[]; portals: [number, number][];
    switches: number[]; gates: number[]; moving: number[]; ice: number[]; dark: number[];
    held: number; toggled: number; turn: number; remaining: number;
}
export interface Walker { pos: number; held: number; toggled: number; phase: number; direction: Heading }
function required<T>(value: T | undefined): T {
    if (value === undefined) throw new RangeError('Case absente');
    return value;
}
const width = 19;
// Seed salts selected by full engine replays, route separation and campaign pacing.
const placementSalts = [0, 0, 0, 733103, 0, 0, 0, 209458, 104729, 104729, 0, 0, 0, 209458, 209458, 523645, 104729, 104729, 733103, 104729, 733103, 1256748, 117087022, 1570935, 418916, 22097819, 1361477, 223491686, 77813647, 45242928];
const offsets: Record<Heading, number> = { up: -19, left: -1, down: 19, right: 1 };
/** The principal corridor is also the placement frame: there is no common gallery. */
export const labyrinthSeed = (level: number, seed: number): number => (seed + level * 7919 + (placementSalts[level] ?? 0)) >>> 0;
export function createLabyrinth(level: number, seed: number): { maze: boolean[]; journey: Journey; seeds: number[]; suns: number[] } {
    const random = new Random(labyrinthSeed(level, seed)), shape = SHAPES[level % 5] ?? 'corridors';
    const maze = Array<boolean>(437).fill(false);
    const open = (x: number, y: number): void => { maze[y * width + x] = true; };
    const shuffle = <T>(items: T[]): T[] => {
        for (let i = items.length - 1; i > 0; i--) { const k = Math.floor(random.next() * (i + 1)); [items[i], items[k]] = [required(items[k]), required(items[i])]; }
        return items;
    };
    let principal: number[] = [];
    if (shape === 'ring') {
        const left = 1 + Math.floor(random.next() * 5), right = 13 + Math.floor(random.next() * 5);
        const top = 1 + Math.floor(random.next() * 6), bottom = 16 + Math.floor(random.next() * 6);
        for (let x = left; x < right; x++) principal.push(top * width + x);
        for (let y = top; y < bottom; y++) principal.push(y * width + right);
        for (let x = right; x > left; x--) principal.push(bottom * width + x);
        for (let y = bottom; y > top; y--) principal.push(y * width + left);
        if (random.next() < 0.5) principal.reverse();
        const cut = Math.floor(random.next() * principal.length);
        principal = [...principal.slice(cut), ...principal.slice(0, cut)];
        for (const at of principal) maze[at] = true;
    } else if (shape === 'spiral') {
        const radius = (level === 28 ? 6 : 3 + Math.floor(level / 5)), cx = 1 + radius + Math.floor(random.next() * (17 - 2 * radius));
        const cy = 1 + radius + Math.floor(random.next() * (21 - 2 * radius));
        let x = -radius, y = -radius, left = -radius, right = radius, top = -radius, bottom = radius;
        const rotation = Math.floor(random.next() * 4), reflect = random.next() < 0.5;
        const add = (): void => {
            let a = reflect ? -x : x, b = y;
            for (let r = 0; r < rotation; r++) [a, b] = [-b, a];
            principal.push((cy + b) * width + cx + a);
        };
        add();
        while (left <= right && top <= bottom) {
            while (x < right) { x++; add(); }
            while (y < bottom) { y++; add(); }
            left += 2; top += 2;
            if (left > right || top > bottom) break;
            while (x > left) { x--; add(); }
            while (y > top) { y--; add(); }
            right -= 2; bottom -= 2;
        }
        for (const at of principal) maze[at] = true;
    } else {
        const stack: [number, number][] = [[1, 1]]; open(1, 1);
        while (stack.length) {
            const [x, y] = required(stack[stack.length - 1]);
            const options = shuffle<[number, number]>([[x - 2, y], [x + 2, y], [x, y - 2], [x, y + 2]]).filter(([a, b]) => a > 0 && a < 18 && b > 0 && b < 22 && !maze[b * width + a]);
            if (!options.length) { stack.pop(); continue; }
            const [a, b] = required(options[0]);
            open(a, b); open((x + a) / 2, (y + b) / 2); stack.push([a, b]);
        }
        if (shape === 'rooms') {
            for (let n = 0; n < 5; n++) {
                const x = 1 + 2 * Math.floor(random.next() * 7), y = 1 + 2 * Math.floor(random.next() * 9);
                for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) open(x + dx, y + dy);
            }
        }
        if (shape === 'mirror') {
            for (let y = 1; y <= 21; y++) for (let x = 1; x <= 9; x++) maze[y * width + 18 - x] = (maze[y * width + x] ?? false);
            for (let y = 1; y <= 21; y++) open(9, y);
        }
        // A seeded DFS path through this very topology, rather than an attached tutorial.
        const root = required(shuffle(maze.flatMap((v, i) => v ? [i] : []))[0]);
        const seen = new Set<number>(), path: number[] = [];
        const visit = (at: number): void => {
            seen.add(at); path.push(at);
            if (path.length > principal.length) principal = [...path];
            for (const d of shuffle([-19, -1, 19, 1])) {
                const dest = at + d;
                if (maze[dest] && !seen.has(dest)) visit(dest);
            }
            path.pop();
        };
        visit(root);
    }
    const corridor = [...principal];
    const length = shape === 'spiral' ? principal.length : Math.min(principal.length, 26 + level * 4);
    principal = principal.slice(0, length);
    const point = (fraction: number): number => required(principal[Math.min(length - 1, Math.max(1, Math.floor(fraction * (length - 1))))]);
    const arrowAt = principal.findIndex((at, i) => i >= 2 && i < length - 1 && at - required(principal[i - 1]) === required(principal[i + 1]) - at);
    const direction = (a: number, b: number): Heading => b - a === -19 ? 'up' : b - a === 19 ? 'down' : b < a ? 'left' : 'right';
    const journey: Journey = {
        shape, start: required(principal[0]), principal, corridor,
        wispStart: shape === 'spiral' ? point(0.1 + random.next() * 0.85) : point(0.6),
        keys: level >= 3 ? [{ at: point(0.08), color: 0 }, ...(level >= 27 ? [{ at: point(0.55), color: 1 }] : [])] : [],
        doors: level >= 3 ? [{ at: point(0.16), color: 0 }, ...(level >= 27 ? [{ at: point(0.62), color: 1 }] : [])] : [],
        arrows: level >= 4 ? [{ at: required(principal[arrowAt]), direction: direction(required(principal[arrowAt]), required(principal[arrowAt + 1])) }] : [],
        portals: level >= 8 ? [[point(0.30), point(0.32)]] : [],
        switches: level >= 12 ? [point(0.40)] : [], gates: level >= 12 ? [point(0.46)] : [],
        moving: level >= 15 ? [point(0.69)] : [], ice: level >= 18 ? [point(0.76)] : [], dark: level >= 21 ? [point(0.86), point(0.87)] : [],
        held: 0, toggled: 0, turn: 0, remaining: (level + 1) % 5 === 0 ? (level === 29 ? 40000 : 25000) : 0,
    };
    // Goals on both sides of every interaction make the route playable evidence.
    const goals = new Set([point(0.05), point(0.25), point(0.52), point(1),
        ...journey.keys.map(v => v.at), ...journey.doors.map(v => v.at), ...journey.arrows.map(v => v.at),
        ...journey.switches, ...journey.gates, ...journey.moving, ...journey.ice, ...journey.dark,
        ...(journey.portals.length ? [point(0.34)] : [])]);
    const suns = [point(0.05), point(0.25), point(0.52), point(1)];
    for (const at of [point(0.12), point(0.36), point(0.65), point(0.92)]) goals.add(at);
    return { maze, journey, suns, seeds: [...goals].filter(at => !suns.includes(at)) };
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
