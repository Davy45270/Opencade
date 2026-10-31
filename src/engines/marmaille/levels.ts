/** Marmaille: hand-made boards built from a few drawing primitives (20 × 22 cells). */
export const GAME_NAME = 'Marmaille';
export type RoleCounts = Partial<Record<'block' | 'build' | 'dig' | 'bash' | 'float' | 'climb', number>>;
export interface LevelDef {
    id: string;
    name: string;
    /** What this board introduces or asks to combine (shown in the HUD). */
    lesson: string;
    map: readonly string[];
    spawn: { x: number; y: number };
    exit: { x: number; y: number };
    dir?: 1 | -1;
    count: number;
    needed: number;
    /** Ticks between two departures. */
    rate: number;
    seconds: number;
    roles: RoleCounts;
}
type Op = ['fill', number, number, number, number, string];
/** Paints rectangles (x0, y0, x1, y1 inclusive) of one tile onto an empty 20 × 22 board. */
function board(...ops: Op[]): string[] {
    const g = Array.from({ length: 22 }, () => Array.from({ length: 20 }, () => '.'));
    for (const [, x0, y0, x1, y1, t] of ops) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const row = g[y]; if (row) row[x] = t; }
    return g.map(r => r.join(''));
}
const f = (x0: number, y0: number, x1: number, y1: number, t: string): Op => ['fill', x0, y0, x1, y1, t];
const FLOOR = f(0, 18, 19, 21, 'X');
export const LEVELS: readonly LevelDef[] = [
    { id: 'M1', name: 'Premiers pas', lesson: 'La marmaille marche droit devant : rejoindre la porte',
        map: board(FLOOR), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 5, needed: 4, rate: 8, seconds: 60, roles: {} },
    { id: 'M2', name: 'Le garde', lesson: 'Bloqueur : fait demi-tourner les autres',
        map: board(FLOOR, f(16, 18, 19, 18, '~')), spawn: { x: 6, y: 14 }, exit: { x: 1, y: 17 }, count: 6, needed: 5, rate: 8, seconds: 60, roles: { block: 1 } },
    { id: 'M3', name: 'La falaise', lesson: 'Plus de cinq cases de chute : perdu. Petites marches : sans danger',
        map: board(FLOOR, f(6, 11, 14, 11, '#'), f(5, 12, 5, 12, '#'), f(4, 13, 4, 13, '#'), f(3, 14, 3, 14, '#'), f(2, 15, 2, 15, '#'), f(1, 16, 1, 16, '#')),
        spawn: { x: 9, y: 7 }, exit: { x: 1, y: 17 }, count: 6, needed: 5, rate: 8, seconds: 70, roles: { block: 1 } },
    { id: 'M4', name: 'Le pont', lesson: 'Bâtisseur : pose cinq marches au-dessus du vide',
        map: board(FLOOR, f(9, 18, 11, 18, '~')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 6, needed: 5, rate: 12, seconds: 70, roles: { build: 2 } },
    { id: 'M5', name: 'La corniche', lesson: 'Bâtir pour monter sur un rebord',
        map: board(FLOOR, f(14, 14, 19, 17, '#')), spawn: { x: 2, y: 14 }, exit: { x: 18, y: 13 }, count: 8, needed: 6, rate: 12, seconds: 80, roles: { build: 2 } },
    { id: 'M6', name: 'La cave', lesson: 'Creuseur : perce la terre sous ses pieds',
        map: board(f(0, 17, 19, 21, 'X'), f(0, 12, 19, 13, '#'), f(0, 0, 0, 11, 'X'), f(19, 0, 19, 11, 'X')),
        spawn: { x: 4, y: 8 }, exit: { x: 14, y: 16 }, count: 6, needed: 5, rate: 8, seconds: 70, roles: { dig: 1 } },
    { id: 'M7', name: 'Sous la cave', lesson: 'Creuser puis garder : deux rôles à la suite',
        map: board(f(0, 17, 12, 21, 'X'), f(13, 17, 19, 17, '~'), f(13, 18, 19, 21, 'X'), f(0, 12, 19, 13, '#'), f(0, 0, 0, 11, 'X'), f(19, 0, 19, 11, 'X')),
        spawn: { x: 4, y: 8 }, exit: { x: 2, y: 16 }, count: 8, needed: 6, rate: 10, seconds: 80, roles: { dig: 1, block: 1 } },
    { id: 'M8', name: 'Le tunnel', lesson: 'Mineur : creuse droit devant à travers la terre',
        map: board(FLOOR, f(9, 13, 12, 17, '#'), f(9, 0, 12, 12, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 6, needed: 5, rate: 8, seconds: 70, roles: { bash: 1 } },
    { id: 'M9', name: 'Tunnel et pont', lesson: 'Miner, puis bâtir au-dessus de l’eau',
        map: board(FLOOR, f(6, 13, 8, 17, '#'), f(6, 0, 8, 12, 'X'), f(11, 18, 13, 18, '~')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 6, needed: 5, rate: 12, seconds: 80, roles: { bash: 1, build: 1 } },
    { id: 'M10', name: 'Le grand saut', lesson: 'Parachute : chaque enfant qui en a un tombe sans danger',
        map: board(FLOOR, f(0, 8, 9, 9, 'X')), spawn: { x: 2, y: 4 }, exit: { x: 16, y: 17 }, count: 6, needed: 5, rate: 8, seconds: 70, roles: { float: 6 } },
    { id: 'M11', name: 'Le puits', lesson: 'Creuser un puits profond, parachutes ouverts',
        map: board(FLOOR, f(0, 8, 19, 9, '#'), f(0, 0, 0, 7, 'X'), f(19, 0, 19, 7, 'X')), spawn: { x: 4, y: 4 }, exit: { x: 14, y: 17 }, count: 6, needed: 5, rate: 10, seconds: 80, roles: { dig: 1, float: 6 } },
    { id: 'M12', name: 'Le mur', lesson: 'Grimpeur : escalade les murs au lieu de faire demi-tour',
        map: board(FLOOR, f(10, 13, 10, 17, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 16, y: 17 }, count: 6, needed: 5, rate: 8, seconds: 70, roles: { climb: 6 } },
    { id: 'M13', name: 'Grimper puis bâtir', lesson: 'Grimper le mur, puis bâtir au-dessus de l’eau',
        map: board(FLOOR, f(6, 13, 6, 17, 'X'), f(9, 18, 11, 18, '~')), spawn: { x: 2, y: 14 }, exit: { x: 16, y: 17 }, count: 6, needed: 5, rate: 12, seconds: 80, roles: { climb: 6, build: 1 } },
    { id: 'M14', name: 'Le chantier', lesson: 'Creuser jusqu’à la galerie, puis miner vers la sortie',
        map: board(f(0, 16, 19, 21, 'X'), f(1, 11, 18, 12, '#'), f(12, 11, 18, 12, 'X'), f(0, 0, 0, 15, 'X'), f(19, 0, 19, 15, 'X'), f(12, 13, 14, 15, '#')),
        spawn: { x: 3, y: 7 }, exit: { x: 17, y: 15 }, count: 8, needed: 6, rate: 10, seconds: 90, roles: { dig: 1, bash: 1 } },
    { id: 'M15', name: 'Le grand passage', lesson: 'Final : parachutes, mineur et bâtisseur',
        map: board(FLOOR, f(0, 7, 8, 7, 'X'), f(10, 13, 11, 17, '#'), f(10, 0, 11, 12, 'X'), f(13, 18, 15, 18, '~')),
        spawn: { x: 3, y: 3 }, exit: { x: 18, y: 17 }, count: 8, needed: 6, rate: 12, seconds: 100, roles: { float: 8, bash: 1, build: 1 } },
    { id: 'M16', name: 'Deux fossés', lesson: 'Deux ponts à la suite : le même bâtisseur peut reprendre',
        map: board(FLOOR, f(6, 18, 7, 18, '~'), f(13, 18, 14, 18, '~')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 6, needed: 5, rate: 12, seconds: 80, roles: { build: 2 } },
    { id: 'M17', name: 'Demi-tour', lesson: 'Le bloqueur renvoie la troupe vers le pont',
        map: board(FLOOR, f(1, 18, 3, 18, '~'), f(14, 18, 15, 18, '~')), spawn: { x: 10, y: 14 }, dir: -1, exit: { x: 18, y: 17 }, count: 7, needed: 5, rate: 10, seconds: 80, roles: { block: 1, build: 1 } },
    { id: 'M18', name: 'La cheminée', lesson: 'Grimper haut, redescendre en parachute',
        map: board(FLOOR, f(9, 9, 10, 17, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 16, y: 17 }, count: 6, needed: 5, rate: 10, seconds: 80, roles: { climb: 6, float: 6 } },
    { id: 'M19', name: 'Les deux étages', lesson: 'Creuser deux fois, un étage après l’autre',
        map: board(FLOOR, f(0, 0, 0, 17, 'X'), f(19, 0, 19, 17, 'X'), f(1, 8, 18, 9, '#'), f(1, 13, 18, 14, '#')), spawn: { x: 4, y: 4 }, exit: { x: 15, y: 17 }, count: 6, needed: 5, rate: 10, seconds: 90, roles: { dig: 2 } },
    { id: 'M20', name: 'Atterrissage', lesson: 'Parachutes, puis un garde avant l’eau',
        map: board(FLOOR, f(0, 8, 9, 9, 'X'), f(15, 18, 19, 18, '~')), spawn: { x: 2, y: 4 }, exit: { x: 2, y: 17 }, count: 7, needed: 5, rate: 10, seconds: 90, roles: { float: 7, block: 1 } },
    { id: 'M21', name: 'L’escalier', lesson: 'Deux volées de marches pour atteindre la terrasse',
        map: board(FLOOR, f(14, 8, 19, 17, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 7 }, count: 6, needed: 5, rate: 14, seconds: 90, roles: { build: 2 } },
    { id: 'M22', name: 'Le gouffre', lesson: 'Sauter en parachute, puis bâtir au-dessus de l’eau',
        map: board(FLOOR, f(0, 10, 8, 11, 'X'), f(12, 18, 14, 18, '~')), spawn: { x: 2, y: 6 }, exit: { x: 18, y: 17 }, count: 6, needed: 5, rate: 12, seconds: 90, roles: { float: 6, build: 1 } },
    { id: 'M23', name: 'Deux collines', lesson: 'Miner deux collines l’une après l’autre',
        map: board(FLOOR, f(6, 13, 8, 17, '#'), f(6, 0, 8, 12, 'X'), f(12, 13, 14, 17, '#'), f(12, 0, 14, 12, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 6, needed: 5, rate: 10, seconds: 80, roles: { bash: 2 } },
    { id: 'M24', name: 'Le sommet', lesson: 'Grimper la butte, puis creuser jusqu’à la porte',
        map: board(FLOOR, f(8, 13, 12, 17, '#'), f(13, 8, 13, 17, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 12, y: 17 }, count: 6, needed: 5, rate: 10, seconds: 80, roles: { climb: 6, dig: 1 } },
    { id: 'M25', name: 'Trois métiers', lesson: 'Creuser, miner, puis bâtir : trois rôles pour un seul passage',
        map: board(FLOOR, f(0, 0, 0, 17, 'X'), f(19, 0, 19, 17, 'X'), f(1, 16, 18, 17, 'X'), f(1, 11, 18, 12, '#'), f(9, 11, 18, 12, 'X'), f(9, 13, 11, 15, '#'), f(14, 16, 15, 17, '~')),
        spawn: { x: 3, y: 7 }, exit: { x: 18, y: 15 }, count: 7, needed: 5, rate: 12, seconds: 100, roles: { dig: 1, bash: 1, build: 1 } },
    { id: 'M26', name: 'La tour', lesson: 'Grimper la tour, sauter en parachute, miner la colline',
        map: board(FLOOR, f(8, 6, 9, 17, 'X'), f(13, 13, 15, 17, '#'), f(13, 0, 15, 12, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 18, y: 17 }, count: 6, needed: 5, rate: 12, seconds: 100, roles: { climb: 6, float: 6, bash: 1 } },
    { id: 'M27', name: 'La crevasse', lesson: 'Creuser une épaisse couche de terre, parachutes ouverts',
        map: board(FLOOR, f(0, 0, 0, 17, 'X'), f(19, 0, 19, 17, 'X'), f(1, 6, 18, 9, '#')), spawn: { x: 4, y: 2 }, exit: { x: 15, y: 17 }, count: 7, needed: 6, rate: 10, seconds: 90, roles: { dig: 1, float: 7 } },
    { id: 'M28', name: 'Le retour', lesson: 'Faire demi-tour, miner, puis bâtir jusqu’au bord',
        map: board(FLOOR, f(1, 18, 3, 18, '~'), f(10, 13, 11, 17, '#'), f(10, 0, 11, 12, 'X'), f(15, 18, 16, 18, '~')),
        spawn: { x: 8, y: 14 }, dir: -1, exit: { x: 19, y: 17 }, count: 8, needed: 6, rate: 10, seconds: 100, roles: { block: 1, bash: 1, build: 1 } },
    { id: 'M29', name: 'Mur et tunnel', lesson: 'Grimper le mur, puis miner la colline',
        map: board(FLOOR, f(6, 13, 6, 17, 'X'), f(11, 13, 13, 17, '#'), f(11, 0, 13, 12, 'X')), spawn: { x: 2, y: 14 }, exit: { x: 17, y: 17 }, count: 6, needed: 5, rate: 10, seconds: 90, roles: { climb: 6, bash: 1 } },
    { id: 'M30', name: 'La grande traversée', lesson: 'Final : parachutes, creuseur et bâtisseur',
        map: board(FLOOR, f(0, 6, 7, 7, 'X'), f(8, 12, 19, 13, '#'), f(13, 12, 19, 13, 'X'), f(0, 18, 7, 18, '~'), f(14, 18, 15, 18, '~')), spawn: { x: 2, y: 2 }, exit: { x: 18, y: 17 }, count: 8, needed: 6, rate: 12, seconds: 120, roles: { float: 8, dig: 1, build: 1 } },
];
