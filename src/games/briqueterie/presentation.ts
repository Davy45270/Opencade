import type { Engine } from '../../engines/briqueterie/engine';
import { actionThemes, liveries } from '../../characters/arcade-art';
import type { CharacterId } from '../../characters/model';
import type Phaser from 'phaser';
import { designs } from '../../engines/briqueterie/levels';
/** A fixed, monotone view projection per authored level; never depends on surviving tiles. */
export function brickView(level: number, focus = 180) {
    const rows = designs[level]?.rows ?? [];
    const first = Math.max(0, rows.findIndex(row => /[^.]/.test(row)));
    const top = 64 + first * 27, bottom = 64 + (rows.length - 1) * 27 + 18;
    const y = (value: number): number => value >= 574 ? value : value < top ? value * 70 / top : value <= bottom ? 70 + (value - top) * 330 / (bottom - top) : 400 + (value - bottom) * (574 - 400) / (574 - bottom);
    // A real horizontal camera zoom, for the wall, easing back to the full-width paddle lane.
    // The eight central columns fit at launch; the lead ball pans the upper view toward either edge.
    const zoom = 1.3, center = Math.max(180 / zoom, Math.min(360 - 180 / zoom, focus));
    const x = (value: number, logicalY = top): number => {
        const blend = Math.max(0, Math.min(1, (574 - logicalY) / (574 - bottom)));
        return value + (180 + (value - center) * zoom - value) * blend;
    };
    return { y, x, zoom, width: 32 * zoom };
}

/** Bright, modelled scenery behind the playable wall, never additional target tiles. */
export function brickGarden(g: Phaser.GameObjects.Graphics, theme: string): void {
    if (theme === 'stars' || theme === 'licorne') {
        for (let i = 0; i < 12; i++) {
            const x = i % 2 ? 342 - i % 3 * 9 : 18 + i % 3 * 9, y = 170 + Math.floor(i / 2) * 77;
            g.fillStyle(i % 2 ? 0x6d5ee5 : 0x1f9bd1, .8);
            g.fillPoints([{x:x-19,y:y+58},{x:x-12,y},{x:x+2,y:y-24},{x:x+18,y:y+12},{x:x+20,y:y+58}], true);
            g.fillStyle(0x89edff, .65); g.fillTriangle(x - 12, y, x + 2, y - 24, x - 2, y + 52);
            g.lineStyle(2, 0xabefff, .8); g.lineBetween(x + 2, y - 24, x - 2, y + 52);
        }
    } else if (theme === 'autumn' || theme === 'pandaroux') {
        for (let i = 0; i < 10; i++) {
            const x = i % 2 ? 350 : 10, y = 80 + Math.floor(i / 2) * 115;
            g.lineStyle(8, 0xc05a32); g.lineBetween(x, y + 90, x + (i % 2 ? -27 : 27), y);
            for (let j = 0; j < 6; j++) {
                const dx = (j % 3 - 1) * 19, dy = Math.floor(j / 3) * 25;
                g.fillStyle(([0xffb52e, 0xed6032, 0xffd95d][j % 3] ?? 0xffd95d), .85); g.fillEllipse(x + dx, y + dy, 41, 27);
                g.lineStyle(1, 0xffefaa, .6); g.lineBetween(x + dx - 12, y + dy, x + dx + 11, y + dy - 5);
            }
        }
    } else if (theme === 'dragon') {
        for (let i = 0; i < 12; i++) {
            const x = i % 2 ? 345 : 15, y = 120 + Math.floor(i / 2) * 88;
            g.fillStyle(0xe54f2d, .75); g.fillTriangle(x - 22, y + 48, x, y - 30, x + 25, y + 48);
            g.fillStyle(0xffc443, .9); g.fillTriangle(x - 11, y + 43, x + 6, y, x + 14, y + 43);
        }
    } else {
        for (let i = 0; i < 8; i++) {
            const x = i % 2 ? 348 : 12, y = 85 + Math.floor(i / 2) * 150;
            g.fillStyle(0x57b535, .85); g.fillRoundedRect(x - 8, y, 16, 170, 7);
            for (let j = 0; j < 4; j++) {
                g.lineStyle(3, 0xe4ed64, .9); g.lineBetween(x - 9, y + j * 40 + 9, x + 9, y + j * 40 + 9);
                g.fillStyle(0x9be347, .8); g.fillEllipse(x + (i % 2 ? -18 : 18), y + j * 40 + 22, 41, 13);
            }
        }
    }
}

