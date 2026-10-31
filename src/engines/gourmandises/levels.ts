/** Compact authored campaign; nine worlds playable, later worlds reserved.
 * Targets and target-colour weights are measured on five seeds, without tools.
 * Every other colour has weight 1. The same bag fills both modes and all heroes.
 */
export const GAME_NAME = 'Gourmandises';
export type ObstacleKind = 'crate' | 'ice' | 'vine' | 'chocolate' | 'drop' | 'belt' | 'portal' | 'honey' | 'lock' | 'key';
export type Objective = { kind: 'collect'; color: number; target: number }
    | { kind: 'crate' | 'ice' | 'score' | 'drop' | 'chocolate' | 'flower'; target: number };
export interface Level {
    name: string;
    width: number;
    height: number;
    seed: number;
    moves: number;
    colors: number;
    targetWeight: number;
    world: number;
    layout: number;
    finale: boolean;
    objectives: Objective[];
}
const rows: readonly (readonly [string, number, number, number, number, number, number])[] = [
    ["Découverte", 6, 6, 56, 28, 7919, 2],
    ["Première collecte", 6, 6, 56, 28, 15838, 2],
    ["Virage", 6, 6, 56, 27, 23757, 2.9],
    ["Croisement", 6, 6, 56, 27, 31676, 2.75],
    ["Duo", 6, 6, 56, 26, 39595, 2.8],
    ["Raccourci", 6, 6, 56, 26, 47514, 2.4],
    ["Blocage", 6, 6, 56, 25, 55433, 2.75],
    ["Cascade", 7, 7, 56, 25, 63352, 2.45],
    ["Détour", 7, 7, 56, 24, 71271, 2],
    ["Palier", 7, 7, 56, 24, 79190, 2.15],
    ["Symétrie", 7, 7, 56, 23, 87109, 2],
    ["Séparation", 7, 7, 56, 23, 95028, 2.45],
    ["Ouverture", 7, 7, 56, 22, 102947, 2],
    ["Chaîne", 7, 7, 56, 22, 110866, 2],
    ["Choix", 8, 7, 56, 21, 118785, 1.85],
    ["Pression douce", 8, 7, 56, 21, 126704, 2],
    ["Récompense", 8, 7, 56, 20, 134623, 1.85],
    ["Maîtrise", 8, 7, 56, 20, 142542, 2],
    ["Avant-finale", 8, 7, 56, 19, 150461, 2],
    ["Finale", 8, 7, 56, 19, 158380, 2],
    ["Découverte", 6, 6, 42, 28, 166299, 2.15],
    ["Première collecte", 6, 6, 42, 28, 174218, 2],
    ["Virage", 6, 6, 42, 27, 182137, 2.6],
    ["Croisement", 6, 6, 42, 27, 190056, 2.45],
    ["Duo", 6, 6, 42, 26, 197975, 2.45],
    ["Raccourci", 6, 6, 42, 26, 205894, 2.75],
    ["Blocage", 6, 6, 42, 25, 213813, 2.9],
    ["Cascade", 7, 7, 42, 25, 221732, 2.3],
    ["Détour", 7, 7, 42, 24, 229651, 2.3],
    ["Palier", 7, 7, 42, 24, 237570, 2],
    ["Symétrie", 7, 7, 42, 23, 245489, 2.3],
    ["Séparation", 7, 7, 42, 23, 253408, 2.6],
    ["Ouverture", 7, 7, 42, 22, 261327, 2.3],
    ["Chaîne", 7, 7, 42, 22, 269246, 2.3],
    ["Choix", 8, 7, 42, 21, 277165, 2],
    ["Pression douce", 8, 7, 42, 21, 285084, 2.15],
    ["Récompense", 8, 7, 42, 20, 293003, 2],
    ["Maîtrise", 8, 7, 42, 20, 300922, 2.15],
    ["Avant-finale", 8, 7, 42, 19, 308841, 2.15],
    ["Finale", 8, 7, 42, 19, 316760, 2.45],
    ["Découverte", 6, 6, 30, 28, 324679, 1.425],
    ["Première collecte", 6, 6, 30, 28, 332598, 1.55],
    ["Virage", 6, 6, 30, 27, 340517, 2.35],
    ["Croisement", 6, 6, 30, 27, 348436, 2.45],
    ["Duo", 6, 6, 30, 26, 356355, 2.25],
    ["Raccourci", 6, 6, 30, 26, 364274, 2.15],
    ["Blocage", 6, 6, 30, 25, 372193, 2.6],
    ["Cascade", 7, 7, 30, 25, 380112, 2],
    ["Détour", 7, 7, 30, 24, 388031, 1.975],
    ["Palier", 7, 7, 30, 24, 395950, 1.925],
    ["Symétrie", 7, 7, 30, 23, 403869, 2.45],
    ["Séparation", 7, 7, 30, 23, 411788, 2.9],
    ["Ouverture", 7, 7, 30, 22, 419707, 2.45],
    ["Chaîne", 7, 7, 30, 22, 427626, 2.45],
    ["Choix", 8, 7, 30, 21, 435545, 2.275],
    ["Pression douce", 8, 7, 30, 21, 443464, 2.75],
    ["Récompense", 8, 7, 30, 20, 451383, 2.275],
    ["Maîtrise", 8, 7, 30, 20, 459302, 2.75],
    ["Avant-finale", 8, 7, 30, 19, 467221, 2.75],
    ["Finale", 8, 7, 30, 19, 475140, 2.15],
];
export const WORLDS = Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    first: index * 20 + 1,
    last: index * 20 + 20,
    playable: index < 9,
}));
const firstLevels: readonly Level[] = rows.map(([name, width, height, target, moves, seed, targetWeight], index) => ({
    name,
    width,
    height,
    seed,
    moves,
    colors: 5 + Math.floor(index / 20),
    targetWeight,
    world: Math.floor(index / 20) + 1,
    layout: index % 20,
    finale: index % 20 === 19,
    objectives: [{
        kind: 'collect',
        color: required([0, 1, 3][Math.floor(index / 20)]),
        target,
    }],
}));
export function levelAt(index: number): Level {
    const level = LEVELS[index];
    if (!level) throw new RangeError('Niveau invalide');
    return level;
}
/** Physical parameters only: geometry is counted from the generated terrain. */
export function difficulty(index: number) {
    const level = levelAt(index);
    const cells = terrain(level);
    return {
        pressure: level.objectives.reduce((sum, o) => sum + o.target, 0) / level.moves,
        colors: level.colors,
        obstacles: cells.reduce((sum, c) => sum + c.crate + c.ice + (c.chocolate ? 1 : 0) + (c.hedge ? 1 : 0), 0),
        absent: cells.filter(c => !c.active).length,
        objectives: level.objectives.length,
    };
}
export interface Terrain {
    active: boolean;
    crate: number;
    ice: number;
    exit?: boolean;
    chocolate?: boolean;
    hedge?: boolean;
    belt?: { band: number; direction: 'right' | 'left' | 'down' | 'up' };
}
export function terrain(level: Level): Terrain[] {
    if (level.world >= 7) return gardenTerrain(level);
    if (level.world >= 4) return extendedTerrain(level);
    const { width: w, height: h, world, layout } = level;
    const middleX = Math.floor(w / 2);
    const middleY = Math.floor(h / 2);
    const absent = new Set<number>();
    // A narrow vertical passage and a central cross are distinct silhouettes.
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (layout === 2 && Math.abs(x - middleX) > 1 && y > 0 && y < h - 1) absent.add(y * w + x);
            if (layout === 3 && Math.abs(x - middleX) > 1 && Math.abs(y - middleY) > 1) absent.add(y * w + x);
            // The only bridge between the two rooms is the central cell.
            if (layout === 11 && x === middleX && y !== middleY) absent.add(y * w + x);
            if (layout === 6 && y === middleY && (x === 1 || x === w - 2)) absent.add(y * w + x);
        }
    }
    const quota = layout < 2 ? (world === 2 ? 4 : 0) : w === 6 ? 12 : w === 7 ? 14 : 16;
    const boundary = Array.from({ length: w * h }, (_, i) => i).filter(i => {
        const x = i % w;
        const y = Math.floor(i / w);
        return x === 0 || x === w - 1 || y === 0 || y === h - 1;
    }).sort((a, b) => {
        const cornerDistance = (i: number): number => Math.min(i % w, w - 1 - i % w)
            + Math.min(Math.floor(i / w), h - 1 - Math.floor(i / w));
        return cornerDistance(a) - cornerDistance(b) || a - b;
    });
    for (const i of boundary) {
        if (absent.size >= quota) break;
        absent.add(i);
    }
    const cells = Array.from({ length: w * h }, (_, i) => ({ active: !absent.has(i), crate: 0, ice: 0 }));
    if (world === 3) {
        const count = layout < 7 ? 2 : layout < 10 ? 3 : layout < 14 ? 6 : 8;
        // Small islands, away from the connecting neck and from the outer rim.
        const islands = cells.flatMap((c, i) => c.active && i % w > 0 && i % w < w - 1
            && Math.floor(i / w) > 0 && Math.floor(i / w) < h - 1
            && !(i % w === middleX && Math.floor(i / w) === middleY) ? [i] : []);
        islands.sort((a, b) => (a % 3) - (b % 3) || b - a);
        for (const i of islands.slice(0, count)) required(cells[i]).crate = layout >= 10 ? 2 : 1;
    }
    if (layout >= 17) {
        const ice = cells.flatMap((c, i) => c.active && !c.crate ? [i] : []).reverse().slice(0, 3);
        for (const i of ice) required(cells[i]).ice = 1;
    }
    return cells;
}

