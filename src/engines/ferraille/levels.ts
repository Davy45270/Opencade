import { levelCatalogue } from '../../content/level-catalogue';
import { MODULES, type ModuleKind } from './modules';
import type { Enemy, Weapon, Boss } from './engine';
export type Theme = 'factory' | 'desert' | 'jungle' | 'night';
export type Structure = 'corridor' | 'ascent' | 'descent' | 'vehicle' | 'rescue' | 'arena';
export interface Level {
    openingEnemy?: Enemy;
    star: ModuleKind; sequence: readonly ModuleKind[];
    name: string; theme: Theme; structure: Structure; enemies: Enemy['kind'][];
    weapon: Exclude<Weapon, 'single'>; recovery: boolean; boss?: Boss['pattern']; discovery: string;
}
const c: Enemy['kind'][] = ['crawler'], s: Enemy['kind'][] = ['shooter', 'crawler'];
const k: Enemy['kind'][] = ['kamikaze', 'shooter'], t: Enemy['kind'][] = ['turret', 'kamikaze'];
const f: Enemy['kind'][] = ['drone', 'shooter'], a: Enemy['kind'][] = ['armored', 'drone', 'kamikaze'];
function level(theme: Theme, structure: Structure, enemies: Enemy['kind'][], weapon: Level['weapon'], discovery = '', recovery = false, boss?: Boss['pattern']): Level {
    return { openingEnemy: enemies.length ? { kind: 'turret', x: 108, y: 242, w: 14, h: 14, vx: 0, vy: 0, hp: 1, clock: 0, originY: 242, phase: 0, aim: Math.PI, opening: true } : undefined, star: 'conveyor', sequence: [], name: discovery || `${theme} · ${structure}`, theme, structure, enemies, weapon, discovery, recovery, boss };
}
export const LEVELS: readonly Level[] = [
    level('factory', 'corridor', c, 'fan', 'Patrouilles'),
    level('factory', 'corridor', s, 'fan', 'Tireur : visée verrouillée'),
    level('factory', 'corridor', s, 'fan'),
    level('factory', 'corridor', s, 'flame', 'Lance-flammes'),
    level('factory', 'arena', s, 'flame', 'Gardien : éventail', false, 'fan'),
    level('desert', 'ascent', c, 'flame', 'Montée à étages', true),
    level('desert', 'descent', s, 'flame', 'Descente à étages'),
    level('desert', 'corridor', k, 'flame', 'Kamikaze'),
    level('desert', 'ascent', k, 'flame'),
    level('desert', 'arena', k, 'flame', 'Gardien : onde au sol', false, 'stomp'),
    level('jungle', 'corridor', c, 'bounce', 'Tir rebondissant', true),
    level('jungle', 'vehicle', k, 'bounce', 'Wagonnet'),
    level('jungle', 'ascent', k, 'bounce'),
    level('jungle', 'corridor', t, 'bounce', 'Tourelle à rotation lente'),
    level('jungle', 'arena', t, 'bounce', 'Gardien : pluie de bombes', false, 'bombs'),
    level('night', 'corridor', ['drone'], 'bounce', 'Volant bombardier', true),
    level('night', 'vehicle', f, 'bounce'),
    level('night', 'rescue', f, 'bounce', 'Otages'),
    level('night', 'ascent', f, 'bounce'),
    level('night', 'arena', t, 'bounce', 'Gardien : balayage', false, 'sweep'),
    level('factory', 'corridor', c, 'grenade', 'Grenades', true),
    level('factory', 'rescue', f, 'grenade'),
    level('factory', 'vehicle', t, 'grenade'),
    level('factory', 'corridor', a, 'grenade', 'Blindé : dos ou retournement'),
    level('factory', 'arena', a, 'grenade', 'Gardien : tirs croisés', false, 'crossfire'),
    level('desert', 'rescue', ['armored'], 'grenade', 'Bouclier de sauvetage', true),
    level('jungle', 'ascent', a, 'flame'),
    level('night', 'vehicle', a, 'bounce'),
    level('factory', 'rescue', a, 'grenade'),
    level('night', 'arena', a, 'grenade', 'Réacteur : trois phases', false, 'reactor'),
];

