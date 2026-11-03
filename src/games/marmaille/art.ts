import type Phaser from 'phaser';
import type { Tile } from '../../engines/marmaille/engine';
/**
 * Marmaille scenery after the charter's three troop-guiding boards: bamboo bridge (levels 1-10),
 * pink cliffs (11-20), dragon mine (21-30). Everything here is static: the backdrop is baked
 * once per world and companion, terrain cells are painted into a render texture only when they
 * change. The per-frame layer (kids, hero, water glints) lives in the scene.
 */
type G = Phaser.GameObjects.Graphics;
export type World = 'bambou' | 'roses' | 'mine';
export function worldOf(level: number): World { return level < 10 ? 'bambou' : level < 20 ? 'roses' : 'mine'; }
export const WORLD_NAME: Record<World, string> = { bambou: 'Pont des bambous', roses: 'Falaises roses', mine: 'Mine du dragon' };
interface Palette { sky: [number, number]; far: number; near: number; rock: number; cap: number; bloom: number; soil: number; liquid: number; crest: number }
export const palettes: Record<World, Palette> = {
    bambou: { sky: [0x7fd0f2, 0xd7f3ff], far: 0x6f9fb0, near: 0x4f8a5e, rock: 0x8c7a62, cap: 0x5cbf3f, bloom: 0xb6ec6a, soil: 0x9b6a3a, liquid: 0x3aa6e2, crest: 0xe6f8ff },
    roses: { sky: [0xf7b8d8, 0xffe8c8], far: 0xc58db0, near: 0x9a6a9a, rock: 0xc98f9a, cap: 0x7ccc5a, bloom: 0xff9cc8, soil: 0xa8714f, liquid: 0x63c4f2, crest: 0xffffff },
    mine: { sky: [0x1c1218, 0x4a2224], far: 0x3a2628, near: 0x2a1a1c, rock: 0x5a4844, cap: 0x7a5e50, bloom: 0xffb04a, soil: 0x6e4a32, liquid: 0xe4521c, crest: 0xffd060 },
};
/** Card colour of each companion, after the board's columns. */
export const CARD: Record<string, number> = { panda: 0x2f7a3a, pandaroux: 0xa8392b, dragon: 0x1f5fae, singe: 0xb03a8c, licorne: 0x5a3ab0 };
function mix(a: number, b: number, t: number): number {
    const c = (s: number): number => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export function shade(color: number, t: number): number { return t >= 0 ? mix(color, 0xffffff, t) : mix(color, 0x000000, -t); }
/** Deterministic small hash for per-cell variation. */
const hash = (x: number, y: number): number => ((x * 73856093) ^ (y * 19349663)) >>> 0;
/** Sky, far cliffs with falls (or a cave with lava seams), and the HUD card at the bottom. */
export function backdrop(g: G, world: World, card: number, fieldBottom: number): void {
    const p = palettes[world], bands = 16;
    for (let i = 0; i < bands; i++) { g.fillStyle(mix(p.sky[0], p.sky[1], i / (bands - 1))); g.fillRect(0, i * 40, 360, 41); }
    if (world === 'mine') {
        // Cave vault: arches, hanging stalactites, lava seams and lanterns.
        g.fillStyle(p.far); for (let i = 0; i < 5; i++) g.fillEllipse(i * 90, 120, 150, 230);
        g.fillStyle(p.sky[0]); for (let i = 0; i < 5; i++) g.fillEllipse(i * 90 + 45, 190, 70, 170);
        g.fillStyle(p.near); for (let i = 0; i < 12; i++) g.fillTriangle(i * 32, 0, i * 32 + 22, 0, i * 32 + 11, 30 + (i % 3) * 18);
        g.lineStyle(2, 0xff7a2a, .55); for (let i = 0; i < 6; i++) { const x = 20 + i * 62; g.lineBetween(x, 200 + (i % 2) * 60, x + 14, 260 + (i % 3) * 40); }
        for (const [x, y] of [[48, 92], [182, 70], [312, 104]] as const) { g.lineStyle(1, 0x2a1a14); g.lineBetween(x, 0, x, y - 8); g.fillStyle(0xffb04a, .25); g.fillCircle(x, y, 16); g.fillStyle(0xffd27a); g.fillRoundedRect(x - 5, y - 8, 10, 14, 3); }
        g.fillStyle(0x9a6aff, .7); for (const [x, y] of [[30, 330], [338, 300], [120, 360]] as const) g.fillTriangle(x, y, x + 6, y - 16, x + 12, y);
    } else {
        g.fillStyle(0xffffff, .7);
        for (const [x, y] of [[58, 70], [228, 46], [318, 108]] as const) { g.fillEllipse(x, y, 74, 22); g.fillEllipse(x + 20, y - 9, 44, 22); g.fillEllipse(x - 18, y - 4, 34, 16); }
        // Far cliffs, each with a fall.
        for (let i = 0; i < 5; i++) {
            const x = i * 84 - 10, top = 120 + (i % 2) * 40;
            g.fillStyle(p.far); g.fillRoundedRect(x, top, 70, 420, 14);
            g.fillStyle(shade(p.far, .18)); g.fillRect(x + 8, top + 8, 10, 400);
            g.fillStyle(world === 'roses' ? p.bloom : p.cap, .9); g.fillEllipse(x + 35, top + 2, 84, 20);
            if (i % 2 === 0) { g.fillStyle(0xeaf8ff, .8); g.fillRect(x + 44, top + 14, 9, 380); g.fillStyle(0xffffff, .55); g.fillRect(x + 46, top + 14, 3, 380); }
        }
        if (world === 'bambou') {
            // Bamboo stalks framing the field.
            for (const x of [6, 20, 342]) {
                g.fillStyle(0x7fbf3a); g.fillRect(x, 40, 9, 420);
                g.lineStyle(2, 0x4f8a2a); for (let j = 1; j < 10; j++) g.lineBetween(x, 40 + j * 44, x + 9, 40 + j * 44);
                g.fillStyle(0x5cbf3f); g.fillEllipse(x + 16, 80 + (x % 3) * 30, 30, 9); g.fillEllipse(x - 6, 150 + (x % 5) * 20, 26, 8);
            }
        } else {
            // Blossom trees.
            for (const [x, y] of [[26, 210], [334, 180], [180, 150]] as const) {
                g.fillStyle(0x6a4038); g.fillRect(x - 3, y, 6, 70);
                g.fillStyle(p.bloom); g.fillCircle(x, y, 22); g.fillStyle(shade(p.bloom, .35)); g.fillCircle(x - 9, y - 7, 11); g.fillCircle(x + 11, y + 4, 9);
            }
        }
        g.fillStyle(p.near, .85); for (let i = -1; i < 6; i++) g.fillEllipse(i * 70 + 20, 420, 120, 70);
    }
    // Deep strata under the board, so the field never sits in a box.
    g.fillStyle(shade(p.rock, -.45)); g.fillRect(0, fieldBottom, 360, 640 - fieldBottom);
    g.fillStyle(shade(p.rock, -.3)); for (let i = 0; i < 9; i++) g.fillEllipse(i * 44 + 10, fieldBottom + 18 + (i % 3) * 22, 36, 14);
    // HUD card in the companion's colour.
    g.fillStyle(0x000000, .35); g.fillRoundedRect(10, fieldBottom + 10, 340, 640 - fieldBottom - 20, 14);
    g.fillStyle(card, .92); g.fillRoundedRect(8, fieldBottom + 6, 340, 640 - fieldBottom - 20, 14);
    g.fillStyle(shade(card, -.35), .9); g.fillRoundedRect(16, fieldBottom + 40, 324, 640 - fieldBottom - 62, 10);
    g.lineStyle(2, shade(card, .45), .9); g.strokeRoundedRect(8, fieldBottom + 6, 340, 640 - fieldBottom - 20, 14);
}
/** One terrain cell, drawn inside its own square (so a cell can be cleared and repainted alone). */
export interface Around { up: Tile; left: Tile; right: Tile }
const solidTile = (t: Tile): boolean => t === '#' || t === 'X';
export function paintCell(g: G, world: World, tile: Tile, around: Around, built: boolean, x: number, y: number, s: number, top: number): void {
    if (tile === ' ') return;
    const p = palettes[world], h = hash(x, y), px = x * s, py = top + y * s;
    if (tile === '~') {
        g.fillStyle(p.liquid); g.fillRect(px, py + s * .25, s, s * .75);
        g.fillStyle(shade(p.liquid, -.2)); g.fillRect(px, py + s * .7, s, s * .3);
        g.fillStyle(p.crest, .85); g.fillRect(px, py + s * .25, s, 2);
        return;
    }
    if (built) {
        // Builder's step: a wooden plank on two pegs (charter: "Pont").
        g.fillStyle(0x6a4020); g.fillRect(px, py + s * .35, s, s * .45);
        g.fillStyle(0xc88a46); g.fillRect(px, py + s * .3, s, s * .3);
        g.fillStyle(0xe8b06a); g.fillRect(px + 1, py + s * .32, s - 2, 2);
        g.fillStyle(0x4a2a14); g.fillCircle(px + s * .2, py + s * .45, 1.4); g.fillCircle(px + s * .8, py + s * .45, 1.4);
        return;
    }
    const open = !solidTile(around.up);
    if (tile === 'X') {
        // Seamless cliff rock: strata every third row, shaded flanks where the cliff meets the air.
        g.fillStyle(h % 5 === 0 ? shade(p.rock, -.06) : p.rock); g.fillRect(px, py, s, s);
        if (y % 3 === 0) { g.fillStyle(shade(p.rock, -.18)); g.fillRect(px, py + s - 3, s, 2); }
        g.fillStyle(shade(p.rock, .16)); g.fillEllipse(px + s * (.3 + (h % 4) * .12), py + s * .45, 6, 3);
        if (!solidTile(around.left)) { g.fillStyle(shade(p.rock, .2)); g.fillRect(px, py, 3, s); }
        if (!solidTile(around.right)) { g.fillStyle(shade(p.rock, -.3)); g.fillRect(px + s - 3, py, 3, s); }
        if (h % 6 === 0) { g.lineStyle(1, shade(p.rock, -.4)); g.lineBetween(px + s * .55, py + s * .3, px + s * .7, py + s * .75); }
        if (world !== 'mine' && h % 9 === 0) { g.fillStyle(p.cap, .9); g.fillEllipse(px + s * .5, py + s * .2, 8, 4); }
        if (world === 'mine' && h % 7 === 0) { g.fillStyle(0xffb04a); g.fillTriangle(px + 5, py + s - 3, px + 8, py + 6, px + 11, py + s - 3); }
    } else {
        g.fillStyle(p.soil); g.fillRect(px, py, s, s);
        g.fillStyle(shade(p.soil, -.25)); g.fillCircle(px + s * (.25 + (h % 3) * .2), py + s * .65, 1.8); g.fillCircle(px + s * (.7 - (h % 2) * .3), py + s * .35, 1.3);
        g.fillStyle(shade(p.soil, .15)); g.fillRect(px + 2, py + s * .82, s * .4, 2);
        if (h % 5 === 1) { g.fillStyle(shade(p.rock, .1)); g.fillEllipse(px + s * .5, py + s * .5, 6, 4); }
        if (!solidTile(around.left)) { g.fillStyle(shade(p.soil, .18)); g.fillRect(px, py, 2, s); }
        if (!solidTile(around.right)) { g.fillStyle(shade(p.soil, -.3)); g.fillRect(px + s - 2, py, 2, s); }
    }
    if (open) {
        // Grass (or ash in the mine) on every exposed top, with tufts and the odd bloom.
        g.fillStyle(p.cap); g.fillRect(px, py, s, s * .3);
        g.fillStyle(shade(p.cap, .25)); g.fillRect(px, py, s, 2);
        g.fillStyle(p.cap); g.fillTriangle(px + 2, py + s * .3, px + 6, py + s * .3, px + 4, py + s * .48); g.fillTriangle(px + 10, py + s * .3, px + 14, py + s * .3, px + 12, py + s * .44);
        if (h % 4 === 0) { g.fillStyle(p.bloom); g.fillCircle(px + s * .6, py - 1, 2.2); }
    }
}
/** Trapdoor (wooden hatch, arrow sign) and exit (striped arch, dark tunnel, flag), static on the terrain layer. */
export function portals(g: G, spawn: { x: number; y: number }, exit: { x: number; y: number }, dir: 1 | -1, s: number, top: number): void {
    const sx = spawn.x * s + s / 2, sy = top + spawn.y * s;
    g.fillStyle(0x4a2a14); g.fillRoundedRect(sx - 16, sy - 6, 32, 10, 3);
    g.fillStyle(0xb7783a); g.fillRoundedRect(sx - 14, sy - 5, 28, 7, 2);
    g.lineStyle(1, 0x5a3418); g.lineBetween(sx - 5, sy - 5, sx - 5, sy + 2); g.lineBetween(sx + 5, sy - 5, sx + 5, sy + 2);
    // Sign post with the walking direction.
    const px = sx - dir * 22;
    g.fillStyle(0x6a4020); g.fillRect(px - 1.5, sy - 22, 3, 22);
    g.fillStyle(0xd09a56); g.fillTriangle(px - 9 * dir, sy - 26, px + 11 * dir, sy - 20, px - 9 * dir, sy - 14);
    const ex = exit.x * s + s / 2, ey = top + exit.y * s + s;
    g.fillStyle(0x2a1810); g.fillRoundedRect(ex - 13, ey - 30, 26, 30, { tl: 13, tr: 13, bl: 0, br: 0 });
    for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? 0xffffff : 0xe03a3a);
        const a0 = Math.PI + i * Math.PI / 6, a1 = a0 + Math.PI / 6;
        g.fillTriangle(ex, ey - 17, ex + Math.cos(a0) * 18, ey - 17 + Math.sin(a0) * 18, ex + Math.cos(a1) * 18, ey - 17 + Math.sin(a1) * 18);
    }
    g.fillStyle(0x1a0e08); g.fillRoundedRect(ex - 9, ey - 26, 18, 26, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.fillStyle(0xe03a3a); g.fillRect(ex - 17, ey - 17, 4, 17); g.fillRect(ex + 13, ey - 17, 4, 17);
    g.fillStyle(0xffffff); g.fillRect(ex - 17, ey - 11, 4, 4); g.fillRect(ex + 13, ey - 11, 4, 4);
    g.lineStyle(2, 0x5a3418); g.lineBetween(ex + 12, ey - 34, ex + 12, ey - 52);
    g.fillStyle(0xff4a3a); g.fillTriangle(ex + 13, ey - 52, ex + 26, ey - 47, ex + 13, ey - 42);
}
/** Cells whose painted state differs from the engine's tiles (with the eight neighbours, whose caps depend on them). */
export function dirtyCells(painted: readonly string[], tiles: readonly (readonly Tile[])[]): [number, number][] {
    const out = new Set<number>(), rows = tiles.length, cols = tiles[0]?.length ?? 0;
    for (let y = 0; y < rows; y++) {
        const row = tiles[y] ?? [], was = painted[y] ?? '';
        for (let x = 0; x < cols; x++) {
            if ((row[x] ?? ' ') === (was[x] ?? ' ')) continue;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) out.add(ny * cols + nx);
            }
        }
    }
    return [...out].sort((a, b) => a - b).map(i => [i % cols, Math.floor(i / cols)]);
}
/** One rectangle covering every dirty cell: a render texture honours a single clear before its next draw,
 * so the scene clears this box once and repaints every cell inside it. */
