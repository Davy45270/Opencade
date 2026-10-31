export const GAME_NAME = 'Les Artificiers';
export type Shape = 'islands' | 'cliffs' | 'crater' | 'cave' | 'city' | 'bridge';
export type Mission = 'duel' | 'target' | 'survive' | 'structure';
export interface Level {
    name: string; world: number; shape: Shape; height: number; amplitude: number;
    frequency: number; gap: number; left: number; right: number; teams: number;
    wind: number; ai: 0 | 1 | 2; mission: Mission; goal: number; sudden: number;
}
// Authored parameters, never selected by a random map generator.
const rows: readonly (readonly [string, Shape, number, number, number, number, number, number, number, number, 0 | 1 | 2, Mission, number])[] = [
    ['Premier pétard', 'islands', 432, 16, 1.2, 172, 58, 282, 1, 0, 0, 'target', 1],
    ['Deux rives', 'islands', 455, 31, 2.1, 190, 44, 306, 1, 8, 0, 'duel', 1],
    ['Passerelle verte', 'bridge', 420, 24, 1.4, 165, 72, 264, 1, 12, 0, 'duel', 1],
    ['Sous les racines', 'cave', 462, 21, 2.6, 145, 40, 290, 1, 10, 0, 'duel', 1],
    ['Le belvédère', 'cliffs', 448, 43, 1.8, 182, 62, 314, 1, 16, 0, 'structure', 1],
    ['Trois îlots', 'islands', 478, 46, 3.4, 158, 36, 266, 2, 18, 0, 'duel', 1],
    ['Le petit chantier', 'city', 440, 36, 2.3, 205, 84, 302, 2, 20, 0, 'duel', 1],
    ['Marée de jade', 'bridge', 474, 38, 2.7, 140, 48, 278, 1, 24, 1, 'survive', 4],
    ['La grande arche', 'cave', 427, 54, 1.7, 220, 66, 320, 2, 26, 1, 'duel', 1],
    ['Bastion des roseaux', 'cliffs', 464, 62, 3.1, 176, 32, 286, 2, 28, 1, 'structure', 1],
    ['Premier souffle', 'cliffs', 418, 32, 2.2, 155, 52, 294, 1, 24, 1, 'target', 1],
    ['Terrasses dorées', 'cliffs', 460, 58, 1.3, 210, 78, 312, 2, 30, 1, 'duel', 1],
    ['Le pont des brumes', 'bridge', 446, 55, 3.6, 180, 42, 270, 2, 32, 1, 'duel', 1],
    ['Galerie ambrée', 'cave', 488, 30, 2.9, 130, 64, 324, 2, 36, 1, 'duel', 1],
    ['Le vieux moulin', 'city', 420, 66, 1.6, 196, 30, 258, 2, 38, 1, 'structure', 1],
    ['Courants contraires', 'islands', 452, 70, 4.1, 165, 86, 306, 2, 42, 1, 'duel', 1],
    ['Le rempart ocre', 'city', 480, 48, 3.2, 226, 50, 282, 3, 44, 2, 'duel', 1],
    ['Tenir la corniche', 'cliffs', 436, 76, 2.5, 145, 34, 318, 2, 40, 2, 'survive', 6],
    ['Voûte de cuivre', 'cave', 456, 64, 4.4, 188, 74, 266, 3, 46, 2, 'duel', 1],
    ['Le grand échafaud', 'bridge', 498, 52, 1.9, 214, 46, 300, 3, 48, 2, 'structure', 1],
    ['Étincelle de basalte', 'crater', 442, 70, 1.1, 180, 60, 292, 1, 32, 1, 'target', 1],
    ['Les dents noires', 'cliffs', 490, 82, 3.8, 160, 36, 310, 3, 48, 2, 'duel', 1],
    ['Passage incandescent', 'bridge', 430, 68, 2.4, 202, 80, 274, 3, 52, 2, 'duel', 1],
    ['Le ventre du mont', 'cave', 508, 40, 3.3, 142, 48, 326, 3, 54, 2, 'duel', 1],
    ['La forge déserte', 'city', 458, 78, 4.6, 218, 28, 286, 3, 56, 2, 'structure', 1],
    ['La caldeira', 'crater', 470, 96, 1.7, 168, 70, 304, 3, 58, 2, 'duel', 1],
    ['Îles de cendre', 'islands', 500, 86, 4.8, 194, 42, 260, 3, 60, 2, 'duel', 1],
    ['Dernier refuge', 'crater', 420, 106, 2.8, 148, 54, 320, 3, 54, 2, 'survive', 8],
    ['Les tours fumantes', 'city', 482, 92, 3.7, 230, 88, 296, 3, 62, 2, 'duel', 1],
    ['Le cœur du fourneau', 'crater', 452, 112, 2.1, 182, 32, 310, 3, 64, 2, 'structure', 1],
];
export const LEVELS: readonly Level[] = rows.map((r, i) => ({
    name: r[0], shape: r[1], height: r[2], amplitude: r[3], frequency: r[4], gap: r[5],
    left: r[6], right: r[7], teams: r[8], wind: r[9], ai: r[10], mission: r[11], goal: r[12],
    world: Math.floor(i / 10), sudden: i < 10 ? 18 : i < 20 ? 14 : 10,
}));
export function levelAt(index: number): Level {
    const level = LEVELS[index];
    if (!level) throw new RangeError('Niveau invalide');
    return { ...level };
}
