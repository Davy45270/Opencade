import type { GameDefinition } from '../definition';
import { PetitsPompiersScene, pompiersButtons } from './scene';
import { pompiersEffects } from './sound';
import { createThumbnail, createDemo } from './thumbnail';
import { GAME_NAME, LEVELS } from '../../engines/petits-pompiers/levels';

/** Petits Pompiers as a whole game: what its own site (/pompiers/) plays. */
export const definition: GameDefinition = { thumbnail: createThumbnail, demo: createDemo, id: 'petits-pompiers', fill: true, name: GAME_NAME, levelCount: LEVELS.length, realtime: true, keyboardHelp: 'Flèches / ZQSD : marcher · Espace : action · A : outil · P/Échap : pause', touchHelp: 'Stick : marcher · Grande touche : action contextuelle · Petite touche : outil', createScene: session => new PetitsPompiersScene(session), effects: pompiersEffects, testHook: () => window.__PETITS_POMPIERS_TEST__, touchControls: pompiersButtons };
