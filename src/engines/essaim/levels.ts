export const WEAPONS = ['beam', 'bounce', 'drones', 'slow', 'magnet', 'charge'] as const;
export type Weapon = typeof WEAPONS[number];
export type Formation = 'patrol' | 'shield' | 'burst' | 'fast' | 'miner' | 'split' | 'spiral' | 'turret' | 'rescue' | 'mirror' | 'column' | 'command';
export type Layout = 'rows' | 'wedge' | 'column' | 'pincer' | 'ring';
export interface Level { name: string; formations: Formation[]; layout: Layout; weapon: Weapon; rest: boolean; boss: number }
const plan: [string, Formation[], Layout, Weapon, boolean?][] = [
    ['Patrouille', ['patrol'], 'rows', 'beam'],
    ['Rafales', ['burst'], 'wedge', 'drones'],
    ['Course', ['fast'], 'pincer', 'slow'],
    ['Escortes', ['shield'], 'ring', 'bounce'],
    ['Gardien des flancs', ['shield', 'burst'], 'column', 'bounce'],
    ['Escale', ['patrol'], 'wedge', 'beam', true],
    ['Champs de mines', ['miner'], 'pincer', 'magnet'],
    ['Boucliers et mines', ['shield', 'miner'], 'rows', 'bounce'],
    ['Rafales croisées', ['burst', 'fast'], 'ring', 'drones'],
    ['Scission', ['split'], 'column', 'beam'],
    ['Halte', ['patrol', 'split'], 'wedge', 'beam', true],
    ['Éclats rapides', ['split', 'fast'], 'pincer', 'slow'],
    ['Spirales', ['spiral'], 'ring', 'slow'],
    ['Spirales minées', ['spiral', 'miner'], 'rows', 'magnet'],
    ['Gardien des rafales', ['burst', 'spiral'], 'wedge', 'magnet'],
    ['Tourelles portées', ['turret'], 'column', 'charge'],
    ['Répit', ['patrol', 'turret'], 'pincer', 'drones', true],
    ['Convoi protégé', ['turret', 'shield'], 'ring', 'bounce'],
    ['Sauvetage', ['rescue', 'burst'], 'wedge', 'drones'],
    ['Gardien du convoi', ['rescue', 'turret'], 'rows', 'charge'],
    ['Secours sous mines', ['rescue', 'miner'], 'pincer', 'magnet'],
    ['Miroir', ['mirror'], 'ring', 'beam'],
    ['Reflets scindés', ['mirror', 'split'], 'column', 'beam'],
    ['Dernière halte', ['patrol', 'rescue'], 'wedge', 'drones', true],
    ['Blindés alignés', ['column'], 'column', 'charge'],
    ['Blindage miroir', ['column', 'mirror'], 'rows', 'charge'],
    ['Mines et escorte', ['miner', 'shield', 'turret'], 'pincer', 'bounce'],
    ['Convoi en spirale', ['rescue', 'spiral', 'fast'], 'ring', 'slow'],
    ['Reflets de rafale', ['mirror', 'burst', 'split'], 'wedge', 'magnet'],
    ['Commandement', ['command', 'shield', 'burst'], 'column', 'charge'],
];
export const LEVELS: Level[] = plan.map(([name, formations, layout, weapon, rest], i) => ({ name: `Essaim ${String(i + 1)} · ${name}`, formations, layout, weapon, rest: !!rest, boss: (i + 1) % 5 === 0 ? (i + 1) / 5 : 0 }));
