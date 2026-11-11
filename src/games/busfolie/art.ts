import type Phaser from 'phaser';
import type { Bus, Color, Exit } from '../../engines/busfolie/rules';
type G = Phaser.GameObjects.Graphics;
/** Bus en folie drawing, shared by the scene, the DOM buttons and the catalogue thumbnail (one source, no drift).
 * Style of David's reference board: a sunny bus yard seen from above, glossy rounded buses with windows and wheels,
 * a white arrow on the roof, a blue station canopy where coloured passengers queue, striped exits in the kerb,
 * orange cones. Every colour also carries its own symbol (circle, square, triangle, diamond, star, cross): colour is
 * never the only clue. All in code. */
export const UI = { violet: 0x6c3fd1, night: 0x1d2235, gold: 0xffc928, green: 0x3fbf4a, red: 0xe5413b, white: 0xffffff, ink: 0x22304a, asphalt: 0x596170, kerb: 0xe9dcc0, grass: 0x6cc24a, canopy: 0x2f8be0 } as const;
export const COLORS: Readonly<Record<Color, number>> = { rouge: 0xe8413b, bleu: 0x2f7fe0, jaune: 0xf5c01c, vert: 0x35b04a, violet: 0x9a4fd8, orange: 0xf2801e, gris: 0x9aa3b1 };
export type Symbol = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'cross';
export const SYMBOLS: Readonly<Record<Exclude<Color, 'gris'>, Symbol>> = { rouge: 'circle', bleu: 'square', jaune: 'triangle', vert: 'diamond', violet: 'star', orange: 'cross' };
export function mix(a: number, b: number, t: number): number {
    const c = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export const light = (c: number, t: number): number => mix(c, 0xffffff, t);
export const dark = (c: number, t: number): number => mix(c, 0x000000, t);
/** A white symbol with a dark outline, centred on (x, y), of size `s`. */
export function symbol(g: G, kind: Symbol, x: number, y: number, s: number, fill = 0xffffff, outline = 0x1d2235): void {
    const r = s / 2;
    const star = (k: number): { x: number; y: number }[] => Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 5, d = (i % 2 ? 0.45 : 1) * (r + k);
        return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    });
    const shape = (k: number): void => {
        if (kind === 'circle') g.fillCircle(x, y, r * 0.82 + k);
        else if (kind === 'square') g.fillRect(x - r * 0.72 - k, y - r * 0.72 - k, (r * 0.72 + k) * 2, (r * 0.72 + k) * 2);
        else if (kind === 'triangle') g.fillTriangle(x, y - r - k * 1.6, x - r * 1.0 - k * 1.4, y + r * 0.78 + k, x + r * 1.0 + k * 1.4, y + r * 0.78 + k);
        else if (kind === 'diamond') g.fillPoints([{ x, y: y - r - k * 1.4 }, { x: x + r * 0.85 + k * 1.4, y }, { x, y: y + r + k * 1.4 }, { x: x - r * 0.85 - k * 1.4, y }], true);
        else if (kind === 'star') g.fillPoints(star(k * 1.6), true);
        else { const a = r * 0.34 + k; g.fillRect(x - a, y - r - k, 2 * a, 2 * (r + k)); g.fillRect(x - r - k, y - a, 2 * (r + k), 2 * a); }
    };
    g.fillStyle(outline); shape(Math.max(1, s * 0.12));
    g.fillStyle(fill); shape(0);
}
/** Sunny backdrop: grass, a few trees and bushes around the yard. */
export function backdrop(g: G, width = 360, height = 640): void {
    for (let i = 0; i < 12; i++) { g.fillStyle(mix(0x8bd35e, 0x4f9e3c, i / 11)); g.fillRect(0, i * height / 12, width, height / 12 + 1); }
    for (let i = 0; i < 18; i++) {
        const x = (i * 97 + 31) % width, y = (i * 211 + 17) % height;
        g.fillStyle(0x3f8f34, 0.35); g.fillCircle(x, y, 6 + (i % 3) * 3);
    }
}
export function tree(g: G, x: number, y: number, s: number): void {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(x + s * 0.1, y + s * 0.42, s * 0.9, s * 0.3);
    g.fillStyle(0x7a4b25); g.fillRect(x - s * 0.08, y, s * 0.16, s * 0.4);
    g.fillStyle(0x2f8a34); g.fillCircle(x, y - s * 0.08, s * 0.42);
    g.fillStyle(0x47b04a); g.fillCircle(x - s * 0.12, y - s * 0.18, s * 0.3); g.fillCircle(x + s * 0.16, y - s * 0.12, s * 0.26);
    g.fillStyle(0xffffff, 0.25); g.fillCircle(x - s * 0.18, y - s * 0.3, s * 0.1);
}
/** The yard: a kerb around dark asphalt, faint parking lines on each cell. */
export function yard(g: G, x: number, y: number, cols: number, rows: number, s: number): void {
    const w = cols * s, h = rows * s, k = Math.max(5, s * 0.16);
    g.fillStyle(0x000000, 0.22); g.fillRoundedRect(x - k + 3, y - k + 5, w + 2 * k, h + 2 * k, k * 1.6);
    g.fillStyle(UI.kerb); g.fillRoundedRect(x - k, y - k, w + 2 * k, h + 2 * k, k * 1.6);
    g.fillStyle(dark(UI.kerb, 0.18)); g.fillRoundedRect(x - k * 0.45, y - k * 0.45, w + k * 0.9, h + k * 0.9, k);
    g.fillStyle(UI.asphalt); g.fillRect(x, y, w, h);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        g.fillStyle((r + c) % 2 ? 0x5f6878 : 0x565e6c); g.fillRect(x + c * s, y + r * s, s, s);
    }
    g.lineStyle(Math.max(1, s * 0.03), 0xffffff, 0.16);
    for (let c = 1; c < cols; c++) g.lineBetween(x + c * s, y, x + c * s, y + h);
    for (let r = 1; r < rows; r++) g.lineBetween(x, y + r * s, x + w, y + r * s);
}
/** An exit: a gap in the kerb with yellow and black stripes and an outward arrow; a coloured exit shows its colour
 * and its symbol. (x, y) is the top-left of the board, `s` the cell size. */
