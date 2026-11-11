import type { Template } from './generator';
/** The 30 progression slots: title (FR/EN), the generator template, and the novelty the level introduces. One idea
 * at a time, then combined. The boards themselves were picked offline (scripts/search-busfolie.js) and frozen in data.ts. */
export interface Slot { name: string; en: string; novelty: string; template: Template }
const T = (width: number, buses: number, cars: number, long: number, obstacles: number, colors: number, twins: number, coloured: boolean, oneWay: number, groupsMax: number): Template =>
    ({ width, height: width, buses, cars, long, obstacles, colors, twins, coloured, oneWay, groupsMax });
export const SLOTS: readonly Slot[] = [
    { name: 'Premier départ', en: 'First departure', novelty: 'base', template: T(6, 3, 0, 0, 0, 2, 0, false, 0, 1) },
    { name: 'Petit bus, grand groupe', en: 'Small bus, big group', novelty: 'capacité', template: T(6, 3, 0, 0, 0, 2, 1, false, 0, 1) },
    { name: 'Chacun son tour', en: 'Each in turn', novelty: 'file', template: T(6, 4, 0, 0, 0, 3, 1, false, 0, 2) },
    { name: 'La voiture garée', en: 'The parked car', novelty: 'voiture', template: T(6, 4, 2, 0, 0, 3, 1, false, 0, 2) },
    { name: 'Les plots', en: 'The cones', novelty: 'plots', template: T(6, 4, 2, 0, 3, 3, 1, false, 0, 2) },
    { name: 'Le grand car', en: 'The long coach', novelty: 'car de 3', template: T(6, 5, 2, 1, 2, 3, 1, false, 0, 2) },
    { name: 'Sorties de couleur', en: 'Coloured exits', novelty: 'sorties colorées', template: T(6, 5, 2, 1, 2, 3, 1, true, 0, 2) },
    { name: 'Quatre lignes', en: 'Four lines', novelty: 'quatre couleurs', template: T(6, 5, 3, 1, 2, 4, 1, false, 0, 2) },
    { name: 'Heure de pointe', en: 'Peak hour', novelty: 'deux cars', template: T(6, 6, 3, 2, 1, 4, 2, false, 0, 2) },
    { name: 'La grande place', en: 'The big square', novelty: '7 × 7', template: T(7, 6, 3, 2, 8, 4, 2, false, 0, 2) },
    { name: 'Sens unique', en: 'One way', novelty: 'sens unique', template: T(6, 5, 3, 1, 2, 4, 1, false, 1, 2) },
    { name: 'Les violets', en: 'The purples', novelty: 'cinq couleurs', template: T(6, 6, 3, 1, 2, 5, 1, false, 0, 2) },
    { name: 'Le dépôt', en: 'The depot', novelty: '', template: T(7, 6, 4, 2, 8, 5, 2, true, 0, 2) },
    { name: 'Double sens', en: 'Two ways', novelty: '', template: T(6, 6, 3, 2, 1, 4, 2, false, 2, 2) },
    { name: 'Les jumeaux', en: 'The twins', novelty: '', template: T(7, 7, 4, 2, 8, 5, 2, false, 1, 2) },
    { name: 'Le marché', en: 'The market', novelty: '', template: T(6, 6, 4, 2, 1, 5, 2, true, 1, 2) },
    { name: 'La gare routière', en: 'The bus station', novelty: '', template: T(7, 7, 4, 2, 9, 5, 2, true, 1, 2) },
    { name: 'Le grand dépôt', en: 'The great depot', novelty: '8 × 8', template: T(8, 8, 4, 3, 16, 5, 2, false, 0, 2) },
    { name: 'Les oranges', en: 'The oranges', novelty: 'six couleurs', template: T(7, 7, 4, 2, 8, 6, 2, false, 1, 2) },
    { name: 'Embouteillage', en: 'Traffic jam', novelty: '', template: T(6, 6, 4, 2, 2, 5, 2, false, 2, 2) },
    { name: 'Le carrefour', en: 'The crossroads', novelty: '', template: T(8, 8, 4, 3, 16, 6, 2, true, 1, 2) },
    { name: 'La rue étroite', en: 'The narrow street', novelty: '', template: T(7, 7, 5, 2, 8, 6, 2, false, 2, 2) },
    { name: 'Le parking', en: 'The car park', novelty: '', template: T(6, 7, 4, 2, 1, 5, 2, false, 1, 2) },
    { name: 'Le terminus', en: 'The terminus', novelty: '', template: T(8, 8, 5, 3, 15, 6, 2, true, 1, 2) },
    { name: 'La sortie d’école', en: 'School’s out', novelty: '', template: T(7, 8, 4, 3, 6, 6, 2, false, 2, 2) },
    { name: 'Le grand marché', en: 'The big market', novelty: '', template: T(8, 9, 4, 3, 14, 6, 3, true, 2, 2) },
    { name: 'La place du village', en: 'The village square', novelty: '', template: T(7, 8, 5, 3, 6, 6, 3, true, 2, 2) },
    { name: 'Le centre-ville', en: 'Downtown', novelty: '', template: T(8, 9, 5, 3, 13, 6, 3, false, 2, 2) },
    { name: 'La grande gare', en: 'The central station', novelty: '', template: T(6, 7, 5, 2, 1, 6, 2, true, 2, 2) },
    { name: 'Bus en folie', en: 'Bus Frenzy', novelty: '', template: T(8, 9, 5, 4, 12, 6, 3, true, 3, 2) },
];
