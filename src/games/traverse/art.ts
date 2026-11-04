import type Phaser from 'phaser';
import { filled, type Board, type Lane } from '../../engines/traverse/engine';
import { backdrop, groundTile, stoneBlock, water, type World } from '../universal/art';
type G = Phaser.GameObjects.Graphics;
/** Drawing shared by the scene and the catalogue thumbnail (one source, no drift). */
export const CAR_PAINTS = [0xff5f5f, 0x4fa3ff, 0xffc93d, 0x9a6bff, 0x3fcf8e];
/** Sky, grass strips, water and asphalt: they never move within a crossing. Returns the rocks painted. */
export function crossingScenery(g: G, world: World, board: Board): number {
    backdrop(g, world, 360, 640);
    for (let y = 0; y < 15; y++) {
        const lane = board.lanes.find(l => l.y === y), top = 64 + y * 38;
        if (!lane) for (let x = 0; x < 9; x++) groundTile(g, world, 9 + x * 38, top, 38, x + y * 3);
        else if (lane.kind === 'river') water(g, world, 9, top, 342, 37, 0);
        else {
            g.fillStyle(0x3b3f4c); g.fillRect(9, top, 342, 37); g.fillStyle(0x8a8f9c); g.fillRect(9, top, 342, 2); g.fillRect(9, top + 35, 342, 2);
            g.fillStyle(0xf2f2e6, .7); for (let x = 0; x < 9; x++) g.fillRect(20 + x * 38, top + 18, 16, 2);
        }
    }
    let rocks = 0;
    for (const r of board.rocks ?? []) { stoneBlock(g, world, 12 + r.x * 38, 67 + r.y * 38, 32, r.x + r.y); rocks++; }
    return rocks;
}
/** Contiguous filled cells of a lane form one vehicle, log or row of turtles: [first, end) cells. */
export function laneRuns(lane: Lane, phase: number, level: number): [number, number][] {
    const runs: [number, number][] = [];
    let run = -1;
    for (let x = 0; x <= 9; x++) {
        const on = x < 9 && filled(lane, x, phase, level);
        if (on && run < 0) run = x;
        if (on || run < 0) continue;
        runs.push([run, x]); run = -1;
    }
    return runs;
}
/** Shelter hut: its door glows when open, a star once reached (38 × 40). */
export function hut(g: G, state: 'done' | 'open' | 'closed'): void {
    const done = state === 'done', open = state === 'open';
    g.fillStyle(0x6b4226); g.fillRect(4, 16, 28, 22); g.fillStyle(0xb5532a); g.fillTriangle(0, 18, 18, 2, 36, 18);
    g.fillStyle(done ? 0xffd479 : open ? 0x64e4cc : 0x2a3340); g.fillRoundedRect(11, 22, 14, 16, 4);
    if (done) { g.fillStyle(0xfff3a0); g.fillCircle(18, 12, 4); }
}
