import type Phaser from 'phaser';
type G = Phaser.GameObjects.Graphics;
/** Drawing shared by the scene and the catalogue thumbnail (one source, no drift). */
export const CELL = 30, TOP = 40, MINE_GROUND = 0x15110d;
/** One mine tile `t` whose top left is (px, py): earth, rock, brick, boulder, diamond, exit,
 * sorter, nugget, dynamite, water or moss. `turns` animates the exit glint and the water. */
export function mineTile(g: G, t: string, px: number, py: number, open: boolean, turns: number, sorting: boolean): void {
    const cx = px + CELL / 2, cy = py + CELL / 2;
    if (t === '.') { g.fillStyle(0x6b4a2b); g.fillRect(px, py, CELL, CELL); g.fillStyle(0x7d5934); g.fillCircle(px + 8, py + 9, 2); g.fillCircle(px + 21, py + 20, 2); }
    else if (t === '#') { g.fillStyle(0x3b3f4a); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0x555a68); g.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2); }
    else if (t === '=') { g.fillStyle(0x8a3f2c); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0x5c2a1d); g.lineBetween(px, py + 15, px + CELL, py + 15); g.lineBetween(px + 15, py, px + 15, py + 15); g.lineBetween(px + 7, py + 15, px + 7, py + CELL); }
    else if (t === 'o') { g.fillStyle(0x9a948a); g.fillCircle(cx, cy, 13); g.fillStyle(0xc2bcb1); g.fillCircle(cx - 4, cy - 4, 4); }
    else if (t === '*') { g.fillStyle(0xffd34d); g.fillTriangle(cx, cy - 12, cx - 11, cy, cx + 11, cy); g.fillStyle(0xf2a900); g.fillTriangle(cx, cy + 12, cx - 11, cy, cx + 11, cy); g.fillStyle(0xffffff, 0.7); g.fillCircle(cx - 3, cy - 4, 2); }
    else if (t === 'E') { g.fillStyle(open ? 0x64e4cc : 0x2c3a44); g.fillRoundedRect(px + 3, py + 3, CELL - 6, CELL - 6, 5); if (open) { g.lineStyle(2, 0xffffff, 0.5 + 0.5 * Math.sin(turns)); g.strokeRoundedRect(px + 3, py + 3, CELL - 6, CELL - 6, 5); } }
    else if (t === 'm') { g.fillStyle(sorting ? 0x7b5cff : 0x4a3d7a); g.fillRect(px, py, CELL, CELL); g.lineStyle(1, 0xd8ccff, sorting ? 0.9 : 0.3); g.lineBetween(px + 4, py + 4, px + 26, py + 26); g.lineBetween(px + 26, py + 4, px + 4, py + 26); }
    else if (t === 'g') { g.fillStyle(0xffe680); g.fillCircle(cx, cy, 13); g.fillStyle(0xf2a900); g.fillCircle(cx + 3, cy + 3, 8); g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - 5, cy - 5, 3); }
    else if (t === 'x') { g.fillStyle(0xc0392b); g.fillRoundedRect(px + 6, py + 4, 18, 22, 4); g.lineStyle(2, 0xffd34d); g.lineBetween(cx, py + 4, cx + 4, py); g.fillStyle(0xffffff); g.fillRect(px + 8, cy - 2, 14, 4); }
    else if (t === 'w') { g.fillStyle(0x2f7fd6, 0.85); g.fillRect(px, py, CELL, CELL); g.lineStyle(2, 0x9fd8ff, 0.7); g.lineBetween(px + 4, py + 10 + 2 * Math.sin(turns), px + 26, py + 10 - 2 * Math.sin(turns)); }
    else if (t === 'a') { g.fillStyle(0x3fbf5a); g.fillCircle(cx - 5, cy - 3, 8); g.fillCircle(cx + 6, cy + 2, 8); g.fillCircle(cx - 1, cy + 7, 6); }
}
/** Mine creature centred on (cx, cy): a firefly square (`f`) or a butterfly. */
export function creature(g: G, kind: string, cx: number, cy: number): void {
    if (kind === 'f') { g.fillStyle(0xff8a3d); g.fillRect(cx - 10, cy - 10, 20, 20); g.fillStyle(0xfff1a8); g.fillRect(cx - 4, cy - 4, 8, 8); }
    else { g.fillStyle(0x7fd4ff); g.fillTriangle(cx, cy, cx - 12, cy - 10, cx - 12, cy + 10); g.fillTriangle(cx, cy, cx + 12, cy - 10, cx + 12, cy + 10); }
}