function required<T>(value: T | null | undefined): T {
    if (value == null) throw new Error('Valeur attendue');
    return value;
}

/** Authored dimensions, budgets and seeds; targets calibrated with the campaign policy. */
const laterRows: readonly (readonly [string, number, number, number, number, number, number])[] = [
    ["Découverte", 7, 7, 6, 27, 483059, 2.75],
    ["Première collecte", 7, 7, 6, 27, 490978, 2.25],
    ["Virage", 7, 7, 3, 26, 498897, 3],
    ["Croisement", 7, 7, 4, 26, 506816, 1.75],
    ["Duo", 7, 7, 5, 25, 514735, 1.5],
    ["Raccourci", 7, 7, 5, 25, 522654, 1.75],
    ["Blocage", 7, 7, 3, 24, 530573, 1.5],
    ["Cascade", 8, 7, 4, 24, 538492, 1.25],
    ["Détour", 8, 7, 5, 23, 546411, 1.75],
    ["Palier", 8, 7, 5, 23, 554330, 2.75],
    ["Symétrie", 8, 7, 3, 22, 562249, 1.75],
    ["Séparation", 8, 7, 2, 22, 570168, 2.85],
    ["Ouverture", 8, 7, 7, 21, 578087, 3.25],
    ["Chaîne", 8, 7, 4, 21, 586006, 1.25],
    ["Choix", 8, 8, 4, 20, 593925, 1.75],
    ["Pression douce", 8, 8, 5, 20, 601844, 3.25],
    ["Récompense", 8, 8, 4, 19, 609763, 1.75],
    ["Maîtrise", 8, 8, 8, 19, 617682, 3],
    ["Avant-finale", 8, 8, 3, 18, 625601, 2.5],
    ["Finale", 8, 8, 6, 18, 633520, 2.65],
    ["Découverte", 7, 7, 68, 27, 641439, 2],
    ["Première collecte", 7, 7, 56, 27, 649358, 1.75],
    ["Virage", 7, 7, 48, 26, 657277, 3],
    ["Croisement", 7, 7, 48, 26, 665196, 2.5],
    ["Duo", 7, 7, 60, 25, 673115, 2],
    ["Raccourci", 7, 7, 52, 25, 681034, 1.75],
    ["Blocage", 7, 7, 60, 24, 688953, 2.5],
    ["Cascade", 8, 7, 40, 24, 696872, 1.5],
    ["Détour", 8, 7, 72, 23, 704791, 2.75],
    ["Palier", 8, 7, 44, 23, 712710, 1.5],
    ["Symétrie", 8, 7, 40, 22, 720629, 1.5],
    ["Séparation", 8, 7, 56, 22, 728548, 2.75],
    ["Ouverture", 8, 7, 68, 21, 736467, 2.75],
    ["Chaîne", 8, 7, 44, 21, 744386, 2],
    ["Choix", 8, 8, 44, 20, 752305, 1.5],
    ["Pression douce", 8, 8, 44, 20, 760224, 1.5],
    ["Récompense", 8, 8, 40, 19, 768143, 1.5],
    ["Maîtrise", 8, 8, 56, 19, 776062, 2.5],
    ["Avant-finale", 8, 8, 40, 18, 783981, 1.75],
    ["Finale", 8, 8, 40, 18, 791900, 2.75],
    ["Découverte", 7, 7, 56, 27, 799819, 1.75],
    ["Première collecte", 7, 7, 44, 27, 807738, 1.5],
    ["Virage", 7, 7, 40, 26, 815657, 2],
    ["Croisement", 7, 7, 56, 26, 823576, 2.5],
    ["Duo", 7, 7, 56, 25, 831495, 1.75],
    ["Raccourci", 7, 7, 52, 25, 839414, 1.75],
    ["Blocage", 7, 7, 40, 24, 847333, 1.5],
    ["Cascade", 8, 7, 52, 24, 855252, 1.75],
    ["Détour", 8, 7, 40, 23, 863171, 1.5],
    ["Palier", 8, 7, 48, 23, 871090, 1.5],
    ["Symétrie", 8, 7, 48, 22, 879009, 1.5],
    ["Séparation", 8, 7, 72, 22, 886928, 2.75],
    ["Ouverture", 8, 7, 48, 21, 894847, 1.75],
    ["Chaîne", 8, 7, 72, 21, 902766, 2.5],
    ["Choix", 8, 8, 52, 20, 910685, 2],
    ["Pression douce", 8, 8, 60, 20, 918604, 2.25],
    ["Récompense", 8, 8, 44, 19, 926523, 1.75],
    ["Maîtrise", 8, 8, 56, 19, 934442, 2],
    ["Avant-finale", 8, 8, 40, 18, 942361, 1.5],
    ["Finale", 8, 8, 64, 18, 950280, 2.5],
];
const laterLevels: Level[] = laterRows.map(([name, width, height, target, moves, seed, targetWeight], index) => {
    const world = 4 + Math.floor(index / 20);
    const layout = index % 20;
    const finale = layout === 19;
    const level: Level = {
        name, width, height, moves, seed, world, layout, finale,
        colors: world === 4 ? 5 : 6, targetWeight,
        objectives: world === 4 ? [{ kind: 'drop', target }]
            : [{ kind: 'collect', color: world === 5 ? 4 : 1, target }],
    };
    if (finale) level.objectives.push(world === 4 ? { kind: 'collect', color: 2, target: 30 }
        : { kind: 'ice', target: terrain(level).reduce((sum, cell) => sum + cell.ice, 0) });
    return level;
});
/** Nine-world campaign: dimensions, budgets and silhouettes follow the design cards. */
const gardenRows: readonly (readonly [string, number, number, number, number, number, number])[] = [
    ["Découverte", 8, 7, 66, 26, 958199, 2],
    ["Première collecte", 8, 7, 99, 26, 966118, 2.5],
    ["Virage", 8, 7, 29, 25, 974037, 2],
    ["Croisement", 8, 7, 41, 25, 981956, 2],
    ["Duo", 8, 7, 84, 24, 989875, 2.5],
    ["Raccourci", 8, 7, 63, 24, 997794, 2],
    ["Blocage", 8, 7, 48, 23, 1005713, 2],
    ["Cascade", 8, 8, 67, 23, 1013632, 2],
    ["Détour", 8, 8, 55, 22, 1021551, 2],
    ["Palier", 8, 8, 99, 22, 1029470, 2.5],
    ["Symétrie", 8, 8, 55, 21, 1037389, 2],
    ["Séparation", 8, 8, 36, 21, 1045308, 2],
    ["Ouverture", 8, 8, 50, 20, 1053227, 2],
    ["Chaîne", 8, 8, 69, 20, 1061146, 2.5],
    ["Choix", 9, 8, 60, 19, 1069065, 2],
    ["Pression douce", 9, 8, 66, 19, 1076984, 2],
    ["Récompense", 9, 8, 55, 18, 1084903, 2],
    ["Maîtrise", 9, 8, 40, 18, 1092822, 1.5],
    ["Avant-finale", 9, 8, 65, 17, 1100741, 2.5],
    ["Finale", 9, 8, 116, 17, 1108660, 3],
    ["Découverte", 8, 7, 39, 26, 1116579, 1.5],
    ["Première collecte", 8, 7, 37, 25, 1124498, 1],
    ["Virage", 8, 7, 17, 12, 1132417, 1.5],
    ["Croisement", 8, 7, 16, 12, 1140336, 1],
    ["Duo", 8, 7, 37, 24, 1148255, 1],
    ["Raccourci", 8, 7, 37, 24, 1156174, 1.5],
    ["Blocage", 8, 7, 33, 15, 1164093, 1],
    ["Cascade", 8, 8, 34, 13, 1172012, 1],
    ["Détour", 8, 8, 34, 20, 1179931, 1.5],
    ["Palier", 8, 8, 38, 16, 1187850, 1],
    ["Symétrie", 8, 8, 35, 16, 1195769, 1],
    ["Séparation", 8, 8, 28, 21, 1203688, 1],
    ["Ouverture", 8, 8, 34, 13, 1211607, 1],
    ["Chaîne", 8, 8, 34, 20, 1219526, 1.5],
    ["Choix", 9, 8, 46, 19, 1227445, 2],
    ["Pression douce", 9, 8, 46, 19, 1235364, 2],
    ["Récompense", 9, 8, 43, 18, 1243283, 2],
    ["Maîtrise", 9, 8, 42, 18, 1251202, 1],
    ["Avant-finale", 9, 8, 42, 15, 1259121, 1.5],
    ["Finale", 9, 8, 49, 13, 1267040, 2],
    ["Découverte", 8, 7, 119, 26, 1274959, 2],
    ["Première collecte", 8, 7, 107, 26, 1282878, 2],
    ["Virage", 8, 7, 53, 25, 1290797, 2],
    ["Croisement", 8, 7, 83, 25, 1298716, 2.5],
    ["Duo", 8, 7, 151, 24, 1306635, 2.5],
    ["Raccourci", 8, 7, 114, 24, 1314554, 2],
    ["Blocage", 8, 7, 64, 23, 1322473, 1.5],
    ["Cascade", 8, 8, 95, 23, 1330392, 2],
    ["Détour", 8, 8, 89, 22, 1338311, 2],
    ["Palier", 8, 8, 115, 22, 1346230, 2],
    ["Symétrie", 8, 8, 149, 21, 1354149, 2.5],
    ["Séparation", 8, 8, 59, 21, 1362068, 2.5],
    ["Ouverture", 8, 8, 85, 20, 1369987, 2],
    ["Chaîne", 8, 8, 68, 20, 1377906, 1.5],
    ["Choix", 9, 8, 157, 19, 1385825, 2.5],
    ["Pression douce", 9, 8, 95, 19, 1393744, 2],
    ["Récompense", 9, 8, 145, 18, 1401663, 2.5],
    ["Maîtrise", 9, 8, 95, 18, 1409582, 2],
    ["Avant-finale", 9, 8, 95, 17, 1417501, 2],
    ["Finale", 9, 8, 104, 17, 1425420, 2],
];
const gardenLevels: Level[] = gardenRows.map(([name, width, height, target, moves, seed, targetWeight], index) => {
    const world = 7 + Math.floor(index / 20);
    const layout = index % 20;
    const level: Level = {
        name, width, height, moves, seed, world, layout, targetWeight,
        colors: world === 8 ? 7 : 6, finale: layout === 19,
        objectives: world === 8 ? [{ kind: 'flower', target }]
            : [{ kind: 'collect', color: world === 7 ? 0 : 2, target }],
    };
    if (level.finale) level.objectives.push(world === 7 ? { kind: 'chocolate', target: 6 }
        : { kind: 'collect', color: world === 8 ? 4 : 1, target: 24 });
    return level;
});

