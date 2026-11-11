import { Random } from '../shared/random';
import { PASSENGER_COLORS, SCHEMA_VERSION, validateLevel, cellsOf, type Bus, type Exit, type LevelDefinition, type PassengerGroup } from './rules';
function shuffle<T>(list: T[], pick: (n: number) => number): T[] {
    for (let i = list.length - 1; i > 0; i--) { const j = pick(i + 1), a = list[i], b = list[j]; if (a === undefined || b === undefined) continue; list[i] = b; list[j] = a; }
    return list;
}
/** Seeded generator of the dossier: a template (size, vehicles, obstacles, colours, exits, line) and a seed give one
 * board, always the same for the same template, seed and generator version (AC-09). The 30 progression levels are
 * candidates of this generator picked offline (scripts/search-busfolie.js) and frozen in data.ts. */
export const GENERATOR_VERSION = '1.0.0';
export interface Template {
    width: number; height: number; buses: number; cars: number; long: number; obstacles: number; colors: number;
    /** Colours given to two buses (or more): the capacity then decides who takes which group. */
    twins: number;
    coloured: boolean; oneWay: number; groupsMax: number;
}
/** 32-bit mix of a seed and the template, so two templates never share a sequence. */
export function mix(seed: number, t: Template): number {
    let h = 2166136261 ^ (seed >>> 0);
    for (const v of [t.width, t.height, t.buses, t.cars, t.long, t.obstacles, t.colors, t.twins, t.coloured ? 1 : 0, t.oneWay, t.groupsMax, ...GENERATOR_VERSION.split('').map(c => c.charCodeAt(0))]) {
        h = Math.imul(h ^ v, 16777619) >>> 0; h ^= h >>> 13;
    }
    return h >>> 0;
}
export function generateLevel(t: Template, seed: number, id = `BUS-${String(seed)}`): LevelDefinition | null {
    const r = new Random(mix(seed, t)), pick = (n: number): number => Math.floor(r.next() * n);
    const w = t.width, h = t.height, taken = new Set<number>();
    const buses: Bus[] = [];
    const total = t.buses + t.cars;
    // Lengths: `long` buses of three cells among the passenger buses; cars are two cells.
    for (let k = 0; k < total; k++) {
        const car = k >= t.buses, length = !car && k < t.long ? 3 : 2;
        let placed = false;
        for (let attempt = 0; attempt < 300 && !placed; attempt++) {
            const hz = r.next() < 0.5, x = pick(hz ? w - length + 1 : w), y = pick(hz ? h : h - length + 1);
            const probe: Bus = { id: '', color: 'gris', x, y, length, orientation: hz ? 'horizontal' : 'vertical', capacity: 0, facing: hz ? 'right' : 'down' };
            const cells = cellsOf(probe, x, y).map(([cx, cy]) => cy * w + cx);
            if (cells.some(c => taken.has(c))) continue;
            // A parked car lying in the lane ahead of a bus would close that lane for good.
            if (car && cells.some(c => ahead(buses, w, h, hz).has(c))) continue;
            cells.forEach(c => taken.add(c)); placed = true;
            const facing = hz ? (r.next() < 0.5 ? 'right' : 'left') : (r.next() < 0.5 ? 'down' : 'up');
            // A parked car has no front: it always faces right or down (its forward is +x or +y).
            const facing2 = car ? (hz ? 'right' : 'down') : facing;
            buses.push({ ...probe, id: `${car ? 'V' : 'B'}${String.fromCharCode(65 + k)}`, facing: facing2 });
        }
        if (!placed) return null;
    }
    // Colours: every colour at least once, `twins` colours twice.
    const palette = PASSENGER_COLORS.slice(0, t.colors), colours: (typeof palette)[number][] = [...palette];
    for (let k = 0; k < t.twins && colours.length < t.buses; k++) colours.push(palette[k % palette.length] ?? 'rouge');
    while (colours.length < t.buses) colours.push(palette[pick(palette.length)] ?? 'rouge');
    shuffle(colours, pick);
    buses.forEach((b, i) => {
        if (i >= t.buses) return;
        b.color = colours[i] ?? 'rouge';
        b.capacity = b.length === 3 ? 4 + pick(3) : 2 + pick(3);
        if (i < t.oneWay) b.oneWay = true;
    });
    // Obstacles on free cells.
    const obstacles: { x: number; y: number }[] = [];
    for (let k = 0, guard = 0; k < t.obstacles && guard < 500; guard++) {
        const c = pick(w * h); if (taken.has(c) || ahead(buses, w, h).has(c)) continue;
        taken.add(c); obstacles.push({ x: c % w, y: Math.floor(c / w) }); k++;
    }
    const exits = laneExits(buses, t.coloured);
    // The waiting line: a departure order, each bus planned with one to `groupsMax` groups that fit in it.
    // Two buses of one colour never follow each other in the plan: the first would board the second one's groups.
    let plan = shuffle(buses.slice(0, t.buses), pick);
    for (let k = 0; k < 20 && plan.some((b, i) => i > 0 && plan[i - 1]?.color === b.color); k++) plan = shuffle(plan, pick);
    const queue: PassengerGroup[] = [];
    for (const b of plan) {
        const color = b.color; if (color === 'gris') continue;
        const groups = 1 + pick(t.groupsMax), load = Math.max(groups, Math.ceil(b.capacity / 2) + pick(Math.floor(b.capacity / 2) + 1));
        let left = Math.min(b.capacity, load);
        for (let g = 0; g < groups; g++) {
            const count = g === groups - 1 ? left : Math.max(1, Math.min(left - (groups - g - 1), 1 + pick(left - (groups - g - 1))));
            if (count < 1) break;
            queue.push({ id: `G${String(queue.length + 1)}`, color, count }); left -= count;
            if (left <= 0) break;
        }
    }
    const level: LevelDefinition = {
        schemaVersion: SCHEMA_VERSION, id, mode: 'classic', seed, generatorVersion: GENERATOR_VERSION, board: { width: w, height: h },
        buses, passengerQueue: queue, exits, obstacles, rules: { allowReverse: true, allowUndo: true, timeLimitSeconds: null },
    };
    return validateLevel(level).length ? null : level;
}
/** Exits: the lane end each bus faces (shared by the buses of the same lane; a shared exit of two colours is neutral),
 * numbered clockwise from the top. */