const number = (color: string): number => Number.parseInt(color.slice(1), 16);
export function brickBackdrop(g: Phaser.GameObjects.Graphics, id: CharacterId, band: number, clock: number, reduced: boolean, part = -1): void {
    const l = liveries[id], t = reduced ? 0 : clock / 1000;
    if (part < 0 || part === 0) {
    g.fillStyle(number(actionThemes[id].sky)); g.fillRoundedRect(0, 0, 360, 640, 16);
    }
    for (let layer = 0; layer < 3; layer++) {
        if (part >= 0 && part !== layer + 1) continue;
        const offset = t * (layer + 1) * 2;
        g.fillStyle(number(l.body), .05 + layer * .035);
        for (let i = 0; i < 7; i++) {
            const x = ((i * 69 + layer * 23 - offset) % 440 + 440) % 440 - 40, y = 190 + (i * 53 + band * 19) % 190;
            if (id === 'panda' || id === 'pandaroux') {
                g.fillRoundedRect(x, y, 9 + layer * 3, 460, 5);
                for (let j = 0; j < 5; j++) { g.fillEllipse(x - 10, y + j * 47, 37, 12); g.fillEllipse(x + 19, y + j * 47 + 16, 37, 12); }
            } else if (id === 'dragon') { g.fillTriangle(x - 28, 640, x + 34, y, x + 100, 640); }
            else if (id === 'singe') { g.fillEllipse(x, y, 73, 93); g.fillRoundedRect(x - 22, y, 44, 440, 18); }
            else { g.fillTriangle(x - 21, y + 100, x, y, x + 28, y + 100); g.fillRect(x - 14, y + 100, 32, 280); }
        }
    }
    if (part < 0 || part === 4) {
    if (id === 'dragon') { g.fillStyle(0xff723e, .12); g.fillEllipse(180, 628, 440, 80); }
    if (part < 0) brickParticles(g, id, band, clock, reduced);
    }
}

