import type Phaser from 'phaser';
import { shape, type Primitive } from '../../engines/devisso/shapes';
import { RAINBOW, type Material, type Theme } from '../../engines/devisso/rules';
type G = Phaser.GameObjects.Graphics;
/** Dévisso drawing, shared by the scene, the boost buttons and the catalogue thumbnail (one source, no drift).
 * Style of David's boards: 2D/2.5D cartoon, crisp dark outlines, soft drop shadows, bright colours,
 * plastic, wood, metal, rubber, glass and crystal. Everything is drawn in code. */
export const SCREW_COLORS = [0xe8382f, 0x2f7de1, 0xf7c51e, 0x3cb83a, 0x8e44d8, 0xf06aa8, 0xf58a1f, 0x2ec6e6] as const;
export const COLOR_NAMES = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'rose', 'orange', 'cyan', 'multicolore'] as const;
/** Plate tints: the eight colours, then steel, wood, cream, dark. */
export const TINTS = [...SCREW_COLORS, 0xa9b4c2, 0xc98a4b, 0xf4ead2, 0x434a59] as const;
export const UI = { violet: 0x6c3fd1, night: 0x1d2235, gold: 0xffc928, cream: 0xfff6e0, steel: 0xc9d2de, green: 0x3fbf4a, red: 0xe5413b, white: 0xffffff } as const;
export function mix(a: number, b: number, t: number): number {
    const c = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export const light = (c: number, t: number): number => mix(c, 0xffffff, t);
export const dark = (c: number, t: number): number => mix(c, 0x000000, t);
/** Board geometry in the 360 × 640 world: one unit (42 px, a finger at phone scale) between holes; the margin keeps
 * plates that overhang the outer holes (rings, roofs) inside the frame. */
export const UNIT = 42;
export const BOARD = { ox: 33, oy: 212, x: 4, y: 172, w: 352, h: 416 } as const;
export const toWorld = (x: number, y: number): [number, number] => [BOARD.ox + x * UNIT, BOARD.oy + y * UNIT];
export const toBoard = (x: number, y: number): [number, number] => [(x - BOARD.ox) / UNIT, (y - BOARD.oy) / UNIT];
export const ROWS = { hud: 0, boxes: 60, buffer: 126, tip: 594 } as const;
export const THEMES: Record<Theme, { sky: [number, number]; frame: number; face: number; accent: number; name: string }> = {
    atelier: { sky: [0x3a2a52, 0x241a36], frame: 0x9a5b2c, face: 0xd9a066, accent: 0xffd27a, name: 'Atelier' },
    usine: { sky: [0x26324a, 0x151c2c], frame: 0x6f7b8c, face: 0xb7c2cf, accent: 0x9ad8ff, name: 'Usine' },
    jouets: { sky: [0x4b2a5c, 0x2b1638], frame: 0xe17bb0, face: 0xffc8e2, accent: 0xfff0a0, name: 'Jouets' },
    nature: { sky: [0x1f4a3a, 0x10261e], frame: 0x6b4a2a, face: 0x86c95a, accent: 0xfff1a8, name: 'Nature' },
    espace: { sky: [0x1a1442, 0x0a0820], frame: 0x5a4bb0, face: 0x3b2f8a, accent: 0xffe36b, name: 'Espace' },
    glace: { sky: [0x1d4a6e, 0x0e2338], frame: 0x8fd3f2, face: 0xd8f3ff, accent: 0xffffff, name: 'Glace' },
};
/** Night gradient, soft dots and the themed board (frame, face, corner screws). */
export function backdrop(g: G, theme: Theme, width = 360, height = 640): void {
    const t = THEMES[theme];
    for (let i = 0; i < 16; i++) { g.fillStyle(mix(t.sky[0], t.sky[1], i / 15)); g.fillRect(0, i * height / 16, width, height / 16 + 1); }
    for (let i = 0; i < 26; i++) {
        const x = (i * 97 + 31) % width, y = (i * 211 + 17) % height, r = 1 + (i % 3);
        g.fillStyle(t.accent, theme === 'espace' ? 0.7 : 0.12); g.fillCircle(x, y, theme === 'espace' ? r * 0.7 : r * 3);
    }
}
export function boardFrame(g: G, theme: Theme): void {
    const t = THEMES[theme], { x, y, w, h } = BOARD;
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x + 3, y + 6, w, h, 22);
    g.fillStyle(dark(t.frame, 0.35)); g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 24);
    g.fillStyle(t.frame); g.fillRoundedRect(x, y, w, h, 22);
    g.fillStyle(light(t.frame, 0.25)); g.fillRoundedRect(x + 3, y + 3, w - 6, 10, 8);
    const inset = 12;
    g.fillStyle(dark(t.face, 0.2)); g.fillRoundedRect(x + inset - 1, y + inset, w - inset * 2 + 2, h - inset * 2 + 2, 14);
    g.fillStyle(t.face); g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 14);
    if (theme === 'atelier' || theme === 'nature') {
        // Wood grain or grass blades.
        g.lineStyle(2, dark(t.face, theme === 'atelier' ? 0.12 : 0.18), 0.6);
        for (let k = 0; k < 9; k++) { const yy = y + inset + 18 + k * 44; g.lineBetween(x + inset + 10 + (k * 37) % 60, yy, x + w - inset - 20 - (k * 53) % 80, yy + (k % 2 ? 3 : -3)); }
    } else if (theme === 'usine') {
        g.fillStyle(light(t.face, 0.35), 0.35);
        for (let k = 0; k < 7; k++) g.fillRect(x + inset, y + inset + 30 + k * 56, w - inset * 2, 3);
    } else if (theme === 'espace') {
        for (let k = 0; k < 30; k++) { g.fillStyle(0xffffff, 0.25 + (k % 3) * 0.2); g.fillCircle(x + inset + (k * 71) % (w - inset * 2), y + inset + (k * 127) % (h - inset * 2), 1 + (k % 2)); }
    } else if (theme === 'glace') {
        g.lineStyle(2, 0xffffff, 0.45);
        for (let k = 0; k < 6; k++) { const xx = x + 30 + k * 55, yy = y + 40 + (k * 67) % 300; g.lineBetween(xx, yy, xx + 18, yy + 26); g.lineBetween(xx + 18, yy + 26, xx + 8, yy + 44); }
    } else {
        for (let k = 0; k < 14; k++) { g.fillStyle(k % 2 ? 0xffffff : t.accent, 0.35); g.fillCircle(x + inset + 14 + (k * 53) % (w - inset * 2 - 28), y + inset + 16 + (k * 89) % (h - inset * 2 - 30), 4); }
    }
    for (const [cx, cy] of [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]] as const) {
        g.fillStyle(dark(t.frame, 0.4)); g.fillCircle(cx, cy + 1, 5);
        g.fillStyle(light(t.frame, 0.45)); g.fillCircle(cx, cy, 4.5);
        g.lineStyle(1.5, dark(t.frame, 0.45)); g.lineBetween(cx - 2.5, cy - 2.5, cx + 2.5, cy + 2.5);
    }
}
/** One primitive of a plate shape, offset by `grow` units, in world pixels. */
function primitive(g: G, p: Primitive, ox: number, oy: number, rot: number, grow: number, dy = 0): void {
    const at = (x: number, y: number): [number, number] => {
        let px = x, py = y;
        for (let k = 0; k < rot; k++) [px, py] = [-py, px];
        return [ox + px * UNIT, oy + py * UNIT + dy];
    };
    if (p.t === 'circle') { const [cx, cy] = at(p.x, p.y); g.fillCircle(cx, cy, Math.max(1, (p.r + grow) * UNIT)); return; }
    if (p.t === 'rect') {
        const [ax, ay] = at(p.x0, p.y0), [bx, by] = at(p.x1, p.y1);
        const x0 = Math.min(ax, bx) - grow * UNIT, y0 = Math.min(ay, by) - grow * UNIT, w = Math.abs(bx - ax) + grow * UNIT * 2, h = Math.abs(by - ay) + grow * UNIT * 2;
        g.fillRoundedRect(x0, y0, w, h, Math.max(0.5, Math.min((p.r + grow) * UNIT, w / 2 - 0.1, h / 2 - 0.1)));
        return;
    }
    const pts = p.points.map(([x, y]) => at(x, y));
    if (grow > 0) {
        // Polygons grow by a thick stroke (round joins come from the circle caps).
        g.fillPoints(pts.map(([x, y]) => ({ x, y })), true);
        for (const [x, y] of pts) g.fillCircle(x, y, grow * UNIT);
        for (let i = 0; i < pts.length; i++) {
            const [x0, y0] = pts[i] ?? [0, 0], [x1, y1] = pts[(i + 1) % pts.length] ?? [0, 0], len = Math.hypot(x1 - x0, y1 - y0) || 1;
            const nx = -(y1 - y0) / len * grow * UNIT, ny = (x1 - x0) / len * grow * UNIT;
            g.fillPoints([{ x: x0 + nx, y: y0 + ny }, { x: x1 + nx, y: y1 + ny }, { x: x1 - nx, y: y1 - ny }, { x: x0 - nx, y: y0 - ny }], true);
        }
        return;
    }
    g.fillPoints(pts.map(([x, y]) => ({ x, y })), true);
}
const MATERIAL_ALPHA: Record<Material, number> = { plastique: 0.94, bois: 0.97, metal: 0.97, caoutchouc: 0.97, verre: 0.6, cristal: 0.68 };
export function plateColor(tint: number, material: Material): number {
    if (material === 'bois') return tint === 9 ? 0xc98a4b : mix(TINTS[tint] ?? 0xc98a4b, 0xc98a4b, 0.45);
    if (material === 'metal') return mix(TINTS[tint] ?? 0xa9b4c2, 0xb8c2cf, 0.55);
    if (material === 'caoutchouc') return mix(TINTS[tint] ?? 0x434a59, 0x2f3340, 0.6);
    if (material === 'verre') return mix(TINTS[tint] ?? 0x2ec6e6, 0xbff3ff, 0.45);
    if (material === 'cristal') return mix(TINTS[tint] ?? 0x8e44d8, 0xd9b8ff, 0.35);
    return TINTS[tint] ?? 0xa9b4c2;
}
export interface PlateLook { shape: string; x: number; y: number; rot: number; tint: number; material: Material }
/** A plate at board position (x, y): shadow, outline, body, top light, material marks and its holes.
 * `holes` are the board positions of the holes to show (a screw sits in some of them). */
