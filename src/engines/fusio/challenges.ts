import { SCHEMA_VERSION, type GameConfig, type Size } from './rules';
/**
 * The thirty written challenges, after the classic game. Each one changes the rules one at a time against the base
 * (4 × 4, 2 at 90 %): the target, the board size, the spawn weights, blocked cells, a move limit, an editorial start,
 * then undo switched off from challenge 21. Each has a fixed seed. Its `difficulty` is MEASURED, not proved: the
 * share of games lost by the expectimax agent (depth 1) playing the challenge's own seed with 25 %, 10 % and 3 % of
 * random moves, 40 games per level (solver.ts `measure`), recomputed by scripts/validate-fusio.js. A seed never
 * makes a game winnable: spawns follow the moves, and every challenge can be lost.
 */
export type Theme = 'classique' | 'pastel' | 'nature' | 'neon' | 'espace' | 'arcade';
export const THEMES: readonly Theme[] = ['classique', 'pastel', 'nature', 'neon', 'espace', 'arcade'];
export interface Challenge {
    name: string; en: string;
    /** Companion's line when the challenge opens: what is new. */
    tip: string;
    size: Size; target: number; seed: number;
    p2?: number; moveLimit?: number; walls?: number[]; start?: number[]; undo?: boolean;
    /** Measured difficulty, 0 (always won) to 100 (never won), frozen from `measure`. */
    difficulty: number;
}
const S = (rows: string): number[] => rows.trim().split(/\s+/).map(Number);
export const CHALLENGES: readonly Challenge[] = [
    { name: 'Premier 128', en: 'First 128', tip: 'Objectif 128 : glissez, deux tuiles égales fusionnent.', size: 4, target: 128, seed: 4527, difficulty: 1.7 },
    { name: 'Grand plateau', en: 'Big board', tip: '5 × 5 : plus de place, objectif 512.', size: 5, target: 512, seed: 4528, difficulty: 5.8 },
    { name: 'Pluie de 4', en: 'Raining fours', tip: 'Ici, une tuile sur deux qui apparaît est un 4.', size: 4, target: 128, seed: 4529, p2: 50, difficulty: 10 },
    { name: 'Le rocher', en: 'The rock', tip: 'Un rocher en haut : il coupe la ligne en deux.', size: 4, target: 128, seed: 4531, walls: [1], difficulty: 10 },
    { name: 'Coins condamnés', en: 'Closed corners', tip: 'Deux coins sont pris : choisissez bien le vôtre.', size: 5, target: 512, seed: 4533, walls: [0, 24], difficulty: 12.5 },
    { name: 'Compte à rebours', en: 'Countdown', tip: '110 coups au plus pour atteindre 128.', size: 4, target: 128, seed: 4532, moveLimit: 110, difficulty: 15 },
    { name: 'Quatre piliers', en: 'Four pillars', tip: '6 × 6 et quatre cases bloquées : les tuiles s’arrêtent contre elles.', size: 6, target: 512, seed: 4530, walls: [7, 10, 25, 28], difficulty: 18.3 },
    { name: 'Mille vingt-quatre', en: 'A thousand and twenty-four', tip: '5 × 5 jusqu’à 1024 : de la patience.', size: 5, target: 1024, seed: 4535, difficulty: 20 },
    { name: 'Deux coins pris', en: 'Two corners taken', tip: 'Deux coins opposés sont bloqués : il en reste deux.', size: 4, target: 128, seed: 4538, walls: [0, 15], difficulty: 24.2 },
    { name: 'Course au 512', en: 'Race to 512', tip: '512 en 380 coups au plus.', size: 5, target: 512, seed: 4537, moveLimit: 380, difficulty: 25 },
    { name: 'Que des 2', en: 'Only twos', tip: 'Il n’apparaît que des 2 : plus lent, mais plus sûr.', size: 4, target: 256, seed: 4540, p2: 100, difficulty: 28.3 },
    { name: 'Petit damier', en: 'Small checkerboard', tip: 'Trois rangées en damier : rien ne fusionne au départ.', size: 4, target: 256, seed: 4542, start: S('2 4 2 4  4 2 4 2  2 4 2 4  0 0 0 0'), difficulty: 28.3 },
    { name: 'Le damier', en: 'The checkerboard', tip: 'Un damier de 2 et de 4 : il faut l’ouvrir par un bord.', size: 5, target: 1024, seed: 4536, start: S('128 2 4 2 64  2 4 2 4 2  4 2 0 2 4  2 4 2 4 2  32 2 4 2 16'), difficulty: 29.2 },
    { name: 'Cap sur 256', en: 'Heading for 256', tip: '4 × 4, objectif 256 : gardez la grande tuile dans un coin.', size: 4, target: 256, seed: 4539, difficulty: 33.3 },
    { name: 'Pierre au milieu', en: 'Stone in the middle', tip: 'Une pierre au centre du plateau gêne les fusions.', size: 4, target: 128, seed: 4543, walls: [5], difficulty: 35.8 },
    { name: 'Deux cents coups', en: 'Two hundred moves', tip: '256 en 200 coups au plus.', size: 4, target: 256, seed: 4541, moveLimit: 200, difficulty: 44.2 },
    { name: 'Averse de 4', en: 'Downpour of fours', tip: 'Une tuile sur deux est un 4, sur 5 × 5 jusqu’à 1024.', size: 5, target: 1024, seed: 4546, p2: 50, difficulty: 44.2 },
    { name: 'Le puits', en: 'The well', tip: 'Le centre du 5 × 5 est bloqué.', size: 5, target: 512, seed: 4547, walls: [12], difficulty: 45 },
    { name: 'Le coin perdu', en: 'The lost corner', tip: 'Le coin en haut à gauche est bloqué, objectif 256.', size: 4, target: 256, seed: 4545, walls: [0], difficulty: 47.5 },
    { name: 'Marathon', en: 'Marathon', tip: '1024 sur 5 × 5 en 700 coups au plus.', size: 5, target: 1024, seed: 4544, moveLimit: 700, difficulty: 52.5 },
    { name: 'Quatre-vingt-dix coups', en: 'Ninety moves', tip: 'Désormais sans annuler. 128 en 90 coups : chaque coup compte.', size: 4, target: 128, seed: 4549, moveLimit: 90, undo: false, difficulty: 56.7 },
    { name: 'L’îlot', en: 'The islet', tip: 'Un îlot de quatre cases au centre du 6 × 6, et 420 coups.', size: 6, target: 512, seed: 4551, walls: [14, 15, 20, 21], moveLimit: 420, undo: false, difficulty: 59.2 },
    { name: 'Départ en désordre', en: 'Messy start', tip: 'Le plateau commence en désordre : rangez-le avant tout.', size: 4, target: 256, seed: 4534, start: S('2 64 4 32  16 2 8 4  4 8 2 16  0 0 0 0'), undo: false, difficulty: 62.5 },
    { name: 'Au plus juste', en: 'Tight count', tip: '256 en 160 coups : aucun coup perdu.', size: 4, target: 256, seed: 4553, moveLimit: 160, undo: false, difficulty: 67.5 },
    { name: 'Sprint', en: 'Sprint', tip: '512 sur 5 × 5 en 310 coups.', size: 5, target: 512, seed: 4550, moveLimit: 310, undo: false, difficulty: 72.5 },
    { name: 'Le dernier rocher', en: 'The last rock', tip: 'Un rocher au cœur du 4 × 4 et 256 à atteindre.', size: 4, target: 256, seed: 4556, walls: [5], undo: false, difficulty: 78.3 },
    { name: 'L’escalier', en: 'The staircase', tip: 'L’escalier est déjà monté jusqu’à 128 : allez à 512.', size: 4, target: 512, seed: 4552, start: S('128 64 32 16  0 0 0 8  0 0 0 0  0 0 0 2'), undo: false, difficulty: 80 },
    { name: 'Le mur', en: 'The wall', tip: 'Un mur de deux cases au milieu du 4 × 4.', size: 4, target: 128, seed: 4557, walls: [5, 6], undo: false, difficulty: 84.2 },
    { name: 'Cap sur 512', en: 'Heading for 512', tip: '512 sur 4 × 4, sans annuler.', size: 4, target: 512, seed: 4555, undo: false, difficulty: 83.3 },
    { name: 'Les deux bornes', en: 'Two posts', tip: 'Deux bornes coupent le 5 × 5 en couloirs.', size: 5, target: 512, seed: 4554, walls: [7, 17], undo: false, difficulty: 84.2 },
];
/** Theme of a challenge: five per theme, in order. */
export const themeOf = (index: number): Theme => THEMES[Math.min(THEMES.length - 1, Math.floor(index / 5))] ?? 'classique';
/** The game config of a challenge (the dossier's contract, with the challenge extensions). */
export function challengeConfig(index: number): GameConfig {
    const c = CHALLENGES[index]; if (!c) throw new RangeError('Défi');
    const config: GameConfig = { schemaVersion: SCHEMA_VERSION, mode: 'challenge', size: c.size, target: c.target, seed: c.seed, spawnWeights: { '2': c.p2 ?? 90, '4': 100 - (c.p2 ?? 90) }, undoEnabled: c.undo !== false, timerSeconds: null };
    if (c.moveLimit) config.moveLimit = c.moveLimit;
    if (c.walls) config.walls = [...c.walls];
    if (c.start) config.start = [...c.start];
    return config;
}
/** The classic game, the entry point: 4 × 4, target 2048, may go on after the win (the dossier's example config). */
export function classicConfig(seed: number): GameConfig {
    return { schemaVersion: SCHEMA_VERSION, mode: 'classic', size: 4, target: 2048, seed: seed >>> 0, spawnWeights: { '2': 90, '4': 10 }, undoEnabled: true, timerSeconds: null, continueAfterWin: true };
}
