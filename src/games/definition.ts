import type Phaser from 'phaser';
import type { FingerProof } from './finger-receipts';
import type { ThumbnailFactory } from './thumbnail';
import type { PlaySession } from '../shell/pause';
import type { TouchButton } from '../shell/input';
import type { SoundEffects } from '../shell/sound';
// What a game gives the shell: the catalogue lists it, a single-game site plays only it.
export interface GameTestHook extends FingerProof {
    fingerReceipts(): { sequence: number; events: { sequence: number; type: string; x: number; y: number; target: string | null }[] };
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
    /** Full-screen shell: the canvas takes the whole play area (Phaser RESIZE) above a bottom control bar. */
    fill?: boolean;
}
/** Catalogue card of a game served by its own site (`href`, relative to the catalogue), without its scene. */
export interface CatalogueLink {
    id: string;
    name: string;
    levelCount: number;
    thumbnail: ThumbnailFactory;
    href: string;
}
