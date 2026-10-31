import type Phaser from 'phaser';

/** Three opaque, tiled depths. Coordinates are viewport pixels, never collision data. */
export function scenery(g: Phaser.GameObjects.Graphics, level: number, camera: number, ticks: number, reduced: boolean, theme = 'factory', part = -1): void {
    const jungle = level === 13 || theme === 'jungle', fortress = level === 5 || theme === 'desert';
    const furnace = level === 23, night = theme === 'night';
    const t = reduced ? 0 : ticks;
    if (part < 0 || part === 0) {
    g.fillStyle(jungle ? 0x62cde2 : fortress ? 0xffce82 : night ? 0x304c99 : 0x65aae7); g.fillRect(0, 112, 360, 528);
    g.fillStyle(night ? 0xe4ebf5 : 0xffec9b); g.fillCircle(285, 158, 28);
    if (night) for (let i = 0; i < 24; i++) { g.fillStyle(0xe2f3ff); g.fillCircle((i * 47) % 360, 120 + i * 19 % 91, 1.5); }
    }
    for (let layer = 0; layer < 3; layer++) {
        if (part >= 0 && part !== layer + 1) continue;
        const spacing = 104 - layer * 12, shift = camera * ([.15, .3, .55][layer] ?? .55) % spacing;
        for (let i = -1; i < 6; i++) {
            const x = i * spacing - shift, y = 184 + layer * 83 + (i % 2) * 22;
            if (jungle) {
                g.fillStyle(([0x297e75, 0x398b43, 0x8a672f][layer] ?? 0x8a672f)); g.fillRect(x + 28, y, 18, 456);
                for (let j = 0; j < 6; j++) {
                    g.fillStyle(([0x409d76, 0x69bc38, 0xafd545][layer] ?? 0x8a672f)); g.fillEllipse(x + 32, y + j * 43, 112, 49);
                    g.fillStyle(0xbedf65); g.fillEllipse(x + 14, y + j * 43 - 9, 36, 8);
                }
                if (layer === 2) {
                    g.fillStyle(0xb77a37); g.fillRect(x, 433, 85, 103);
                    g.fillStyle(0xeac369); for (let j = 0; j < 5; j++) g.fillRect(x + 3, 438 + j * 18, 79, 3);
                    g.fillStyle(0x394e32); g.fillTriangle(x - 9, 434, x + 43, 397, x + 94, 434);
                    g.fillStyle(0x193d3c); g.fillRect(x + 30, 476, 24, 60);
                }
            } else if (fortress) {
                g.fillStyle(([0xbd754e, 0xd7945b, 0xf5bd75][layer] ?? 0x8a672f)); g.fillRect(x, y, 90, 456);
                g.fillStyle(0x6c4140); g.fillRoundedRect(x + 17, y + 48, 54, 180, 27);
                g.lineStyle(3, 0xffd894); for (let j = 0; j < 8; j++) g.lineBetween(x, y + j * 33, x + 90, y + j * 33);
                g.fillStyle(0x63402f); g.fillRoundedRect(x + 22, 458, 45, 80, 20);
                g.lineStyle(3, 0xeaa94b); for (let j = 0; j < 4; j++) g.lineBetween(x + 26 + j * 11, 482, x + 26 + j * 11, 535);
                g.fillStyle(0xffdf64); g.fillCircle(x + 57, 510, 3);
            } else {
                g.fillStyle(([0x6382a0, 0x48657e, 0x354d65][layer] ?? 0x8a672f)); g.fillRect(x, y, 81, 456);
                g.fillStyle(0x263e59); g.fillRect(x + 16, y - 42, 23, 44);
                for (let j = 0; j < 7; j++) {
                    g.fillStyle(j % 2 ? 0xffbe55 : 0x7edbec); g.fillRect(x + 12, y + 20 + j * 39, 15, 22); g.fillRect(x + 48, y + 20 + j * 39, 15, 22);
                }
                g.lineStyle(12, 0xc18b61); g.lineBetween(x + 5, y + 43, x + 78, y + 43);
                g.lineStyle(3, 0xffdb98); for (let j = 0; j < 4; j++) g.strokeCircle(x + 12 + j * 19, y + 43, 7);
                if (layer === 2) {
                    g.fillStyle(0x8faeb7); g.fillRect(x + 58, 387, 12, 95);
                    if (part < 0) { g.fillStyle(0xe9c45f); g.fillRect(x + 48, 475 + Math.sin(t / 24 + i) * 5, 32, 15); }
                }
            }
        }
    }
    if (part < 0 || part === 4) {
    if (furnace) {
        g.fillStyle(0xef462b); g.fillRect(0, 490, 360, 58);
        if (part < 0) { g.lineStyle(5, 0xffdf43); for (let i = 0; i < 14; i++) g.lineBetween(i * 29, 501 + Math.sin(t / 18 + i) * 6, i * 29 + 22, 510); }
    }
    // A burning machine in the middle distance: sparks, hot core and smoke.
    g.fillStyle(0x5d656c); g.fillCircle(237, 320, 17); g.fillCircle(250, 301, 23);
    if (part < 0) { g.fillStyle(0xf7702d); g.fillTriangle(215, 370, 236, 323 - t % 8, 260, 370); }
    if (part < 0) { g.fillStyle(0xffdb55); g.fillTriangle(224, 370, 239, 340, 251, 370); }
    g.lineStyle(3, 0xffdf7d); for (let i = 0; i < 5; i++) g.lineBetween(235 + i * 7, 337 - i * 6, 239 + i * 7, 331 - i * 6);
    }
    if (part < 0 || part === 5) {
    // Foreground stores, foliage and hot vents break up every starting platform.
    for (let i = 0; i < 6; i++) {
        const x = i * 76 - camera * .7 % 76;
        g.fillStyle(0x623d2c); g.fillRect(x, 513, 38, 35);
        g.fillStyle(0xe9a346); g.fillRect(x + 3, 516, 32, 29);
        g.lineStyle(3, 0xffd581); g.strokeRect(x + 3, 516, 32, 29); g.lineBetween(x + 3, 516, x + 35, 545); g.lineBetween(x + 35, 516, x + 3, 545);
        if (jungle) { g.fillStyle(0xb3df42); g.fillEllipse(x + 49, 543, 42, 12); g.fillEllipse(x + 49, 531, 13, 36); }
        if (part < 0 && (furnace || !jungle && !fortress)) {
            g.fillStyle(0xff682c); g.fillTriangle(x + 45, 546, x + 57, 502 - (t % 15), x + 69, 546);
            g.fillStyle(0xffe368); g.fillTriangle(x + 50, 546, x + 57, 517, x + 64, 546);
        }
    }
    }

}

