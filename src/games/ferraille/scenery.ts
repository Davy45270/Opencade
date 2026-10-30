import type Phaser from 'phaser';

/** Decoration stays behind collisions. Loops cover only the viewport, at four depths. */
export function scenery(g: Phaser.GameObjects.Graphics, level: number, camera: number, ticks: number, reduced: boolean): void {
    const fortress = level === 5, jungle = level === 13, furnace = level === 23;
    if (!fortress && !jungle && !furnace) return;
    const time = reduced ? 0 : ticks / 60;
    for (const [layer, factor] of [.08, .15, .3, .55].entries()) {
        const spacing = 146 - layer * 15, shift = camera * factor % spacing;
        for (let i = -1; i < 5; i++) {
            const x = i * spacing - shift, y = 203 + layer * 37 + i % 2 * 17;
            const alpha = .17 + layer * .1;
            if (jungle) {
                g.fillStyle(0x102a28, alpha); g.fillRoundedRect(x + 34, y + 18, 16, 285, 7);
                g.fillStyle(0x78b547, alpha); for (const side of [-1, 1]) for (let j = 0; j < 3; j++) g.fillEllipse(x + 40 + side * (20 + j * 7), y + j * 24, 65 - j * 8, 26);
                g.lineStyle(3, 0xa3c761, alpha); g.lineBetween(x + 18, y + 5, x + 24, y + 160);
                if (layer === 3) {
                    g.fillStyle(0x75613f, .7); g.fillRoundedRect(x + 25, 389, 74, 75, 5);
                    g.fillStyle(0x384e38); g.fillTriangle(x + 10, 392, x + 61, 360, x + 110, 392);
                    g.fillStyle(0x132b2b); g.fillRoundedRect(x + 51, 415, 20, 49, 4);
                    g.lineStyle(2, 0xa2b46c, .5); g.lineBetween(x + 34, 398, x + 90, 398);
                }
            } else if (fortress) {
                g.fillStyle(0xbca582, alpha); g.fillRoundedRect(x + 8, y, 41, 255, 5); g.fillRoundedRect(x + 94, y, 41, 255, 5);
                g.lineStyle(21, 0xbca582, alpha); g.beginPath(); g.arc(x + 71, y + 68, 44, Math.PI, 0); g.strokePath();
                g.lineStyle(1, 0x4b4241, alpha); for (let j = 0; j < 7; j++) { g.lineBetween(x + 9, y + j * 32, x + 47, y + j * 32); g.lineBetween(x + 95, y + j * 32 + 16, x + 134, y + j * 32 + 16); }
                if (layer === 3) { g.lineStyle(2, 0xceb780, .6); for (let j = 0; j < 9; j++) g.strokeEllipse(x + 52, y + j * 16, 7, 13); }
            } else {
                g.fillStyle(0x584455, alpha); g.fillRoundedRect(x + 12, y, 45, 280, 9);
                g.lineStyle(11, 0x97705c, alpha); g.lineBetween(x, y + 39, x + 117, y + 39); g.lineBetween(x + 104, y + 39, x + 104, y + 135);
                g.lineStyle(3, 0xf3b15b, alpha); for (let j = 0; j < 3; j++) g.strokeCircle(x + 24 + j * 25, y + 39, 7);
                if (layer === 3) { g.fillStyle(0x392f43); g.fillRoundedRect(x + 14, 392, 26, 69, 6); g.fillStyle(0xffb45d, .5); g.fillRoundedRect(x + 20, 404 + Math.sin(time * 2 + i) * 9, 14, 30, 4); }
            }
        }
    }
    if (furnace) {
        g.fillStyle(0xff643b, .35); g.fillRoundedRect(0, 512, 360, 128, 15);
        for (let i = 0; i < 16; i++) { const x = i * 27 - camera * .6 % 27, y = 548 + Math.sin(time * 2 + i) * 9; g.lineStyle(3, 0xffb83d, .3); g.lineBetween(x, y, x + 19, y + 5); }
    }
    for (let i = 0; i < 12; i++) {
        const x = (i * 71 - camera * .8 % 360 + 720) % 360, y = 160 + (i * 89 + time * 11) % 325;
        g.fillStyle(furnace ? 0xffc35c : jungle ? 0xa8e05d : 0xffdfad, .22); g.fillEllipse(x, y, 3 + i % 3, furnace ? 3 : 6);
    }
}
