import type Phaser from 'phaser';
import { characters, type CharacterId } from '../../characters/model';
import type { Block, Power } from '../../engines/bombercade/engine';
export const palettes = {
    jungle: [0x093c29, 0x398842, 0xa4c575, 0xc48a45],
    château: [0x202840, 0x555e78, 0xafbcd0, 0xbf8249],
    volcan: [0x390e12, 0x382b34, 0x62505a, 0xa56b49],
    sucré: [0x48284d, 0xd78fb4, 0xffc8e4, 0xd78b53],
} as const;
export type Arena = keyof typeof palettes;
type Graphics = Phaser.GameObjects.Graphics;
export function color(id: CharacterId): number { return Number.parseInt(characters[id].accent.slice(1), 16); }
export function star(g: Graphics, x: number, y: number, r: number, tint: number, alpha = 1): void {
    g.fillStyle(tint, alpha); g.fillPoints(Array.from({ length: 10 }, (_, i) => {
        const a = i * Math.PI / 5 - Math.PI / 2, d = r * (i % 2 ? .46 : 1);
        return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    }), true);
}
export function heart(g: Graphics, x: number, y: number, r: number, tint: number, alpha = 1): void {
    g.fillStyle(tint, alpha); g.fillCircle(x - r * .42, y - r * .25, r * .58); g.fillCircle(x + r * .42, y - r * .25, r * .58);
    g.fillTriangle(x - r, y - r * .1, x + r, y - r * .1, x, y + r);
}
/** Integer avalanche: stable details without rows of repeating motifs. */
export function cellHash(at: number): number {
    let h = Math.imul(at + 1, 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return (h ^ (h >>> 16)) >>> 0;
}
function lavaCrack(g: Graphics, x: number, y: number, hash: number, wall: boolean): void {
    const shapes = [
        [[3, 8], [13, 12], [18, 23], [28, 26]],
        [[5, 24], [12, 17], [10, 9], [24, 4]],
        [[3, 15], [11, 10], [17, 15], [25, 8]],
        [[9, 3], [16, 9], [12, 17], [20, 26]],
    ] as const;
    const shape = shapes[(hash >>> 5) % 4] ?? shapes[0];
    const crack = shape.map(([dx = 0, dy = 0]) => ({ x: x + (hash & 16 ? 30 - dx : dx), y: y + dy * (wall ? .68 : 1) }));
    for (const [width, tint, alpha] of [[7, 0xff4313, .25], [3, 0xff7623, 1], [1, 0xffed9b, 1]] as const) {
        g.lineStyle(width, tint, alpha); g.strokePoints(crack, false);
    }
}
/** Stable cell details: these commands are used only while baking the arena. */
export function tile(g: Graphics, arena: Arena, x: number, y: number, at: number, wall: boolean, edge: boolean): void {
    const col = at % 11, row = Math.floor(at / 11);
    const hash = cellHash(at), p = palettes[arena], variation = hash % 3;
    g.fillStyle(p[0]); g.fillRect(x, y, 30, 30);
    g.fillStyle(p[1], .83 + variation * .08); g.fillRoundedRect(x + 1, y + 1, 28, 28, 2);
    g.lineStyle(1, 0xffffff, .08); g.lineBetween(x + 3, y + 2, x + 26, y + 2);
    if (!wall) {
        if (arena === 'jungle') {
            if (hash % 4 === 0) {
                const offset = (hash >>> 8) % 5 - 2;
                x += offset; y -= offset;
                g.fillStyle(0xb0ce56, .8); g.fillEllipse(x + 8, y + 22, 8, 3); g.fillEllipse(x + 22, y + 8, 4, 7);
                g.lineStyle(1, 0x80ce50); for (const dx of [-3, 0, 3]) g.lineBetween(x + 19, y + 25, x + 19 + dx, y + 19 - Math.abs(dx));
            }
        } else if (arena === 'château') {
            g.fillStyle(variation === 0 ? 0x7b8498 : 0x646b80, .7); g.fillRect(x + 3, y + 3, 23, 10);
            g.lineStyle(2, p[0], .8); g.lineBetween(x + 2, y + 15, x + 28, y + 15); g.lineBetween(x + 10 + (hash >>> 8) % 9, y + 2, x + 10 + (hash >>> 8) % 9, y + 14);
        } else if (arena === 'volcan') {
            if (hash % 13 === 0) {
                g.fillStyle(0xb52e17); g.fillRoundedRect(x + 3, y + 3, 24, 24, 3);
                g.fillStyle(0xff7422); g.fillTriangle(x + 4, y + 6, x + 25, y + 12, x + 15, y + 27);
            }
            if (hash % 3 === 0) lavaCrack(g, x, y, hash, false);
        } else {
            g.fillStyle((col + row) % 2 ? 0xffd7e9 : 0xf6b1d8, .6); g.fillRect(x + 2, y + 2, 26, 26);
            const sprinkle = (hash >>> 8) % 5;
            g.fillStyle(0xfff3db, .8); g.fillCircle(x + 5 + sprinkle, y + 22, 1); g.fillCircle(x + 23, y + 6 + sprinkle, 1);
        }
        return;
    }
    g.fillStyle(0x080e1b, .16); g.fillRoundedRect(x + 1, y + 9, 29, 24, 5);
    g.fillStyle(0x080e1b, .3); g.fillRoundedRect(x + 3, y + 8, 27, 24, 4);
    g.fillStyle(p[0]); g.fillRoundedRect(x + 1, y + 2, 27, 26, 4);
    g.fillStyle(p[2]); g.fillRoundedRect(x + 1, y + 1, 27, 19, 4);
    g.fillStyle(0xffffff, .23); g.fillRoundedRect(x + 3, y + 2, 23, 4, 2);
    g.lineStyle(1, p[0], .55); g.lineBetween(x + 3, y + 21, x + 26, y + 21);
    if (arena === 'jungle') {
        g.lineBetween(x + 10 + variation * 3, y + 6, x + 8 + variation * 3, y + 19); g.fillStyle(0x446b39); g.fillEllipse(x + 6, y + 7, 10, 5); g.fillEllipse(x + 23, y + 19, 9, 4);
        if (edge) { for (const dx of [4, 15, 25]) {
            g.fillStyle(dx === 15 ? 0x248b38 : 0x65b63c); g.fillEllipse(x + dx, y + 4, 13, 7); g.fillEllipse(x + dx - 2, y + 9, 7, 11);
        } }
    } else if (arena === 'château') {
        g.lineBetween(x + 2, y + 12, x + 27, y + 12); g.lineBetween(x + 15, y + 12, x + 15, y + 21);
        if (edge) { g.fillStyle(p[0]); g.fillRect(x + 10, y, 8, 5); }
    } else if (arena === 'volcan') {
        g.fillStyle(0x32232b); g.fillRect(x + 3, y + 21, 23, 6);
        g.lineStyle(3, 0xd34c23, .8); g.lineBetween(x + 4, y + 22, x + 24, y + 22);
        if (hash % 3 === 0) lavaCrack(g, x, y, hash, true);
    } else {
        const kind = (hash >>> 4) % 3;
        if (kind === 0) {
            g.lineStyle(4, 0xf065a5); g.lineBetween(x + 4, y + 16, x + 16, y + 4); g.lineBetween(x + 14, y + 17, x + 25, y + 6);
        } else if (kind === 1) {
            g.fillStyle(0xc65bd4); g.fillTriangle(x + 4, y + 11, x + 15, y + 2, x + 25, y + 13);
            g.fillStyle(0xfff3b1); g.fillTriangle(x + 4, y + 11, x + 15, y + 19, x + 25, y + 13);
        } else {
            g.fillStyle(0xfff0ed); g.fillRoundedRect(x + 4, y + 3, 21, 16, 7);
            g.fillStyle(0xf5aad8); g.fillEllipse(x + 15, y + 6, 15, 5);
        }
        g.lineStyle(1, 0xffffff, .7); g.lineBetween(x + 4, y + 3, x + 23, y + 3);
    }
}
export function crate(g: Graphics, arena: Arena, block: Block): void {
    const gold = block.kind === 'gold', ice = block.kind === 'ice';
    g.fillStyle(0x0b101c, .18); g.fillRoundedRect(3, 8, 27, 24, 4);
    g.fillStyle(0x0b101c, .4); g.fillRoundedRect(4, 6, 25, 24, 3);
    g.fillStyle(gold ? 0xa76118 : ice ? 0x3588a6 : 0x754421); g.fillRoundedRect(2, 2, 25, 25, 3);
    g.fillStyle(gold ? 0xffd65f : ice ? 0xb2eff5 : palettes[arena][3]); g.fillRect(4, 3, 21, 16);
    g.fillStyle(gold ? 0xffef9a : ice ? 0xe6ffff : 0xf0c888); g.fillRect(4, 3, 21, 3);
    g.lineStyle(1, gold ? 0xa86b24 : ice ? 0x5aaccc : 0x83502d);
    for (const dx of [10, 18]) g.lineBetween(dx, 5, dx, 23);
    g.lineStyle(3, ice ? 0xedffff : gold ? 0xffec95 : 0xe5b979); g.strokeRect(4, 4, 21, 21);
    g.lineBetween(6, 6, 23, 23); g.lineBetween(23, 6, 6, 23);
    if (block.kind === 'reinforced') { g.lineStyle(block.hp === 2 ? 4 : 2, 0x647080); g.lineBetween(3, 9, 26, 9); g.lineBetween(3, 21, 26, 21); }
    g.fillStyle(ice ? 0xffffff : 0x493b32); for (const dx of [5, 24]) for (const dy of [5, 24]) g.fillCircle(dx, dy, 1);
    if (gold) star(g, 15, 15, 6, 0xfffaac);
}
/** David's crate (06/11), drawn in place of the vector crate: 64 × 59 WebP, shown 26 × 24 on its 30 px cell. */
export const DRAWN_CRATE = { w: 64, h: 59 } as const;
export const CRATE_TEXTURE = 'bombercade-crate';
/** Bakes one destructible block from David's crate on a 32 × 34 canvas: the same footprint and shadow as the vector
 *  crate, and the same cues for the special kinds (ice tinted pale blue, gold tinted gold with its star, reinforced
 *  crossed by steel bands, thicker while it has two hits left). */
export function drawnCrate(ctx: CanvasRenderingContext2D, source: CanvasImageSource, block: Block): void {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 2, 2, 26, 24);
    const tint = block.kind === 'ice' ? 'rgba(160,232,255,.55)' : block.kind === 'gold' ? 'rgba(255,208,64,.5)' : '';
    if (tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = tint; ctx.fillRect(0, 0, 32, 34); }
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'rgba(11,16,28,.4)'; ctx.beginPath(); ctx.roundRect(4, 6, 25, 24, 3); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (block.kind === 'reinforced') {
        ctx.strokeStyle = '#647080'; ctx.lineWidth = block.hp === 2 ? 4 : 2;
        ctx.beginPath(); ctx.moveTo(3, 9); ctx.lineTo(27, 9); ctx.moveTo(3, 21); ctx.lineTo(27, 21); ctx.stroke();
    }
    if (block.kind === 'gold') {
        ctx.fillStyle = '#fffaac'; ctx.strokeStyle = '#a86b24'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, d = 6 * (i % 2 ? .46 : 1); ctx.lineTo(15 + Math.cos(a) * d, 14 + Math.sin(a) * d); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
}
/** One burning cell: a tinted glow, then arms joined to its burning neighbours [right, left, down, up].
 * `time` already carries the cell's flicker phase (engine time + cell × 65). */
export function fireCell(g: Graphics, id: CharacterId, x: number, y: number, neighbors: readonly boolean[], time: number, alpha: number): void {
    const tint = id === 'panda' ? 0xc6ef58 : id === 'pandaroux' ? 0xff9c3d : id === 'dragon' ? 0xff5b27 : id === 'singe' ? 0xff66c9 : 0x9c8bff;
    g.fillStyle(tint, .22 * alpha); g.fillRoundedRect(x - 15, y - 15, 30, 30, 9);
    for (const [axis, dx, dy] of [[0, 1, 0], [2, 0, 1]] as const) {
        const positive = neighbors[axis], negative = neighbors[axis + 1];
        if (!positive && !negative) continue;
        const flicker = Math.sin(time / 65) * 1.2;
        // Shared boundaries have identical width; only exposed tips taper.
        const shape = [[-15, negative ? -6 : 0], [-9, -8 - flicker], [0, -6], [9, -8 + flicker], [15, positive ? -6 : 0],
            [15, positive ? 6 : 0], [9, 8 + flicker], [0, 6], [-9, 8 - flicker], [-15, negative ? 6 : 0]];
        const points = shape.map(([along = 0, across = 0]) => ({ x: x + dx * along - dy * across, y: y + dy * along + dx * across }));
        g.fillStyle(0xff8a26, alpha); g.fillPoints(points, true);
        const core = [[-15, negative ? -2.5 : 0], [0, -3], [15, positive ? -2.5 : 0], [15, positive ? 2.5 : 0], [0, 3], [-15, negative ? 2.5 : 0]];
        g.fillStyle(0xfff4b0, alpha); g.fillPoints(core.map(([along = 0, across = 0]) => ({ x: x + dx * along - dy * across, y: y + dy * along + dx * across })), true);
    }
}
/** Each bomb keeps a distinct silhouette even without its color. */
export function drawBomb(g: Graphics, id: CharacterId, x: number, y: number, r: number, phase: number): void {
    g.fillStyle(0x08101d, .55); g.fillEllipse(x + 1, y + r, r * 2.5, r * .8);
    const tint = id === 'panda' ? 0x88b948 : id === 'pandaroux' ? 0xee8031 : id === 'dragon' ? 0x432d3c : id === 'singe' ? 0xf04cb6 : 0x6556cf;
    g.fillStyle(tint);
    if (id === 'panda') {
        g.fillRoundedRect(x - r, y - r, r * 2, r * 2, 4);
        g.lineStyle(2, 0xe1d77e); for (const dy of [-.6, .6]) g.lineBetween(x - r, y + r * dy, x + r, y + r * dy);
        g.lineStyle(1, 0x405c26); for (const dx of [-.35, .35]) g.lineBetween(x + r * dx, y - r, x + r * dx, y + r);
    } else if (id === 'singe') { heart(g, x, y, r, tint); heart(g, x, y - 1, r * .6, 0xffaadf); }
    else if (id === 'dragon') {
        g.fillEllipse(x, y, r * 1.7, r * 2.2); g.lineStyle(2, 0xffa23f);
        g.lineBetween(x - r * .6, y - r * .5, x, y); g.lineBetween(x, y, x - r * .3, y + r * .7); g.lineBetween(x, y, x + r * .6, y - r * .2);
    } else {
        g.fillCircle(x, y, r); g.fillStyle(0xffffff, .16); g.fillCircle(x - 1, y - 2, r * .8);
        if (id === 'licorne') star(g, x, y, r * .8, 0xffe57b);
        else {
            g.fillStyle(0xffd56a);
            g.fillPoints([[-.1, .7], [-.7, .4], [-.55, .1], [-.9, -.25], [-.4, -.3], [-.45, -.7], [-.15, -.55], [0, -.95], [.2, -.5], [.5, -.7], [.45, -.25], [.9, -.2], [.6, .2], [.7, .4], [.1, .55]].map(([dx = 0, dy = 0]) => ({ x: x + dx * r, y: y + dy * r })), true);
            g.lineStyle(1, 0xfff0ab); g.lineBetween(x, y + r * .8, x, y - r * .4); }
    }
    g.fillStyle(0xffffff, .65); g.fillEllipse(x - r * .35, y - r * .5, r * .5, r * .3);
    g.fillStyle(0x433c30); g.fillRoundedRect(x - 3, y - r - 2, 6, 4, 1);
    g.lineStyle(2, 0xffe4b0); g.lineBetween(x, y - r - 1, x + 3, y - r - 5);
    star(g, x + 3, y - r - 5, 3 + Math.sin(phase / 65), 0xffc653);
    g.fillStyle(0xffffff); g.fillCircle(x + 3, y - r - 5, 1.2);
}
export function powerIcon(g: Graphics, kind: Power, x: number, y: number, r = 8): void {
    g.lineStyle(2, 0xffffff);
    if (kind === 'range') {
        g.lineBetween(x - r, y, x + r, y); g.lineBetween(x, y - r, x, y + r);
        for (const sign of [-1, 1]) { g.lineBetween(x + sign * r, y, x + sign * (r - 3), y - 3); g.lineBetween(x, y + sign * r, x + 3, y + sign * (r - 3)); }
    } else if (kind === 'capacity') {
        g.fillStyle(0x172c46); g.fillCircle(x - 2, y + 1, r * .7); g.lineBetween(x - 2, y - 4, x, y - 8);
        g.lineBetween(x + 4, y + 2, x + 9, y + 2); g.lineBetween(x + 6.5, y - 1, x + 6.5, y + 5);
    } else if (kind === 'speed') {
        g.fillStyle(0xffffff); g.fillTriangle(x - r, y + r * .7, x + r, y - r, x + r * .3, y + r * .7);
        g.lineStyle(1, 0x3176a6); g.lineBetween(x - 2, y + 3, x + 5, y - 3);
    } else star(g, x, y, r, 0xffffff);
}