export function exitGate(g: G, e: Exit, x: number, y: number, cols: number, rows: number, s: number, glow = 0): void {
    const k = Math.max(5, s * 0.16) + 1, horizontalSide = e.side === 'left' || e.side === 'right';
    const gx = e.side === 'left' ? x - k : e.side === 'right' ? x + cols * s : x + e.index * s;
    const gy = e.side === 'top' ? y - k : e.side === 'bottom' ? y + rows * s : y + e.index * s;
    const gw = horizontalSide ? k : s, gh = horizontalSide ? s : k;
    const tint = e.color ? COLORS[e.color] : 0xf5c01c;
    g.fillStyle(UI.asphalt); g.fillRect(gx, gy, gw, gh);
    // Stripes across the gap.
    const n = 4;
    for (let i = 0; i < n; i++) {
        g.fillStyle(i % 2 ? UI.night : tint);
        if (horizontalSide) g.fillRect(gx, gy + i * s / n, gw, s / n); else g.fillRect(gx + i * s / n, gy, s / n, gh);
    }
    // On the kerb's outer edge: a tab with an arrow pointing out, or the exit colour and its symbol.
    const t = Math.max(12, s * 0.38);
    const cx = e.side === 'left' ? gx : e.side === 'right' ? gx + gw : gx + gw / 2, cy = e.side === 'top' ? gy : e.side === 'bottom' ? gy + gh : gy + gh / 2;
    if (glow > 0) { g.fillStyle(0xffffff, 0.35 * glow); g.fillCircle(cx, cy, t * 0.9); }
    g.fillStyle(UI.night); g.fillRoundedRect(cx - t / 2 - 1, cy - t / 2 - 1, t + 2, t + 2, t * 0.3);
    g.fillStyle(e.color ? tint : 0x37b24d); g.fillRoundedRect(cx - t / 2, cy - t / 2, t, t, t * 0.28);
    if (e.color) symbol(g, SYMBOLS[e.color], cx, cy, t * 0.52);
    else arrow(g, cx, cy, t * 0.62, e.side === 'left' ? 'left' : e.side === 'right' ? 'right' : e.side === 'top' ? 'up' : 'down', 0xffffff);
}
export function arrow(g: G, x: number, y: number, s: number, dir: Bus['facing'], color = 0xffffff, bold = false): void {
    const pts = [[0.5, 0], [-0.1, -0.5], [-0.1, -0.2], [-0.5, -0.2], [-0.5, 0.2], [-0.1, 0.2], [-0.1, 0.5]] as const;
    const a = dir === 'right' ? 0 : dir === 'down' ? Math.PI / 2 : dir === 'left' ? Math.PI : -Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
    const at = (px: number, py: number, k: number): { x: number; y: number } => ({ x: x + (px * c - py * sn) * s * k, y: y + (px * sn + py * c) * s * k });
    g.fillStyle(UI.night, 0.55); g.fillPoints(pts.map(([px, py]) => at(px, py, 1.12)), true);
    g.fillStyle(color); g.fillPoints(pts.map(([px, py]) => at(px, py, 1)), true);
    if (bold) { g.fillStyle(UI.red); g.fillPoints([at(-0.1, -0.2, 1), at(-0.5, -0.2, 1), at(-0.5, 0.2, 1), at(-0.1, 0.2, 1)], true); }
}
export function cone(g: G, x: number, y: number, s: number): void {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x + s * 0.05, y + s * 0.34, s * 0.7, s * 0.22);
    g.fillStyle(0xd85a12); g.fillRoundedRect(x - s * 0.34, y + s * 0.2, s * 0.68, s * 0.14, s * 0.05);
    g.fillStyle(0xf7781f); g.fillTriangle(x, y - s * 0.36, x - s * 0.26, y + s * 0.24, x + s * 0.26, y + s * 0.24);
    g.fillStyle(0xffffff); g.fillPoints([{ x: x - s * 0.12, y: y - s * 0.08 }, { x: x + s * 0.12, y: y - s * 0.08 }, { x: x + s * 0.17, y: y + s * 0.05 }, { x: x - s * 0.17, y: y + s * 0.05 }], true);
}
/** A vehicle seen from above, `len` cells along its axis, top-left at (x, y). A passenger bus has windows, a roof
 * arrow (bold with a red bar when it only goes forward), its colour symbol and one seat pip per seat. */
