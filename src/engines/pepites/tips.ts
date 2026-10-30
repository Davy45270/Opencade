import { MINES } from './engine';
/** One short HUD hint per mine: the newest element first. */
export function mineTip(level: number): string {
    const m = MINES[level]; if (!m) return '';
    const has = (i: number, c: string) => (MINES[i]?.rows ?? []).some(r => r.includes(c));
    const fresh = (c: string) => has(level, c) && !Array.from({ length: level }, (_, i) => has(i, c)).some(Boolean);
    if (level === 0) return 'Creusez, ramassez, puis la sortie';
    if (fresh('f')) return 'Lucioles : ne pas les approcher';
    if (fresh('b')) return 'Papillon : un rocher le change en pépites';
    if (fresh('m')) return 'Mur trieur : rocher → pépite';
    if (fresh('a')) return 'Mousse : enfermée, elle donne des pépites';
    if (fresh('x')) return 'Dynamite : un rocher dessus, les briques sautent';
    if (fresh('g')) return 'Grosse pépite : elle compte triple';
    if (fresh('w')) return 'Eau : elle se répand, ne pas se laisser noyer';
    if (m.seconds < 100) return 'Défi : vite, le chrono file';
    if (level === 15) return 'Étai : Espace fige les rochers';
    return level === 1 ? 'Un rocher tombe si on creuse dessous' : level === 2 ? 'Poussez un rocher dans le vide' : 'Pensez aux chutes de rochers';
}
