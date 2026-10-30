import { PLANS, difficulty } from './engine';
/** One short HUD hint per crossing: the newest rule first. */
export function crossingTip(level: number): string {
    const p = PLANS[level]; if (!p) return '';
    const earlier = PLANS.slice(0, level), fresh = (k: 'lights' | 'fast' | 'tide' | 'rocks' | 'rescue' | 'ordered') => p[k] !== undefined && !earlier.some(e => e[k] !== undefined);
    if (fresh('lights')) return 'Feux : les voitures s\'arrêtent au rouge';
    if (difficulty(level).diveDuration > 0 && (level === 0 || difficulty(level - 1).diveDuration === 0)) return 'Rondins plongeurs : ils coulent par moments';
    if (fresh('fast')) return 'Rapides : ce courant va deux fois plus vite';
    if (fresh('tide')) return 'Marée : le courant change de sens';
    if (fresh('rocks')) return 'Rochers : on les contourne';
    if (fresh('rescue')) return 'Naufragé : recueillez-le, puis un abri';
    if (fresh('ordered')) return 'Abris en file : de gauche à droite';
    if (p.lives === 1) return 'Défi : une seule vie';
    if (p.slower) return 'Respiration : le flot ralentit';
    return 'Rejoignez tous les abris';
}
