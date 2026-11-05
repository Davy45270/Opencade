import type { GameDefinition } from './definition';
import { definition as pompiers } from './petits-pompiers/definition';
import { games as hosted } from './registry';

/**
 * Every game, in catalogue order, with its scene: what the tests and tools read. The catalogue page imports
 * ./registry instead, which leaves out the games served by their own site (scripts/sites.js).
 */
export const games: readonly GameDefinition[] = [pompiers, ...hosted];