for (const entry of levelCatalogue) if (entry.game === 'ferraille') {
    const level = LEVELS[entry.index];
    if (level) level.name = entry.name;
}

/** Authored encounter order. Seed affects scenery only. */
const ROUTES: readonly [string, ModuleKind, readonly ModuleKind[]][] = [
    ['Le quai roulant', 'conveyor', ['conveyor', 'wind', 'tower', 'spring', 'lava']],
    ['Les presses patientes', 'piston', ['piston', 'wind', 'tunnel', 'chain', 'spring']],
    ['Le pont fragile', 'bridge', ['bridge', 'rails', 'crate', 'tower', 'secret']],
    ['Sous les conduites', 'tunnel', ['tunnel', 'lava', 'spotlight', 'piston', 'crate']],
    ['La vanne de l’Éventreur', 'gate', ['gate', 'piston', 'bridge', 'lift', 'spotlight']],
    ['Forteresse oubliée', 'lift', ['lift', 'tunnel', 'conveyor', 'spring', 'chain']],
    ['Les chaînes du rempart', 'chain', ['chain', 'hut', 'gate', 'bridge', 'wind']],
    ['La dune contraire', 'wind', ['wind', 'secret', 'tunnel', 'rails', 'hut']],
    ['La cour des caisses', 'crate', ['crate', 'wind', 'rails', 'secret', 'lift']],
    ['Le tremplin du Pilon', 'spring', ['spring', 'wind', 'spotlight', 'hut', 'tunnel']],
    ['La cache des bambous', 'secret', ['secret', 'lift', 'piston', 'gate', 'spring']],
    ['Le rail bifurqué', 'rails', ['rails', 'hut', 'lift', 'wind', 'spring']],
    ['La passerelle suspendue', 'bridge', ['bridge', 'gate', 'chain', 'lava', 'hut']],
    ['Jungle mécanique', 'tower', ['tower', 'lift', 'wind', 'hut', 'chain']],
    ['Les chaînes du Scarabombe', 'chain', ['chain', 'tower', 'secret', 'piston', 'rails']],
    ['Les faisceaux de nuit', 'spotlight', ['spotlight', 'crate', 'rails', 'piston', 'hut']],
    ['Le conduit des sentinelles', 'tunnel', ['tunnel', 'wind', 'spring', 'piston', 'rails']],
    ['Les cabanes prisonnières', 'hut', ['hut', 'secret', 'chain', 'conveyor', 'tower']],
    ['Le monte-charge nocturne', 'lift', ['lift', 'tower', 'spotlight', 'tunnel', 'crate']],
    ['La rafale de la Faucheuse', 'wind', ['wind', 'chain', 'rails', 'piston', 'bridge']],
    ['Le rythme des presses', 'piston', ['piston', 'tower', 'lava', 'conveyor', 'secret']],
    ['La réserve cachée', 'secret', ['secret', 'rails', 'conveyor', 'gate', 'chain']],
    ['Les rails de livraison', 'rails', ['rails', 'spotlight', 'spring', 'lift', 'tower']],
    ['Usine infernale', 'conveyor', ['conveyor', 'lava', 'piston', 'secret', 'rails']],
    ['La cuve de Tenaille', 'lava', ['lava', 'spring', 'bridge', 'tunnel', 'chain']],
    ['Le refuge des dunes', 'hut', ['hut', 'gate', 'tower', 'spotlight', 'conveyor']],
    ['L’entrepôt empilé', 'crate', ['crate', 'wind', 'piston', 'conveyor', 'spotlight']],
    ['Le rebond des étoiles', 'spring', ['spring', 'tunnel', 'secret', 'spotlight', 'rails']],
    ['La serrure du réacteur', 'gate', ['gate', 'hut', 'conveyor', 'crate', 'spotlight']],
    ['Le dernier projecteur', 'spotlight', ['spotlight', 'crate', 'gate', 'lava', 'secret']],
];
for (const [i, route] of ROUTES.entries()) {
    const entry = LEVELS[i];
    if (entry) { entry.name = route[0]; entry.star = route[1]; entry.sequence = route[2]; entry.discovery = `${route[0]} · ${MODULES[route[1]].name}`; }
}
