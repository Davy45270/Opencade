import { Random } from '../shared/random';
import type { Cell, Color } from './engine';
export interface Level { id: string; name: string; colors: number; rows: number; interval: number; pattern: string; seed: number; mechanics?: readonly string[]; challenge?: boolean }
const HISTORIC: readonly Level[] = [
    ['Atelier', 4, 5, 0, 'rubans'], ['Losange', 4, 5, 12, 'losange'],
    ['Damier', 4, 6, 12, 'damier'], ['Pyramide', 4, 6, 10, 'pyramide'],
    ['Colonnes', 5, 6, 10, 'colonnes'], ['Vagues', 5, 7, 9, 'vagues'],
    ['Chevrons', 5, 7, 8, 'chevrons'], ['Spirale', 6, 7, 8, 'spirale'],
    ['Cristal', 6, 8, 7, 'cristal'], ['Prisme', 6, 8, 6, 'prisme'],
].map((data, index) => ({ id: `L${String(index + 1)}`, name: String(data[0]), colors: Number(data[1]), rows: Number(data[2]), interval: Number(data[3]), pattern: String(data[4]), seed: 452 + index }));
const additions = [
    'Silex suspendu', 'Arches de craie', 'Halte des lucioles',
    'Mèches jumelles', 'Le grand brasier', 'Jardin ajouré',
    'Iris voyageur', 'Éventail des marées', 'Clairière calme',
    'Banquise fendue', 'Dentelle polaire', 'Le dégel doux',
    'Constellation captive', 'Passerelles du soir', 'Le coffre du ciel',
    'Ricochets de cuivre', 'Les trois cloches', 'Souffle paisible',
    'Couronne des échos', 'La voûte aux six secrets',
] as const;
export const LEVELS: readonly Level[] = [...HISTORIC, ...additions.map((name, i) => ({
    id: `L${String(i + 11)}`, name, colors: i < 5 ? 5 : 6, rows: [7,8,7,7,8,8,7,9,8,8,10,9,8,10,11,8,10,9,10,11][i] ?? 11, interval: 16 - Math.floor(i / 5),
    pattern: `sculpture-${String(i + 1)}`, seed: 462 + i,
    mechanics: ['stone', ...(i >= 3 ? ['bomb'] : []), ...(i >= 6 ? ['rainbow'] : []),
        ...(i >= 9 ? ['ice'] : []), ...(i >= 12 ? ['star'] : []), ...(i >= 15 ? ['bumper'] : [])],
    challenge: [14, 19, 24, 29].includes(i + 10),
}))];
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
