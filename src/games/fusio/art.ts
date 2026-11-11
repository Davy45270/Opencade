import type Phaser from 'phaser';
import type { Theme } from '../../engines/fusio/challenges';
type G = Phaser.GameObjects.Graphics;
/**
 * Fusio drawing, shared by the scene, the DOM buttons and the catalogue card (one source, no drift). Style of David's
 * reference sheet: rounded glossy 2D tiles with a soft bevel, warm colours that climb from cream to orange, red,
 * yellow and a crowned purple, large contrasted numbers. Numbers are vector strokes (no font: a wider system font
 * never overflows a tile), and every value also carries its own emblem in the corner, so colour is never the only clue.
 */
export const UI = { violet: 0x6c3fd1, violetDark: 0x3d2391, gold: 0xffc928, green: 0x3fbf4a, red: 0xe5413b, white: 0xffffff, ink: 0x3a2a1e, cream: 0xfff6e8 } as const;
export function mix(a: number, b: number, t: number): number {
    const c = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export const light = (c: number, t: number): number => mix(c, 0xffffff, t);
export const dark = (c: number, t: number): number => mix(c, 0x000000, t);
/** Tile colours by rank (2 = rank 1), from the sheet; beyond 2048 a deep violet. */
const TILE = [0, 0xf3e3cc, 0xf0cc98, 0xf6a24a, 0xf4833a, 0xef6236, 0xe4423a, 0xf7cd4d, 0xf4bf2f, 0xefb01f, 0xe89d12, 0xb43fde, 0x5a3fd0] as const;
export const tileColor = (value: number): number => TILE[Math.min(TILE.length - 1, Math.round(Math.log2(Math.max(2, value))))] ?? 0x5a3fd0;
/** Dark ink on the two pale tiles, white on all the others (contrast ≥ 3:1 on the large strokes). */
export const inkColor = (value: number): number => value <= 4 ? UI.ink : 0xffffff;
export interface Palette { sky: [number, number]; frame: number; board: number; cell: number; wall: number; glow: number; name: string }
/** Board themes of the sheet: Classique (wood), Pastel, Nature, Néon, Espace, Arcade. */
export const THEMES: Record<Theme, Palette> = {
    classique: { sky: [0x8b5fe0, 0x4b2aa6], frame: 0xb9895a, board: 0xcfa577, cell: 0xe8d4b8, wall: 0x7d6a5a, glow: 0xffe9b0, name: 'Classique' },
    pastel: { sky: [0xb7a6f2, 0x7b6fd8], frame: 0x9e8fe6, board: 0xc9c0f4, cell: 0xece8fd, wall: 0x7c74a8, glow: 0xffffff, name: 'Pastel' },
    nature: { sky: [0x4aa65a, 0x1d5c31], frame: 0x7a5a2f, board: 0xa7834d, cell: 0xdcc79b, wall: 0x5f6b55, glow: 0xfff3a6, name: 'Nature' },
    neon: { sky: [0x1b1745, 0x0a0820], frame: 0x2fd3ff, board: 0x1d2a5c, cell: 0x2b3a78, wall: 0x6a7398, glow: 0x7df9ff, name: 'Néon' },
    espace: { sky: [0x2a1d6a, 0x0b0a26], frame: 0x5b45c8, board: 0x3a2f86, cell: 0x5547a8, wall: 0x8a86a8, glow: 0xffe36b, name: 'Espace' },
    arcade: { sky: [0x2c1450, 0x12062a], frame: 0xe04fd8, board: 0x3a1f66, cell: 0x52308a, wall: 0x8c7aa8, glow: 0xffd34f, name: 'Arcade' },
};
export function backdrop(g: G, theme: Theme, width = 360, height = 640): void {
    const t = THEMES[theme];
    for (let i = 0; i < 16; i++) { g.fillStyle(mix(t.sky[0], t.sky[1], i / 15)); g.fillRect(0, i * height / 16, width, height / 16 + 1); }
    const starry = theme === 'neon' || theme === 'espace' || theme === 'arcade';
    for (let i = 0; i < 26; i++) {
        const x = (i * 97 + 31) % width, y = (i * 211 + 17) % height, r = 1 + (i % 3);
        g.fillStyle(starry ? 0xffffff : t.glow, starry ? 0.5 : 0.1); g.fillCircle(x, y, starry ? r * 0.7 : r * 4);
    }
}
/** The board: a thick bevelled frame and the empty cells. */
export function boardFrame(g: G, theme: Theme, x: number, y: number, side: number, size: number, gap: number): void {
    const t = THEMES[theme], r = Math.max(10, side * 0.04);
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(x - 6, y + 2, side + 12, side + 12, r + 4);
    g.fillStyle(dark(t.frame, 0.25)); g.fillRoundedRect(x - 8, y - 8, side + 16, side + 16, r + 6);
    g.fillStyle(t.frame); g.fillRoundedRect(x - 6, y - 6, side + 12, side + 12, r + 4);
    g.fillStyle(light(t.frame, 0.35)); g.fillRoundedRect(x - 2, y - 5, side + 4, 5, 3);
    g.fillStyle(t.board); g.fillRoundedRect(x, y, side, side, r);
    const cell = (side - gap * (size + 1)) / size;
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
        const cx = x + gap + col * (cell + gap), cy = y + gap + row * (cell + gap);
        g.fillStyle(dark(t.cell, 0.08)); g.fillRoundedRect(cx, cy + 2, cell, cell, cell * 0.16);
        g.fillStyle(t.cell); g.fillRoundedRect(cx, cy, cell, cell, cell * 0.16);
    }
}
/** A blocked cell: a grey stone with a cross-hatch, never mistaken for a tile. */
export function wall(g: G, theme: Theme, x: number, y: number, s: number): void {
    const t = THEMES[theme], r = s * 0.16;
    g.fillStyle(dark(t.wall, 0.35)); g.fillRoundedRect(x, y + s * 0.05, s, s * 0.95, r);
    g.fillStyle(t.wall); g.fillRoundedRect(x, y, s, s * 0.92, r);
    g.lineStyle(Math.max(1.5, s * 0.05), dark(t.wall, 0.3), 0.8);
    for (let k = 1; k < 4; k++) { const d = s * k / 4; g.lineBetween(x + d, y + s * 0.1, x + s * 0.1, y + d); g.lineBetween(x + s - d, y + s * 0.82, x + s * 0.9, y + s * 0.9 - d * 0.82); }
    g.fillStyle(light(t.wall, 0.35)); g.fillRoundedRect(x + s * 0.12, y + s * 0.08, s * 0.76, s * 0.12, r * 0.5);
}
// ——— Vector digits (unit box 0.56 × 1, round joints) ———
type Stroke = readonly (readonly [number, number])[];
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): [number, number][] {
    const steps = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 15)), out: [number, number][] = [];
    for (let i = 0; i <= steps; i++) { const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return out;
}
export const DIGITS: Record<string, readonly Stroke[]> = {
    0: [arc(0.28, 0.5, 0.26, 0.48, 0, 360)],
    1: [[[0.08, 0.2], [0.32, 0.02], [0.32, 0.98]], [[0.06, 0.98], [0.54, 0.98]]],
    2: [[...arc(0.28, 0.28, 0.25, 0.26, 200, 382), [0.03, 0.98], [0.55, 0.98]]],
    3: [arc(0.27, 0.26, 0.23, 0.24, 205, 450), arc(0.27, 0.73, 0.26, 0.25, 270, 520)],
    4: [[[0.42, 0.98], [0.42, 0.02], [0.02, 0.68], [0.56, 0.68]]],
    5: [[[0.5, 0.02], [0.1, 0.02], [0.06, 0.45], ...arc(0.27, 0.67, 0.27, 0.31, 245, 485)]],
    6: [[...arc(0.29, 0.69, 0.26, 0.29, 0, 360)], arc(0.58, 0.69, 0.55, 0.67, 245, 180)],
    7: [[[0.02, 0.02], [0.55, 0.02], [0.2, 0.98]]],
    8: [arc(0.28, 0.26, 0.21, 0.24, 0, 360), arc(0.28, 0.74, 0.26, 0.25, 0, 360)],
    9: [arc(0.27, 0.31, 0.26, 0.29, 0, 360), arc(-0.02, 0.31, 0.55, 0.67, 0, 65)],
};
/** A number centred on (cx, cy), fitted in a box of w × h, drawn with strokes of its own colour on a soft shadow. */
export function number(g: G, value: number, cx: number, cy: number, w: number, h: number, color: number, shadow = true): void {
    const text = String(value), unit = 0.56, gap = 0.2, width = text.length * unit + (text.length - 1) * gap;
    const k = Math.min(h, w / width), x0 = cx - width * k / 2, y0 = cy - k / 2, thick = Math.max(1.6, k * (text.length > 3 ? 0.14 : 0.16));
    const draw = (dx: number, dy: number, c: number, a: number): void => {
        g.lineStyle(thick, c, a);
        text.split('').forEach((ch, i) => {
            for (const stroke of DIGITS[ch] ?? []) {
                g.beginPath();
                stroke.forEach(([px, py], j) => { const X = x0 + dx + (i * (unit + gap) + px) * k, Y = y0 + dy + py * k; if (j === 0) g.moveTo(X, Y); else g.lineTo(X, Y); });
                g.strokePath();
            }
        });
    };
    if (shadow) draw(0, Math.max(1, k * 0.05), 0x000000, 0.22);
    draw(0, 0, color, 1);
}
/** Emblem of a value in the tile's top-left corner: a different shape per rank (dot, two dots, triangle, square,
 * diamond, star, hexagon, heart, drop, ring, crown, burst). */