// Appending cannot change the original level objects or their random streams.
export const LEVELS: readonly Level[] = [...firstLevels, ...laterLevels, ...gardenLevels];

function extendedTerrain(level: Level): Terrain[] {
    const { width: w, height: h, world, layout } = level;
    const mx = Math.floor(w / 2);
    const my = Math.floor(h / 2);
    return Array.from({ length: w * h }, (_, i) => {
        const x = i % w;
        const y = Math.floor(i / w);
        let active = true;
        if (layout === 2) active = Math.abs(x - mx) <= 1 || y === 0 || y === h - 1;
        if (layout === 3) active = Math.abs(x - mx) <= 1 || Math.abs(y - my) <= 1;
        if (layout === 11) active = x !== mx || y === my;
        if (layout === 6 && y === my && (x === 1 || x === w - 2)) {
            active = false;
        }
        if (layout % 5 === 2 && x === 0 && y === 0) active = false;
        if (layout % 5 === 3 && y === 0 && (x < 2 || x >= w - 2)) active = false;
        // Every open vertical segment has a marked outlet at its lower end.
        // Split rooms keep a full-height column on either side of the neck.
        const belowActive = layout === 2 ? Math.abs(x - mx) <= 1 || y + 1 === h - 1
            : layout === 3 ? Math.abs(x - mx) <= 1 || Math.abs(y + 1 - my) <= 1
                : layout === 11 ? x !== mx || y + 1 === my
                    : !(layout === 6 && y + 1 === my && (x === 1 || x === w - 2));
        if (world === 4) return { active, crate: 0, ice: layout >= 17 && active && y === h - 2 ? 1 : 0,
            exit: active && (y === h - 1 || !belowActive) };
        // Broad frozen bands, with two clear lanes through the palace.
        const frozen = active && (world === 5 ? y >= 1 && y <= h - 2
            : level.finale ? x === mx - 1 || x === mx : x % 3 !== 0);
        return { active, crate: 0, ice: frozen ? (world === 6 ? 2 : 1) : 0 };
    });
}

