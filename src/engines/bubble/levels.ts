import { Random } from '../shared/random';
import type { Cell, Color } from './engine';
export interface Level { id: string; name: string; colors: number; rows: number; interval: number; pattern: string; seed: number }
export const LEVELS: readonly Level[] = [
    ['Atelier', 4, 5, 0, 'rubans'], ['Losange', 4, 5, 12, 'losange'],
    ['Damier', 4, 6, 12, 'damier'], ['Pyramide', 4, 6, 10, 'pyramide'],
    ['Colonnes', 5, 6, 10, 'colonnes'], ['Vagues', 5, 7, 9, 'vagues'],
    ['Chevrons', 5, 7, 8, 'chevrons'], ['Spirale', 6, 7, 8, 'spirale'],
    ['Cristal', 6, 8, 7, 'cristal'], ['Prisme', 6, 8, 6, 'prisme'],
].map((data, index) => ({ id: `L${String(index + 1)}`, name: String(data[0]), colors: Number(data[1]), rows: Number(data[2]), interval: Number(data[3]), pattern: String(data[4]), seed: 452 + index }));
export function levelAt(index: number): Level {
    const level = LEVELS[index];
    if (!Number.isInteger(index) || !level) throw new Error('Invalid level');
    return level;
}
export function generateLevel(index: number, seed: number): Cell[] {
    const level = levelAt(index), random = new Random(seed), grid: Cell[] = [];
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
