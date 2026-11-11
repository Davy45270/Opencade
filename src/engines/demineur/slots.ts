/** The 30 progression slots, before the offline search (scripts/search-demineur.js) fills them with proven boards:
 * size (portrait, 6 × 6 to 16 × 16), mine count, title FR/EN, board theme, the drawing made by some of the mines,
 * and the techniques a slot must need (`need`) or must not need (`forbid`), so that each technique arrives alone:
 * one-number deductions (1–3), two numbers compared (3), every placement of a small group (14), the global count (19). */
export type Theme = 'classique' | 'nature' | 'plage' | 'espace' | 'arcade' | 'sombre';
export type TechniqueName = 'simple' | 'pair' | 'enumeration' | 'count';
export interface Slot {
    name: string; en: string; theme: Theme; w: number; h: number; mines: number;
    drawing?: keyof typeof DRAWINGS; at?: readonly [number, number];
    need?: readonly TechniqueName[]; forbid?: readonly TechniqueName[];
}
/** Drawings made of mines ('#'), solid or open strokes: never a safe pocket closed by mines (it could not be proved). */
export const DRAWINGS = {
    chevron: ['..#..', '.#.#.', '#...#'],
    escalier: ['#...', '##..', '.##.', '..##'],
    champignon: ['.###.', '#####', '..#..', '..#..'],
    riviere: ['#......', '.#.....', '.#.....', '..#....', '...##..', '.....#.', '.....#.'],
    poisson: ['.##.#', '####.', '.##.#'],
    chateau: ['#.#.#', '#####', '#####', '##.##'],
    fusee: ['..#..', '.###.', '.###.', '.###.', '#####', '#.#.#'],
    comete: ['##.....', '###....', '.##....', '...#...', '....#..', '.....#.', '......#'],
    planete: ['...###...', '..#####..', '#########', '..#####..', '...###...'],
    coeur: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
    etoile: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    chat: ['#.....#', '##...##', '#######', '#######', '#######', '.#####.'],
    sapin: ['...#...', '..###..', '.#####.', '..###..', '.#####.', '#######', '...#...', '...#...'],
    lune: ['..###', '.##..', '##...', '##...', '##...', '.##..', '..###'],
    bombe: ['......#', '.....#.', '..###..', '.#####.', '.#####.', '.#####.', '..###..'],
} as const satisfies Record<string, readonly string[]>;
const EARLY: readonly TechniqueName[] = ['enumeration', 'count'];
export const SLOTS: readonly Slot[] = [
    { name: 'Premiers pas', en: 'First steps', theme: 'classique', w: 6, h: 6, mines: 4, forbid: ['pair', ...EARLY] },
    { name: 'Les deux voisins', en: 'Two neighbours', theme: 'classique', w: 6, h: 7, mines: 5, forbid: ['pair', ...EARLY] },
    { name: 'La flèche', en: 'The arrow', theme: 'classique', w: 7, h: 7, mines: 6, drawing: 'chevron', at: [1, 0], need: ['pair'], forbid: EARLY },
    { name: 'L’escalier', en: 'The staircase', theme: 'classique', w: 7, h: 8, mines: 9, drawing: 'escalier', at: [0, 0], forbid: EARLY },
    { name: 'Le damier', en: 'The checkerboard', theme: 'classique', w: 8, h: 8, mines: 10, forbid: EARLY },
    { name: 'La clairière', en: 'The clearing', theme: 'nature', w: 8, h: 9, mines: 10, forbid: EARLY },
    { name: 'Le champignon', en: 'The mushroom', theme: 'nature', w: 8, h: 10, mines: 12, drawing: 'champignon', at: [1, 0], forbid: EARLY },
    { name: 'Le trèfle', en: 'The clover', theme: 'nature', w: 9, h: 10, mines: 13, forbid: EARLY },
    { name: 'La rivière', en: 'The river', theme: 'nature', w: 9, h: 11, mines: 15, drawing: 'riviere', at: [1, 0], forbid: EARLY },
    { name: 'La forêt', en: 'The forest', theme: 'nature', w: 10, h: 11, mines: 17, forbid: EARLY },
    { name: 'Les coquillages', en: 'The shells', theme: 'plage', w: 10, h: 12, mines: 19, forbid: EARLY },
    { name: 'Le poisson', en: 'The fish', theme: 'plage', w: 10, h: 13, mines: 21, drawing: 'poisson', at: [2, 2], forbid: ['count'] },
    { name: 'Le château de sable', en: 'The sandcastle', theme: 'plage', w: 11, h: 13, mines: 23, drawing: 'chateau', at: [3, 2], forbid: ['count'] },
    { name: 'Les vagues', en: 'The waves', theme: 'plage', w: 11, h: 14, mines: 25, need: ['enumeration'], forbid: ['count'] },
    { name: 'La marée', en: 'The tide', theme: 'plage', w: 12, h: 14, mines: 28, forbid: ['count'] },
    { name: 'La fusée', en: 'The rocket', theme: 'espace', w: 12, h: 15, mines: 30, drawing: 'fusee', at: [6, 0], forbid: ['count'] },
    { name: 'Les astéroïdes', en: 'The asteroids', theme: 'espace', w: 12, h: 16, mines: 33, forbid: ['count'] },
    { name: 'La comète', en: 'The comet', theme: 'espace', w: 13, h: 16, mines: 35, drawing: 'comete', at: [0, 0], forbid: ['count'] },
    { name: 'La constellation', en: 'The constellation', theme: 'espace', w: 13, h: 16, mines: 37, need: ['count'] },
    { name: 'La planète', en: 'The planet', theme: 'espace', w: 14, h: 16, mines: 39, drawing: 'planete', at: [2, 2] },
    { name: 'Le cœur', en: 'The heart', theme: 'arcade', w: 14, h: 16, mines: 41, drawing: 'coeur', at: [3, 2] },
    { name: 'L’étoile', en: 'The star', theme: 'arcade', w: 15, h: 16, mines: 43, drawing: 'etoile', at: [4, 2] },
    { name: 'Le labyrinthe', en: 'The maze', theme: 'arcade', w: 15, h: 16, mines: 45 },
    { name: 'Le chat', en: 'The cat', theme: 'arcade', w: 16, h: 16, mines: 46, drawing: 'chat', at: [4, 2] },
    { name: 'Néon', en: 'Neon', theme: 'arcade', w: 16, h: 16, mines: 48 },
    { name: 'La chouette', en: 'The owl', theme: 'sombre', w: 16, h: 16, mines: 50 },
    { name: 'Le sapin', en: 'The fir tree', theme: 'sombre', w: 16, h: 16, mines: 51, drawing: 'sapin', at: [4, 2] },
    { name: 'La nuit', en: 'The night', theme: 'sombre', w: 16, h: 16, mines: 52 },
    { name: 'La lune', en: 'The moon', theme: 'sombre', w: 16, h: 16, mines: 53, drawing: 'lune', at: [3, 3] },
    { name: 'La grande mine', en: 'The big mine', theme: 'sombre', w: 16, h: 16, mines: 54, drawing: 'bombe', at: [4, 0] },
];