function gardenTerrain(level: Level): Terrain[] {
    const { width: w, height: h, world, layout } = level;
    const mx = Math.floor(w / 2);
    const my = Math.floor(h / 2);
    return Array.from({ length: w * h }, (_, i): Terrain => {
        const x = i % w;
        const y = Math.floor(i / w);
        let active = true;
        if (layout === 2) active = Math.abs(x - mx) <= 1 || y === 0 || y === h - 1;
        if (layout === 3) active = Math.abs(x - mx) <= 1 || Math.abs(y - my) <= 1;
        if (layout === 11) active = x !== mx || y === my;
        if (layout === 6 && y === my && (x === 1 || x === w - 2)) active = false;
        if (layout % 5 === 2 && x === 0 && y === 0) active = false;
        if (layout % 5 === 3 && y === 0 && (x < 2 || x >= w - 2)) active = false;
        const cell: Terrain = { active, crate: 0, ice: 0 };
        if (!active) return cell;
        if (world === 7) {
            // Broken ramparts leave a broad route; narrow boards keep their neck clear.
            cell.chocolate = (x === 0 || x === w - 1) && y % 2 === 1
                || (layout >= 7 || layout === 2) && y === h - 1 && x % 3 === 0;
        }
        if (world === 8) {
            // Each flower bed is a cross; flowers are liberated from their own hedge.
            cell.hedge = x % 3 === 1 || y % 3 === 1
                || x === 0 || x === w - 1 || y === 0 || y === h - 1;
        }
        if (world === 9) {
            // Vertical bands survive narrow silhouettes; horizontal bands loop within rooms.
            if (layout === 2 || layout === 11) {
                if (x === mx - 1 || x === mx + 1) cell.belt = { band: x, direction: x < mx ? 'down' : 'up' };
            } else if (y === my || y === my + 1) {
                cell.belt = { band: y, direction: y === my ? 'right' : 'left' };
            }
        }
        return cell;
    });
}
