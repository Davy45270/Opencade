import type Phaser from 'phaser';
import { TILE } from '../../engines/empilo/engine';
import { backdrop, hudVeil, palettes, type World } from '../universal/art';
type G = Phaser.GameObjects.Graphics;
/** Drawing shared by the scene and the catalogue thumbnail (one source, no drift). */
export const PIECE_COLORS = [0x80e9dc, 0xffc582, 0xe9a6d2, 0xaeb6ff, 0x91c9ff, 0xe1e992, 0xd29af2, 0x9de1ae, 0xff8a5c];
/** Centre of board cell (x, y) in scene coordinates; a crystal is 26 px centred there. */
/** The reserve tile, touched to set a piece aside (world coordinates). */
export const RESERVE_TILE = { x: 278, y: 148, width: 76, height: 80 } as const;
export function cellCenter(x: number, y: number): { x: number; y: number } { return { x: 32 + x * 28, y: 48 + y * 28 }; }
/** The well: stone frame around a dark shaft, so vivid blocks stay readable over the scenery. */
export function wellScenery(g: G, world: World): void {
    backdrop(g, world, 360, 640);
    g.fillStyle(palettes[world].stone); g.fillRoundedRect(8, 24, 272, 470, 10); g.fillStyle(0xffffff, .18); g.fillRect(12, 27, 264, 4);
    g.fillStyle(palettes[world].veil, .9); g.fillRect(18, 34, 252, 448);
    // Right of the well: next pieces at the top (the reserve tile below them is drawn by the scene), the hero lower.
    hudVeil(g, world, 8, 504, 344, 132); hudVeil(g, world, 276, 24, 80, 116); hudVeil(g, world, 276, 300, 80, 182);
    g.lineStyle(1, 0x244659);
    for (let x = 0; x <= 9; x++) g.lineBetween(18 + x * 28, 34, 18 + x * 28, 482);
    for (let y = 0; y <= 16; y++) g.lineBetween(18, 34 + y * 28, 270, 34 + y * 28);
    g.lineStyle(2, 0x80e9dc); g.strokeRect(17, 33, 254, 450);
}
/** Crystal colour of a settled tile: vivid world colours varied by position like a brick wall. */
export function settledColor(v: number, x: number, y: number, world: World): number {
    if (v === TILE.gem || v === TILE.key) return 0x6fa5b4;
    return v === TILE.sealed ? 0xc59ee9 : [palettes[world].accent, 0x4fa3ff, 0x3fcf8e, 0xffc93d, 0xff6fae][(x * 3 + y * 5) % 5] ?? 0x4fa3ff;
}
