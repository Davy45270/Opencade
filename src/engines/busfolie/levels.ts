import { DATA, type Entry } from './data';
import { SLOTS } from './slots';
import { parseEntry } from './format';
import type { LevelDefinition } from './rules';
export { parseEntry, toEntry } from './format';
export const GAME_NAME = 'Bus en folie';
export const GAME_NAME_EN = 'Bus Frenzy';
/** A progression level: the dossier's level contract plus its title (FR/EN), its novelty and its frozen measures. */
export interface Level extends LevelDefinition { name: string; en: string; novelty: string; par: number; difficulty: number; solution: string; trap: Entry['trap'] }
export const LEVELS: readonly Level[] = SLOTS.map((slot, i) => {
    const entry = DATA[i];
    if (!entry) throw new Error(`Niveau ${String(i + 1)} absent`);
    return { ...parseEntry(entry, `BUS-${String(i + 1).padStart(3, '0')}`), name: slot.name, en: slot.en, novelty: slot.novelty, par: entry.par, difficulty: entry.difficulty, solution: entry.solution, trap: entry.trap };
});
/** The companion's line under the board: the new idea of the level, said once, then advice. */
export const TIPS: readonly string[] = [
    'Glissez un bus le long de sa route. Il part quand le groupe en tête de file est de sa couleur.',
    'Deux bus de la même couleur : le grand groupe ne monte que dans le bus assez grand.',
    'La file ne se double pas : faites partir les bus dans l’ordre des groupes.',
    'Une voiture grise ne part jamais : poussez-la simplement hors du chemin.',
    'Les plots ne bougent pas : contournez-les.',
    'Le car de trois cases emmène plus de monde, mais il prend plus de place.',
    'Une sortie colorée n’accepte que les bus de sa couleur.',
    'Quatre couleurs dans la file : regardez loin devant avant de bouger.',
    'Deux cars dans la cour : libérez d’abord les petits.',
    'Plus grand plateau, plus de détours possibles.',
    'Flèche épaisse : ce bus ne recule pas. Un pas de trop et il bloque sa voie.',
    'Cinq couleurs : la file dit qui part, la cour dit comment.',
    'Un bus qui part trop tôt peut laisser un groupe sans place.',
    'Deux bus à sens unique : réfléchissez avant de les avancer.',
    'Les jumeaux se ressemblent, sauf par leurs places assises.',
    'Le marché bouche les rues : une voiture à la fois.',
    'Coincé ? Annulez : chaque coup se reprend.',
    'Huit sur huit : le plus grand dépôt de la ville.',
    'Six couleurs : la file est longue, gardez de la place.',
    'Embouteillage : commencez par ce qui gêne le premier bus à partir.',
    'Au carrefour, une seule voie se libère à la fois.',
    'Rue étroite : un sens unique mal avancé ferme tout.',
    'Le parking est plein : comptez les cases libres.',
    'Au terminus, chaque bus a sa sortie.',
    'Sortie d’école : beaucoup de petits groupes, peu de places.',
    'Le grand marché : pensez trois départs à l’avance.',
    'La place du village tourne autour de son centre.',
    'Centre-ville : l’indice montre le coup le plus court, et pourquoi.',
    'La grande gare : tous les bus, toutes les couleurs.',
    'Le dernier dépôt. Bonne route !',
];
