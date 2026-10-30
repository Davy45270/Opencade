/** Thirty authored Empilo strata (pass 402). One new rule about every four
 * levels, a timed challenge every five, a calmer stratum after each new rule.
 * Tile values: 0 empty, 1 crystal, 2 sealed (two clears), 3 gem, 4 padlock, 5 key. */
export const TILE = { empty: 0, crystal: 1, sealed: 2, gem: 3, lock: 4, key: 5 } as const;
export interface Conveyor { y: number; direction: 1 | -1 }
export interface Stratum {
    name: string;
    /** Cells per second. */
    gravity: number;
    /** 'lines': clear `goal` lines; 'gems': free every gem (`gems` of them). */
    objective: 'lines' | 'gems';
    goal: number;
    /** Rubble rows from the floor and holes per rubble row. */
    rubble: number; holes: number; sealed: number; gems: number;
    /** Padlocks keep their row from clearing until the key's row clears. */
    locks: number;
    shapes: number;
    /** A one-cell bomb (3 × 3 blast) after every `bomb` pieces; 0 = none. */
    bomb: number;
    /** Rows that slide one column after every lock (wrapping). */
    conveyors: Conveyor[];
    /** A rubble row rises from the floor after every `rise` locks; 0 = none. */
    rise: number;
    /** Next pieces shown (3 normally, 1 in the fog). */
    preview: number;
    timeMs: number;
}
const base: Omit<Stratum, 'name' | 'gravity' | 'goal'> = { objective: 'lines', rubble: 0, holes: 1, sealed: 0, gems: 0, locks: 0, shapes: 4, bomb: 0, conveyors: [], rise: 0, preview: 3, timeMs: 0 };
const gems = (n: number) => ({ objective: 'gems' as const, gems: n, goal: n, holes: 3 });
const belt = (...rows: [number, 1 | -1][]): Conveyor[] => rows.map(([y, direction]) => ({ y, direction }));
export const STRATA: readonly Stratum[] = [
    { ...base, name: 'Premières lignes', gravity: 1, goal: 5 },
    { ...base, name: 'Gravats', gravity: 1.5, goal: 8, rubble: 2 },
    { ...base, name: 'Scellés', gravity: 2, goal: 9, rubble: 3, sealed: 2, shapes: 5 },
    { ...base, name: 'La bombe', gravity: 1.8, goal: 8, rubble: 4, bomb: 6, shapes: 5 },
    { ...base, name: 'Défi : six lignes', gravity: 2.5, goal: 6, rubble: 2, shapes: 5, timeMs: 60000 },
    { ...base, name: 'Éclats', gravity: 2.2, goal: 10, rubble: 4, sealed: 2, bomb: 8, shapes: 5 },
    { ...base, name: 'Trois sceaux', gravity: 3, goal: 11, rubble: 5, sealed: 3, shapes: 6 },
    { ...base, name: 'Fouille', gravity: 2.5, ...gems(3), rubble: 5, bomb: 7, shapes: 6 },
    { ...base, name: 'Filon', gravity: 3, ...gems(5), rubble: 6, shapes: 6 },
    { ...base, name: 'Défi : filon express', gravity: 3, ...gems(4), rubble: 5, bomb: 6, shapes: 6, timeMs: 110000 },
    { ...base, name: 'Puits clair', gravity: 2.5, goal: 12, shapes: 7 },
    { ...base, name: 'Le tapis', gravity: 2.5, goal: 10, rubble: 3, shapes: 7, conveyors: belt([14, 1]) },
    { ...base, name: 'Double tapis', gravity: 3, ...gems(3), rubble: 4, shapes: 7, conveyors: belt([12, 1], [14, -1]) },
    { ...base, name: 'Filon mouvant', gravity: 3.5, ...gems(3), rubble: 5, bomb: 6, shapes: 7, conveyors: belt([13, -1]) },
    { ...base, name: 'Défi : tapis', gravity: 3.5, goal: 10, rubble: 4, shapes: 7, conveyors: belt([13, 1], [15, -1]), timeMs: 100000 },
    { ...base, name: 'La marée', gravity: 2.5, goal: 12, rubble: 2, shapes: 7, rise: 6 },
    { ...base, name: 'Marée haute', gravity: 3, goal: 14, rubble: 3, sealed: 2, bomb: 8, shapes: 7, rise: 6 },
    { ...base, name: 'Fouille sous la marée', gravity: 3, ...gems(4), rubble: 5, shapes: 8, rise: 8 },
    { ...base, name: 'Tapis et marée', gravity: 3.5, goal: 14, rubble: 3, shapes: 8, conveyors: belt([14, 1]), rise: 6 },
    { ...base, name: 'Défi : marée', gravity: 3.5, goal: 12, rubble: 2, bomb: 7, shapes: 8, rise: 4, timeMs: 110000 },
    { ...base, name: 'Le cadenas', gravity: 2.5, goal: 10, rubble: 6, locks: 3, shapes: 8 },
    { ...base, name: 'Le coffre', gravity: 3, ...gems(4), rubble: 7, locks: 4, shapes: 8 },
    { ...base, name: 'Coffre roulant', gravity: 3.5, ...gems(4), rubble: 6, locks: 3, shapes: 8, conveyors: belt([13, 1]) },
    { ...base, name: 'Coffre et marée', gravity: 3.5, goal: 14, rubble: 5, locks: 3, bomb: 8, shapes: 8, rise: 7 },
    { ...base, name: 'Défi : coffre', gravity: 3.5, ...gems(4), rubble: 6, locks: 3, bomb: 6, shapes: 8, timeMs: 140000 },
    { ...base, name: 'Brouillard', gravity: 3, goal: 12, rubble: 3, shapes: 8, preview: 1 },
    { ...base, name: 'Carrière', gravity: 4, ...gems(5), rubble: 6, bomb: 6, shapes: 8, conveyors: belt([12, -1]) },
    { ...base, name: 'Glissement', gravity: 4, goal: 16, rubble: 3, shapes: 8, conveyors: belt([13, 1], [15, -1]), rise: 6, preview: 1 },
    { ...base, name: 'Forteresse', gravity: 4.5, ...gems(4), rubble: 6, locks: 4, bomb: 6, shapes: 8, rise: 9 },
    { ...base, name: 'Le cœur', gravity: 5, ...gems(5), rubble: 6, locks: 3, bomb: 5, shapes: 8, conveyors: belt([12, 1]), rise: 9, preview: 1 },
];