export function plate(g: G, p: PlateLook, holes: readonly (readonly [number, number])[], alpha = 1, lift = 0): void {
    const s = shape(p.shape), [ox, oy] = toWorld(p.x, p.y), color = plateColor(p.tint, p.material), a = MATERIAL_ALPHA[p.material] * alpha;
    g.fillStyle(0x000000, 0.22 * alpha); for (const prim of s.prims) primitive(g, prim, ox + 3, oy, p.rot, 0.03, 6 + lift);
    g.fillStyle(dark(color, 0.55), Math.min(1, a + 0.1)); for (const prim of s.prims) primitive(g, prim, ox, oy, p.rot, 0.06);
    g.fillStyle(dark(color, 0.2), a); for (const prim of s.prims) primitive(g, prim, ox, oy, p.rot, 0, 2.5);
    g.fillStyle(color, a); for (const prim of s.prims) primitive(g, prim, ox, oy, p.rot, -0.02, -1);
    g.fillStyle(light(color, p.material === 'verre' || p.material === 'cristal' ? 0.7 : 0.38), 0.55 * alpha);
    for (const prim of s.prims) primitive(g, prim, ox, oy, p.rot, -0.16, -4);
    g.fillStyle(color, a); for (const prim of s.prims) primitive(g, prim, ox, oy, p.rot, -0.2, 1);
    if (p.material === 'bois') {
        g.lineStyle(1.5, dark(color, 0.25), 0.55 * alpha);
        for (const [hx, hy] of s.holes) { const [x, y] = toWorld(p.x + hx, p.y + hy); g.lineBetween(x - 12, y + 9, x + 12, y + 7); g.lineBetween(x - 10, y - 9, x + 8, y - 10); }
    }
    if (p.material === 'metal') {
        g.fillStyle(0xffffff, 0.3 * alpha);
        for (const [hx, hy] of s.holes) { const [x, y] = toWorld(p.x + hx, p.y + hy); g.fillRect(x - 13, y - 14, 26, 2); }
    }
    if (p.material === 'verre' || p.material === 'cristal') {
        g.lineStyle(3, 0xffffff, 0.55 * alpha);
        const [hx, hy] = s.holes[0] ?? [0, 0], [x, y] = toWorld(p.x + hx, p.y + hy);
        g.lineBetween(x - 14, y + 4, x - 4, y - 10);
    }
    for (const [hx, hy] of holes) hole(g, hx, hy, color, alpha);
}
export function hole(g: G, bx: number, by: number, color: number, alpha = 1): void {
    const [x, y] = toWorld(bx, by);
    g.fillStyle(dark(color, 0.45), alpha); g.fillCircle(x, y, 13);
    g.fillStyle(dark(color, 0.7), alpha); g.fillCircle(x, y + 1.5, 10.5);
    g.fillStyle(light(color, 0.35), 0.6 * alpha); g.fillEllipse(x, y + 10, 18, 4);
}
export interface ScrewLook { color: number; key?: boolean; lock?: boolean; tnt?: boolean; gold?: boolean; ice?: number; gear?: boolean; portal?: boolean; chain?: boolean }
const RAINBOW_STOPS = [0xe8382f, 0xf58a1f, 0xf7c51e, 0x3cb83a, 0x2ec6e6, 0x2f7de1, 0x8e44d8, 0xf06aa8];
/** A screw head seen from above (cross slot), centred at world (x, y). `turn` turns the slot (radians),
 * `dim` greys a blocked screw, `halo` draws the selection glow. */