export function repaintBox(painted: readonly string[], tiles: readonly (readonly Tile[])[]): { x0: number; y0: number; x1: number; y1: number } | null {
    const cells = dirtyCells(painted, tiles);
    if (!cells.length) return null;
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
/** Role props drawn on a kid: pickaxe, plank, raised hands, umbrella, climbing claws. Few primitives each. */
export function roleProp(g: G, state: string, float: boolean, falling: boolean, x: number, y: number, dir: number, t: number): void {
    const swing = Math.sin(t / 90) * .6;
    if (state === 'dig' || state === 'bash') {
        const a = (state === 'dig' ? Math.PI / 2 : 0) + swing * dir, hx = x + dir * 6, hy = y + 4;
        g.lineStyle(2, 0x7a4a24); g.lineBetween(hx, hy, hx + Math.cos(a) * 9 * dir, hy + Math.sin(a) * 9);
        g.fillStyle(0xc8ccd4); g.fillTriangle(hx + Math.cos(a) * 9 * dir - 4, hy + Math.sin(a) * 9 - 2, hx + Math.cos(a) * 9 * dir + 4, hy + Math.sin(a) * 9 - 2, hx + Math.cos(a) * 9 * dir, hy + Math.sin(a) * 9 + 3);
    } else if (state === 'build') {
        g.fillStyle(0xc88a46); g.fillRect(x + dir * 4 - 6, y + 2, 12, 4);
    } else if (state === 'block') {
        g.fillStyle(0xffffff, .9); g.fillCircle(x - 9, y - 2, 3); g.fillCircle(x + 9, y - 2, 3);
    } else if (state === 'climb') {
        g.lineStyle(2, 0xd09a56); g.lineBetween(x + dir * 8, y - 8, x + dir * 8, y + 8);
    }
    if (float && falling) {
        // Bamboo umbrella (charter: "Parachute").
        g.fillStyle(0xf2c45a); g.fillEllipse(x, y - 16, 26, 12);
        g.fillStyle(0xe0943a); g.fillRect(x - 13, y - 16, 26, 2);
        g.lineStyle(1, 0x6a4020); g.lineBetween(x, y - 16, x, y - 2);
    }
}
