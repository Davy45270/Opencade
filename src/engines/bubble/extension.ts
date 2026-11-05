import { Random } from '../shared/random';
import type { Cell, Color } from './engine';
/**
 * Levels 31-130: ten tiers of ten. Each tier opens with an easier breather (k = 0) and adds one
 * existing mechanic on top of the previous ones; shapes and colour motifs rotate within the tier.
 * Colours, rows and ceiling cadence are literal: scripts/bubble-extension-calibrate.js proves each
 * level with the solver (real deal, and a ceiling 20 % faster) before a row lands here.
 */
export const EXTENSION_START = 30;
export const TIER_SIZE = 10;
/** [name, colours, rows, ceiling interval, shape, motif] per level. */
export type ExtensionRow = readonly [string, number, number, number, number, number];
export const EXTENSION: readonly ExtensionRow[] = [
    // Tier 1, jungle: stones, then bombs.
    ['Clairière d’accueil', 4, 5, 18, 2, 1], ['Sentier des lianes', 4, 6, 16, 1, 4], ['Cascade verte', 4, 6, 16, 7, 2],
    ['Perroquets moqueurs', 4, 6, 15, 0, 3], ['Racines tressées', 4, 6, 15, 4, 4], ['Pont de bambou', 5, 6, 15, 3, 1],
    ['Orchidée secrète', 5, 7, 15, 6, 2], ['Mare aux grenouilles', 5, 7, 14, 9, 0], ['Canopée', 5, 7, 14, 8, 2],
    ['Temple des lianes', 5, 7, 14, 5, 4],
    // Tier 2, autumn: leaves sweep their row.
    ['Tapis de feuilles', 4, 6, 17, 4, 3], ['Châtaignes', 5, 6, 15, 0, 5], ['Vent d’octobre', 5, 6, 15, 9, 3],
    ['Verger doré', 5, 7, 15, 1, 5], ['Écureuil pressé', 5, 7, 14, 2, 0], ['Champignons', 5, 7, 14, 3, 2],
    ['Brume du matin', 5, 7, 14, 5, 0], ['Citrouilles', 5, 7, 14, 8, 5], ['Forêt rousse', 5, 7, 13, 6, 4],
    ['Lanterne d’automne', 5, 8, 13, 7, 5],
    // Tier 3, volcano: ice.
    ['Pied du volcan', 4, 6, 16, 0, 0], ['Roches tièdes', 5, 7, 14, 2, 4], ['Coulée lente', 5, 7, 14, 1, 5],
    ['Geyser', 5, 7, 14, 6, 4], ['Cendres dansantes', 5, 7, 13, 7, 0], ['Obsidienne', 5, 7, 13, 9, 5],
    ['Cheminée', 5, 8, 13, 3, 3], ['Lave tressée', 5, 8, 13, 4, 4], ['Cratère', 5, 8, 13, 5, 5],
    ['Cœur de braise', 5, 8, 12, 8, 3],
    // Tier 4, circus: every third shot is a rainbow.
    ['Lever de rideau', 4, 6, 16, 4, 2], ['Jongleurs', 5, 7, 14, 9, 0], ['Trapèze', 5, 7, 13, 1, 5],
    ['Funambule', 5, 7, 13, 0, 0], ['Clowns farceurs', 5, 8, 13, 2, 5], ['Grande roue', 6, 7, 13, 5, 4],
    ['Chapiteau', 6, 7, 13, 8, 5], ['Acrobates', 6, 8, 13, 3, 0], ['Dompteur de bulles', 6, 8, 12, 7, 4],
    ['Grand final', 6, 8, 12, 6, 3],
    // Tier 5, sky: stars to free.
    ['Premier nuage', 5, 6, 16, 0, 4], ['Cerf-volant', 5, 7, 14, 9, 5], ['Montgolfière', 6, 7, 13, 5, 3],
    ['Arc de pluie', 6, 7, 13, 6, 4], ['Hirondelles', 6, 7, 13, 4, 5], ['Vent du nord', 6, 8, 13, 2, 5],
    ['Orage doux', 6, 8, 12, 1, 2], ['Aurore', 6, 8, 12, 3, 4], ['Château de nuages', 6, 8, 12, 8, 5],
    ['Sommet du ciel', 6, 8, 12, 7, 0],
    // Tier 6, night jungle: wild prisms.
    ['Lucioles', 5, 6, 16, 2, 3], ['Bambouseraie', 6, 7, 13, 7, 3], ['Fougères géantes', 6, 7, 13, 0, 5],
    ['Caméléon', 6, 8, 13, 3, 0], ['Liane d’or', 6, 8, 12, 5, 2], ['Toucan', 6, 8, 12, 9, 4],
    ['Ruines vertes', 6, 8, 12, 1, 0], ['Marais brumeux', 6, 8, 12, 4, 5], ['Arbre-monde', 6, 9, 12, 6, 2],
    ['Gardien de la jungle', 6, 9, 11, 8, 3],
    // Tier 7, late autumn: fixed crystals.
    ['Feu de cheminée', 5, 7, 15, 1, 4], ['Pommes d’api', 6, 7, 13, 4, 0], ['Hibou', 6, 8, 12, 3, 2],
    ['Glands', 6, 8, 12, 5, 0], ['Moulin', 6, 8, 12, 2, 2], ['Vendanges', 6, 8, 12, 0, 4],
    ['Bruyère', 6, 8, 11, 6, 5], ['Pluie fine', 6, 9, 11, 9, 4], ['Pont de pierre', 6, 9, 11, 7, 2],
    ['Roi de l’automne', 6, 9, 11, 0, 3],
    // Tier 8, fire mountain: golden bumpers.
    ['Source chaude', 5, 7, 15, 3, 2], ['Basalte', 6, 8, 12, 1, 0], ['Rivière de feu', 6, 8, 12, 8, 5],
    ['Soufre', 6, 8, 12, 2, 3], ['Dragon endormi', 6, 8, 11, 0, 2], ['Grotte ardente', 6, 9, 11, 4, 4],
    ['Pluie de pierres', 6, 9, 11, 5, 2], ['Forge', 6, 9, 11, 6, 4], ['Éruption', 6, 9, 11, 9, 2],
    ['Trône de lave', 6, 9, 10, 7, 0],
    // Tier 9, night circus: every mechanic, in rotating sets.
    ['Parade', 5, 7, 15, 6, 2], ['Monocycle', 6, 8, 12, 4, 3], ['Cracheur de bulles', 6, 8, 11, 9, 5],
    ['Illusionniste', 6, 8, 11, 3, 4], ['Cerceaux', 6, 9, 11, 0, 2], ['Boulet de canon', 6, 9, 11, 7, 5],
    ['Ménagerie', 6, 9, 11, 1, 2], ['Magicien', 6, 9, 10, 8, 0], ['Lumières', 6, 9, 10, 5, 5],
    ['Ovation', 6, 9, 10, 3, 3],
    // Tier 10, deep sky: every mechanic together.
    ['Brise légère', 5, 7, 14, 0, 4], ['Plumes', 6, 8, 11, 9, 0], ['Constellation', 6, 8, 11, 4, 2],
    ['Étoile filante', 6, 9, 11, 8, 5], ['Lune pâle', 6, 9, 10, 2, 2], ['Comète', 6, 9, 10, 1, 4],
    ['Voie lactée', 6, 9, 10, 6, 5], ['Planètes', 6, 9, 10, 7, 0], ['Galaxie', 6, 9, 10, 3, 2],
    ['Le bout du ciel', 6, 9, 10, 5, 2],
];
/** Mechanic introduced by each tier, in order; a tier keeps every earlier one. */
export const TIER_MECHANICS = ['bomb', 'leaf', 'ice', 'rainbow', 'star', 'prism', 'crystal', 'bumper', '', ''] as const;
/** Mechanics of extension level i (0-99): the breather keeps stones and bombs; others rotate earlier mechanics. */
export function extensionMechanics(i: number): string[] {
    const tier = Math.floor(i / TIER_SIZE), k = i % TIER_SIZE;
    if (k === 0) return tier === 0 ? ['stone'] : ['stone', 'bomb'];
    const pool = TIER_MECHANICS.slice(0, tier + 1).filter(Boolean);
    const fresh = TIER_MECHANICS[tier] ?? '';
    // Earlier mechanics rotate (two out of three kept); the tier's own mechanic is always there.
    // Stars change the goal, so they stay on alternate levels only.
    const kept = pool.filter((m, j) => m === fresh || (tier >= 8 ? (k + j) % 4 !== 0 : (k + j) % 3 !== 0))
        .filter(m => m !== 'star' || (m === fresh ? k % 2 === 1 : k % 4 === 1));
    if (tier === 0 && k < 5) return ['stone'];
    return ['stone', ...kept];
}
const SHAPES: readonly ((row: number, col: number, rows: number) => boolean)[] = [
    () => true, // full wall
    (row, col, rows) => row < 3 || Math.abs(col - 4) > (row >= rows - 2 ? 2 : 1), // tunnel arch
    (row, col, rows) => Math.abs(col - 4) <= rows - row + 1, // hanging diamond
    (row, col) => row < 2 || col % 3 !== 2, // columns
    (row, col) => row < 2 || (row + col) % 4 !== 3, // perforated wall
    (row, col) => row < 3 || Math.abs(col - 4) >= row - 3, // V notch
    (row, col, rows) => row < 2 || Math.abs(col - 4) <= rows - row + 2, // keel
    (row, col) => row < 3 || col <= 2 || col >= 6, // twin towers
    (row, col, rows) => row < Math.ceil(rows / 2) + ([0, 2, 3, 1][col % 4] ?? 0), // stalactites
    (row, col, rows) => row < 3 || row >= rows - 1 || Math.abs(col - 4) > 1, // ring with an opening
];
function motifColor(motif: number, row: number, col: number, i: number, colors: number, seam: number): number {
    const tier = Math.floor(i / TIER_SIZE), k = i % TIER_SIZE, breather = k === 0;
    // Wider same-colour runs on breathers and early tiers; later tiers narrow them to pairs.
    const width = breather ? 3 : tier < 2 ? 2 + (k % 2) : tier < 5 ? 2 : 1 + (k % 2), band = breather || tier < 3 || width === 1 ? 2 : 1 + (k % 2);
    // The ceiling row is always cut in short runs, so one match never drops the whole board.
    if (row === 0) return (Math.floor((col + seam) / 2) + i) % colors;
    const distance = Math.abs(col - 4);
    const values = [
        Math.floor(row / band) + Math.floor(col / 4),
        Math.floor((col + seam) / width) + Math.floor(row / 4),
        Math.floor((col + seam) / width) + Math.floor(row / band),
        Math.floor(distance / width) + Math.floor(row / band),
        Math.floor((col + seam) / Math.max(2, width + 1)) + Math.floor(row / 2) * 2,
        Math.floor((col + (row % 2) + seam) / width) + Math.floor(row / band) * 2,
    ];
    return ((values[motif] ?? 0) + i) % colors;
}
function special(i: number, mechanics: readonly string[], row: number, col: number, rows: number): Pick<Cell, 'kind' | 'ice'> {
    const k = i % TIER_SIZE, tier = Math.floor(i / TIER_SIZE), last = rows - 1, has = (m: string) => mechanics.includes(m);
    const pair = (a: number) => col === a || col === 8 - a - (row % 2);
    if (has('stone') && row === 1 && pair(1 + (k % 3))) return { kind: 'stone' };
    if (has('star') && row === 2 && pair(2 + (k % 2))) return { kind: 'star' };
    if (has('bomb') && row === last - 1 && pair(2 + (k % 2))) return { kind: 'bomb' };
    if (has('leaf') && row === Math.min(4, last - 2) && col === (k % 2 ? 2 : 6)) return { kind: 'leaf' };
    if (has('ice') && row === 3 && pair(3)) return { kind: 'ice', ice: tier >= 5 && k % 2 ? 2 : 1 };
    if (has('prism') && row === Math.min(5, last - 1) && pair(1)) return { kind: 'prism' };
    if (has('crystal') && row === last && col === 4) return { kind: 'crystal' };
    return {};
}
/** Ordinary neighbours in the odd-row offset grid (same rule as the engine). */
function linked(row: number, col: number): [number, number][] {
    const left = col - (row % 2 ? 0 : 1);
    return [[row - 1, left], [row - 1, left + 1], [row, col - 1], [row, col + 1], [row + 1, left], [row + 1, left + 1]];
}
export function generateExtensionLevel(i: number, colors: number, rows: number, seed: number): Cell[] {
    const row = EXTENSION[i];
    if (!row) throw new Error('Invalid level');
    const [, , , , shape, motif] = row, mechanics = extensionMechanics(i), random = new Random(seed);
    const palette = Array.from({ length: colors }, (_, c) => c as Color);
    for (let j = palette.length - 1; j > 0; j--) {
        const m = Math.floor(random.next() * (j + 1));
        [palette[j], palette[m]] = [palette[m] ?? 0, palette[j] ?? 0];
    }
    const seam = Math.abs(seed) % 3, mask = SHAPES[shape] ?? SHAPES[0], cells = new Map<string, Cell>();
    for (let r = 0; r < rows; r++) {
        for (let col = 0; col < (r % 2 ? 8 : 9); col++) {
            // Special cells stay even where the shape is open, so each listed mechanic is on the board.
            const kind = special(i, mechanics, r, col, rows);
            if (r > 0 && !kind.kind && !mask?.(r, col, rows)) continue;
            const cell: Cell = { row: r, col, color: palette[motifColor(motif, r, col, i, colors, seam)] ?? 0, ...kind };
            cells.set(`${String(r)}:${String(col)}`, cell);
        }
    }
    // Keep only what hangs from the ceiling or a fixed crystal (which anchors, as in the engine).
    const hung = new Set<string>(), queue = [...cells.values()].filter(c => c.row === 0 || c.kind === 'crystal');
    for (let q = 0; q < queue.length; q++) {
        const c = queue[q];
        if (!c) continue;
        const id = `${String(c.row)}:${String(c.col)}`;
        if (hung.has(id)) continue;
        hung.add(id);
        for (const [r, col] of linked(c.row, c.col)) { const n = cells.get(`${String(r)}:${String(col)}`); if (n) queue.push(n); }
    }
    return [...cells.values()].filter(c => hung.has(`${String(c.row)}:${String(c.col)}`));
}