type Brick = Engine['state']['bricks'][number];
const brickPalette: Record<string, number> = { moving: 0x64e4cc, explosive: 0xff785c, regen: 0x8ae873, portal: 0xbfa2ff, angle: 0xffdf78, key: 0xffdf78, locked: 0x6977a8, multi: 0xf080cf, gravity: 0x68d9ff, anchor: 0xeedac0, hanging: 0xd6bc9a };
export function brickKey(b: Brick, source: Brick, catalogue: string, color: number): string {
    const food = catalogue === 'feast' ? Math.floor(source.x / 34 + source.y / 27) % 4 : 0;
    return `brick-body-118-${catalogue}-${b.kind ?? 'plain'}-${String(b.solid)}-${String(b.hp)}-${String(b.kind === 'regen' && Boolean(b.healAt))}-${b.h.toFixed(4)}-${String(color)}-${String(food)}-${String(catalogue === 'stars' ? Math.floor(source.x / 34) % 2 : 0)}`;
}
export function drawBrickBody(g: Phaser.GameObjects.Graphics, b: Brick, source: Brick, catalogue: string, baseColor: number): void {
            g.fillStyle(catalogue === 'feast' && b.kind === 'plain' ? [0xffd65c, 0x7be84b, 0xff9a52, 0xff729a][Math.floor(source.x / 34 + source.y / 27) % 4] ?? 0xffd65c : brickPalette[b.kind ?? ''] ?? (b.solid ? 0x617b96 : b.hp === 2 ? 0xf080ab : baseColor)); g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);
            g.lineStyle(2, 0x162134); g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4);
            g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(b.x + 4, b.y + 3, b.x + b.w - 4, b.y + 3);
            const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            g.lineStyle(2, 0x132438);
            if (!b.solid && b.kind === 'plain') {
                if (catalogue === 'stars' && Math.floor(source.x / 34) % 2) {
                    g.fillStyle(0x79e9ff); g.fillPoints([{x:cx,y:cy-18},{x:cx+13,y:cy},{x:cx,y:cy+18},{x:cx-13,y:cy}], true);
                    g.lineStyle(2, 0xf1ffff); g.lineBetween(cx, cy-18, cx-5, cy); g.lineBetween(cx-5, cy, cx, cy+18); g.lineBetween(cx-13, cy, cx+13, cy);
                }
            }
            if (b.kind === 'portal') { g.lineStyle(4, 0xe8a1ff); g.strokeEllipse(cx, cy, 28, Math.min(36, b.h - 4)); g.lineStyle(2, 0xffffff); g.strokeEllipse(cx + 2, cy, 16, Math.min(26, b.h - 8)); g.strokeEllipse(cx, cy, 14, 10); g.strokeEllipse(cx, cy, 5, 10); }
            if (b.kind === 'angle') g.lineBetween(cx - 14, cy + 12, cx + 14, cy - 12);
            if (b.kind === 'explosive') { g.strokeCircle(cx, cy, 4); g.lineBetween(cx - 7, cy, cx + 7, cy); g.lineBetween(cx, cy - 7, cx, cy + 7); }
            if (b.kind === 'regen') { g.lineBetween(cx - 5, cy, cx + 5, cy); g.lineBetween(cx, cy - 5, cx, cy + 5); if (b.healAt) { g.lineStyle(2, 0xffffff); g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4); } }
            if (b.kind === 'key') { g.strokeCircle(cx - 4, cy, 4); g.lineBetween(cx, cy, cx + 7, cy); g.lineBetween(cx + 6, cy, cx + 6, cy + 4); }
            if (b.kind === 'moving') { g.lineBetween(cx - 8, cy, cx + 8, cy); g.lineBetween(cx - 8, cy, cx - 4, cy - 4); g.lineBetween(cx + 8, cy, cx + 4, cy + 4); }
            if (b.kind === 'multi') for (const dx of [-7, 0, 7]) { g.fillStyle(0x132438); g.fillCircle(cx + dx, cy, 2); }
            if (b.kind === 'anchor' || b.kind === 'hanging') { g.lineBetween(cx, b.y - 8, cx, cy - 3); g.strokeCircle(cx, cy, 3); }
            if (b.kind === 'gravity') { g.lineBetween(cx, cy - 5, cx, cy + 5); g.lineBetween(cx - 4, cy - 1, cx, cy - 5); g.lineBetween(cx + 4, cy - 1, cx, cy - 5); }
            if (b.solid) { g.fillStyle(0xc7e5ff); for (const dx of [-13, 13]) for (const dy of [-b.h / 2 + 6, b.h / 2 - 6]) g.fillCircle(cx + dx, cy + dy, 2); g.lineStyle(2, 0x132438); g.lineBetween(cx - 10, cy - 10, cx + 10, cy + 10); g.lineBetween(cx + 10, cy - 10, cx - 10, cy + 10); }
            else if (!b.kind || b.kind === 'plain' || b.kind === 'regen') for (let i = 0; i < b.hp; i++) { g.fillStyle(0x132438); g.fillCircle(b.x + b.w / 2 + (i - (b.hp - 1) / 2) * 6, b.y + 11, 1.5); }
}

/** Sparse motes stay live; the three broad decorative depths are only moved images. */
export function brickParticles(g: Phaser.GameObjects.Graphics, id: CharacterId, band: number, clock: number, reduced: boolean): void {
    const l = liveries[id], t = reduced ? 0 : clock / 1000;
    for (let i = 0; i < 18; i++) {
        const x = 14 + (i * 73 + band * 13) % 332, y = 65 + ((i * 97 + t * (3 + i % 3)) % 490);
        g.fillStyle(number(l.trim), .12); g.fillCircle(x, y, 1 + i % 3);
    }
}
