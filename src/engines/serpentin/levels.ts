/** Thirty authored Serpentin rooms: one new rule every four levels, a timed
 * challenge every five, a calmer room after each introduction. Coordinates
 * live on the 15 × 21 grid; the 9 × 5 start zone (x 3–11, y 8–12) stays free. */
export interface Cell { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Portal { a: Cell; b: Cell }
/** Open while (ticks + phase) % period < open; entering a closed gate is fatal. */
export interface Gate { cell: Cell; period: number; open: number; phase: number }
/** Entering an arrow forces the following move in its direction. */
export interface Current { cell: Cell; direction: Direction }
/** A sentry walks its path back and forth, one cell every `every` snake moves; touching it is fatal. */
export interface Patrol { path: Cell[]; every: number }
export interface Layout {
    name: string; walls: boolean; speed: number; goal: number;
    /** Seeded obstacles drawn from pattern 0–3 (border ring, rays, islands, passages). */
    pattern: number; random: number;
    barriers: Cell[]; portals: Portal[]; gates: Gate[]; currents: Current[]; patrols: Patrol[];
    /** The apple flees one cell every `prey` snake moves; 0 means a still apple. */
    prey: number;
    scissors: boolean;
    /** Whole-level countdown in ms; 0 means untimed. */
    timeMs: number;
}
const c = (x: number, y: number): Cell => ({ x, y });
const row = (y: number, x0: number, x1: number, skip: number[] = []): Cell[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => c(x0 + i, y)).filter(p => !skip.includes(p.x));
const column = (x: number, y0: number, y1: number, skip: number[] = []): Cell[] => Array.from({ length: y1 - y0 + 1 }, (_, i) => c(x, y0 + i)).filter(p => !skip.includes(p.y));
const gate = (x: number, y: number, phase: number, period = 300, open = 180): Gate => ({ cell: c(x, y), period, open, phase });
const strip = (cells: Cell[], direction: Direction): Current[] => cells.map(cell => ({ cell, direction }));
// Reusable structures.
const locks = { barriers: [...row(6, 0, 14, [3, 11]), ...row(14, 0, 14, [7])], gates: [gate(3, 6, 0), gate(11, 6, 150), gate(7, 14, 75)] };
const spine = { barriers: [...column(7, 0, 6, [3]), ...column(7, 14, 20, [17])], gates: [gate(7, 3, 0, 240, 150), gate(7, 17, 120, 240, 150)] };
const conveyors = [...strip(row(4, 1, 5), 'right'), ...strip(row(16, 9, 13), 'left'), ...strip(column(1, 9, 14), 'up'), ...strip(column(13, 6, 11), 'down')];
const rapids = [...strip(row(2, 4, 10), 'right'), ...strip(row(18, 4, 10), 'left')];
const cross = [c(2, 2), c(12, 18)], cross2 = [c(12, 2), c(2, 18)];
const pair = (p: Cell[]): Portal => ({ a: p[0] ?? c(0, 0), b: p[1] ?? c(0, 0) });
const base = { pattern: 0, random: 0, barriers: [], portals: [], gates: [], currents: [], patrols: [], prey: 0, scissors: false, timeMs: 0 };
const sentry = (path: Cell[], every = 2): Patrol => ({ path, every });
export const LAYOUTS: readonly Layout[] = [
    { ...base, name: 'Premiers pas', walls: true, speed: 6, goal: 8 },
    { ...base, name: 'Lisière', walls: true, speed: 6.5, goal: 9, random: 6 },
    { ...base, name: 'Le tore', walls: false, speed: 7, goal: 10, random: 10 },
    { ...base, name: 'Premier portail', walls: true, speed: 6.5, goal: 10, portals: [pair([c(2, 3), c(12, 17)])] },
    { ...base, name: 'Défi : portails', walls: false, speed: 7.5, goal: 10, pattern: 1, random: 8, portals: [pair(cross), pair(cross2)], timeMs: 35000 },
    { ...base, name: 'Rayons', walls: true, speed: 7, goal: 11, pattern: 1, random: 12, portals: [pair([c(1, 1), c(13, 19)])] },
    { ...base, name: 'Croisée', walls: false, speed: 8, goal: 12, pattern: 1, random: 16, portals: [pair(cross), pair(cross2)] },
    { ...base, name: 'Écluses', walls: true, speed: 7, goal: 11, ...locks },
    { ...base, name: 'Échine', walls: true, speed: 8, goal: 12, ...spine, portals: [pair([c(2, 10), c(12, 10)])] },
    { ...base, name: 'Défi : écluses', walls: false, speed: 8.5, goal: 12, pattern: 2, random: 6, ...locks, timeMs: 45000 },
    { ...base, name: 'Archipel', walls: false, speed: 8, goal: 13, pattern: 2, random: 18 },
    { ...base, name: 'Luciole', walls: true, speed: 8, goal: 10, prey: 3 },
    { ...base, name: 'Luciole des îles', walls: true, speed: 8.5, goal: 12, pattern: 2, random: 16, prey: 3 },
    { ...base, name: 'Luciole fuyante', walls: false, speed: 9, goal: 12, prey: 3, portals: [pair(cross), pair(cross2)] },
    { ...base, name: 'Défi : la chasse', walls: true, speed: 9, goal: 12, prey: 3, ...locks, timeMs: 90000 },
    { ...base, name: 'Courants', walls: true, speed: 8, goal: 11, currents: conveyors },
    { ...base, name: 'Rapides', walls: false, speed: 9, goal: 13, pattern: 3, random: 14, currents: rapids },
    { ...base, name: 'Moulin', walls: true, speed: 9, goal: 13, ...spine, currents: conveyors },
    { ...base, name: 'Delta', walls: true, speed: 9.5, goal: 13, currents: rapids, portals: [pair([c(1, 10), c(13, 10)])], prey: 4 },
    { ...base, name: 'Défi : delta', walls: false, speed: 10, goal: 13, pattern: 1, random: 8, currents: rapids, ...locks, timeMs: 45000 },
    { ...base, name: 'Ciseaux', walls: true, speed: 9, goal: 22, random: 12, scissors: true },
    { ...base, name: 'Taille fine', walls: false, speed: 10, goal: 22, pattern: 2, random: 20, scissors: true },
    { ...base, name: 'Atelier', walls: true, speed: 10, goal: 20, ...spine, portals: [pair([c(2, 10), c(12, 10)])], scissors: true },
    { ...base, name: 'Passages', walls: true, speed: 10.5, goal: 20, pattern: 3, random: 24, currents: rapids, scissors: true },
    { ...base, name: 'Défi : tout en un', walls: false, speed: 11, goal: 15, prey: 4, portals: [pair(cross), pair(cross2)], ...locks, timeMs: 70000 },
    { ...base, name: 'Sentinelles', walls: true, speed: 10, goal: 16, random: 8, patrols: [sentry(row(4, 2, 8)), sentry(column(12, 13, 19))] },
    { ...base, name: 'Labyrinthe vivant', walls: true, speed: 11, goal: 18, ...locks, portals: [pair([c(1, 1), c(13, 19)])], prey: 4, patrols: [sentry(row(2, 3, 10))] },
    { ...base, name: 'Grand delta', walls: false, speed: 12, goal: 22, pattern: 2, random: 24, currents: conveyors, portals: [pair(cross)], scissors: true },
    { ...base, name: 'Veille', walls: true, speed: 12.5, goal: 22, ...spine, currents: conveyors, portals: [pair([c(2, 10), c(12, 10)])], prey: 5, scissors: true, patrols: [sentry(column(3, 15, 19))] },
    { ...base, name: 'Grand final', walls: true, speed: 12.5, goal: 25, ...locks, currents: rapids, portals: [pair(cross), pair(cross2)], prey: 5, scissors: true, patrols: [sentry(column(13, 15, 19)), sentry(row(10, 0, 2), 3)] },
];
