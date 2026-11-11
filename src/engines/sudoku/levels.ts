import { geometry, parseGrid, type Difficulty, type Size, type SudokuLevel } from './grid';
import type { Technique } from './logic';
import type { Symmetry } from './generator';
/**
 * The Classic progression: thirty written grids, from the 4 × 4 tutorial to the 9 × 9 X-wing. Found offline by
 * scripts/record-sudoku.js (seed kept for provenance), titles written by hand. `technique` is the hardest step the
 * logical solution needs, re-measured by validate-sudoku.js and the Vitest suite; uniqueness is re-proved there too.
 * Within a size and a technique, grids are ordered by the measured difficulty score.
 */
export const GAME_NAME = 'Sudoku';
export interface WrittenGrid {
    title: { fr: string; en: string };
    /** Companion's line when the grid opens. */
    tip: string;
    technique: Technique;
    symmetry: Symmetry;
    /** Seed of the offline search that found the grid (provenance, not used at run time). */
    seed: number;
    /** Rows separated by '/', '.' for an empty cell. */
    grid: string;
}
export const GRIDS: readonly WrittenGrid[] = [
    { title: { fr: "Premiers pas", en: "First steps" }, tip: "Chaque ligne, chaque colonne et chaque bloc contient 1, 2, 3 et 4, une seule fois.", technique: 'hidden-single', symmetry: 'point', seed: 1000, grid: '4321/1.4./.1.4/3412' },
    { title: { fr: "Le miroir", en: "The mirror" }, tip: "Touchez une case vide, puis un chiffre du pavé.", technique: 'hidden-single', symmetry: 'mirror', seed: 2000, grid: '.41./3124/.34./4..1' },
    { title: { fr: "La diagonale", en: "The diagonal" }, tip: "Bloqué ? L'ampoule explique la prochaine déduction.", technique: 'hidden-single', symmetry: 'diagonal', seed: 3000, grid: '.41./3.../4.31/..42' },
    { title: { fr: "Quatre coins", en: "Four corners" }, tip: "Cherchez où le 1 peut aller dans chaque bloc.", technique: 'hidden-single', symmetry: 'point', seed: 4000, grid: '3..1/4.../...4/1..2' },
    { title: { fr: "Presque vide", en: "Almost empty" }, tip: "Quatre chiffres suffisent : chaque chiffre n'a qu'une place possible, une à la fois.", technique: 'hidden-single', symmetry: 'none', seed: 5000, grid: '..../..4./.4.1/.3..' },
    { title: { fr: "Six par six", en: "Six by six" }, tip: "Blocs de 2 lignes sur 3 colonnes : 1 à 6, une fois chacun.", technique: 'hidden-single', symmetry: 'point', seed: 6000, grid: '14.265/2.5.3./.2.3.1/3.4.2./.3.6.2/652.13' },
    { title: { fr: "Les deux rives", en: "Two shores" }, tip: "Le crayon note les chiffres possibles dans une case, sans les jouer.", technique: 'hidden-single', symmetry: 'mirror', seed: 7000, grid: '13..42/26..13/.1..6./..31../.4125./.2..3.' },
    { title: { fr: "Pente douce", en: "Gentle slope" }, tip: "Un chiffre bien placé retire ses notes de la ligne, de la colonne et du bloc.", technique: 'hidden-single', symmetry: 'diagonal', seed: 8000, grid: '.254.6/1...../4.3.../2..643/...16./6..2..' },
    { title: { fr: "Un seul choix", en: "Only choice" }, tip: "Quand une case n'a plus qu'un chiffre possible, c'est lui.", technique: 'naked-single', symmetry: 'point', seed: 9817, grid: '..45../..53../5..4.1/4.3..2/..61../..12..' },
    { title: { fr: "Clairière", en: "Clearing" }, tip: "Peu d'indices : comptez les chiffres déjà vus par chaque case.", technique: 'naked-single', symmetry: 'none', seed: 10426, grid: '3.1.../.6..../.2.6.1/....../2.5.../.1..53' },
    { title: { fr: "Alignés", en: "In line" }, tip: "Si un chiffre d'un bloc est forcément sur une ligne, il quitte le reste de cette ligne.", technique: 'locked-candidates', symmetry: 'point', seed: 11742, grid: '4.1..5/.5..../5..2../..4..3/....5./3..4.6' },
    { title: { fr: "Grand format", en: "Full size" }, tip: "Neuf lignes, neuf colonnes, neuf blocs : 1 à 9 une fois chacun.", technique: 'hidden-single', symmetry: 'point', seed: 12000, grid: '..72.31../2....978./359....2./.35497.68/...5.2.../87.36154./.2....951/.139....6/..87.54..' },
    { title: { fr: "Symétrie", en: "Symmetry" }, tip: "Les chiffres identiques au chiffre choisi s'allument : repérez leurs lignes.", technique: 'hidden-single', symmetry: 'mirror', seed: 13000, grid: '..3...6../.971.683./2.18.45.9/7.5...3.4/..47259../.8..1..2./........./5..972..3/.72.4.19.' },
    { title: { fr: "Fil de soie", en: "Silk thread" }, tip: "Balayez chaque bloc chiffre par chiffre.", technique: 'hidden-single', symmetry: 'diagonal', seed: 14001, grid: '247.8.1.3/1.....6.8/6.82..9../..2..1.86/5....9.3./...62..4./415....../...362.../32.1.....' },
    { title: { fr: "Blocs déserts", en: "Empty blocks" }, tip: "Un bloc presque vide se remplit par ses voisins.", technique: 'hidden-single', symmetry: 'point', seed: 15000, grid: '.....62../6..14...8/1......7./.7261..95/........./54..9371./.6......3/7...69..4/..12.....' },
    { title: { fr: "Candidat unique", en: "Lone candidate" }, tip: "Certaines cases n'ont plus qu'un chiffre possible : cherchez-les.", technique: 'naked-single', symmetry: 'point', seed: 16007, grid: '..381..52/....2..8./.9...5..4/.1..5.7../6.8...2.3/..4.3..9./4..6...3./.8..4..../13..824..' },
    { title: { fr: "Reflets", en: "Reflections" }, tip: "Les notes vous évitent de tout recompter.", technique: 'naked-single', symmetry: 'mirror', seed: 17005, grid: '9.3...2.1/.4..1..8./.5.....4./.6.4.2.9./.9.8.7.1./..5...4../5..9.8..4/..8.7.3../..9...6..' },
    { title: { fr: "Sans motif", en: "No pattern" }, tip: "Aucune symétrie : la grille ne se devine pas, elle se déduit.", technique: 'naked-single', symmetry: 'none', seed: 18000, grid: '.4.7.5.1./..182.69./..9....2./9...3..../.......5./......2.6/...2....8/.2...97../85.6.3..2' },
    { title: { fr: "Biais", en: "Slant" }, tip: "Une case vue par huit chiffres différents n'a plus qu'un choix.", technique: 'naked-single', symmetry: 'diagonal', seed: 19008, grid: '2....5.1./.1..8..92/..4..2.7./...39..../.4.2...../7.1.....8/........./578....31/.3...7.69' },
    { title: { fr: "Pointer du doigt", en: "Pointing" }, tip: "Un chiffre coincé sur une ligne d'un bloc l'interdit au reste de la ligne.", technique: 'locked-candidates', symmetry: 'point', seed: 20121, grid: '..1..7.8./.......31/82.3..4../..8....76/67..4..59/51....3../..2..8.63/15......./.8.6..5..' },
    { title: { fr: "Les colonnes", en: "Columns" }, tip: "La même idée marche avec les colonnes.", technique: 'locked-candidates', symmetry: 'mirror', seed: 21007, grid: '2..1.8..7/1..7.3..8/7..6.5..3/........./45.3.2.86/9.6...7.2/.9.....3./........./..79.62..' },
    { title: { fr: "Étoile filante", en: "Shooting star" }, tip: "Et à l'envers : coincé dans un bloc depuis une ligne.", technique: 'locked-candidates', symmetry: 'point', seed: 23041, grid: '.6....1../.974.8.../.43.6..../6......../..53476../........7/....8.51./...7.184./..9....6.' },
    { title: { fr: "Désordre", en: "Disorder" }, tip: "Quand rien ne bouge, cherchez un alignement.", technique: 'locked-candidates', symmetry: 'none', seed: 24025, grid: '....2.7../.2..4..8./...6.9..5/8......../...8..1../54......./.1...4.78/69.5.8..4/.....2..6' },
    { title: { fr: "Ricochet", en: "Ricochet" }, tip: "Un alignement en débloque souvent un autre.", technique: 'locked-candidates', symmetry: 'diagonal', seed: 22105, grid: '2...78.../..3.4.7.1/.7....2../........./79..2.435/5......72/.16.8..../....63.../.4..97..3' },
    { title: { fr: "Les jumeaux", en: "The twins" }, tip: "Deux cases qui n'acceptent que les deux mêmes chiffres les gardent pour elles.", technique: 'pair', symmetry: 'diagonal', seed: 27048, grid: '.56.3.97./7.....6.8/2.4.9.1../...4....3/3.1..6.9./....1..../847....../9...6...1/.1.5...8.' },
    { title: { fr: "Double serrure", en: "Double lock" }, tip: "Une paire ferme deux chiffres à tout le reste de la ligne.", technique: 'pair', symmetry: 'mirror', seed: 26011, grid: '56.9.4.17/...365.../........./...598.../3.9...5.1/4...3...2/.9.156.4./.1.....9./..2...1..' },
    { title: { fr: "Duo caché", en: "Hidden duo" }, tip: "Deux chiffres qui n'ont que les deux mêmes places les prennent.", technique: 'pair', symmetry: 'point', seed: 28006, grid: '4..23..7./...1...../..3....42/18..9..3./..7...6../.6..5..89/64....8../.....8.../.9..24..5' },
    { title: { fr: "Le pont", en: "The bridge" }, tip: "Paires et alignements, l'un après l'autre.", technique: 'pair', symmetry: 'point', seed: 25014, grid: '9...12..4/........./..54681../.1......9/.64...57./8......1./..78542../........./3..29...5' },
    { title: { fr: "La croix", en: "The cross" }, tip: "Deux lignes, deux colonnes, quatre coins : le chiffre quitte le reste des colonnes.", technique: 'x-wing', symmetry: 'mirror', seed: 30562, grid: '........./9.2...5.8/.7.....1./..92.48../4..7.3..9/.1.....4./...3.1.../..3.6.4../.54.7.18.' },
    { title: { fr: "Grand final", en: "Grand finale" }, tip: "Toutes les techniques, jusqu'à la croix.", technique: 'x-wing', symmetry: 'point', seed: 29760, grid: '...9...4./..8...6../5...6..38/..638..1./.52...86./.1..762../68..4...2/..5...3../.2...9...' },
];
/** The level list of the shell (names shown in the selector). */
export const LEVELS: readonly { name: string }[] = GRIDS.map(g => ({ name: g.title.fr }));
function sizeOf(grid: string): Size {
    const n = grid.split('/').length;
    if (n !== 4 && n !== 6 && n !== 9) throw new RangeError('Taille de grille');
    return n;
}
function difficultyOf(size: Size, technique: Technique): Difficulty {
    if (size === 4) return 'intro';
    if (technique === 'hidden-single') return 'easy';
    if (size === 6 || technique === 'naked-single' || technique === 'locked-candidates') return 'medium';
    return technique === 'pair' ? 'hard' : 'expert';
}
/** The level record of the dossier for written grid `index` (mode classic, origin curated). */
export function levelRecord(index: number): SudokuLevel {
    const data = GRIDS[index]; if (!data) throw new RangeError('Niveau');
    const size = sizeOf(data.grid);
    return { schemaVersion: '1.0.0', id: `SDK-CL-${String(index + 1).padStart(2, '0')}`, mode: 'classic', origin: 'curated', seed: data.seed,
        ...geometry(size), givens: parseGrid(data.grid), difficulty: difficultyOf(size, data.technique), generatorVersion: '1.0.0' };
}