export function emblem(g: G, value: number, x: number, y: number, s: number, color: number): void {
    const rank = Math.round(Math.log2(Math.max(2, value))), r = s, cx = x + r, cy = y + r;
    g.fillStyle(color, 0.85); g.lineStyle(Math.max(1, s * 0.3), color, 0.85);
    const star = (n: number, inner: number): void => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 2 * n; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }); }
        g.fillPoints(pts, true);
    };
    switch (rank) {
        case 1: g.fillCircle(cx, cy, r * 0.55); break;
        case 2: g.fillCircle(cx - r * 0.45, cy, r * 0.42); g.fillCircle(cx + r * 0.45, cy, r * 0.42); break;
        case 3: g.fillTriangle(cx, cy - r, cx + r, cy + r * 0.75, cx - r, cy + r * 0.75); break;
        case 4: g.fillRect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6); break;
        case 5: g.fillPoints([{ x: cx, y: cy - r }, { x: cx + r, y: cy }, { x: cx, y: cy + r }, { x: cx - r, y: cy }], true); break;
        case 6: star(5, 0.45); break;
        case 7: star(3, 1); g.fillCircle(cx, cy, r * 0.8); break;
        case 8: g.fillCircle(cx - r * 0.45, cy - r * 0.2, r * 0.5); g.fillCircle(cx + r * 0.45, cy - r * 0.2, r * 0.5); g.fillTriangle(cx - r * 0.92, cy, cx + r * 0.92, cy, cx, cy + r); break;
        case 9: g.fillCircle(cx, cy + r * 0.3, r * 0.6); g.fillTriangle(cx - r * 0.55, cy + r * 0.1, cx + r * 0.55, cy + r * 0.1, cx, cy - r); break;
        case 10: g.strokeCircle(cx, cy, r * 0.75); break;
        case 11: crown(g, cx, cy, r * 2, color); break;
        default: star(8, 0.5);
    }
}
export function crown(g: G, cx: number, cy: number, w: number, color: number = UI.gold): void {
    const h = w * 0.62, x = cx - w / 2, y = cy - h / 2;
    g.fillStyle(color);
    g.fillPoints([{ x, y: y + h * 0.3 }, { x: x + w * 0.27, y: y + h * 0.58 }, { x: cx, y }, { x: x + w * 0.73, y: y + h * 0.58 }, { x: x + w, y: y + h * 0.3 }, { x: x + w * 0.88, y: y + h }, { x: x + w * 0.12, y: y + h }], true);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(cx, y + h * 0.75, w * 0.07);
}
/** One tile: glossy rounded square, its number and its emblem; `scale` grows it around its centre (merge pop, spawn). */
export function tile(g: G, value: number, x: number, y: number, s: number, scale = 1, alpha = 1): void {
    if (scale <= 0.02) return;
    const k = s * scale, ox = x + (s - k) / 2, oy = y + (s - k) / 2, c = tileColor(value), r = k * 0.18, ink = inkColor(value);
    g.fillStyle(dark(c, 0.3), alpha); g.fillRoundedRect(ox, oy + k * 0.05, k, k * 0.95, r);
    g.fillStyle(c, alpha); g.fillRoundedRect(ox, oy, k, k * 0.93, r);
    g.fillStyle(light(c, 0.4), 0.7 * alpha); g.fillRoundedRect(ox + k * 0.1, oy + k * 0.06, k * 0.8, k * 0.16, r * 0.6);
    if (value >= 2048) { g.lineStyle(Math.max(2, k * 0.05), UI.gold, alpha); g.strokeRoundedRect(ox + 1, oy + 1, k - 2, k * 0.93 - 2, r); crown(g, ox + k / 2, oy + k * 0.04, k * 0.36); }
    if (k >= 22) emblem(g, value, ox + k * 0.08, oy + k * 0.09, Math.max(3, k * 0.085), value <= 4 ? dark(c, 0.35) : light(c, 0.55));
    const digits = String(value).length, boxW = k * (digits >= 4 ? 0.8 : digits === 3 ? 0.74 : 0.62), boxH = k * (digits >= 4 ? 0.3 : digits === 3 ? 0.36 : 0.42);
    number(g, value, ox + k / 2, oy + k * 0.49, boxW, boxH, ink);
}
/** Sparkles of a merge (from the sheet's "Fusion" sequence): eight rays, fading. */
export function sparkle(g: G, cx: number, cy: number, s: number, t: number): void {
    if (t >= 1) return;
    g.lineStyle(Math.max(1.5, s * 0.05), UI.gold, 1 - t);
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, r0 = s * (0.45 + 0.25 * t), r1 = r0 + s * 0.18;
        g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
}
/** The hint arrow, a big translucent chevron over the board pointing where to swipe. */
export function hintArrow(g: G, cx: number, cy: number, size: number, direction: 'up' | 'down' | 'left' | 'right', alpha: number): void {
    const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[direction];
    const pt = (px: number, py: number) => ({ x: cx + px * Math.cos(a) - py * Math.sin(a), y: cy + px * Math.sin(a) + py * Math.cos(a) });
    const s = size;
    g.fillStyle(0x000000, 0.25 * alpha); g.fillPoints([pt(-0.35 * s, -0.12 * s + 4), pt(0.05 * s, -0.12 * s + 4), pt(0.05 * s, -0.3 * s + 4), pt(0.4 * s, 4), pt(0.05 * s, 0.3 * s + 4), pt(0.05 * s, 0.12 * s + 4), pt(-0.35 * s, 0.12 * s + 4)], true);
    g.fillStyle(UI.gold, alpha); g.fillPoints([pt(-0.35 * s, -0.12 * s), pt(0.05 * s, -0.12 * s), pt(0.05 * s, -0.3 * s), pt(0.4 * s, 0), pt(0.05 * s, 0.3 * s), pt(0.05 * s, 0.12 * s), pt(-0.35 * s, 0.12 * s)], true);
    g.lineStyle(3, 0xffffff, alpha); g.strokePoints([pt(-0.35 * s, -0.12 * s), pt(0.05 * s, -0.12 * s), pt(0.05 * s, -0.3 * s), pt(0.4 * s, 0), pt(0.05 * s, 0.3 * s), pt(0.05 * s, 0.12 * s), pt(-0.35 * s, 0.12 * s)], true);
}
/** Rounded HUD pill (sheet's dark blue score boxes). */
export function pill(g: G, x: number, y: number, w: number, h: number, color: number = UI.violetDark): void {
    g.fillStyle(dark(color, 0.35)); g.fillRoundedRect(x, y + 2, w, h, h * 0.35);
    g.fillStyle(color); g.fillRoundedRect(x, y, w, h - 1, h * 0.35);
    g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(x + 4, y + 3, w - 8, h * 0.28, h * 0.2);
}
export function starIcon(g: G, cx: number, cy: number, r: number, on: boolean): void {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }); }
    g.fillStyle(on ? UI.gold : 0xffffff, on ? 1 : 0.25); g.fillPoints(pts, true);
    if (on) { g.lineStyle(1.2, dark(UI.gold, 0.4)); g.strokePoints(pts, true); }
}
// ——— Icons of the DOM buttons (painted on small canvases) ———
export function arrowIcon(g: G, cx: number, cy: number, s: number, direction: 'up' | 'down' | 'left' | 'right'): void {
    const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[direction];
    const pt = (px: number, py: number) => ({ x: cx + (px * Math.cos(a) - py * Math.sin(a)) * s, y: cy + (px * Math.sin(a) + py * Math.cos(a)) * s });
    g.fillStyle(0xffffff); g.fillPoints([pt(-0.34, -0.1), pt(0, -0.1), pt(0, -0.32), pt(0.36, 0), pt(0, 0.32), pt(0, 0.1), pt(-0.34, 0.1)], true);
}
export function undoIcon(g: G, cx: number, cy: number, s: number): void {
    g.lineStyle(s * 0.12, 0xffffff); g.beginPath(); g.arc(cx, cy + s * 0.04, s * 0.26, -Math.PI * 0.85, Math.PI * 0.55); g.strokePath();
    g.fillStyle(0xffffff); g.fillTriangle(cx - s * 0.4, cy - s * 0.2, cx - s * 0.08, cy - s * 0.26, cx - s * 0.3, cy + s * 0.06);
}
export function bulbIcon(g: G, cx: number, cy: number, s: number): void {
    g.fillStyle(0xffe066); g.fillCircle(cx, cy - s * 0.08, s * 0.24);
    g.fillStyle(0xffe066); g.fillRect(cx - s * 0.12, cy + s * 0.08, s * 0.24, s * 0.12);
    g.fillStyle(0xd9d9e8); g.fillRoundedRect(cx - s * 0.13, cy + s * 0.2, s * 0.26, s * 0.14, s * 0.04);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(cx - s * 0.08, cy - s * 0.15, s * 0.06);
}
export interface Rect { x: number; y: number; w: number; h: number }
export interface Layout { width: number; height: number; size: number; hud: Rect; pills: Rect[]; bubble: Rect; hero: Rect; board: Rect & { cell: number; gap: number } }
/**
 * Where everything sits on a W × H play area (the canvas fills the screen, 1 unit = 1 CSS px): the HUD (title and
 * three pills), the companion's bubble, then the square board as large as the width allows. Spare height is shared
 * between the bands so the game fills the screen instead of floating.
 */
