import { GRIDS } from './grids';
import { SLOTS, type Theme } from './slots';
import { curated, noGuessBoard } from './generator';
import { GENERATOR_VERSION, SCHEMA_VERSION, type LevelDefinition } from './rules';
export { type Theme };
export const GAME_NAME = 'Démineur';
/** A progression grid: the spec's level contract plus its title (FR/EN), board theme and drawing. */
export interface Grid extends LevelDefinition { name: string; en: string; theme: Theme; drawing: string | null; difficulty: number }
/** The 30 progression grids, each proven without guessing from its opening (src/engines/demineur/grids.ts). */
export const LEVELS: readonly Grid[] = SLOTS.map((slot, i) => {
    const grid = GRIDS[i];
    if (!grid) throw new Error(`Grille ${String(i + 1)} absente`);
    const base = curated(`DEM-PROG-${String(i + 1).padStart(3, '0')}`, 'learning', grid.layout, { x: grid.start[0], y: grid.start[1] }, 4527 + i);
    return { ...base, name: slot.name, en: slot.en, theme: slot.theme, drawing: slot.drawing ?? null, difficulty: grid.difficulty };
});
export type Classic = 'beginner' | 'intermediate' | 'expert';
export const CLASSICS: readonly Classic[] = ['beginner', 'intermediate', 'expert'];
export const CLASSIC: Readonly<Record<Classic, { name: string; en: string; width: number; height: number; mines: number }>> = {
    beginner: { name: 'Débutant', en: 'Beginner', width: 9, height: 9, mines: 10 },
    intermediate: { name: 'Intermédiaire', en: 'Intermediate', width: 16, height: 16, mines: 40 },
    expert: { name: 'Expert', en: 'Expert', width: 30, height: 16, mines: 99 },
};
/** Classic boards: deferred placement at the first click (the spec's example DEM-CLASSIC-001 for the beginner one).
 * They may need guesses, and say so. */
export function classicLevel(kind: Classic, seed: number): LevelDefinition {
    const c = CLASSIC[kind];
    return {
        schemaVersion: SCHEMA_VERSION, id: `DEM-CLASSIC-${kind}`, mode: 'classic', width: c.width, height: c.height, mineCount: c.mines,
        generation: { type: 'deferred_seeded', generatorVersion: GENERATOR_VERSION, seed: seed >>> 0, noGuess: false },
        rules: { firstClickSafe: true, firstClickZeroPreferred: true, chordEnabled: true, questionMarks: true },
    };
}
/** Daily challenge: the same board for everyone on a given day (key YYYYMMDD), 12 × 16 with 36 mines, proven without
 * guessing from its centre opening. If no candidate is proven (never seen), a classic board of the same size. */
export const DAILY = { width: 12, height: 16, mines: 36 } as const;
export function dailyLevel(day: number): LevelDefinition {
    const found = noGuessBoard(DAILY.width, DAILY.height, DAILY.mines, day, { attempts: 400 });
    if (!found) return { ...classicLevel('beginner', day), id: `DEM-DAY-${String(day)}`, mode: 'challenge', width: DAILY.width, height: DAILY.height, mineCount: DAILY.mines };
    return curated(`DEM-DAY-${String(day)}`, 'challenge', found.layout, found.start, day, true);
}
/** One line per grid under the board: the new idea of the grid, said once, then advice. */
export const TIPS: readonly string[] = [
    'Un chiffre compte les mines de ses 8 voisines. Touchez une case pour la creuser.',
    'Un 1 qui ne touche qu’une case cachée : c’est sa mine. Posez-y un drapeau.',
    'Comparez deux chiffres voisins : leurs cases communes disent où sont les autres mines.',
    'Toucher un chiffre dont les drapeaux sont tous posés ouvre ses autres voisines.',
    'Bloqué ? L’indice montre une déduction certaine, et l’explique.',
    'Le motif 1-2 au bord d’un mur : la mine du 2 est au bout.',
    'Les mines de cette grille dessinent quelque chose : finissez-la pour le voir.',
    'Une case marquée « ? » reste creusable : seuls les drapeaux protègent.',
    'Suivez la rivière : chaque chiffre est une marche.',
    'Avancez par petites certitudes : jamais de pari.',
    'Le motif 1-2-1 : les mines sont sous les deux 1.',
    'Un poisson se cache sous le sable. Trouvez son contour.',
    'Les créneaux du château se lisent par le bas.',
    'Ici, il faut essayer toutes les places possibles d’un petit groupe de mines.',
    'Grande grille : faites glisser pour vous déplacer, la loupe montre tout.',
    'La fusée décolle quand toutes les cases sûres sont ouvertes.',
    'Les astéroïdes sont serrés : comptez avant de creuser.',
    'La queue de la comète traverse la grille en diagonale.',
    'À la fin, comptez les mines qui restent : elles disent les dernières cases.',
    'Une planète et son anneau : tournez autour.',
    'Le cœur est plein de mines : son bord se lit comme un mur.',
    'Cinq branches, et des creux entre elles.',
    'Le labyrinthe se résout couloir après couloir.',
    'Deux oreilles pointues dépassent tout en haut.',
    'Néon : la grille est dense, chaque déduction compte.',
    'La chouette veille : gardez vos drapeaux justes.',
    'Le sapin a un tronc : ne l’oubliez pas.',
    'La nuit est dense : partez de l’ouverture et élargissez.',
    'Un croissant de lune : sa face creuse est sûre.',
    'La dernière grille dessine… une mine. À vous !',
];