export function screwHead(g: G, x: number, y: number, look: ScrewLook, r = 14, turn = 0, dim = 0, halo = 0): void {
    if (halo > 0) { g.fillStyle(0xfff3a0, 0.35 * halo); g.fillCircle(x, y, r * 1.9); g.fillStyle(0xffe14d, 0.45 * halo); g.fillCircle(x, y, r * 1.45); }
    if (look.gear) {
        g.fillStyle(dark(0x9aa6b5, 0.45));
        for (let k = 0; k < 8; k++) { const a = turn + k * Math.PI / 4; g.fillCircle(x + Math.cos(a) * r * 1.22, y + Math.sin(a) * r * 1.22, r * 0.3); }
        g.fillStyle(0x9aa6b5); g.fillCircle(x, y, r * 1.18);
        for (let k = 0; k < 8; k++) { const a = turn + k * Math.PI / 4; g.fillStyle(0xb9c4d1); g.fillCircle(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2, r * 0.24); }
    }
    if (look.portal) { g.lineStyle(4, 0xb46cff, 0.9); g.strokeCircle(x, y, r * 1.3); g.lineStyle(2, 0xf0d6ff, 0.9); g.strokeCircle(x, y, r * 1.12); }
    const base = look.color === RAINBOW ? 0xf7f7f7 : look.gold ? mix(SCREW_COLORS[look.color] ?? 0xffc928, 0xffc928, 0.15) : SCREW_COLORS[look.color] ?? 0x999999;
    const body = dim ? mix(base, 0x6d7280, 0.55 * dim) : base;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + r * 0.55, r * 2.1, r * 1.1);
    g.fillStyle(dark(body, 0.5)); g.fillCircle(x, y + 1.5, r + 1.5);
    if (look.color === RAINBOW) {
        for (let k = 0; k < 8; k++) {
            const a0 = turn + k * Math.PI / 4, a1 = a0 + Math.PI / 4;
            g.fillStyle(dim ? mix(RAINBOW_STOPS[k] ?? 0, 0x6d7280, 0.5 * dim) : RAINBOW_STOPS[k] ?? 0);
            g.fillPoints([{ x, y }, { x: x + Math.cos(a0) * r, y: y + Math.sin(a0) * r }, { x: x + Math.cos((a0 + a1) / 2) * r, y: y + Math.sin((a0 + a1) / 2) * r }, { x: x + Math.cos(a1) * r, y: y + Math.sin(a1) * r }], true);
        }
    } else { g.fillStyle(body); g.fillCircle(x, y, r); }
    g.fillStyle(0xffffff, 0.42 * (1 - dim * 0.6)); g.fillEllipse(x - r * 0.3, y - r * 0.42, r * 0.95, r * 0.5);
    if (look.gold) { g.lineStyle(2.5, 0xffd84a); g.strokeCircle(x, y, r - 1); }
    // Cross slot (an "x" as on the boards), turned while unscrewing.
    const slot = dark(body, 0.6);
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
        const c = Math.cos(a + turn), s = Math.sin(a + turn), l = r * 0.62, w = r * 0.18;
        g.fillStyle(slot);
        g.fillPoints([{ x: x - c * l - s * w, y: y - s * l + c * w }, { x: x + c * l - s * w, y: y + s * l + c * w }, { x: x + c * l + s * w, y: y + s * l - c * w }, { x: x - c * l + s * w, y: y - s * l - c * w }], true);
    }
    if (look.tnt) {
        g.fillStyle(0xb91f1f); g.fillRoundedRect(x - r * 0.95, y - r * 0.32, r * 1.9, r * 0.64, 3);
        g.fillStyle(0xffe14d); g.fillRect(x - r * 0.7, y - r * 0.12, r * 1.4, r * 0.24);
        g.fillStyle(0xffb000); g.fillCircle(x + r * 0.95, y - r * 0.85, r * 0.32); g.fillStyle(0xffffff); g.fillCircle(x + r * 0.95, y - r * 0.85, r * 0.13);
    }
    if (look.key) keyIcon(g, x + r * 0.55, y - r * 0.75, r * 0.75);
    if (look.lock) padlock(g, x + r * 0.62, y + r * 0.55, r * 0.62, 0xffc928);
    if (look.gold) { g.fillStyle(0xffffff, 0.95); star(g, x - r * 0.75, y - r * 0.8, r * 0.38); }
    if ((look.ice ?? 0) > 0) {
        g.fillStyle(0xbdf1ff, 0.55); g.fillRoundedRect(x - r * 1.25, y - r * 1.25, r * 2.5, r * 2.5, 6);
        g.lineStyle(2, 0xffffff, 0.9); g.strokeRoundedRect(x - r * 1.25, y - r * 1.25, r * 2.5, r * 2.5, 6);
        g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(x - r * 0.9, y - r * 0.4, x - r * 0.4, y - r * 0.9);
    }
}
export function star(g: G, x: number, y: number, r: number): void {
    const pts = Array.from({ length: 10 }, (_, k) => { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.45 : r; return { x: x + Math.cos(a) * q, y: y + Math.sin(a) * q }; });
    g.fillPoints(pts, true);
}
export function keyIcon(g: G, x: number, y: number, s: number): void {
    g.fillStyle(dark(0xffc928, 0.4)); g.fillCircle(x, y, s * 0.55); g.fillRect(x, y - s * 0.16, s * 1.2, s * 0.36);
    g.fillStyle(0xffc928); g.fillCircle(x, y, s * 0.45); g.fillRect(x, y - s * 0.1, s * 1.1, s * 0.22); g.fillRect(x + s * 0.8, y, s * 0.14, s * 0.35);
    g.fillStyle(dark(0xffc928, 0.4)); g.fillCircle(x, y, s * 0.18);
}
export function padlock(g: G, x: number, y: number, s: number, color = 0x7d8796): void {
    g.lineStyle(s * 0.28, dark(color, 0.35)); g.beginPath(); g.arc(x, y - s * 0.25, s * 0.42, Math.PI, 0); g.strokePath();
    g.fillStyle(dark(color, 0.35)); g.fillRoundedRect(x - s * 0.66, y - s * 0.28, s * 1.32, s * 1.0, s * 0.2);
    g.fillStyle(color); g.fillRoundedRect(x - s * 0.58, y - s * 0.22, s * 1.16, s * 0.86, s * 0.18);
    g.fillStyle(dark(color, 0.6)); g.fillCircle(x, y + s * 0.12, s * 0.15);
}
/** A crate (obstacle) over board point (bx, by): planks, braces, cracks as it weakens. */
export function crateArt(g: G, bx: number, by: number, hp: number, half = 0.75): void {
    const [cx, cy] = toWorld(bx, by), s = half * UNIT * 2, x = cx - s / 2, y = cy - s / 2;
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x + 3, y + 7, s, s, 8);
    g.fillStyle(0x7a4417); g.fillRoundedRect(x - 2, y - 2, s + 4, s + 4, 9);
    g.fillStyle(0xd88b3e); g.fillRoundedRect(x, y, s, s, 8);
    g.fillStyle(0xe8a35a); for (let k = 0; k < 3; k++) g.fillRect(x + 6, y + 6 + k * (s - 12) / 3, s - 12, (s - 12) / 3 - 4);
    g.fillStyle(0x9b5a22); g.fillRect(x + 4, y + s / 2 - 5, s - 8, 10); g.fillRect(x + 4, y + 4, 10, s - 8); g.fillRect(x + s - 14, y + 4, 10, s - 8);
    for (const [px, py] of [[x + 9, y + 9], [x + s - 9, y + 9], [x + 9, y + s - 9], [x + s - 9, y + s - 9]] as const) { g.fillStyle(0x5d3412); g.fillCircle(px, py, 3); }
    if (hp <= 1) { g.lineStyle(3, 0x4a2a0e); g.lineBetween(cx - 12, cy - 18, cx + 4, cy - 2); g.lineBetween(cx + 4, cy - 2, cx - 2, cy + 14); g.lineBetween(cx + 4, cy - 2, cx + 18, cy + 4); }
    g.fillStyle(0x3b2207, 0.85); g.fillRoundedRect(cx + s / 2 - 22, y - 8, 24, 18, 6);
    g.fillStyle(0xffffff); for (let k = 0; k < Math.min(3, hp); k++) g.fillCircle(cx + s / 2 - 16 + k * 6, y + 1, 2.2);
}
/** A chain from the held screw to its anchor. */
export function chainArt(g: G, from: readonly [number, number], to: readonly [number, number], alpha = 1): void {
    const [x0, y0] = toWorld(from[0], from[1]), [x1, y1] = toWorld(to[0], to[1]), len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(len / 11));
    for (let k = 0; k <= n; k++) {
        const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        g.lineStyle(4, 0x3d4350, alpha); g.strokeEllipse(x, y, k % 2 ? 12 : 7, k % 2 ? 7 : 12);
        g.lineStyle(2, 0xb9c3cf, alpha); g.strokeEllipse(x, y, k % 2 ? 12 : 7, k % 2 ? 7 : 12);
    }
}
/** A collection box with three sockets (planche: coloured toolbox, handle, light tray). */
export function boxArt(g: G, x: number, y: number, w: number, h: number, color: number | null, filled: number, done = 0): void {
    const c = color === null ? 0x8d97a6 : color === RAINBOW ? 0xb7bdc8 : SCREW_COLORS[color] ?? 0x8d97a6;
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x + 2, y + 6, w, h, 12);
    g.lineStyle(5, dark(c, 0.35)); g.strokeRoundedRect(x + w / 2 - 16, y - 6, 32, 14, 5);
    g.lineStyle(3, c); g.strokeRoundedRect(x + w / 2 - 16, y - 6, 32, 14, 5);
    g.fillStyle(dark(c, 0.35)); g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, 13);
    g.fillStyle(c); g.fillRoundedRect(x, y, w, h, 12);
    g.fillStyle(light(c, 0.35), 0.7); g.fillRoundedRect(x + 4, y + 3, w - 8, 6, 3);
    const tx = x + 8, ty = y + 11, tw = w - 16, th = h - 19;
    g.fillStyle(dark(c, 0.25)); g.fillRoundedRect(tx - 1, ty - 1, tw + 2, th + 2, 8);
    g.fillStyle(0xe9edf3); g.fillRoundedRect(tx, ty, tw, th, 8);
    for (let k = 0; k < 3; k++) {
        const sx = tx + tw * (k + 0.5) / 3, sy = ty + th / 2;
        if (k < filled) screwHead(g, sx, sy, { color: color ?? 0 }, Math.min(11, th * 0.4));
        else { g.fillStyle(0xbfc6d1); g.fillRoundedRect(sx - 3, sy - 9, 6, 18, 2); g.fillRoundedRect(sx - 9, sy - 3, 18, 6, 2); }
    }
    if (done > 0) {
        g.fillStyle(UI.green); g.fillCircle(x + w - 8, y + 2, 13 * done); g.lineStyle(4, 0xffffff);
        g.lineBetween(x + w - 14, y + 2, x + w - 9, y + 7); g.lineBetween(x + w - 9, y + 7, x + w - 1, y - 4);
    }
}
/** A small queued box (preview). */
export function miniBox(g: G, x: number, y: number, color: number, alpha = 1): void {
    const c = SCREW_COLORS[color] ?? 0x8d97a6;
    g.fillStyle(dark(c, 0.35), alpha); g.fillRoundedRect(x - 1, y - 1, 30, 20, 6);
    g.fillStyle(c, alpha); g.fillRoundedRect(x, y, 28, 18, 5);
    g.fillStyle(0xe9edf3, alpha); g.fillRoundedRect(x + 4, y + 5, 20, 9, 3);
    g.lineStyle(2, c, alpha); g.strokeRoundedRect(x + 9, y - 4, 10, 6, 2);
}
/** Buffer slot: empty well, or locked (dashed, padlock). */
export function slotArt(g: G, x: number, y: number, s: number, locked: boolean, warn = 0): void {
    if (locked) {
        g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(x, y, s, s, 10);
        g.lineStyle(2, 0xd5dbe6, 0.8);
        for (let k = 0; k < 4; k++) { const t = k / 4; g.lineBetween(x + 6 + t * (s - 12), y, x + 6 + (t + 0.12) * (s - 12), y); g.lineBetween(x + 6 + t * (s - 12), y + s, x + 6 + (t + 0.12) * (s - 12), y + s); g.lineBetween(x, y + 6 + t * (s - 12), x, y + 6 + (t + 0.12) * (s - 12)); g.lineBetween(x + s, y + 6 + t * (s - 12), x + s, y + 6 + (t + 0.12) * (s - 12)); }
        padlock(g, x + s / 2, y + s / 2 + 2, s * 0.28);
        return;
    }
    g.fillStyle(warn > 0 ? mix(0x9aa3b2, UI.red, warn) : 0x9aa3b2); g.fillRoundedRect(x - 1, y - 1, s + 2, s + 2, 11);
    g.fillStyle(0xe6eaf0); g.fillRoundedRect(x, y, s, s, 10);
    g.fillStyle(0xc9d0da); g.fillRoundedRect(x + 4, y + 4, s - 8, s - 8, 8);
}
/** HUD pill (level, coins, hearts). */
export function pill(g: G, x: number, y: number, w: number, h: number, color: number): void {
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x + 1, y + 3, w, h, h / 2);
    g.fillStyle(dark(color, 0.35)); g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, h / 2 + 1);
    g.fillStyle(color); g.fillRoundedRect(x, y, w, h, h / 2);
    g.fillStyle(0xffffff, 0.2); g.fillRoundedRect(x + 4, y + 2, w - 8, h * 0.35, h * 0.2);
}
export function coinIcon(g: G, x: number, y: number, r: number): void {
    g.fillStyle(0xb7790c); g.fillCircle(x, y + 1, r); g.fillStyle(0xffc928); g.fillCircle(x, y, r);
    g.fillStyle(0xffe27a); g.fillCircle(x, y, r * 0.7); g.fillStyle(0xd99a12); g.fillRoundedRect(x - r * 0.15, y - r * 0.45, r * 0.3, r * 0.9, 2);
}
export function heartIcon(g: G, x: number, y: number, r: number, color = 0xe5413b): void {
    g.fillStyle(dark(color, 0.35)); g.fillCircle(x - r * 0.5, y - r * 0.15, r * 0.62); g.fillCircle(x + r * 0.5, y - r * 0.15, r * 0.62); g.fillTriangle(x - r * 1.08, y + r * 0.05, x + r * 1.08, y + r * 0.05, x, y + r * 1.1);
    g.fillStyle(color); g.fillCircle(x - r * 0.5, y - r * 0.2, r * 0.55); g.fillCircle(x + r * 0.5, y - r * 0.2, r * 0.55); g.fillTriangle(x - r * 0.98, y, x + r * 0.98, y, x, y + r);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(x - r * 0.55, y - r * 0.38, r * 0.18);
}
export function starIcon(g: G, x: number, y: number, r: number, on: boolean): void {
    g.fillStyle(on ? 0xb7790c : 0x2b2f3d); star(g, x, y + 1.5, r * 1.12);
    g.fillStyle(on ? 0xffc928 : 0x596075); star(g, x, y, r);
    if (on) { g.fillStyle(0xfff3b0); star(g, x - r * 0.12, y - r * 0.15, r * 0.4); }
}
/** Boost icons (planche: undo arrow, bulb, hammer, bomb, drill) on a coloured rounded square. */
export const BOOST_COLORS = { undo: 0x2f8ff0, hint: 0xf7c51e, hammer: 0xf58a1f, bomb: 0xe5413b, drill: 0x3cb83a } as const;
export function boostIcon(g: G, kind: keyof typeof BOOST_COLORS, x: number, y: number, s: number, active = false): void {
    const c = BOOST_COLORS[kind], r = s * 0.22;
    g.fillStyle(dark(c, 0.4)); g.fillRoundedRect(x, y + 3, s, s - 3, r);
    g.fillStyle(active ? light(c, 0.35) : c); g.fillRoundedRect(x, y, s, s - 4, r);
    g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(x + 4, y + 3, s - 8, s * 0.22, r * 0.6);
    const cx = x + s / 2, cy = y + s / 2 - 2, u = s / 56;
    if (kind === 'undo') {
        g.lineStyle(7 * u, 0xffffff); g.beginPath(); g.arc(cx + 2 * u, cy + 2 * u, 12 * u, -Math.PI * 0.9, Math.PI * 0.75); g.strokePath();
        g.fillStyle(0xffffff); g.fillTriangle(cx - 18 * u, cy - 6 * u, cx - 4 * u, cy - 12 * u, cx - 10 * u, cy + 4 * u);
    } else if (kind === 'hint') {
        g.fillStyle(0xfff7c2); g.fillCircle(cx, cy - 4 * u, 12 * u); g.fillStyle(0xffffff); g.fillCircle(cx - 4 * u, cy - 8 * u, 4 * u);
        g.fillStyle(0x8d97a6); g.fillRoundedRect(cx - 7 * u, cy + 7 * u, 14 * u, 10 * u, 3 * u);
        g.lineStyle(2 * u, 0x5a6372); g.lineBetween(cx - 7 * u, cy + 11 * u, cx + 7 * u, cy + 11 * u);
    } else if (kind === 'hammer') {
        g.fillStyle(0x7b4a22); g.fillPoints([{ x: cx - 14 * u, y: cy + 16 * u }, { x: cx - 9 * u, y: cy + 20 * u }, { x: cx + 7 * u, y: cy - 2 * u }, { x: cx + 2 * u, y: cy - 6 * u }], true);
        g.fillStyle(0x8d97a6); g.fillPoints([{ x: cx - 4 * u, y: cy - 12 * u }, { x: cx + 6 * u, y: cy - 20 * u }, { x: cx + 18 * u, y: cy - 4 * u }, { x: cx + 8 * u, y: cy + 4 * u }], true);
        g.fillStyle(0xd6dde6); g.fillPoints([{ x: cx - 1 * u, y: cy - 12 * u }, { x: cx + 6 * u, y: cy - 17 * u }, { x: cx + 9 * u, y: cy - 13 * u }, { x: cx + 2 * u, y: cy - 8 * u }], true);
    } else if (kind === 'bomb') {
        g.fillStyle(0x2b2f3d); g.fillCircle(cx - 2 * u, cy + 4 * u, 13 * u); g.fillStyle(0x596075); g.fillCircle(cx - 6 * u, cy, 4 * u);
        g.lineStyle(3 * u, 0xc9a26b); g.lineBetween(cx + 6 * u, cy - 6 * u, cx + 12 * u, cy - 13 * u);
        g.fillStyle(0xffd84a); star(g, cx + 14 * u, cy - 15 * u, 7 * u); g.fillStyle(0xffffff); g.fillCircle(cx + 14 * u, cy - 15 * u, 2 * u);
    } else {
        g.fillStyle(0xf7c51e); g.fillRoundedRect(cx - 14 * u, cy - 10 * u, 22 * u, 12 * u, 4 * u); g.fillRoundedRect(cx - 10 * u, cy, 9 * u, 16 * u, 3 * u);
        g.fillStyle(0x2b2f3d); g.fillRect(cx - 9 * u, cy + 6 * u, 7 * u, 4 * u);
        g.fillStyle(0x8d97a6); g.fillRect(cx + 8 * u, cy - 7 * u, 6 * u, 6 * u); g.fillTriangle(cx + 14 * u, cy - 7 * u, cx + 14 * u, cy - 1 * u, cx + 20 * u, cy - 4 * u);
    }
}
/** Feedback: sparkle burst (success, reward), dust puff (unscrew), impact ring. `t` 0→1. */
export function burst(g: G, x: number, y: number, t: number, color = 0xffd84a, n = 8, radius = 34): void {
    for (let k = 0; k < n; k++) {
        const a = k * Math.PI * 2 / n + 0.3, d = radius * t;
        g.fillStyle(k % 2 ? 0xffffff : color, 1 - t); star(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 6 * (1 - t * 0.5));
    }
}
export function dust(g: G, x: number, y: number, t: number): void {
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + 0.4, d = 8 + 18 * t; g.fillStyle(0xe8e2d6, 0.55 * (1 - t)); g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + 6, 5 + 5 * t); }
}
export function impact(g: G, x: number, y: number, t: number, color = 0xffffff): void {
    g.lineStyle(4 * (1 - t) + 1, color, 1 - t); g.strokeCircle(x, y, 10 + 30 * t);
}
