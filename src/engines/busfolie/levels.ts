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
    'Nouveau quartier, petites rues : chaque case libre compte.',
    'Avant de bouger, cherchez quel bus part en premier.',
    'Un plot au milieu : il faudra tourner autour.',
    'Deux plots sur le quai : les voitures grises ont peu de place.',
    'Cinq voitures garées : poussez-les dans le bon ordre.',
    'Le car de trois cases revient : il bouche une rue entière.',
    'La fête foraine : faites de la place avant de faire partir.',
    'Les sorties ont de nouveau leur couleur : regardez où chaque bus peut sortir.',
    'À la caserne, une sortie colorée attend son bus, pas un autre.',
    'Une cinquième couleur dans la file : comptez les groupes de chaque bus.',
    'Flèche épaisse : ce bus n’avance que tout droit, sans marche arrière.',
    'Au zoo, un sens unique mal placé ferme la cour.',
    'Deux cars sur la plage : laissez-leur la place de sortir.',
    'Deux bus à sens unique : avancez-les au dernier moment.',
    'Six voitures grises : un coup de trop et tout se bloque.',
    'Dans le tunnel, chaque bus n’a qu’une route.',
    'Six couleurs sur la colline : la file est longue, lisez-la jusqu’au bout.',
    'Le phare éclaire la sortie : à chaque bus sa couleur.',
    'Huit bus à l’aéroport : faites partir les petits d’abord.',
    'Trois cars à la mairie : ils prennent presque toute la place.',
    'Au cirque, un départ trop tôt laisse un groupe sur le quai.',
    'Le vieux port est plein : déplacez d’abord ce qui gêne le premier départ.',
    'Sur les quais, un car à sens unique ne recule jamais.',
    'Aux ateliers, chaque voiture grise a sa place exacte.',
    'Trois sens uniques : réfléchissez avant chaque pas en avant.',
    'Le marché de nuit : la file dit qui part, la cour dit comment.',
    'Quatre cars dans les remparts : le moindre détour compte.',
    'Gare de nuit : coincé ? Annulez, chaque coup se reprend.',
    'Neuf bus au dépôt : la cour n’a jamais été aussi pleine.',
    'La dernière tournée. Bravo, chauffeur !',
];