export function vehicle(g: G, b: Pick<Bus, 'color' | 'length' | 'orientation' | 'facing' | 'capacity' | 'oneWay'>, x: number, y: number, s: number, opts: { selected?: boolean; load?: number; dim?: number } = {}): void {
    const hz = b.orientation === 'horizontal', L = b.length * s, m = s * 0.08;
    const w = hz ? L - 2 * m : s - 2 * m, h = hz ? s - 2 * m : L - 2 * m, x0 = x + m, y0 = y + m, r = s * 0.2;
    const body = COLORS[b.color], car = b.color === 'gris';
    if (opts.selected) { g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(x0 - 4, y0 - 4, w + 8, h + 8, r + 4); g.fillStyle(UI.gold); g.fillRoundedRect(x0 - 2, y0 - 2, w + 4, h + 4, r + 2); }
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(x0 + 2, y0 + 4, w, h, r);
    // Wheels peek out on the long sides.
    g.fillStyle(0x1b1f27);
    const wheel = (u: number): void => {
        if (hz) { g.fillRoundedRect(x0 + u - s * 0.12, y0 - s * 0.05, s * 0.24, s * 0.12, 3); g.fillRoundedRect(x0 + u - s * 0.12, y0 + h - s * 0.07, s * 0.24, s * 0.12, 3); }
        else { g.fillRoundedRect(x0 - s * 0.05, y0 + u - s * 0.12, s * 0.12, s * 0.24, 3); g.fillRoundedRect(x0 + w - s * 0.07, y0 + u - s * 0.12, s * 0.12, s * 0.24, 3); }
    };
    wheel(s * 0.35); wheel((hz ? w : h) - s * 0.35);
    g.fillStyle(dark(body, 0.28)); g.fillRoundedRect(x0, y0, w, h, r);
    g.fillStyle(body); g.fillRoundedRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3 - (hz ? s * 0.05 : 0), r * 0.9);
    // Front: windshield on the side it faces.
    const fwd = b.facing, glass = 0xbfe6ff;
    g.fillStyle(glass);
    if (fwd === 'right') g.fillRoundedRect(x0 + w - s * 0.26, y0 + h * 0.16, s * 0.16, h * 0.68, 3);
    else if (fwd === 'left') g.fillRoundedRect(x0 + s * 0.1, y0 + h * 0.16, s * 0.16, h * 0.68, 3);
    else if (fwd === 'down') g.fillRoundedRect(x0 + w * 0.16, y0 + h - s * 0.26, w * 0.68, s * 0.16, 3);
    else g.fillRoundedRect(x0 + w * 0.16, y0 + s * 0.1, w * 0.68, s * 0.16, 3);
    if (car) {
        // A parked car: a lighter roof, no arrow, no seats.
        g.fillStyle(light(body, 0.35)); g.fillRoundedRect(x0 + w * (hz ? 0.28 : 0.18), y0 + h * (hz ? 0.18 : 0.28), w * (hz ? 0.42 : 0.64), h * (hz ? 0.64 : 0.42), r * 0.6);
        g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(x0 + 4, y0 + 3, w - 8, Math.max(2, (hz ? h : w) * 0.12), 2);
        return;
    }
    // Side windows along the body.
    const panes = b.length * 2 - 1;
    for (let k = 0; k < panes; k++) {
        const u = s * 0.34 + k * ((b.length * s - s * 0.9) / Math.max(1, panes - 1));
        g.fillStyle(light(glass, 0.2), 0.85);
        if (hz) { g.fillRoundedRect(x + u - s * 0.11, y0 + s * 0.05, s * 0.2, s * 0.13, 2); g.fillRoundedRect(x + u - s * 0.11, y0 + h - s * 0.2, s * 0.2, s * 0.13, 2); }
        else { g.fillRoundedRect(x0 + s * 0.05, y + u - s * 0.11, s * 0.13, s * 0.2, 2); g.fillRoundedRect(x0 + w - s * 0.2, y + u - s * 0.11, s * 0.13, s * 0.2, 2); }
    }
    g.fillStyle(0xffffff, 0.28); g.fillRoundedRect(x0 + 5, y0 + 4, hz ? w - 10 : w * 0.25, hz ? h * 0.12 : h - 8, 3);
    // Roof: arrow toward the front, the colour symbol behind it, the seat pips along the back.
    const cx = x0 + w / 2, cy = y0 + h / 2, along = (d: number): [number, number] => {
        const sign = fwd === 'right' || fwd === 'down' ? 1 : -1;
        return hz ? [cx + sign * d, cy] : [cx, cy + sign * d];
    };
    const [ax, ay] = along(b.length === 3 ? s * 0.62 : s * 0.38), [sx, sy] = along(b.length === 3 ? -s * 0.15 : -s * 0.36);
    arrow(g, ax, ay, s * 0.42, fwd, 0xffffff, b.oneWay === true);
    const sym = SYMBOLS[b.color as Exclude<Color, 'gris'>];
    g.fillStyle(dark(body, 0.15)); g.fillCircle(sx, sy, s * 0.24);
    symbol(g, sym, sx, sy, s * 0.3);
    if (b.length === 3) {
        // Seat pips on the long coach's back cell.
        const [px, py] = along(-s * 0.85);
        pips(g, px, py, s, b.capacity, opts.load ?? 0, hz);
    } else {
        const [px, py] = along(-s * 0.72);
        pips(g, px, py, s, b.capacity, opts.load ?? 0, hz);
    }
    if (opts.dim) { g.fillStyle(UI.night, opts.dim); g.fillRoundedRect(x0, y0, w, h, r); }
}
/** Seats: a short column of pips across the bus (filled ones are taken). */
function pips(g: G, x: number, y: number, s: number, n: number, filled: number, hz: boolean): void {
    const step = Math.min(s * 0.14, (s * 0.72) / Math.max(1, n)), d = step * 0.8;
    for (let k = 0; k < n; k++) {
        const o = (k - (n - 1) / 2) * step, px = hz ? x : x + o, py = hz ? y + o : y;
        g.fillStyle(UI.night); g.fillCircle(px, py, d / 2 + 1);
        g.fillStyle(k < filled ? UI.gold : 0xffffff); g.fillCircle(px, py, d / 2);
    }
}
/** One waiting passenger: round head, rounded body in the group colour with its symbol. */
export function passenger(g: G, color: Exclude<Color, 'gris'>, x: number, y: number, s: number, bob = 0): void {
    const c = COLORS[color];
    g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + s * 0.5, s * 0.7, s * 0.16);
    g.fillStyle(dark(c, 0.3)); g.fillRoundedRect(x - s * 0.33, y - s * 0.05 + bob, s * 0.66, s * 0.56, s * 0.24);
    g.fillStyle(c); g.fillRoundedRect(x - s * 0.3, y - s * 0.03 + bob, s * 0.6, s * 0.5, s * 0.22);
    g.fillStyle(dark(c, 0.3)); g.fillCircle(x, y - s * 0.25 + bob, s * 0.24);
    g.fillStyle(light(c, 0.15)); g.fillCircle(x, y - s * 0.26 + bob, s * 0.21);
    g.fillStyle(0xffffff, 0.35); g.fillCircle(x - s * 0.07, y - s * 0.32 + bob, s * 0.06);
    symbol(g, SYMBOLS[color], x, y + s * 0.2 + bob, s * 0.26);
}
/** The station canopy over the waiting line (blue roof, white posts), x..x+w. */
export function canopy(g: G, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x000000, 0.22); g.fillRoundedRect(x + 2, y + 4, w, h, 12);
    g.fillStyle(0xd9e7f5); g.fillRoundedRect(x, y, w, h, 12);
    g.fillStyle(0xbcd3ea); g.fillRect(x + 6, y + h - 10, w - 12, 6);
    g.fillStyle(dark(UI.canopy, 0.25)); g.fillRoundedRect(x - 2, y - 4, w + 4, 16, 8);
    g.fillStyle(UI.canopy); g.fillRoundedRect(x, y - 4, w, 13, 7);
    g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(x + 8, y - 2, w - 16, 3, 2);
}
export function pill(g: G, x: number, y: number, w: number, h: number, color: number): void {
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x + 1, y + 3, w, h, h / 2);
    g.fillStyle(dark(color, 0.3)); g.fillRoundedRect(x, y, w, h, h / 2);
    g.fillStyle(color); g.fillRoundedRect(x + 1.5, y + 1.5, w - 3, h - 5, (h - 4) / 2);
    g.fillStyle(0xffffff, 0.2); g.fillRoundedRect(x + 8, y + 4, w - 16, 4, 2);
}
export function starIcon(g: G, x: number, y: number, r: number, on: boolean): void {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * 0.45 : r; return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d }; });
    g.fillStyle(UI.night); g.fillPoints(pts.map(p => ({ x: x + (p.x - x) * 1.25, y: y + (p.y - y) * 1.25 })), true);
    g.fillStyle(on ? UI.gold : 0x59627a); g.fillPoints(pts, true);
}
export function bulbIcon(g: G, x: number, y: number, s: number): void {
    g.fillStyle(0xfff3a1); g.fillCircle(x + s / 2, y + s * 0.42, s * 0.3);
    g.fillStyle(0xffd23c); g.fillCircle(x + s / 2, y + s * 0.42, s * 0.24);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(x + s * 0.42, y + s * 0.34, s * 0.07);
    g.fillStyle(0xa0a8b8); g.fillRoundedRect(x + s * 0.36, y + s * 0.66, s * 0.28, s * 0.16, 3);
    g.fillStyle(0x6b7385); g.fillRect(x + s * 0.38, y + s * 0.72, s * 0.24, 2); g.fillRect(x + s * 0.4, y + s * 0.78, s * 0.2, 2);
}
export function undoIcon(g: G, x: number, y: number, s: number): void {
    g.lineStyle(s * 0.13, 0xffffff); g.beginPath(); g.arc(x + s * 0.54, y + s * 0.56, s * 0.26, Math.PI * 1.05, Math.PI * 2.35, false); g.strokePath();
    g.fillStyle(0xffffff); g.fillTriangle(x + s * 0.1, y + s * 0.5, x + s * 0.4, y + s * 0.5, x + s * 0.24, y + s * 0.24);
}
export function restartIcon(g: G, x: number, y: number, s: number): void {
    g.lineStyle(s * 0.12, 0xffffff); g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.27, -Math.PI * 0.35, Math.PI * 1.45, false); g.strokePath();
    g.fillStyle(0xffffff); g.fillTriangle(x + s * 0.62, y + s * 0.08, x + s * 0.84, y + s * 0.3, x + s * 0.56, y + s * 0.34);
}
