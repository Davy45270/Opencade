import type Phaser from 'phaser';
import { pistonBox, pistonClosed, type TerrainModule } from '../../engines/ferraille/modules';

/** One shared Graphics; drawings follow physical anchors, with no entity objects. */
export function drawModule(g: Phaser.GameObjects.Graphics, m: TerrainModule, xx: (x: number) => number, yy: (y: number) => number, scale: number, ticks: number, reduced: boolean): void {
    const x = xx(m.x), y = yy(m.y), w = m.w * scale, t = reduced ? 0 : ticks;
    const metal = (a: number, b: number, c: number, d: number): void => {
        g.fillStyle(0x25394b); g.fillRect(a - 2, b - 2, c + 4, d + 4);
        g.fillStyle(0x83a7ac); g.fillRect(a, b, c, d);
        g.fillStyle(0xd4eff1); g.fillRect(a, b, c, 3);
        g.fillStyle(0xeebc54); for (const dx of [5, c - 5]) for (const dy of [6, d - 5]) g.fillCircle(a + dx, b + dy, 2);
    };
    const chain = (cx: number, bottom: number): void => { g.lineStyle(3, 0xffce6e); for (let cy = yy(112); cy < bottom; cy += 12) g.strokeEllipse(cx, cy, 8, 15); };
    switch (m.kind) {
        case 'conveyor': case 'rails':
            metal(x, y - 9, w, 17);
            for (let dx = 9; dx < w; dx += 19) { g.fillStyle(0x26374a); g.fillCircle(x + dx, y, 7); g.lineStyle(2, 0xf5ce71); const a = t / 12; g.lineBetween(x + dx - Math.cos(a) * 5, y - Math.sin(a) * 5, x + dx + Math.cos(a) * 5, y + Math.sin(a) * 5); }
            if (m.kind === 'rails') { g.lineStyle(5, 0xf4cb70); g.lineBetween(x + w / 2, y - 8, x + w, y - 78); for (let i = 0; i < 5; i++) g.lineBetween(x + w / 2 + i * w / 10, y - i * 14, x + w / 2 + i * w / 10 + 12, y - i * 14); }
            break;
        case 'piston': {
            const box = pistonBox(m), bx = xx(box.x), by = yy(box.y), bw = box.w * scale;
            metal(bx, by - 12, bw, 20); metal(bx + bw / 2 - 9, by + 9, 18, pistonClosed(ticks) ? box.h * scale - 26 : 33);
            const py = pistonClosed(ticks) ? y - 25 : by + 40;
            metal(bx, py, bw, 22); g.fillStyle(0xf9bd3d); g.fillRect(bx, py + 4, bw, 11);
            g.lineStyle(5, 0x3a3940); for (let dx = 8; dx < bw; dx += 23) g.lineBetween(bx + dx, py + 5, bx + dx + 10, py + 15);
            break;
        }
        case 'bridge':
            g.lineStyle(3, 0xc7a474); g.lineBetween(x, y - 33, x + w, y - 33);
            for (let i = 0; i < 10; i++) { const bx = x + i * w / 10, fall = m.value && i > 2 && i < 8 ? 38 + i % 3 * 17 : 0; g.fillStyle(i % 2 ? 0xc28343 : 0xf1b969); g.fillRect(bx, y - 7 + fall, w / 10 - 2, 11); g.fillStyle(0x69462d); g.fillRect(bx + 4, y - 5 + fall, 3, 5); if (i % 3 === 0) { g.lineStyle(2, 0xd5ba86); g.lineBetween(bx, y - 33, bx, y); } }
            g.lineStyle(2, 0x573e33); g.lineBetween(x + w / 2, y - 7, x + w / 2 - 6, y); break;
        case 'lift': case 'chain':
            for (const cx of [x + 12, x + w - 12]) chain(cx, y - 9);
            metal(x + 3, y - 75, 9, 75); metal(x + w - 12, y - 75, 9, 75); metal(x, y - 7, w, 14); metal(x, y - 82, w, 12);
            g.lineStyle(2, 0xffd361); g.lineBetween(x + 12, y - 38, x + w - 12, y - 38); break;
        case 'gate': case 'secret':
            metal(x + w / 2 - 12, y - 122, w / 2 + 12, 16);
            if (m.value < (m.kind === 'gate' ? 18 : 30)) for (let i = 0; i < 6; i++) { g.fillStyle(m.kind === 'gate' ? 0xc99c55 : 0xa7a6b7); g.fillRect(x + w / 2, y - 105 + i * 17, w / 2 - 4, 15); g.lineStyle(2, 0x535867); g.lineBetween(x + w / 2 + i % 2 * 23, y - 105 + i * 17, x + w / 2 + 15, y - 90 + i * 17); }
            metal(x + 4, y - 68, 24, 32); g.fillStyle(m.value ? 0x83ef76 : 0xff6346); g.fillCircle(x + 16, y - 52, 8); break;
        case 'crate': {
            const cx = xx(m.x + 24 + m.value); g.fillStyle(0x8e4f2d); g.fillRect(cx, y - 52, 52, 52); g.fillStyle(0xe6a14c); g.fillRect(cx + 4, y - 48, 44, 44); g.lineStyle(5, 0xffd183); g.strokeRect(cx + 4, y - 48, 44, 44); g.lineBetween(cx + 4, y - 48, cx + 48, y - 4); g.lineBetween(cx + 48, y - 48, cx + 4, y - 4); break;
        }
        case 'tower': case 'hut': {
            const height = m.kind === 'tower' ? 175 : 92;
            g.fillStyle(0xa97236); g.fillRect(x + 20, y - height, w - 40, height);
            g.lineStyle(4, 0xf2c371); for (let j = 16; j < height; j += 22) g.lineBetween(x + 20, y - j, x + w - 20, y - j);
            g.fillStyle(0x334e3b); g.fillTriangle(x + 8, y - height, x + w / 2, y - height - 35, x + w - 8, y - height);
            g.fillStyle(0x293448); g.fillRect(x + w / 2 - 20, y - 63, 40, 63);
            if (m.kind === 'tower') { g.lineStyle(4, 0xffcf71); for (let j = 15; j < height; j += 19) g.lineBetween(x + 25, y - j, x + 47, y - j); }
            break;
        }
        case 'spotlight':
            metal(x + w / 2, y - 140, 9, 140); g.fillStyle(0xffee9a, m.value ? .38 : .16); g.fillTriangle(x + w / 2, y - 131, x, y, x + w, y); metal(x + w / 2 - 15, y - 145, 40, 24); g.fillStyle(0xffed96); g.fillCircle(x + w / 2 - 12, y - 133, 10); break;
        case 'lava':
            metal(x, y - 6, w, 12);
            g.fillStyle(0xf45027); g.fillRect(x, yy(296 - m.value), w, (24 + m.value) * scale);
            g.lineStyle(5, 0xffe45b); for (let i = 0; i < 9; i++) g.strokeCircle(x + i * w / 8, yy(296 - m.value) + Math.sin(t / 12 + i) * 5, 10); break;
        case 'wind':
            metal(x + 8, y - 75, 12, 75); g.fillStyle(0x294b60); g.fillCircle(x + 14, y - 91, 26); g.lineStyle(5, 0xb2e6e6); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t / 18; g.lineBetween(x + 14, y - 91, x + 14 + Math.cos(a) * 21, y - 91 + Math.sin(a) * 21); } g.lineStyle(2, 0xe6f8ed); for (let i = 0; i < 4; i++) g.lineBetween(x + 50 + t % 16, y - 88 + i * 17, x + w - 6, y - 94 + i * 17); break;
        case 'tunnel':
            metal(x, y - 74, w, 24); metal(x, y - 50, 16, 13); metal(x + w - 16, y - 50, 16, 13); g.lineStyle(4, 0xf5bd51); for (let i = 10; i < w; i += 28) g.lineBetween(x + i, y - 73, x + i + 12, y - 53); break;
        case 'spring':
            metal(x + 12, y - 8, w - 24, 12); g.lineStyle(4, 0xd8e6df); for (let i = 0; i < 5; i++) g.lineBetween(x + w / 2 - 20 * (i % 2 ? -1 : 1), y - 12 - i * 7, x + w / 2 + 20 * (i % 2 ? -1 : 1), y - 19 - i * 7); metal(x + 12, y - 51, w - 24, 12); break;
    }
}
