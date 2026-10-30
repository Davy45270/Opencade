/** Thirty crossings (pass 404): one new rule about every four levels, a
 * one-life challenge every five, slower flow right after each challenge.
 * Lane indices count the eight lanes from the top: 0-4 river, 5-7 road. */
export interface Plan {
    name: string;
    /** Road lanes with a traffic light: they stand still `red` phases out of `period`. */
    lights?: number[];
    /** Lanes moving two cells per phase. */
    fast?: number[];
    /** Lanes whose direction reverses every `period` phases. */
    tide?: { lanes: number[]; period: number };
    /** Rocks on the banks between lanes: impassable, never fatal. */
    rocks?: number;
    /** A castaway rides a log; shelters stay shut until the player picks them up. */
    rescue?: boolean;
    /** Shelters open one at a time, left to right. */
    ordered?: boolean;
    /** Challenges: a single life. */
    lives?: number;
    /** Extra frames per flow quantum (respiration after a challenge). */
    slower?: number;
}
export const PLANS: readonly Plan[] = [
    { name: 'Premier gué' }, { name: 'Deux rives' }, { name: 'Le pont de bois' },
    { name: 'Feu rouge', lights: [5, 6, 7], slower: 2 },
    { name: 'Défi : une seule vie', lights: [6], lives: 1 },
    { name: 'Carrefour calme', lights: [5, 7], slower: 6 },
    { name: 'Rondins plongeurs', lights: [7], slower: 3 },
    { name: 'Rapides', fast: [2], slower: 3 },
    { name: 'Torrent', fast: [1, 3], lights: [5] },
    { name: 'Défi : torrent', fast: [2, 6], lives: 1 },
    { name: 'Eaux lentes', fast: [4], slower: 6 },
    { name: 'La marée', tide: { lanes: [1], period: 6 }, slower: 3 },
    { name: 'Marées croisées', tide: { lanes: [0, 3], period: 8 }, lights: [6] },
    { name: 'Marée et rapides', tide: { lanes: [2], period: 6 }, fast: [4] },
    { name: 'Défi : la marée', tide: { lanes: [1, 3], period: 7 }, lives: 1 },
    { name: 'Les rochers', rocks: 6, slower: 6 },
    { name: 'Éboulis', rocks: 9, lights: [5, 7] },
    { name: 'Rochers et marée', rocks: 7, tide: { lanes: [2], period: 6 } },
    { name: 'Gorges', rocks: 10, fast: [1] },
    { name: 'Défi : les gorges', rocks: 8, fast: [3], lives: 1 },
    { name: 'Le naufragé', rescue: true, slower: 6 },
    { name: 'Sauvetage', rescue: true, lights: [6] },
    { name: 'Sauvetage en marée', rescue: true, tide: { lanes: [3], period: 7 } },
    { name: 'Sauvetage aux rochers', rescue: true, rocks: 7 },
    { name: 'Défi : sauvetage', rescue: true, fast: [2], lives: 1 },
    { name: 'Abris en file', ordered: true, slower: 6 },
    { name: 'File et feux', ordered: true, lights: [5, 6, 7], rocks: 6 },
    { name: 'File et rapides', ordered: true, fast: [1, 4], tide: { lanes: [2], period: 8 } },
    { name: 'La grande crue', ordered: true, rescue: true, fast: [3], rocks: 7 },
    { name: 'Le dernier convoi', ordered: true, rescue: true, lights: [6, 7], fast: [1], tide: { lanes: [3], period: 7 }, rocks: 8 },
];
