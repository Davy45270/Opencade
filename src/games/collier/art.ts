import type Phaser from 'phaser';
import { themes } from './presentation';
type Graphics = Phaser.GameObjects.Graphics;

/** All scenery is built once per universe and retained as a texture. */
export function drawDecor(g: Graphics, universe: number): void {
    const theme = themes[universe] ?? themes[0];
    g.fillStyle(theme.sky);
    g.fillRoundedRect(0, 0, 360, 640, 18);
    if (universe === 0) {
        for (let i = 0; i < 12; i++) {
            g.fillStyle(i % 2 ? theme.accent : theme.light, .85);
            g.fillTriangle(180, -20, i * 36 - 36, 145, i * 36, 145);
        }
        g.fillStyle(0xf997b8, .22);
        g.fillEllipse(180, 460, 350, 160);
        for (const x of [18, 342]) {
            g.fillStyle(0xffedbf, .09);
            g.fillTriangle(x, 130, 80, 520, 280, 520);
        }
    } else if (universe === 1) {
        for (let i = 0; i < 9; i++) {
            const x = i * 47;
            g.lineStyle(7, 0x328467);
            g.lineBetween(x, 0, x + 15, 640);
            g.fillStyle(i % 2 ? 0x53bd73 : 0x8ed478, .65);
            g.fillEllipse(x, 85 + i % 3 * 35, 90, 32);
            g.fillStyle(0xffd65c);
            g.fillEllipse(x + 9, 130, 9, 22);
        }
    } else if (universe === 2) {
        g.lineStyle(3, 0xc4b2ed, .35);
        g.strokeCircle(275, 155, 92);
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6;
            const x = 275 + Math.cos(a) * 92, y = 155 + Math.sin(a) * 92;
            g.lineBetween(275, 155, x, y);
            g.fillStyle(i % 2 ? 0xffd65c : 0xf45eaa);
            g.fillRoundedRect(x - 7, y - 5, 14, 12, 4);
        }
        g.lineBetween(275, 155, 225, 350);
        g.lineBetween(275, 155, 325, 350);
    } else {
        const rainbow = [0xff8ca8, 0xffcf7b, 0xffec98, 0x91e9ba, 0x8bd8fa, 0xc6b0ff];
        rainbow.forEach((color, i) => {
            g.lineStyle(13, color, .65);
            g.strokeCircle(180, 330, 170 - i * 13);
        });
        for (const [x, y] of [[20, 120], [310, 460], [45, 505]]) {
            g.fillStyle(0xffffff, .7);
            g.fillEllipse(x ?? 0, y ?? 0, 110, 40);
        }
    }
    // A shared garland gives every universe a bright upper frame.
    g.lineStyle(2, theme.light, .8);
    g.lineBetween(0, 35, 360, 65);
    for (let i = 0; i < 12; i++) {
        g.fillStyle(i % 2 ? theme.accent : theme.light);
        g.fillTriangle(i * 32, 35 + i * 2.7, i * 32 + 22, 37 + i * 2.7, i * 32 + 10, 57 + i * 2.7);
    }
    g.fillStyle(theme.sky, .32);
    g.fillRoundedRect(8, 150, 344, 400, 24);
}

export function drawMotif(g: Graphics, x: number, y: number, color: number, r: number): void {
    g.fillStyle(0x392549, .9);
    g.lineStyle(Math.max(1, r * .15), 0x392549, .9);
    if (color === 0) {
        g.fillCircle(x - r * .23, y - r * .12, r * .29);
        g.fillCircle(x + r * .23, y - r * .12, r * .29);
        g.fillTriangle(x - r * .5, y, x + r * .5, y, x, y + r * .52);
    } else if (color === 1 || color === 5) {
        const count = color === 1 ? 5 : 6;
        for (let i = 0; i < count; i++) {
            const a = i * Math.PI * 2 / count - Math.PI / 2;
            if (color === 5)
                g.fillCircle(x + Math.cos(a) * r * .3, y + Math.sin(a) * r * .3, r * .22);
            else
                g.fillTriangle(x, y, x + Math.cos(a) * r * .62, y + Math.sin(a) * r * .62, x + Math.cos(a + .7) * r * .23, y + Math.sin(a + .7) * r * .23);
        }
    } else if (color === 2) {
        g.beginPath();
        g.arc(x, y - r * .2, r * .5, .1, Math.PI - .1);
        g.strokePath();
    } else if (color === 3) {
        g.fillEllipse(x, y, r * .65, r * 1.1);
        g.lineStyle(1, 0xffffff, .8);
        g.lineBetween(x - r * .2, y + r * .35, x + r * .2, y - r * .35);
    } else {
        g.fillCircle(x, y + r * .18, r * .32);
        g.fillTriangle(x - r * .32, y + r * .1, x + r * .32, y + r * .1, x, y - r * .6);
    }
}

export function drawBonus(g: Graphics, x: number, y: number, bonus: string): void {
    g.lineStyle(2, 0xffffff);
    g.fillStyle(0xffffff);
    if (bonus === 'slow') {
        g.strokeRect(x - 4, y - 6, 8, 12);
        g.lineBetween(x - 4, y - 5, x + 4, y + 5);
        g.lineBetween(x + 4, y - 5, x - 4, y + 5);
    } else if (bonus === 'reverse') {
        g.lineBetween(x - 5, y, x + 5, y);
        g.lineBetween(x - 5, y, x, y - 5);
        g.lineBetween(x - 5, y, x, y + 5);
    } else if (bonus === 'bomb') {
        g.fillCircle(x, y + 2, 4);
        g.lineBetween(x, y - 2, x + 3, y - 6);
        g.fillCircle(x + 4, y - 6, 1.5);
    } else {
        g.strokeCircle(x, y, 5);
        g.lineBetween(x - 8, y, x + 8, y);
        g.lineBetween(x, y - 8, x, y + 8);
    }
}
