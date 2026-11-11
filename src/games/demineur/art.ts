import type Phaser from 'phaser';
import type { Theme } from '../../engines/demineur/levels';
type G = Phaser.GameObjects.Graphics;
/** Démineur drawing, shared by the scene, the DOM buttons and the catalogue thumbnail (one source, no drift).
 * Style of David's reference board: rounded glossy tiles with a soft bevel, big bold numbers in eight colours,
 * a dark round mine with a spark, a red flag on a pole, a yellow "?", a red cross for a wrong flag. All in code. */
export const UI = { violet: 0x6c3fd1, night: 0x1d2235, gold: 0xffc928, green: 0x3fbf4a, red: 0xe5413b, white: 0xffffff, ink: 0x22304a } as const;
/** Number colours of the board (1 blue, 2 green, 3 red, 4 navy, 5 violet, 6 teal, 7 pink, 8 grey); the digits also
 * differ by their shape, never by colour alone. */
export const NUMBER_COLORS = [0x000000, 0x1f6fe0, 0x1f9a3c, 0xe0322c, 0x26318f, 0x8a3cc8, 0x14989a, 0xd02f72, 0x56606e] as const;
export function mix(a: number, b: number, t: number): number {
    const c = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export const light = (c: number, t: number): number => mix(c, 0xffffff, t);
export const dark = (c: number, t: number): number => mix(c, 0x000000, t);
/** Board themes of the reference board: classic (light), nature, beach, space, arcade (neon), dark (comfort). */
export const THEMES: Record<Theme, { sky: [number, number]; frame: number; tile: number; open: number; glow: number; name: string }> = {
    classique: { sky: [0x3b5fae, 0x1f2f66], frame: 0x2e4f9a, tile: 0x8fb1e3, open: 0xeef3fb, glow: 0xffffff, name: 'Classique' },
    nature: { sky: [0x2f7a4a, 0x12361f], frame: 0x2f6b34, tile: 0x7fcb63, open: 0xf1f7e6, glow: 0xfff3a6, name: 'Nature' },
    plage: { sky: [0x3aa6d8, 0x1b5f8f], frame: 0xc98b3e, tile: 0xf3c95e, open: 0xfdf6e3, glow: 0xffffff, name: 'Plage' },
    espace: { sky: [0x2a1d6a, 0x0b0a26], frame: 0x4a39a8, tile: 0x8b6be0, open: 0xece8fb, glow: 0xffe36b, name: 'Espace' },
    arcade: { sky: [0x181c3a, 0x07081a], frame: 0x1a9fd6, tile: 0x2fc6e8, open: 0xe8fbff, glow: 0x7df9ff, name: 'Arcade' },
    sombre: { sky: [0x232a38, 0x0e1118], frame: 0x3a4456, tile: 0x5d6b82, open: 0xd9dee7, glow: 0xb9c7dd, name: 'Sombre' },
};
export function backdrop(g: G, theme: Theme, width = 360, height = 640): void {
    const t = THEMES[theme];
    for (let i = 0; i < 16; i++) { g.fillStyle(mix(t.sky[0], t.sky[1], i / 15)); g.fillRect(0, i * height / 16, width, height / 16 + 1); }
    for (let i = 0; i < 24; i++) {
        const x = (i * 97 + 31) % width, y = (i * 211 + 17) % height, r = 1 + (i % 3);
        const starry = theme === 'espace' || theme === 'arcade' || theme === 'sombre';
        g.fillStyle(starry ? 0xffffff : t.glow, starry ? 0.55 : 0.1); g.fillCircle(x, y, starry ? r * 0.7 : r * 3);
    }
}
/** The rounded frame around the visible part of the board. */
export function frame(g: G, theme: Theme, x: number, y: number, w: number, h: number): void {
    const t = THEMES[theme];
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x - 4, y - 1, w + 10, h + 10, 16);
    g.fillStyle(dark(t.frame, 0.3)); g.fillRoundedRect(x - 7, y - 7, w + 14, h + 14, 16);
    g.fillStyle(t.frame); g.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 15);
    g.fillStyle(light(t.frame, 0.3)); g.fillRoundedRect(x - 3, y - 5, w + 6, 5, 3);
    g.fillStyle(dark(t.frame, 0.45)); g.fillRect(x, y, w, h);
}
/** A covered tile. `press` (0–1) sinks it, `hover` lights it (keyboard focus). */
export function coveredTile(g: G, theme: Theme, x: number, y: number, s: number, hover = 0): void {
    const t = THEMES[theme], c = hover > 0 ? light(t.tile, 0.25 * hover) : t.tile, r = Math.max(2, s * 0.18), m = Math.max(0.5, s * 0.05);
    if (s < 14) { g.fillStyle(c); g.fillRect(x + m, y + m, s - 2 * m, s - 2 * m); g.fillStyle(light(c, 0.35)); g.fillRect(x + m, y + m, s - 2 * m, Math.max(1, s * 0.15)); return; }
    g.fillStyle(dark(c, 0.35)); g.fillRoundedRect(x + m, y + m + s * 0.04, s - 2 * m, s - 2 * m, r);
    g.fillStyle(c); g.fillRoundedRect(x + m, y + m, s - 2 * m, s - 2 * m - s * 0.04, r);
    g.fillStyle(light(c, 0.45)); g.fillRoundedRect(x + m + s * 0.1, y + m + s * 0.07, s - 2 * m - s * 0.2, s * 0.2, r * 0.6);
    g.fillStyle(0xffffff, 0.18); g.fillCircle(x + s * 0.28, y + s * 0.3, s * 0.07);
}
export function openTile(g: G, theme: Theme, x: number, y: number, s: number, tint?: number): void {
    const t = THEMES[theme], m = Math.max(0.5, s * 0.04);
    g.fillStyle(tint ?? t.open); g.fillRect(x + m, y + m, s - 2 * m, s - 2 * m);
    if (s >= 14) { g.fillStyle(0x000000, 0.06); g.fillRect(x + m, y + m, s - 2 * m, s * 0.07); }
}
/** Bold stroked digits (1–8): each has its own silhouette, so colour is never the only clue. Unit box 0.62 × 1. */
const GLYPHS: Readonly<Record<number, readonly (readonly [number, number])[][]>> = {
    1: [[[0.12, 0.28], [0.34, 0.1], [0.34, 0.9]], [[0.1, 0.9], [0.56, 0.9]]],
    2: [[[0.08, 0.3], [0.16, 0.14], [0.31, 0.08], [0.46, 0.14], [0.53, 0.3], [0.46, 0.47], [0.08, 0.9], [0.56, 0.9]]],
    3: [[[0.08, 0.12], [0.52, 0.12], [0.27, 0.42], [0.45, 0.48], [0.54, 0.66], [0.46, 0.85], [0.28, 0.92], [0.07, 0.85]]],
    4: [[[0.42, 0.92], [0.42, 0.08], [0.05, 0.64], [0.6, 0.64]]],
    5: [[[0.52, 0.09], [0.13, 0.09], [0.09, 0.46], [0.3, 0.4], [0.48, 0.47], [0.55, 0.66], [0.47, 0.86], [0.28, 0.93], [0.07, 0.86]]],
    6: [[[0.5, 0.1], [0.28, 0.1], [0.12, 0.3], [0.08, 0.6], [0.15, 0.85], [0.31, 0.93], [0.47, 0.86], [0.54, 0.67], [0.46, 0.5], [0.3, 0.45], [0.11, 0.55]]],
    7: [[[0.06, 0.09], [0.56, 0.09], [0.24, 0.92]]],
};
function stroke(g: G, points: readonly (readonly [number, number])[], ox: number, oy: number, k: number, width: number, color: number): void {
    const pts = points.map(([px, py]) => ({ x: ox + px * k, y: oy + py * k }));
    g.lineStyle(width, color); g.strokePoints(pts);
    g.fillStyle(color); for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
}
export function digit(g: G, n: number, cx: number, cy: number, s: number): void {
    const color = NUMBER_COLORS[n] ?? 0, k = s * 0.62, w = Math.max(1.6, s * 0.12), ox = cx - 0.31 * k, oy = cy - 0.5 * k;
    if (n === 8) {
        for (const [color2, width] of [[light(color, 0.75), w + Math.max(1, s * 0.06)], [color, w]] as const) {
            g.lineStyle(width, color2); g.strokeCircle(cx, cy - k * 0.22, k * 0.2); g.strokeCircle(cx, cy + k * 0.2, k * 0.25);
        }
        return;
    }
    const strokes = GLYPHS[n] ?? [];
    if (s >= 16) for (const p of strokes) stroke(g, p, ox, oy + s * 0.03, k, w + Math.max(1, s * 0.06), light(color, 0.75));
    for (const p of strokes) stroke(g, p, ox, oy, k, w, color);
}
export function mine(g: G, cx: number, cy: number, s: number, spark = 0): void {
    const r = s * 0.27;
    g.lineStyle(Math.max(1, s * 0.07), 0x1a1f2e);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.lineBetween(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45); }
    g.fillStyle(0x1a1f2e); g.fillCircle(cx, cy, r);
    g.fillStyle(0x3b4660); g.fillCircle(cx - r * 0.15, cy - r * 0.15, r * 0.75);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(cx - r * 0.38, cy - r * 0.4, r * 0.25);
    if (spark > 0) { g.fillStyle(UI.gold, spark); g.fillCircle(cx + r * 1.05, cy - r * 1.05, r * 0.35 * (0.7 + 0.3 * spark)); }
}
export function flag(g: G, cx: number, cy: number, s: number, color = 0xe5322e): void {
    const h = s * 0.62, x = cx - s * 0.12, top = cy - h / 2;
    g.fillStyle(0x000000, 0.18); g.fillEllipse(cx, cy + h / 2, s * 0.42, s * 0.12);
    g.fillStyle(0x5a6476); g.fillRect(x - s * 0.03, top, Math.max(1, s * 0.07), h);
    g.fillStyle(0x7d889c); g.fillRoundedRect(cx - s * 0.2, cy + h / 2 - s * 0.08, s * 0.32, s * 0.1, s * 0.04);
    g.fillStyle(color); g.fillTriangle(x, top, x + s * 0.4, top + h * 0.22, x, top + h * 0.46);
    g.fillStyle(light(color, 0.35)); g.fillTriangle(x, top + h * 0.04, x + s * 0.18, top + h * 0.14, x, top + h * 0.2);
}
export function question(g: G, cx: number, cy: number, s: number): void {
    const k = s * 0.6, w = Math.max(1.6, s * 0.12), ox = cx - 0.25 * k, oy = cy - 0.5 * k;
    const p: [number, number][] = [[0.02, 0.28], [0.1, 0.1], [0.27, 0.04], [0.44, 0.12], [0.48, 0.3], [0.38, 0.45], [0.25, 0.55], [0.25, 0.68]];
    stroke(g, p, ox, oy + s * 0.03, k, w + Math.max(1, s * 0.06), 0xb87a00);
    stroke(g, p, ox, oy, k, w, 0xffc928);
    g.fillStyle(0xffc928); g.fillCircle(ox + 0.25 * k, oy + 0.9 * k, w * 0.7);
}
export function cross(g: G, cx: number, cy: number, s: number): void {
    const r = s * 0.28, w = Math.max(2, s * 0.13);
    g.lineStyle(w + 2, 0xffffff); g.lineBetween(cx - r, cy - r, cx + r, cy + r); g.lineBetween(cx + r, cy - r, cx - r, cy + r);
    g.lineStyle(w, UI.red); g.lineBetween(cx - r, cy - r, cx + r, cy + r); g.lineBetween(cx + r, cy - r, cx - r, cy + r);
}
export function pill(g: G, x: number, y: number, w: number, h: number, color: number): void {
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x + 1, y + 3, w, h, h / 2);
    g.fillStyle(dark(color, 0.3)); g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, h / 2 + 1);
    g.fillStyle(color); g.fillRoundedRect(x, y, w, h, h / 2);
    g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(x + 6, y + 3, w - 12, h * 0.32, h * 0.16);
}
export function stopwatch(g: G, cx: number, cy: number, r: number): void {
    g.fillStyle(UI.gold); g.fillRect(cx - r * 0.25, cy - r * 1.35, r * 0.5, r * 0.4);
    g.fillStyle(dark(UI.gold, 0.3)); g.fillCircle(cx, cy, r + 1.5);
    g.fillStyle(UI.gold); g.fillCircle(cx, cy, r);
    g.fillStyle(0xffffff); g.fillCircle(cx, cy, r * 0.72);
    g.lineStyle(Math.max(1.5, r * 0.18), UI.ink); g.lineBetween(cx, cy, cx, cy - r * 0.5); g.lineBetween(cx, cy, cx + r * 0.38, cy + r * 0.12);
}
export function starIcon(g: G, cx: number, cy: number, r: number, on: boolean): void {
    const pts = Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.45 : r; return { x: cx + Math.cos(a) * q, y: cy + Math.sin(a) * q }; });
    g.fillStyle(on ? dark(UI.gold, 0.25) : 0x000000, on ? 1 : 0.35); g.fillPoints(pts.map(p => ({ x: p.x, y: p.y + 1.5 })), true);
    g.fillStyle(on ? UI.gold : 0x8a93a6); g.fillPoints(pts, true);
}
/** Icons of the DOM buttons: pick (dig), flag, bulb (hint), magnifier (zoom). */
export function pickIcon(g: G, x: number, y: number, s: number): void {
    const cx = x + s / 2, cy = y + s / 2;
    g.lineStyle(s * 0.1, 0x8a5a2b); g.lineBetween(cx - s * 0.28, cy + s * 0.3, cx + s * 0.16, cy - s * 0.14);
    g.fillStyle(0xc9d3e0); g.fillTriangle(cx - s * 0.02, cy - s * 0.38, cx + s * 0.4, cy + s * 0.04, cx + s * 0.16, cy - s * 0.14);
    g.fillStyle(0x8994a6); g.fillTriangle(cx - s * 0.02, cy - s * 0.38, cx + s * 0.16, cy - s * 0.14, cx + s * 0.06, cy - s * 0.2);
}
export function bulbIcon(g: G, x: number, y: number, s: number): void {
    const cx = x + s / 2, cy = y + s * 0.44;
    g.fillStyle(UI.gold, 0.35); g.fillCircle(cx, cy, s * 0.36);
    g.fillStyle(0xffe066); g.fillCircle(cx, cy, s * 0.24);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - s * 0.08, cy - s * 0.08, s * 0.06);
    g.fillStyle(0x8994a6); g.fillRoundedRect(cx - s * 0.12, cy + s * 0.2, s * 0.24, s * 0.16, s * 0.04);
}
export function loupeIcon(g: G, x: number, y: number, s: number, zoomed: boolean): void {
    const cx = x + s * 0.43, cy = y + s * 0.43, r = s * 0.24;
    g.lineStyle(s * 0.11, 0x5a4a2a); g.lineBetween(cx + r * 0.7, cy + r * 0.7, x + s * 0.84, y + s * 0.84);
    g.fillStyle(0xd9f1ff); g.fillCircle(cx, cy, r);
    g.lineStyle(s * 0.07, 0x26405a); g.strokeCircle(cx, cy, r);
    g.lineStyle(s * 0.06, 0x26405a); g.lineBetween(cx - r * 0.5, cy, cx + r * 0.5, cy);
    if (!zoomed) g.lineBetween(cx, cy - r * 0.5, cx, cy + r * 0.5);
}
/** Explosion ring (sober): a flash and an expanding ring, `t` 0 → 1. */
export function blast(g: G, cx: number, cy: number, s: number, t: number): void {
    g.fillStyle(0xffd34a, Math.max(0, 0.6 * (1 - t * 2))); g.fillCircle(cx, cy, s * (0.4 + t));
    g.lineStyle(Math.max(1, s * 0.12 * (1 - t)), 0xff6a3a, 1 - t); g.strokeCircle(cx, cy, s * (0.5 + 1.6 * t));
}