export function laneExits(buses: readonly Bus[], coloured: boolean): Exit[] {
    const exits: Exit[] = [];
    for (const b of buses) {
        const color = b.color; if (color === 'gris') continue;
        const side = b.facing === 'right' ? 'right' : b.facing === 'left' ? 'left' : b.facing === 'down' ? 'bottom' : 'top';
        const index = b.orientation === 'horizontal' ? b.y : b.x, colour = coloured ? color : null;
        const existing = exits.find(e => e.side === side && e.index === index);
        if (existing) { if (existing.color !== colour) existing.color = null; }
        else exits.push({ id: '', side, index, color: colour });
    }
    const order: Record<string, number> = { top: 0, right: 1, bottom: 2, left: 3 };
    exits.sort((a, b) => (order[a.side] ?? 0) - (order[b.side] ?? 0) || a.index - b.index).forEach((e, i) => { e.id = `E${String(i + 1)}`; });
    return exits;
}
/** Cells between each passenger bus and the board edge it faces (optionally only for buses of one orientation): a cone
 * or a parallel parked car there would close the bus's road for good. */
export function ahead(buses: readonly Bus[], w: number, h: number, horizontalOnly?: boolean): Set<number> {
    const out = new Set<number>();
    for (const b of buses) {
        if (b.color === 'gris' || (horizontalOnly !== undefined && (b.orientation === 'horizontal') !== horizontalOnly)) continue;
        const dx = b.facing === 'right' ? 1 : b.facing === 'left' ? -1 : 0, dy = b.facing === 'down' ? 1 : b.facing === 'up' ? -1 : 0;
        let x = dx > 0 ? b.x + b.length : dx < 0 ? b.x - 1 : b.x, y = dy > 0 ? b.y + b.length : dy < 0 ? b.y - 1 : b.y;
        for (; x >= 0 && y >= 0 && x < w && y < h; x += dx, y += dy) out.add(y * w + x);
    }
    return out;
}
/** A board no search can win: a cone or a parallel car in the road ahead of a bus. */
export function hopeless(level: LevelDefinition): boolean {
    const w = level.board.width, h = level.board.height, cones = new Set(level.obstacles.map(o => o.y * w + o.x));
    for (const b of level.buses) {
        if (b.color === 'gris') continue;
        const road = ahead([b], w, h);
        if ([...road].some(c => cones.has(c))) return true;
        for (const v of level.buses) if (v.color === 'gris' && v.orientation === b.orientation && cellsOf(v, v.x, v.y).some(([x, y]) => road.has(y * w + x))) return true;
    }
    return false;
}
