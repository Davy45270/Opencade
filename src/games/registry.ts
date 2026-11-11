import { CollierScene, collierButtons } from './collier/scene';
import { MarmailleScene, marmailleButtons } from './marmaille/scene';
import { marmailleEffects } from './marmaille/sound';
import { createThumbnail as marmailleThumbnail, createDemo as marmailleDemo } from './marmaille/thumbnail';
import { GAME_NAME as MARMAILLE_NAME, LEVELS as MARMAILLE_LEVELS } from '../engines/marmaille/levels';
import { collierEffects } from './collier/sound';
import { createThumbnail as collierThumbnail, createDemo as collierDemo } from './collier/thumbnail';
import { GAME_NAME as COLLIER_NAME } from '../engines/collier/levels';
import { PepitesScene, pepitesButtons } from './pepites/scene';
import { pepitesEffects } from './pepites/sound';
import { createThumbnail as pepitesThumbnail, createDemo as pepitesDemo } from './pepites/thumbnail';
import { GAME_NAME as PEPITES_NAME } from '../engines/pepites/levels';
import { GourmandisesScene, gourmandisesButtons } from './gourmandises/scene';
import { gourmandisesEffects } from './gourmandises/sound';
import { createThumbnail as gourmandisesThumbnail, createDemo as gourmandisesDemo } from './gourmandises/thumbnail';
import { GAME_NAME } from '../engines/gourmandises/levels';
import { BombercadeScene, bombercadeButtons } from './bombercade/scene';
import { bombercadeEffects } from './bombercade/sound';
import { createThumbnail as bombercadeThumbnail, createDemo as bombercadeDemo } from './bombercade/thumbnail';
import { GAME_NAME as BOMBERCADE_NAME } from '../engines/bombercade/levels';
import { DerapageScene, derapageButtons } from './derapage/scene';
import { derapageEffects } from './derapage/sound';
import { createThumbnail as derapageThumbnail, createDemo as derapageDemo } from './derapage/thumbnail';
import { CaissesScene, caissesButtons } from './caisses/scene';
import { caissesEffects } from './caisses/sound';
import { createThumbnail as caissesThumbnail, createDemo as caissesDemo } from './caisses/thumbnail';
import { SudokuScene, sudokuButtons } from './sudoku/scene';
import { sudokuEffects } from './sudoku/sound';
import { createThumbnail as sudokuThumbnail, createDemo as sudokuDemo } from './sudoku/thumbnail';
import { GAME_NAME as SUDOKU_NAME, LEVELS as SUDOKU_LEVELS } from '../engines/sudoku/levels';
import { TraverseScene, traverseButtons } from './traverse/scene';
import { traverseEffects } from './traverse/sound';
import { createThumbnail as traverseThumbnail, createDemo as traverseDemo } from './traverse/thumbnail';
import { createThumbnail as alunirThumbnail, createDemo as alunirDemo } from './alunir/thumbnail';
import { AlunirScene, alunirButtons } from './alunir/scene';
import { alunirEffects } from './alunir/sound';
import { createThumbnail as briqueterieThumbnail, createDemo as briqueterieDemo } from './briqueterie/thumbnail';
import { createThumbnail as orbiteThumbnail, createDemo as orbiteDemo } from './orbite/thumbnail';
import { createThumbnail as essaimThumbnail, createDemo as essaimDemo } from './essaim/thumbnail';
import { createThumbnail as empiloThumbnail, createDemo as empiloDemo } from './empilo/thumbnail';
import { createThumbnail as serpentinThumbnail, createDemo as serpentinDemo } from './serpentin/thumbnail';
import { createThumbnail as dedaleThumbnail, createDemo as dedaleDemo } from './dedale/thumbnail';
import { createThumbnail as ferrailleThumbnail, createDemo as ferrailleDemo } from './ferraille/thumbnail';
import { createThumbnail as bubbleThumbnail, createDemo as bubbleDemo } from './bubble/thumbnail';
import { FerrailleScene, ferrailleButtons } from './ferraille/scene';
import { ferrailleEffects } from './ferraille/sound';
import { DedaleScene, dedaleButtons } from './dedale/scene';
import { dedaleEffects } from './dedale/sound';
import { EssaimScene, essaimButtons } from './essaim/scene';
import { essaimEffects } from './essaim/sound';
import { OrbiteScene, orbiteButtons } from './orbite/scene';
import { orbiteEffects } from './orbite/sound';
import { EmpiloScene, empiloButtons } from './empilo/scene';
import { empiloEffects } from './empilo/sound';
import { BriqueterieScene, briqueterieButtons } from './briqueterie/scene';
import { briqueterieEffects } from './briqueterie/sound';
import { SerpentinScene, serpentinButtons } from './serpentin/scene';
import { serpentinEffects } from './serpentin/sound';
import type { TouchButton } from '../shell/input';
import { LabScene } from './bubble/scene';
import { LEVELS } from '../engines/bubble/levels';
import { bubbleEffects } from './bubble/sound';
export type { GameDefinition, GameTestHook } from './definition';
import type { GameDefinition } from './definition';
export const bubbleButtons: readonly TouchButton[] = [
    // Aim and fire: drag then release on the canvas; swap: tap the next bubble.
    { id: 'bubble-special', label: 'Joker', ariaLabel: 'Joker : couleur du groupe visé', size: 56, placement: 'center', mode: 'tap' },
    { setting: true, id: 'touch-mode', label: 'Tir au toucher', ariaLabel: 'Tirer au toucher', size: 56, placement: 'right', mode: 'tap' },
];
/** Games still played inside the catalogue. Games with their own site are in ./all.ts (tools and tests) and scripts/sites.js. */
export const games: readonly GameDefinition[] = [
    { thumbnail: collierThumbnail, demo: collierDemo, id: 'collier', name: COLLIER_NAME, levelCount: 30, realtime: true, keyboardHelp: '← → : viser · Espace : tirer · X : échanger · P/Échap : pause', touchHelp: 'Viser partout puis relâcher · Toucher le tireur ou la perle suivante : échanger', createScene: session => new CollierScene(session), effects: collierEffects, testHook: () => window.__COLLIER_TEST__, touchControls: collierButtons },
    { thumbnail: bombercadeThumbnail, demo: bombercadeDemo, id: 'bombercade', name: BOMBERCADE_NAME, levelCount: 30, realtime: true, keyboardHelp: 'Flèches / ZQSD : marcher · Espace : bombe · X : pouvoir · P/Échap : pause', touchHelp: 'Pavé : maintenir la direction · Glisser dans l’arène : marcher · Tap dans l’arène ou Bombe : poser · ✦ : pouvoir', createScene: session => new BombercadeScene(session), effects: bombercadeEffects, testHook: () => window.__BOMBERCADE_TEST__, touchControls: bombercadeButtons },
    { thumbnail: derapageThumbnail, demo: derapageDemo, id: 'derapage', name: 'Pistouille', levelCount: 30, realtime: true, keyboardHelp: '← → : braquer · Espace/Maj : dérapage · X/Ctrl : bonus · C : élan · P/Échap : pause', touchHelp: 'Maintenir ◀ ▶ et Glisse (Dérapage) · Bonus : utiliser · Inclinaison et souris en option', createScene: session => new DerapageScene(session), effects: derapageEffects, testHook: () => window.__DERAPAGE_TEST__, touchControls: derapageButtons },
    { thumbnail: traverseThumbnail, demo: traverseDemo, id: 'traverse', name: 'Traverse', levelCount: 30, realtime: true, keyboardHelp: 'Flèches ou ZQSD : un pas · Espace : Bond · P/Échap : pause', touchHelp: 'Toucher : un pas en avant · Glisser : un pas de côté ou en arrière · Bond · Attendre les fenêtres de passage', createScene: session => new TraverseScene(session), effects: traverseEffects, testHook: () => window.__TRAVERSE_TEST__, touchControls: traverseButtons },
    { thumbnail: caissesThumbnail, demo: caissesDemo, id: 'caisses', name: 'Caisses', levelCount: 30, realtime: false, keyboardHelp: 'Flèches / QSD / Maj+Z : déplacer · Z ou Retour arrière : annuler · R : recommencer', touchHelp: 'Glisser : un pas · ↶ : annuler · Tirer (contre une caisse) · Recommencer dans ☰', createScene: session => new CaissesScene(session), effects: caissesEffects, testHook: () => window.__CAISSES_TEST__, touchControls: caissesButtons },
    { thumbnail: sudokuThumbnail, demo: sudokuDemo, id: 'sudoku', fill: true, name: SUDOKU_NAME, levelCount: SUDOKU_LEVELS.length, realtime: false, keyboardHelp: 'Flèches : case · 1–9 : chiffre · Maj+chiffre : note · N : mode notes · Suppr/0 : effacer · Ctrl+Z : annuler · H : indice', touchHelp: 'Toucher une case puis un chiffre du pavé · Crayon : notes · ↶ : annuler · Ampoule : indice expliqué · Grille du jour et infinie dans Niveaux', createScene: session => new SudokuScene(session), effects: sudokuEffects, testHook: () => window.__SUDOKU_TEST__, touchControls: sudokuButtons },
    { thumbnail: alunirThumbnail, demo: alunirDemo, id: 'alunir', name: 'Alunir', levelCount: 30, realtime: true, keyboardHelp: '↑ ou W : poussée · ← → ou A/D : rotation · P/Échap : pause', touchHelp: 'Maintenir ↺ ↻ : tourner · Maintenir Poussée : freiner la chute · Poser doucement et droit', createScene: session => new AlunirScene(session), effects: alunirEffects, testHook: () => window.__ALUNIR_TEST__, touchControls: alunirButtons },
    { thumbnail: ferrailleThumbnail, demo: ferrailleDemo, id: 'ferraille', name: 'Ferraille', levelCount: 30, realtime: true, keyboardHelp: '← → ou A/D : courir · ↑ W : viser · ↓ S : accroupir · Espace/Z : saut · X/J : tir · C : super-tir · P/Échap : pause', touchHelp: 'Joystick : courir et viser · Saut : maintenir pour monter · Tir : maintenir', createScene: session => new FerrailleScene(session), effects: ferrailleEffects, testHook: () => window.__FERRAILLE_TEST__, touchControls: ferrailleButtons },
    { thumbnail: dedaleThumbnail, demo: dedaleDemo, id: 'dedale', name: 'Dédale', levelCount: 30, realtime: true, keyboardHelp: 'Flèches ou ZQSD : guider · P/Échap : pause', touchHelp: 'Glisser : guider · Lueur : chemin vers le soleil · Croix en option dans ⏸', createScene: session => new DedaleScene(session), effects: dedaleEffects, testHook: () => window.__DEDALE_TEST__, touchControls: dedaleButtons },
    { thumbnail: essaimThumbnail, demo: essaimDemo, id: 'essaim', name: 'Essaim', levelCount: 30, realtime: true, keyboardHelp: '← → ou A/D : guider · Espace : tir continu · P/Échap : pause', touchHelp: 'Glisser sous la ligne : guider et tirer · Vaisseau au-dessus du doigt', createScene: session => new EssaimScene(session), effects: essaimEffects, testHook: () => window.__ESSAIM_TEST__, touchControls: essaimButtons },
    { thumbnail: orbiteThumbnail, demo: orbiteDemo, id: 'orbite', name: 'Orbite', levelCount: 30, realtime: true, keyboardHelp: '← → ou A/D : guider · Espace : tirer · P/Échap : pause', touchHelp: 'Glisser en bas : guider · tir automatique (réglage dans ⏸) · Rafale', createScene: session => new OrbiteScene(session), effects: orbiteEffects, testHook: () => window.__ORBITE_TEST__, touchControls: orbiteButtons },
    { thumbnail: empiloThumbnail, demo: empiloDemo, id: 'empilo', name: 'Empilo', levelCount: 30, realtime: true, keyboardHelp: '← → ↓ · X/W/↑ et Z/C : tourner · Espace : chute · P/Échap : pause', touchHelp: 'Glisser : déplacer · Tap : tourner · Glisser vite vers le bas : chute · Tap sur Réserve : mettre de côté · ↓ : descente lente', createScene: session => new EmpiloScene(session), effects: empiloEffects, testHook: () => window.__EMPILO_TEST__, touchControls: empiloButtons },
    { thumbnail: briqueterieThumbnail, demo: briqueterieDemo, id: 'briqueterie', name: 'Briqueterie', levelCount: 30, realtime: true, keyboardHelp: 'Souris : guider · ← → ou A/D : déplacer · Espace : lancer · P/Échap : pause', touchHelp: 'Glisser en bas : guider · Tap ou Lancer : départ · Pause en haut', createScene: session => new BriqueterieScene(session), effects: briqueterieEffects, testHook: () => window.__BRIQUETERIE_TEST__, touchControls: briqueterieButtons },
    { thumbnail: bubbleThumbnail, demo: bubbleDemo, id: 'bubble', realtime: false, name: 'Bubble Lab', keyboardHelp: 'Souris : viser et tirer · ← → : viser · Maj + ← → ou molette : case suivante · Espace : tirer · X : échanger · C : joker', touchHelp: 'Glisser puis relâcher : tirer · Sous le lanceur : tirer en arrière comme un lance-pierre · Relâcher sur le lanceur : annuler · Toucher la bulle suivante : échanger · Joker : couleur du groupe visé · Tir au toucher : réglage de la pause', levelCount: LEVELS.length, createScene: session => new LabScene(session), effects: bubbleEffects, testHook: () => window.__BUBBLE_TEST__, touchControls: bubbleButtons },
    { thumbnail: serpentinThumbnail, demo: serpentinDemo, id: 'serpentin', name: 'Serpentin', levelCount: 30, realtime: true, keyboardHelp: 'Flèches · ZQSD/WASD · Espace : esquive · P ou Échap : pause', touchHelp: 'Glisser : tourner · Esquive : traverser son corps · Croix en option dans ⏸', createScene: session => new SerpentinScene(session), effects: serpentinEffects, testHook: () => window.__SERPENTIN_TEST__, touchControls: serpentinButtons },
    { thumbnail: pepitesThumbnail, demo: pepitesDemo, id: 'pepites', name: PEPITES_NAME, levelCount: 30, realtime: true, keyboardHelp: 'Flèches ou ZQSD : creuser (maintenir pour avancer) · Espace : étai · P/Échap : pause', touchHelp: 'Glisser et maintenir : creuser · Étai : figer les rochers', createScene: session => new PepitesScene(session), effects: pepitesEffects, testHook: () => window.__PEPITES_TEST__, touchControls: pepitesButtons },
    {
        thumbnail: gourmandisesThumbnail,
        demo: gourmandisesDemo,
        id: 'gourmandises',
        name: GAME_NAME,
        levelCount: 180,
        realtime: false,
        keyboardHelp: 'Flèches : curseur · Espace : choisir puis flèche : permuter · 1/2/3 : outils · P/Échap : pause',
        touchHelp: 'Glisser vers une voisine ou toucher deux pièces · Outil puis case · Indice après 5 s en Découverte',
        createScene: session => new GourmandisesScene(session),
        effects: gourmandisesEffects,
        testHook: () => window.__GOURMANDISES_TEST__,
        touchControls: gourmandisesButtons,
    },
    { thumbnail: marmailleThumbnail, demo: marmailleDemo, id: 'marmaille', name: MARMAILLE_NAME, levelCount: MARMAILLE_LEVELS.length, realtime: true, keyboardHelp: '1 2 3 : choisir un rôle · clic sur un enfant : le lui donner · V : accélérer · P/Échap : pause', touchHelp: 'Toucher un rôle, puis un enfant · » : accélérer', createScene: session => new MarmailleScene(session), effects: marmailleEffects, testHook: () => window.__MARMAILLE_TEST__, touchControls: marmailleButtons },
    { thumbnail: devissoThumbnail, demo: devissoDemo, id: 'devisso', name: DEVISSO_NAME, levelCount: DEVISSO_LEVELS.length, realtime: false, keyboardHelp: 'Entrée : dévisser la vis proposée · 1 à 5 : bonus · Z : annuler · H : indice · R : recommencer · P/Échap : pause', touchHelp: 'Toucher une vis libre : elle file dans sa boîte ou la réserve · Bonus en bas · Reprendre ♥ quand plus rien ne rentre', createScene: session => new DevissoScene(session), effects: devissoEffects, testHook: () => window.__DEVISSO_TEST__, touchControls: devissoButtons },
    { thumbnail: demineurThumbnail, demo: demineurDemo, id: 'demineur', name: DEMINEUR_NAME, levelCount: DEMINEUR_LEVELS.length, realtime: false, keyboardHelp: 'Flèches : case · Espace/Entrée : creuser (sur un chiffre complet : ouvrir ses voisines) · F : drapeau · clic droit : drapeau · T : outil · H : indice · Z : loupe · R : recommencer', touchHelp: 'Toucher : creuser ou poser un drapeau selon l’outil (bouton Creuser/Drapeau) · appui long : l’autre outil · glisser : déplacer une grande grille · loupe : vue d’ensemble', createScene: session => new DemineurScene(session), effects: demineurEffects, testHook: () => window.__DEMINEUR_TEST__, touchControls: demineurButtons },
    { thumbnail: fusioThumbnail, demo: fusioDemo, id: 'fusio', fill: true, name: FUSIO_NAME, levelCount: FUSIO_LEVELS.length, realtime: false, keyboardHelp: 'Flèches ou WASD (ZQSD en AZERTY) : glisser · U, Retour arrière ou Ctrl+Z : annuler · H : indice · R : nouvelle partie', touchHelp: 'Glisser sur le plateau : pousser les tuiles · flèches en bas : la même chose · ↶ : annuler · ampoule : coup conseillé, expliqué · Défis dans Niveaux', createScene: session => new FusioScene(session), effects: fusioEffects, testHook: () => window.__FUSIO_TEST__, touchControls: fusioButtons },
    { thumbnail: artificiersThumbnail, demo: artificiersDemo, id: 'artificiers', name: 'Les Artificiers', levelCount: 30, realtime: true, keyboardHelp: '← → : marcher · ↑ ↓ : angle · W/S : puissance · Espace : tir · J : saut · G : grappin · X : arme · P/Échap : pause', touchHelp: 'Glisser du héros et relâcher · Marche, Saut, Arme, Corde · 1 / 2 : solo ou duel local', createScene: session => new ArtificiersScene(session), effects: artificiersEffects, testHook: () => window.__ARTIFICIERS_TEST__, touchControls: artificiersButtons },
];

