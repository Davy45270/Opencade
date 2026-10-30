import type Phaser from 'phaser';
import { LEVELS } from '../../engines/bubble/levels';
export const bubbleWorlds = ['jungle', 'automne', 'volcan', 'cirque', 'ciel'] as const;
export function bubbleWorld(level: number): typeof bubbleWorlds[number] { return bubbleWorlds[Math.min(4, Math.floor(Math.max(0, level) / 6))] ?? 'ciel'; }
const palettes = {
    jungle: [0x173f39, 0x316e4f, 0x80b65b], automne: [0x483244, 0x86503b, 0xd58b43],
    volcan: [0x352d47, 0x675064, 0xd1794a], cirque: [0x3e2850, 0x7a427f, 0xc57da8], ciel: [0x243e61, 0x426a8d, 0x9ac4d9],
    etoiles: [0x1b1638, 0x3a2f6b, 0xb7a6ff],
} as const;
/** Muted scenery stays behind a dark playfield veil. Fixed loops, no scene objects. */
/** Draws the scenery; returns the catalogue features actually drawn (for the E2E frame log). */
export function drawBubbleBackdrop(g: Phaser.GameObjects.Graphics, level: number): string[] {
    const features: string[] = [];
    // Catalogue boards wear their own scenery; the chapter world stays the same elsewhere.
    const catalogue = LEVELS[level]?.catalogue;
    const world = catalogue === 'P01' ? 'jungle' : catalogue === 'P02' ? 'automne' : catalogue === 'P03' ? 'etoiles' : bubbleWorld(level), [base, mid, light] = palettes[world];
    g.fillStyle(base); g.fillRoundedRect(0, 0, 360, 640, 18);
    for (let i = 0; i < 7; i++) {
        const x = i * 61 - 9, y = 140 + (i % 3) * 63;
        g.fillStyle(mid); g.fillRoundedRect(x, y, 45, 330, 12);
        if (world === 'jungle' || world === 'automne') {
            g.lineStyle(5, light, .35); g.lineBetween(x + 20, 70, x + 10, 470);
            for (let j = 0; j < 4; j++) { g.fillStyle(light, .35); g.fillEllipse(x + (j % 2 ? 2 : 34), 85 + j * 98, 58, 23); }
        } else if (world === 'etoiles') {
            for (let j = 0; j < 5; j++) { g.fillStyle(0xffffff, .35 + (j % 2) * .25); g.fillCircle((x + 31 + j * 47) % 360, 30 + ((i * 97 + j * 61) % 420), 1.6 + (j % 3)); }
            g.fillStyle(light, .28); g.fillTriangle(x + 2, 468, x + 42, 468, x + 22, 380 + (i % 3) * 22);
        } else if (world === 'volcan') {
            g.fillStyle(light, .3); g.fillTriangle(x - 35, 467, x + 75, 467, x + 22, 222 + (i % 2) * 83);
            g.lineStyle(3, light, .3); g.lineBetween(x + 23, 300, x + 11, 421);
        } else if (world === 'cirque') {
            g.fillStyle(light, .27); g.fillTriangle(x - 20, 100, x + 50, 100, x + 14, 164);
            g.lineStyle(2, light, .35); g.lineBetween(x, 80, x + 60, 100);
        } else {
            g.fillStyle(light, .32); g.fillEllipse(x + 20, y, 86, 35);
            g.fillStyle(mid); g.fillTriangle(x - 6, 453, x + 48, 453, x + 21, 397);
            g.fillStyle(light, .4); g.fillRect(x + 11, 350, 20, 56); g.fillTriangle(x + 2, 354, x + 41, 354, x + 21, 325);
        }
    }
    if (catalogue === 'P01') {
        // Tall bamboo stalks with nodes and a steamed bao on the terrace.
        for (const x of [24, 96, 264, 336]) { g.fillStyle(0x7fc65a, .55); g.fillRect(x - 7, 30, 14, 440); for (let y = 90; y < 470; y += 95) { g.fillStyle(0xcfe8a0, .6); g.fillRect(x - 9, y, 18, 4); } }
        features.push('bambous');
        g.fillStyle(0xfff4dc, .9); g.fillEllipse(318, 560, 44, 30); features.push('bao'); g.lineStyle(2, 0xd8c29a, .9); g.lineBetween(318, 547, 318, 560); g.lineBetween(306, 552, 318, 560); g.lineBetween(330, 552, 318, 560);
    } else if (catalogue === 'P02') {
        // Autumn temple roof with two lanterns.
        g.fillStyle(0x9b3b2f, .55); g.fillTriangle(40, 150, 320, 150, 180, 70); g.fillRect(70, 150, 220, 14); features.push('temple');
        g.fillStyle(0x6a2a22, .5); g.fillRect(95, 164, 16, 250); g.fillRect(249, 164, 16, 250);
        for (const x of [60, 300]) { g.fillStyle(0xffc45a, .55); g.fillEllipse(x, 200, 22, 30); }
        features.push('lanternes');
    } else if (catalogue === 'P03') {
        // Constellation links between bright stars.
        const stars: [number, number][] = [[40, 60], [110, 130], [190, 90], [260, 160], [320, 70]];
        g.lineStyle(1.5, 0xd8ccff, .45); for (let i = 1; i < stars.length; i++) { const a = stars[i - 1], b = stars[i]; if (a && b) g.lineBetween(a[0], a[1], b[0], b[1]); }
        for (const [x, y] of stars) { g.fillStyle(0xffffff, .85); g.fillCircle(x, y, 3); }
        features.push('constellation');
    }
    g.fillStyle(0x101d30, .52); g.fillRoundedRect(8, 4, 344, 463, 16);
    g.lineStyle(2, light, .55); g.strokeRoundedRect(2, 2, 356, 636, 16);
    // The launcher rests on a bright stone terrace below the playing field.
    g.fillStyle(mid); g.fillRoundedRect(12, 553, 336, 80, 16);
    g.lineStyle(2, light, .45); g.lineBetween(20, 628, 340, 628);
    return features;
}
