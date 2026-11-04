import type Phaser from 'phaser';
import { WIDTH, HEIGHT, type Wisp } from '../../engines/dedale/engine';
import type { Journey } from '../../engines/dedale/labyrinth';
import { displayedWalls } from './board';
/** Drawing shared by the scene and the catalogue thumbnail (one source, no drift). */
export const CELL = 18.4, LEFT = 5.2, TOP = 64;
export function mazeWorld(level: number): number { return level < 10 ? 0 : level < 20 ? 1 : 2; }
/** Sky, path, merged hedge (stone, crystal) walls and HUD veils: painted once per maze. */
export function mazeScenery(ctx: CanvasRenderingContext2D, maze: boolean[], level: number, journey: Journey | undefined, size = CELL, left = LEFT, top = TOP): void {
    // Three worlds after the charter: hedge garden (1-10), autumn stone (11-20), crystal night (21-30).
    const world = mazeWorld(level);
    const themes: readonly (readonly [string, string, string, string, string, string])[] = [
        ['#7fcff0', '#2f7a4a', '#e8d6a0', '#3f9a3f', '#7fd05a', '#22602a'],
        ['#ffc88a', '#7a3a2a', '#e0b884', '#9a8a7a', '#cbbca8', '#5a4a40'],
        ['#1a1440', '#3a2a7a', '#3c3470', '#5a4aa8', '#a89aff', '#2a2060'],
    ];
    const [skyTop, skyBottom, path, wall, wallTop, wallDark] = themes[world] ?? ['#7fcff0', '#2f7a4a', '#e8d6a0', '#3f9a3f', '#7fd05a', '#22602a'];
    ctx.clearRect(0, 0, 360, 640);
    // Sky in sixteen bands (plain fills: the board texture is painted once per state change).
    const channel = (hex: string, i: number): number => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    for (let band = 0; band < 16; band++) {
        const t = band / 15, rgb = [0, 1, 2].map(i => Math.round(channel(skyTop, i) * (1 - t) + channel(skyBottom, i) * t));
        ctx.fillStyle = `rgb(${rgb.join(',')})`; ctx.fillRect(0, band * 40, 360, 41);
    }
    ctx.fillStyle = path; ctx.beginPath(); ctx.roundRect(left - 2, top - 2, WIDTH * size + 4, HEIGHT * size + 4, 8); ctx.fill();
    ctx.fillStyle = '#00000014';
    for (let y = 0; y < HEIGHT; y++) for (let x = (y % 2); x < WIDTH; x += 2) ctx.fillRect(left + x * size, top + y * size, size, size);
    // Walls merge with their wall neighbours into hedges (or stone runs), with a lit top and a shadow.
    const walls = new Set(displayedWalls(maze));
    const block = (color: string, inset: number, dy: number): void => {
        ctx.fillStyle = color;
        for (const at of walls) {
            const x = at % WIDTH, y = Math.floor(at / WIDTH), px = left + x * size, py = top + y * size + dy;
            const l = x > 0 && walls.has(at - 1) ? 0 : inset, r = x < WIDTH - 1 && walls.has(at + 1) ? 0 : inset;
            const u = walls.has(at - WIDTH) ? 0 : inset, d = walls.has(at + WIDTH) ? 0 : inset;
            ctx.fillRect(px + l, py + u, size - l - r, size - u - d);
        }
    };
    block('#00000040', 1.5, 3); block(wallDark, 1.5, 0); block(wall, 2.5, -1.5);
    ctx.fillStyle = wallTop;
    for (const at of walls) if (!walls.has(at - WIDTH)) { const x = at % WIDTH, y = Math.floor(at / WIDTH); ctx.fillRect(left + x * size + 3, top + y * size + 1, size - 6, 3); }
    // Leaf (or grain, or facet) speckles so a run of wall reads as hedge, stone or crystal.
    ctx.fillStyle = wallDark;
    for (const at of walls) { const x = left + (at % WIDTH) * size, y = top + Math.floor(at / WIDTH) * size; ctx.fillRect(x + 4 + (at % 3) * 3, y + 8, 3, 3); ctx.fillRect(x + 11 - (at % 2) * 4, y + 12, 2.5, 2.5); }
    if (world === 0) { ctx.fillStyle = '#ff9cc8'; for (const at of walls) if ((at * 7) % 11 === 0) { ctx.beginPath(); ctx.arc(left + (at % WIDTH + .5) * size, top + (Math.floor(at / WIDTH) + .4) * size, 2, 0, Math.PI * 2); ctx.fill(); } }
    if (journey?.shape === 'mirror') {
        ctx.strokeStyle = '#b9fff055'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(180, top); ctx.lineTo(180, top + HEIGHT * size); ctx.stroke(); ctx.setLineDash([]);
    }
    // Veils keep the HUD lines readable over a bright sky.
    ctx.fillStyle = '#0a141ccc'; ctx.beginPath(); ctx.roundRect(8, 8, 344, top - 14, 10); ctx.fill();
    ctx.beginPath(); ctx.roundRect(8, top + HEIGHT * size + 8, 344, 632 - top - HEIGHT * size - 12, 10); ctx.fill();
}
/** Seed of light at cell `i` (a small dot in the world's colour). */
export function seedLight(ctx: CanvasRenderingContext2D, i: number, level: number, size = CELL, left = LEFT, top = TOP): void {
    ctx.fillStyle = mazeWorld(level) === 2 ? '#ffe8ab' : '#b8561e';
    ctx.beginPath(); ctx.arc(left + (i % WIDTH + 0.5) * size, top + (Math.floor(i / WIDTH) + 0.5) * size, 2, 0, Math.PI * 2); ctx.fill();
}
/** Sun at cell `i`: halo, disc and eight rays. */
export function sunLight(ctx: CanvasRenderingContext2D, i: number, size = CELL, left = LEFT, top = TOP): void {
    const x = left + (i % WIDTH + 0.5) * size, y = top + (Math.floor(i / WIDTH) + 0.5) * size;
    ctx.fillStyle = '#ffcf7130'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ctx.strokeStyle = '#ffdf88'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); }
    ctx.stroke();
}
/** One wisp centred on (x, y): eyes only while returning home, blue when the sun makes it vulnerable. */
export function wispArt(g: Phaser.GameObjects.Graphics, w: Wisp, x: number, y: number, vulnerable: boolean, size = CELL): void {
    const colors = { tracker: 0xff618a, seer: 0xc399ff, roamer: 0xffbf49, shy: 0x48e5de };
    if (w.returning) {
        g.lineStyle(2, 0xffffff); g.strokeEllipse(x, y, size * 0.86, size * 0.65);
        g.fillStyle(0xffffff); g.fillCircle(x - 3, y, 2.5); g.fillCircle(x + 3, y, 2.5);
        g.fillStyle(0x101f2c); g.fillCircle(x - 3, y, 1); g.fillCircle(x + 3, y, 1);
        return;
    }
    g.fillStyle(vulnerable ? 0x3574ff : colors[w.kind]);
    g.fillRoundedRect(x - size * 0.45, y - size * 0.45, size * 0.9, size * 0.9, 5);
    g.lineStyle(1.5, vulnerable ? 0xffffff : 0x101f2c);
    g.strokeRoundedRect(x - size * 0.45, y - size * 0.45, size * 0.9, size * 0.9, 5);
    g.fillStyle(0x101f2c); g.fillCircle(x - 3, y - 1, 2); g.fillCircle(x + 3, y - 1, 2);
    if (vulnerable) { g.lineStyle(2, 0xffffff); g.lineBetween(x - 4, y + 4, x + 4, y + 4); }
    if (w.wait > 0) { g.lineStyle(1, 0xffffff); g.strokeCircle(x, y, size * 0.49); }
}