export const sceneryThemes = ['factory', 'desert', 'jungle', 'night', 'furnace'] as const;
export function sceneryTheme(level: number, theme: string): string {
    return level === 13 ? 'jungle' : level === 5 ? 'desert' : level === 23 ? 'furnace' : theme;
}

/** Only the small moving parts remain live; none of the opaque depths is redrawn. */
export function sceneryMotion(g: Phaser.GameObjects.Graphics, level: number, camera: number, ticks: number, reduced: boolean, theme: string): void {
    const jungle = level === 13 || theme === 'jungle', fortress = level === 5 || theme === 'desert', t = reduced ? 0 : ticks;
    if (!jungle && !fortress) for (let i = -1; i < 6; i++) {
        const x = i * 80 - camera * .55 % 80;
        g.fillStyle(0xe9c45f); g.fillRect(x + 48, 475 + Math.sin(t / 24 + i) * 5, 32, 15);
    }
    if (level === 23) { g.lineStyle(5, 0xffdf43); for (let i = 0; i < 14; i++) g.lineBetween(i * 29, 501 + Math.sin(t / 18 + i) * 6, i * 29 + 22, 510); }
    g.fillStyle(0xf7702d); g.fillTriangle(215, 370, 236, 323 - t % 8, 260, 370);
    g.fillStyle(0xffdb55); g.fillTriangle(224, 370, 239, 340, 251, 370);
    for (let i = 0; i < 6; i++) if (level === 23 || !jungle && !fortress) {
        const x = i * 76 - camera * .7 % 76;
        g.fillStyle(0xff682c); g.fillTriangle(x + 45, 546, x + 57, 502 - t % 15, x + 69, 546);
        g.fillStyle(0xffe368); g.fillTriangle(x + 50, 546, x + 57, 517, x + 64, 546);
    }
}
