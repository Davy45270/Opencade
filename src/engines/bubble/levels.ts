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
    id: `L${String(i + 11)}`, name, colors: 6, rows: 8, interval: [14, 19, 24, 29].includes(i + 10) ? 6 : 0,
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
        // Separate hanging islands with distinct silhouettes, gaps and narrow necks.
        const phase = Math.floor(random.next() * 6);
        const variant = index - 10;
        const columns = variant % 3 === 0 ? [1, 4, 7] : variant % 3 === 1 ? [0, 3, 6] : [2, 5, 8];
        for (const [island, col] of columns.entries()) {
            const color = ((phase + island) % 6) as Color;
            const depth = 2 + Math.floor(variant / (island + 1)) % 4;
            grid.push({ row: 0, col, color }, { row: 1, col: Math.min(col, 7), color });
            for (let row = 2; row <= depth; row++) {
                const socket = Math.min(col, row % 2 ? 7 : 8);
                grid.push({ row, col: socket, color: ((color + row) % 6) as Color,
                    kind: row === depth ? 'stone' : undefined });
                if (Math.floor(variant / (row + island)) % 2 === 0 && socket > 0)
                    grid.push({ row, col: socket - 1, color, kind: level.mechanics?.includes('bomb') ? 'bomb' : undefined });
            }
            const last = grid[grid.length - 1];
            if (last && level.mechanics?.includes('ice') && island === 1) { last.kind = 'ice'; last.ice = 2; }
            if (level.mechanics?.includes('star')) grid.push({ row: depth + 1, col: Math.min(col, (depth + 1) % 2 ? 7 : 8), color, kind: 'star' });
        }
        if (variant % 5 === 3 || index === 29) {
            // A suspended crosspiece joins the three necks; all supports must be cut.
            for (let col = 0; col < 9; col++) if (!grid.some(c => c.row === 2 && c.col === col)) {
                grid.push({ row: 2, col, color: ((phase + Math.floor(col / 3)) % 6) as Color,
                    kind: level.mechanics?.includes('bomb') && col % 3 === 1 ? 'bomb' : undefined });
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