import { FusioScene, fusioButtons } from './fusio/scene';
import { fusioEffects } from './fusio/sound';
import { createThumbnail as fusioThumbnail, createDemo as fusioDemo } from './fusio/thumbnail';
import { GAME_NAME as FUSIO_NAME, LEVELS as FUSIO_LEVELS } from '../engines/fusio/engine';
import { DemineurScene, demineurButtons } from './demineur/scene';
import { demineurEffects } from './demineur/sound';
import { createThumbnail as demineurThumbnail, createDemo as demineurDemo } from './demineur/thumbnail';
import { GAME_NAME as DEMINEUR_NAME, LEVELS as DEMINEUR_LEVELS } from '../engines/demineur/levels';
import { DevissoScene, devissoButtons } from './devisso/scene';
import { devissoEffects } from './devisso/sound';
import { createThumbnail as devissoThumbnail, createDemo as devissoDemo } from './devisso/thumbnail';
import { GAME_NAME as DEVISSO_NAME, LEVELS as DEVISSO_LEVELS } from '../engines/devisso/levels';
import { ArtificiersScene, artificiersButtons } from './artificiers/scene';
import { artificiersEffects } from './artificiers/sound';
import { createThumbnail as artificiersThumbnail, createDemo as artificiersDemo } from './artificiers/thumbnail';
