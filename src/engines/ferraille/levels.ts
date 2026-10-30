import type { Enemy, Weapon, Boss } from './engine';
export type Theme = 'factory' | 'desert' | 'jungle' | 'night';
export type Structure = 'corridor' | 'ascent' | 'descent' | 'vehicle' | 'rescue' | 'arena';
interface Level {
    name: string; theme: Theme; structure: Structure; enemies: Enemy['kind'][];
    weapon: Exclude<Weapon, 'single'>; recovery: boolean; boss?: Boss['pattern']; discovery: string;
}
const c: Enemy['kind'][] = ['crawler'], s: Enemy['kind'][] = ['shooter', 'crawler'];
const k: Enemy['kind'][] = ['kamikaze', 'shooter'], t: Enemy['kind'][] = ['turret', 'kamikaze'];
const f: Enemy['kind'][] = ['drone', 'shooter'], a: Enemy['kind'][] = ['armored', 'drone', 'kamikaze'];
function level(theme: Theme, structure: Structure, enemies: Enemy['kind'][], weapon: Level['weapon'], discovery = '', recovery = false, boss?: Boss['pattern']): Level {
    return { name: discovery || `${theme} · ${structure}`, theme, structure, enemies, weapon, discovery, recovery, boss };
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