export function layout(size: number, width = 360, height = 640): Layout {
    const column = Math.min(width - 16, 560), x0 = (width - column) / 2;
    const titleH = 26, pillH = 46, hudH = titleH + 6 + pillH, bubbleH = 58, frame = 9;
    const fixed = 6 + hudH + 8 + bubbleH + 10 + 2 * frame + 6;
    const side = Math.max(120, Math.floor(Math.min(column - 2 * frame, height - fixed)));
    const spare = Math.max(0, height - fixed - side), gap = Math.min(22, spare / 4);
    let y = 6 + Math.max(0, spare - 4 * gap) / 2 + gap * 0.5;
    const hud = { x: x0, y, w: column, h: hudH };
    const pw = (column - 12) / 3;
    const pills = [0, 1, 2].map(k => ({ x: x0 + k * (pw + 6), y: y + titleH + 6, w: pw, h: pillH }));
    y += hudH + 8 + gap;
    const hero = { x: x0, y: y - 4, w: 62, h: 62 }, bubble = { x: x0 + 66, y, w: column - 66, h: bubbleH };
    y += bubbleH + 10 + frame + gap * 1.5;
    const cellGap = Math.max(4, Math.round(side * (size >= 6 ? 0.018 : 0.024)));
    const cell = (side - cellGap * (size + 1)) / size;
    const board = { x: Math.round((width - side) / 2), y: Math.round(y), w: side, h: side, cell, gap: cellGap };
    return { width, height, size, hud, pills, bubble, hero, board };
}
/** Top-left corner of board cell i. */
export function cellXY(l: Layout, i: number): [number, number] {
    const b = l.board, col = i % l.size, row = Math.floor(i / l.size);
    return [b.x + b.gap + col * (b.cell + b.gap), b.y + b.gap + row * (b.cell + b.gap)];
}
