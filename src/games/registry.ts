import { createThumbnail as alunirThumbnail, createDemo as alunirDemo } from './alunir/thumbnail';
import { AlunirScene, alunirButtons } from './alunir/scene';
import { alunirEffects } from './alunir/sound';
import type { ThumbnailFactory } from './thumbnail';
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
import type Phaser from 'phaser';
import type { PlaySession } from '../shell/pause';
import type { TouchButton } from '../shell/input';
import { LabScene } from './bubble/scene';
import { LEVELS } from '../engines/bubble/levels';
import type { SoundEffects } from '../shell/sound';
import { bubbleEffects } from './bubble/sound';
export interface GameTestHook {
    read(): unknown;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
}
export interface GameDefinition {
    thumbnail: ThumbnailFactory;
    demo: (seed?: number) => { engine: { status: string; snapshot(): unknown }; step(): void; readonly restarts: number };
    id: string;
    name: string;
    levelCount: number;
    keyboardHelp: string;
    touchHelp: string;
    realtime: boolean;
    createScene: (session?: PlaySession) => Phaser.Scene;
    effects: SoundEffects;
    testHook?: () => GameTestHook | undefined;
    touchControls?: readonly TouchButton[];
}
export const bubbleButtons: readonly TouchButton[] = [
    { id: 'touch-left', label: '←', ariaLabel: 'Viser à gauche', size: 44, placement: 'left', mode: 'tap' },
    { id: 'touch-fire', label: 'Tirer', ariaLabel: 'Tirer', size: 56, placement: 'center', mode: 'tap' },
    { id: 'touch-right', label: '→', ariaLabel: 'Viser à droite', size: 44, placement: 'right', mode: 'tap' },
];
export const games: readonly GameDefinition[] = [
    { thumbnail: alunirThumbnail, demo: alunirDemo, id: 'alunir', name: 'Alunir', levelCount: 30, realtime: true, keyboardHelp: '↑ ou W : poussée · ← → ou A/D : rotation · P/Échap : pause', touchHelp: 'Maintenir ↺ ↻ : tourner · Maintenir Poussée : freiner la chute · Poser doucement et droit', createScene: session => new AlunirScene(session), effects: alunirEffects, testHook: () => window.__ALUNIR_TEST__, touchControls: alunirButtons },
    { thumbnail: ferrailleThumbnail, demo: ferrailleDemo, id: 'ferraille', name: 'Ferraille', levelCount: 30, realtime: true, keyboardHelp: '← → ou A/D : courir · ↑ W : viser · ↓ S : accroupir · Espace/Z : saut · X/J : tir · P/Échap : pause', touchHelp: 'Joystick : courir et viser · Saut : maintenir pour monter · Tir : maintenir', createScene: session => new FerrailleScene(session), effects: ferrailleEffects, testHook: () => window.__FERRAILLE_TEST__, touchControls: ferrailleButtons },
    { thumbnail: dedaleThumbnail, demo: dedaleDemo, id: 'dedale', name: 'Dédale', levelCount: 30, realtime: true, keyboardHelp: 'Flèches ou ZQSD : guider · P/Échap : pause', touchHelp: 'Glisser : guider · Croix : direction mémorisée · Pause en haut', createScene: session => new DedaleScene(session), effects: dedaleEffects, testHook: () => window.__DEDALE_TEST__, touchControls: dedaleButtons },
    { thumbnail: essaimThumbnail, demo: essaimDemo, id: 'essaim', name: 'Essaim', levelCount: 30, realtime: true, keyboardHelp: '← → ou A/D : guider · Espace : tir continu · P/Échap : pause', touchHelp: 'Glisser sous la ligne : guider et tirer · Vaisseau au-dessus du doigt', createScene: session => new EssaimScene(session), effects: essaimEffects, testHook: () => window.__ESSAIM_TEST__, touchControls: essaimButtons },
    { thumbnail: orbiteThumbnail, demo: orbiteDemo, id: 'orbite', name: 'Orbite', levelCount: 30, realtime: true, keyboardHelp: '← → ou A/D : guider · Espace : tirer · P/Échap : pause', touchHelp: 'Glisser en bas : guider · Tir maintenu ou Tir auto · Pause en haut', createScene: session => new OrbiteScene(session), effects: orbiteEffects, testHook: () => window.__ORBITE_TEST__, touchControls: orbiteButtons },
    { thumbnail: empiloThumbnail, demo: empiloDemo, id: 'empilo', name: 'Empilo', levelCount: 30, realtime: true, keyboardHelp: '← → ↓ · X/W/↑ et Z/C : tourner · Espace : chute · P/Échap : pause', touchHelp: 'Glisser : déplacer · Tap : tourner · Glisser vite vers le bas : chute', createScene: session => new EmpiloScene(session), effects: empiloEffects, testHook: () => window.__EMPILO_TEST__, touchControls: empiloButtons },
    { thumbnail: briqueterieThumbnail, demo: briqueterieDemo, id: 'briqueterie', name: 'Briqueterie', levelCount: 30, realtime: true, keyboardHelp: 'Souris : guider · ← → ou A/D : déplacer · Espace : lancer · P/Échap : pause', touchHelp: 'Glisser en bas : guider · Tap ou Lancer : départ · Pause en haut', createScene: session => new BriqueterieScene(session), effects: briqueterieEffects, testHook: () => window.__BRIQUETERIE_TEST__, touchControls: briqueterieButtons },
    { thumbnail: bubbleThumbnail, demo: bubbleDemo, id: 'bubble', realtime: false, name: 'Bubble Lab', keyboardHelp: 'Souris : viser et tirer · ← → : viser · Espace : tirer', touchHelp: 'Toucher : viser et tirer · Boutons : ajuster et tirer', levelCount: LEVELS.length, createScene: session => new LabScene(session), effects: bubbleEffects, testHook: () => window.__BUBBLE_TEST__, touchControls: bubbleButtons },
    { thumbnail: serpentinThumbnail, demo: serpentinDemo, id: 'serpentin', name: 'Serpentin', levelCount: 30, realtime: true, keyboardHelp: 'Flèches · ZQSD/WASD · P ou Échap : pause', touchHelp: 'Glisser : tourner · Croix : guider · Pause en haut', createScene: session => new SerpentinScene(session), effects: serpentinEffects, testHook: () => window.__SERPENTIN_TEST__, touchControls: serpentinButtons },
];
