import { geometry, parseGrid, type Difficulty, type Size, type SudokuLevel } from './grid';
import type { Technique } from './logic';
import type { Symmetry } from './generator';
/**
 * The Classic progression: thirty written 9 × 9 grids, from grids rich in clues (hidden singles only) to the X-wing; each
 * new technique arrives alone (naked single, locked candidates, pair, X-wing). The 4 × 4 and 6 × 6 sizes stay in the
 * engine for the kid edition but are not part of this progression. Found offline by scripts/record-sudoku.js (seed kept
 * for provenance), titles written by hand. `technique` is the hardest step the
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
    { title: { fr: "Premiers pas", en: "First steps" }, tip: "Chaque ligne, chaque colonne et chaque bloc contient 1 à 9, une seule fois.", technique: 'hidden-single', symmetry: 'point', seed: 1001, grid: '.56.97..3/7493.6..2/3.12.5.6./1.2.3...4/.739.168./8...6.2.1/.2.8.34.9/9..4.2176/5..67.32.' },
    { title: { fr: "Le miroir", en: "The mirror" }, tip: "Touchez une case vide, puis un chiffre du pavé.", technique: 'hidden-single', symmetry: 'mirror', seed: 2000, grid: '.4..5..8./713...596/8.......1/..6...4../53.218.79/978...125/4.9...3.7/25..8..64/367941852' },
    { title: { fr: "La diagonale", en: "The diagonal" }, tip: "Bloqué ? L'ampoule explique la prochaine déduction.", technique: 'hidden-single', symmetry: 'diagonal', seed: 3000, grid: '8217.95../4978.51../65..1.8../97....315/..5.7...6/14...37.2/5694.7..1/...3....9/...95647.' },
    { title: { fr: "Quatre coins", en: "Four corners" }, tip: "Cherchez où le 1 peut aller dans chaque bloc.", technique: 'hidden-single', symmetry: 'point', seed: 4000, grid: '....815.4/..5.6.127/4.1...8.9/...6.925./15.2.4.86/.275.8.../9.4...3.5/512.4.6../7.389....' },
    { title: { fr: "Sans motif", en: "No pattern" }, tip: "Aucune symétrie : la grille ne se devine pas, elle se déduit.", technique: 'hidden-single', symmetry: 'none', seed: 5000, grid: '4.8..2.7./1.67953.8/....8.921/6....18.5/..2.3.4../3159...62/.7.....5./.614.7.9./9....3.8.' },
    { title: { fr: "Les deux rives", en: "Two shores" }, tip: "Le crayon note les chiffres possibles dans une case, sans les jouer.", technique: 'hidden-single', symmetry: 'mirror', seed: 6000, grid: '849.6.527/53.824.91/........./..2...4../4..9.7..6/.6.4.2.5./9.......5/..3...9../2813.5764' },
    { title: { fr: "Pente douce", en: "Gentle slope" }, tip: "Un chiffre bien placé retire ses notes de la ligne, de la colonne et du bloc.", technique: 'hidden-single', symmetry: 'diagonal', seed: 7000, grid: '...896.7./...45..../..6..148./34......9/78...5.42/5.2.3.8../..5..8..4/2.8.4...5/...56.92.' },
    { title: { fr: "Blocs déserts", en: "Empty blocks" }, tip: "Un bloc presque vide se remplit par ses voisins.", technique: 'hidden-single', symmetry: 'point', seed: 8000, grid: '6.....312/.4.....9./5...19.../8697.1.../...9.6.../...3.5946/...46...1/.3.....8./421.....3' },
    { title: { fr: "Un seul choix", en: "Only choice" }, tip: "Quand une case n'a plus qu'un chiffre possible, c'est lui.", technique: 'naked-single', symmetry: 'point', seed: 9018, grid: '.7.186.3./...9..7.6/..4.5...1/896.7..../5.7...8.9/....9.267/9...6.1../7.1..4.../.6.519.7.' },
    { title: { fr: "Reflets", en: "Reflections" }, tip: "Les notes vous évitent de tout recompter.", technique: 'naked-single', symmetry: 'mirror', seed: 10026, grid: '.62...83./...6.4.../1.4...7.6/.76...51./3...7...8/2.......3/........./4.13.86.7/.9716234.' },
    { title: { fr: "Clairière", en: "Clearing" }, tip: "Comptez les chiffres déjà vus par chaque case.", technique: 'naked-single', symmetry: 'none', seed: 11012, grid: '3.41...../.1..2..4./9.6.4...3/...6...21/...37.98./29...87.5/....3..98/769...1../..8......' },
    { title: { fr: "Biais", en: "Slant" }, tip: "Une case vue par huit chiffres différents n'a plus qu'un choix.", technique: 'naked-single', symmetry: 'diagonal', seed: 12003, grid: '.2.15.4../4..8.62../.....2..8/89......4/6...7.53./.52...9../26..31.../....8..../..52....7' },
    { title: { fr: "Candidat unique", en: "Lone candidate" }, tip: "Certaines cases n'ont plus qu'un chiffre possible : cherchez-les.", technique: 'naked-single', symmetry: 'mirror', seed: 14002, grid: '56.8.7.13/...3.1.../.8.....6./...5.4.../..2.8.4../....3..../..6.7.9../.18.2.37./.35...62.' },
    { title: { fr: "Fil de soie", en: "Silk thread" }, tip: "Balayez chaque bloc chiffre par chiffre.", technique: 'naked-single', symmetry: 'point', seed: 13000, grid: '......64./49.1.6.../2.1.3...9/.....9.1./1.......8/.8.4...../9...6.2.7/...9.2.83/.72......' },
    { title: { fr: "Alignés", en: "In line" }, tip: "Si un chiffre d'un bloc est forcément sur une ligne, il quitte le reste de cette ligne.", technique: 'locked-candidates', symmetry: 'point', seed: 15004, grid: '.....9.2./.29.8..4./6...41..9/9..1..3../1..865..7/..5..7..1/8..45...6/.9..1.83./.6.9.....' },
    { title: { fr: "Les colonnes", en: "Columns" }, tip: "La même idée marche avec les colonnes.", technique: 'locked-candidates', symmetry: 'mirror', seed: 16013, grid: '2.......8/.9.....3./1.6...7.2/........./.2..9..7./7..2.6..1/8..5.1..7/..1.7.3../95.3.4.16' },
    { title: { fr: "Désordre", en: "Disorder" }, tip: "Quand rien ne bouge, cherchez un alignement.", technique: 'locked-candidates', symmetry: 'none', seed: 18003, grid: '....95.46/......8../7.6....../.....7..8/...2..5../4.1..8.9./....8.972/.7....3../16..39...' },
    { title: { fr: "Étoile filante", en: "Shooting star" }, tip: "Et à l'envers : coincé dans un bloc depuis une ligne.", technique: 'locked-candidates', symmetry: 'diagonal', seed: 17009, grid: '.49....../63...9.4./2..37..../..7....../..3.5.716/.5.....3./....3.27./.7..659../....8...4' },
    { title: { fr: "Ricochet", en: "Ricochet" }, tip: "Un alignement en débloque souvent un autre.", technique: 'locked-candidates', symmetry: 'mirror', seed: 20026, grid: '9.3.7.8.1/...1.9.../........./..78.12../3..4.6..7/..2...3../4.......6/8.9...5.2/..6.8.7..' },
    { title: { fr: "Pointer du doigt", en: "Pointing" }, tip: "Un chiffre coincé sur une ligne d'un bloc l'interdit au reste de la ligne.", technique: 'locked-candidates', symmetry: 'point', seed: 19118, grid: '.9....5../....2..83/...7.4.../.8....2.4/..45921../7.1....9./...4.7.../65..3..../..9....1.' },
    { title: { fr: "Les jumeaux", en: "The twins" }, tip: "Deux cases qui n'acceptent que les deux mêmes chiffres les gardent pour elles.", technique: 'pair', symmetry: 'point', seed: 21076, grid: '.1..6..4./..53..6.8/....78.../..9...8.4/45.....13/6.3...2../...25..../5.4..79../.9..8..7.' },
    { title: { fr: "Double serrure", en: "Double lock" }, tip: "Une paire ferme deux chiffres à tout le reste de la ligne.", technique: 'pair', symmetry: 'mirror', seed: 23169, grid: '3.......2/.6.....8./...276.../63.8.9.21/1.......4/9.4...7.6/.5.1.4.7./........./.1.3.8.6.' },
    { title: { fr: "Duo caché", en: "Hidden duo" }, tip: "Deux chiffres qui n'ont que les deux mêmes places les prennent.", technique: 'pair', symmetry: 'diagonal', seed: 22002, grid: '..2.....3/.3.8....6/8....1.../.6..7.8../...5.2.67/..3.6..9./...6...../....45..9/14..3..78' },
    { title: { fr: "Le pont", en: "The bridge" }, tip: "Paires et alignements, l'un après l'autre.", technique: 'pair', symmetry: 'diagonal', seed: 26035, grid: '.8......./4..3.6..8/..5.2.7.6/.4.....2./..2..5..9/.5..73.1./..7....8./...7.15../.94.3....' },
    { title: { fr: "Symétrie", en: "Symmetry" }, tip: "Une paire dans un bloc, une autre dans une colonne : elles s'enchaînent.", technique: 'pair', symmetry: 'point', seed: 25014, grid: '9...12..4/........./..54681../.1......9/.64...57./8......1./..78542../........./3..29...5' },
    { title: { fr: "Labyrinthe", en: "Labyrinth" }, tip: "Beaucoup de paires : notez, puis éliminez.", technique: 'pair', symmetry: 'none', seed: 24040, grid: '...1.6.7./...4...../..9...14./..5..9.../9.....325/7.46...../.43....59/1....2.../.8......6' },
    { title: { fr: "La croix", en: "The cross" }, tip: "Deux lignes, deux colonnes, quatre coins : le chiffre quitte le reste des colonnes.", technique: 'x-wing', symmetry: 'point', seed: 28279, grid: '12.3..9../47..1...3/...9..7../6.4....../73.....16/......3.2/..5..4.../3...5..97/..7..6.34' },
    { title: { fr: "Croisée", en: "Crossing" }, tip: "La croix marche aussi en partant des colonnes.", technique: 'x-wing', symmetry: 'mirror', seed: 28419, grid: '....7..../8.......6/.638.952./4..1.2..8/.1..9..3./..7.3.2../3..7.5..4/........./.8..2..9.' },
    { title: { fr: "Vertige", en: "Vertigo" }, tip: "Toutes les techniques se relaient.", technique: 'x-wing', symmetry: 'diagonal', seed: 29645, grid: '.6.34.7../7...568../.......45/4..1...../89...3.7./.5..9..../62......9/..4.6...7/..5...32.' },
    { title: { fr: "Grand final", en: "Grand finale" }, tip: "Toutes les techniques, jusqu'à la croix.", technique: 'x-wing', symmetry: 'point', seed: 30006, grid: '....2..3./3.....9.7/4.53...62/9...3.48./........./.42.1...6/86...12.3/2.4.....8/.5..9....' },
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
