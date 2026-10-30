import { layout } from './engine';
/** One short HUD hint per level: the newest rule first, otherwise the room's character. */
export function levelTip(level: number): string {
    const l = layout(level), before = level > 0 ? layout(level - 1) : null;
    const fresh = (k: 'portals' | 'gates' | 'currents' | 'patrols') => l[k].length > 0 && !Array.from({ length: level }, (_, i) => layout(i)[k].length).some(Boolean);
    const first = (k: 'prey' | 'scissors') => !!l[k] && !Array.from({ length: level }, (_, i) => layout(i)[k]).some(Boolean);
    if (fresh('portals')) return 'Portails : entrée ↔ sortie';
    if (fresh('gates')) return 'Écluses : passer si ouvertes';
    if (first('prey')) return 'Luciole : coincez-la';
    if (fresh('currents')) return 'Flèches : pas suivant imposé';
    if (fresh('patrols')) return 'Sentinelles : ne pas toucher';
    if (first('scissors')) return 'Ciseaux : corps coupé en deux';
    if (l.timeMs) return 'Défi : battre le chrono';
    if (before && l.speed < before.speed) return 'Respiration : plus lent';
    return l.walls ? 'Les murs sont mortels' : 'Les bords se rejoignent';
}
