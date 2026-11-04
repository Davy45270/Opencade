import type Phaser from 'phaser';
import { backdrop, floorTile, palettes, shade, stoneBlock, type World } from '../universal/art';
type G = Phaser.GameObjects.Graphics;
/** Drawing shared by the scene and the catalogue thumbnail (one source, no drift). */
/** Meadow (or ash field) in a checker of 22 px cells; walls are a stone rim, the torus a low hedge. */
export function meadowScenery(g: G, world: World, walls: boolean): void {
    backdrop(g, world, 360, 640);
    for (let y = 0; y < 21; y++) for (let x = 0; x < 15; x++) floorTile(g, world, 15 + x * 22, 32 + y * 22, 22, (x + y) % 2 === 1);
    if (walls) { for (let i = 0; i < 17; i++) { stoneBlock(g, world, 4 + i * 21, 21, 11, i); stoneBlock(g, world, 4 + i * 21, 495, 11, i + 1); } for (let i = 0; i < 23; i++) { stoneBlock(g, world, 4, 21 + i * 21, 11, i); stoneBlock(g, world, 345, 21 + i * 21, 11, i + 2); } }
    else { g.lineStyle(5, palettes[world].foliage, .8); g.strokeRect(12, 29, 336, 468); g.lineStyle(2, shade(palettes[world].foliage, .35), .9); g.strokeRect(12, 29, 336, 468); }
    g.lineStyle(3, walls ? 0xffb867 : 0x70cfff); g.strokeRect(14, 31, 332, 464);
}
/** One snake segment whose cell top left is (x, y); index 0 is the head plate under the character. */
export function segment(g: G, i: number, x: number, y: number): void {
    const scale = i % 2 ? 0x2fbf8f : 0x3fd9a3;
    g.fillStyle(i === 0 ? 0xe5fff7 : shade(scale, -.35)); g.fillRoundedRect(x - 1, y - 1, 20, 20, i === 0 ? 8 : 7);
    if (i > 0) { g.fillStyle(scale); g.fillRoundedRect(x + 1, y + 1, 16, 15, 6); g.fillStyle(0xffe08a, .8); g.fillCircle(x + 9, y + 9, 2.5); g.fillStyle(0xffffff, .35); g.fillEllipse(x + 6, y + 5, 7, 3); }
}
/** The bonus crystal centred on (x, y). */
export function crystalMark(g: G, x: number, y: number): void {
    g.fillStyle(0xbfa2ff); g.fillTriangle(x, y - 10, x - 8, y, x + 8, y); g.fillTriangle(x, y + 10, x - 8, y, x + 8, y);
}
