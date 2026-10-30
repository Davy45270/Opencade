import { stratum } from './engine';
/** One short HUD hint per stratum: the newest rule first, otherwise the objective. */
export function strataTip(level: number): string {
    const l = stratum(level), earlier = Array.from({ length: level }, (_, i) => stratum(i));
    const fresh = (has: (s: typeof l) => boolean) => has(l) && !earlier.some(has);
    if (fresh(s => s.bomb > 0)) return 'Bombe : souffle 3 × 3 à l\'arrivée';
    if (fresh(s => s.objective === 'gems')) return 'Gemmes : vider leurs lignes';
    if (fresh(s => s.conveyors.length > 0)) return 'Tapis : la rangée glisse à chaque pièce';
    if (fresh(s => s.rise > 0)) return 'Marée : une rangée monte (jauge)';
    if (fresh(s => s.locks > 0)) return 'Cadenas : libérer la clé d\'abord';
    if (fresh(s => s.preview < 3)) return 'Brouillard : une seule pièce visible';
    if (l.timeMs) return 'Défi : battre le chrono';
    if (level > 0 && l.gravity < (earlier.at(-1)?.gravity ?? 0)) return 'Respiration : chute plus lente';
    return l.objective === 'gems' ? 'Libère toutes les gemmes !' : 'Complète les lignes !';
}
