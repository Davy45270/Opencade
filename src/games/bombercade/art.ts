import type Phaser from 'phaser';
import { characters, type CharacterId } from '../../characters/model';
export const palettes = {
    jungle: [0x103e39, 0x247653, 0x89c65b, 0xdab164],
    château: [0x282a59, 0x565a91, 0xaabce0, 0xd7a668],
    volcan: [0x3e2039, 0x733d55, 0xf48651, 0xbb7959],
    sucré: [0x54285c, 0x99549c, 0x85d9df, 0xf4b4ce],
} as const;
export function color(id: CharacterId): number { return Number.parseInt(characters[id].accent.slice(1), 16); }
/** Distinct silhouettes, drawn at the bomb's actual cell. */
export function drawBomb(g: Phaser.GameObjects.Graphics, id: CharacterId, x: number, y: number, r: number, phase: number): void {
    g.fillStyle(0x122633); g.fillCircle(x + 2, y + 3, r + 1);
    g.fillStyle(color(id));
    if (id === 'panda') {
        for (let n = -1; n <= 1; n++) { g.fillRoundedRect(x + n * r * .55 - r * .24, y - r, r * .48, r * 2, 3); g.lineStyle(1, 0xd0ed83); g.lineBetween(x + n * r * .55 - r * .2, y, x + n * r * .55 + r * .2, y); }
    } else if (id === 'licorne') {
        const points = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? r * .5 : r; return new PhaserPoint(x + Math.cos(a) * radius, y + Math.sin(a) * radius); });
        g.fillPoints(points, true);
    } else {
        g.fillCircle(x, y, r);
        if (id === 'singe') for (let n = 0; n < 5; n++) { const a = n * Math.PI * 2 / 5; g.fillCircle(x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8, r * .45); }
        g.lineStyle(1.5, 0xffefc0);
        if (id === 'pandaroux') { g.strokeCircle(x, y, r * .65); g.lineBetween(x - r * .7, y + r * .5, x + r * .6, y - r * .5); }
        if (id === 'dragon') { g.fillStyle(0xffdf65); g.fillTriangle(x - r * .5, y + r * .5, x, y - r * .8, x + r * .5, y + r * .5); }
    }
    g.lineStyle(2, 0xffe4b0); g.lineBetween(x, y - r, x + r * .25, y - r * 1.4);
    g.fillStyle(phase % 400 < 200 ? 0xffffff : 0xffad35); g.fillCircle(x + r * .25, y - r * 1.4, 2);
}
// Graphics accepts any point-like object; keep this helper independent of runtime imports.
class PhaserPoint { constructor(public x: number, public y: number) {} }
