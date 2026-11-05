import type { CatalogueLink } from '../definition';
import { createThumbnail } from './thumbnail';
import { GAME_NAME, LEVELS } from '../../engines/petits-pompiers/levels';

/** Catalogue card of Petits Pompiers: name, progress and thumbnail, but not the scene, which lives on its own site. */
export const card: CatalogueLink = { id: 'petits-pompiers', name: GAME_NAME, levelCount: LEVELS.length, thumbnail: createThumbnail, href: 'pompiers/' };
