import { Random } from '../shared/random';
import type { Cell, Color } from './engine';
export interface Level { id: string; name: string; colors: number; rows: number; interval: number; pattern: string; seed: number; mechanics?: readonly string[]; challenge?: boolean; catalogue?: 'P01' | 'P02' | 'P03' }
const HISTORIC: readonly Level[] = [
    ['Atelier', 4, 5, 0, 'rubans'], ['Losange', 4, 5, 12, 'losange'],
    ['Damier', 4, 6, 12, 'damier'], ['Pyramide', 4, 6, 10, 'pyramide'],
    ['Colonnes', 5, 6, 10, 'colonnes'], ['Vagues', 5, 7, 9, 'vagues'],
    ['Chevrons', 5, 7, 8, 'chevrons'], ['Spirale', 6, 7, 8, 'spirale'],
    ['Cristal', 6, 8, 7, 'cristal'], ['Prisme', 6, 8, 6, 'prisme'],
].map((data, index) => ({ id: `L${String(index + 1)}`, name: String(data[0]), colors: Number(data[1]), rows: Number(data[2]), interval: Number(data[3]), pattern: String(data[4]), seed: 452 + index }));
const additions = [
    'Silex suspendu', 'Jardin gourmand', 'Halte des lucioles',
    'Mèches jumelles', 'Le grand brasier', 'Jardin ajouré',
    'Iris voyageur', 'Éventail des marées', 'Clairière calme',
    'Automne enchanté', 'Dentelle polaire', 'Le dégel doux',
    'Constellation captive', 'Passerelles du soir', 'Le coffre du ciel',
    'Cristaux célestes', 'Les trois cloches', 'Souffle paisible',
    'Couronne des échos', 'La voûte aux six secrets',
] as const;
/** Bubble catalogue boards, set on campaign slots that already open a chapter (no parallel campaign). */
const CATALOGUE: Readonly<Record<number, { code: 'P01' | 'P02' | 'P03'; colors?: number; mechanics: readonly string[] }>> = {
    // P01 Jardin gourmand: bamboo stalks and a bao, broad single-colour groups, no obstacle.
    1: { code: 'P01', colors: 4, mechanics: [] },
    // P02 Automne enchanté: ice opens here as one-burst locks, with leaf bubbles that sweep their row.
    9: { code: 'P02', mechanics: ['stone', 'bomb', 'rainbow', 'ice', 'leaf'] },
    // P03 Cristaux célestes: fixed crystals and bumpers, wild prisms and bombs for chain reactions.
    15: { code: 'P03', mechanics: ['stone', 'bomb', 'rainbow', 'ice', 'bumper', 'crystal', 'prism'] },
};
export const LEVELS: readonly Level[] = [...HISTORIC, ...additions.map((name, i) => {
    const catalogue = CATALOGUE[i];
    return {
        id: `L${String(i + 11)}`, name, colors: catalogue?.colors ?? (i < 5 ? 5 : 6), rows: [7,8,7,7,8,8,7,9,8,8,10,9,10,10,11,8,10,9,10,11][i] ?? 11, interval: 16 - Math.floor(i / 5),
        pattern: catalogue ? catalogue.code : `sculpture-${String(i + 1)}`, seed: 462 + i,
        mechanics: catalogue?.mechanics ?? ['stone', ...(i >= 3 ? ['bomb'] : []), ...(i >= 6 ? ['rainbow'] : []),
            ...(i >= 9 ? ['ice'] : []), ...(i >= 12 ? ['star'] : []), ...(i >= 15 ? ['bumper'] : [])],
        challenge: [14, 19, 24, 29].includes(i + 10),
        ...(catalogue ? { catalogue: catalogue.code } : {}),
    };
})];
/** Literal catalogue placements (row, col), shared by the generator and its oracle. */
export const CATALOGUE_CELLS = {
    P02: { locks: [[3, 1], [3, 6], [5, 2], [5, 5]], leaves: [[2, 4], [4, 1], [6, 6]] },
    P03: { crystals: [[4, 2], [4, 6], [6, 4]], prisms: [[2, 4], [5, 1], [5, 6]], bombs: [[3, 2], [3, 5]] },
} as const;
function catalogueCell(level: Level, row: number, col: number, color: Color, palette: Color[]): Cell {
    const at = (list: readonly (readonly [number, number])[]) => list.some(([r, c]) => r === row && c === col);
    if (level.catalogue === 'P01') {
        // Two-cell bamboo stalks (bands 0 and 2) with nodes every three rows, foliage bands 1 and 3, a bao hung in the right foliage.
        const x = 20 + col * 40 + (row % 2) * 20, band = Math.min(3, Math.floor((x - 20) / 80));
        const bao = row >= 2 && row <= 4 && band === 3;
        const shade = bao ? 3 : band % 2 ? 2 : Math.floor(row / 3) % 2;
        return { row, col, color: palette[shade] ?? 0 };
    }
    if (level.catalogue === 'P02') {
        if (at(CATALOGUE_CELLS.P02.locks)) return { row, col, color, kind: 'ice', ice: 1 };
        if (at(CATALOGUE_CELLS.P02.leaves)) return { row, col, color, kind: 'leaf' };
        return { row, col, color };
    }
    if (at(CATALOGUE_CELLS.P03.crystals)) return { row, col, color, kind: 'crystal' };
    if (at(CATALOGUE_CELLS.P03.prisms)) return { row, col, color, kind: 'prism' };
    if (at(CATALOGUE_CELLS.P03.bombs)) return { row, col, color, kind: 'bomb' };
    return { row, col, color };
}
export function levelAt(index: number): Level {
    const level = LEVELS[index];
    if (!Number.isInteger(index) || !level) throw new Error('Invalid level');
    return level;
}
export function generateLevel(index: number, seed: number): Cell[] {
    const level = levelAt(index), random = new Random(seed), grid: Cell[] = [];
    if (index >= 10) {
        // Shuffle the whole palette; nearby seeds also change the staggered seams.
        const palette = Array.from({ length: level.colors }, (_, c) => c as Color);
        for (let i = palette.length - 1; i > 0; i--) {
            const j = Math.floor(random.next() * (i + 1));
            [palette[i], palette[j]] = [palette[j] ?? 0, palette[i] ?? 0];
        }
        const seam = Math.abs(seed) % 3;
        for (let row = 0; row < level.rows; row++) {
            for (let col = 0; col < (row % 2 ? 8 : 9); col++) {
                if (row === level.rows - 1 && col === Math.abs(seed) % (row % 2 ? 8 : 9)) continue;
                const color = palette[(Math.floor((col + seam) / 2) + (index < 15 ? Math.floor(row / 2) : index < 25 ? row : row * 2) + index) % level.colors] ?? 0;
                if (level.catalogue) { grid.push(catalogueCell(level, row, col, color, palette)); continue; }
                const cell: Cell = { row, col, color };
                if (row === 1 && col === 1) cell.kind = 'stone';
                if (level.mechanics?.includes('bomb') && row === level.rows - 2 && col === 5) cell.kind = 'bomb';
                if (level.mechanics?.includes('ice') && row === 2 && col === 6) { cell.kind = 'ice'; cell.ice = 2; }
                if (level.mechanics?.includes('star') && row === 1 && (col === 2 || col === 7)) cell.kind = 'star';
                grid.push(cell);
            }
        }
        return grid;
    }
    const palette = Array.from({ length: level.colors }, (_, color) => color as Color);
    for (let i = palette.length - 1; i > 0; i--) {
        const j = Math.floor(random.next() * (i + 1));
        const a = palette[i], b = palette[j];
        if (a !== undefined && b !== undefined) { palette[i] = b; palette[j] = a; }
    }
    for (let row = 0; row < level.rows; row++) {
        for (let col = 0; col < (row % 2 ? 8 : 9); col++) {
            // A full ceiling anchors each sculpted motif. Seed chooses its palette phase.
            const distance = Math.abs(col - 4);
            const masks = [true, distance <= level.rows - row, true, distance <= row + 1, col % 3 !== 2, (col + row) % 4 !== 3, distance % 3 !== row % 3, row % 2 === 0 || col % 3 !== 1, distance + row < 9, (row + col) % 5 !== 4];
            if (row === 0 || masks[index]) {
                const motifs = [row + Math.floor(col / 3), distance + row, row + col, row,
                    col, row + Math.floor(col / 2), distance + row, Math.max(distance, row) + col,
                    distance * 2 + row, col + row * 2];
                const color = palette[(motifs[index] ?? 0) % level.colors] ?? 0;
                grid.push({ row, col, color });
            }
        }
    }
    return grid;
}
