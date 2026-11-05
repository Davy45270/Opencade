/**
 * Special bubbles, drawn as shapes before colours: each effect has its own silhouette and a
 * dark-and-white outline, so it reads on any bubble colour and without colour vision.
 * One description feeds the Phaser board and the 2D canvas of the pause legend.
 */
export type SpecialId = 'stone' | 'bomb' | 'ice2' | 'ice1' | 'lock' | 'star' | 'leaf' | 'crystal' | 'prism' | 'rainbow' | 'bumper';
type XY = readonly [number, number];
export type Prim =
    | { t: 'circle'; x: number; y: number; r: number; fill?: number; fillAlpha?: number; stroke?: number; lw?: number; pulse?: boolean }
    | { t: 'rect'; x: number; y: number; w: number; h: number; r: number; fill?: number; fillAlpha?: number; stroke?: number; lw?: number }
    | { t: 'poly'; pts: readonly XY[]; fill?: number; stroke?: number; lw?: number }
    | { t: 'line'; a: XY; b: XY; stroke: number; lw: number; pulse?: boolean }
    | { t: 'arc'; x: number; y: number; r: number; from: number; to: number; stroke: number; lw: number; spin?: boolean };
export interface Special {
    id: SpecialId;
    /** Name shown in the legend and the first-time tip. */
    name: string;
    /** One line: what the bubble does. */
    line: string;
    /** Drawn over an ordinary colour bubble (it keeps matching its colour). */
    onBubble: boolean;
    /** The colour-independent trait that tells it apart. */
    shape: string;
    glyph: readonly Prim[];
}
const INK = 0x10161f, WHITE = 0xffffff;
const star = (outer: number, inner: number, points: number, turn = -Math.PI / 2): XY[] =>
    Array.from({ length: points * 2 }, (_, i) => {
        const r = i % 2 ? inner : outer, a = turn + i * Math.PI / points;
        return [Math.round(Math.cos(a) * r * 100) / 100, Math.round(Math.sin(a) * r * 100) / 100] as const;
    });
const hexagon = (r: number): XY[] => Array.from({ length: 6 }, (_, i) => [Math.round(Math.cos(i * Math.PI / 3 + Math.PI / 6) * r * 100) / 100, Math.round(Math.sin(i * Math.PI / 3 + Math.PI / 6) * r * 100) / 100] as const);
const RAINBOW = [0xff5a6e, 0xffa53d, 0xffe14d, 0x5fd86b, 0x4aa8ff, 0xa66bff] as const;
export const SPECIALS: readonly Special[] = [
    { id: 'stone', name: 'Pierre', line: 'Pierre : coupez ses attaches', onBubble: true, shape: 'carré fissuré',
        glyph: [{ t: 'rect', x: -15, y: -15, w: 30, h: 30, r: 5, fill: 0x6b7585, stroke: INK, lw: 3 },
            { t: 'line', a: [-5, -15], b: [1, -4], stroke: INK, lw: 2.5 }, { t: 'line', a: [1, -4], b: [-5, 5], stroke: INK, lw: 2.5 },
            { t: 'line', a: [-5, 5], b: [0, 15], stroke: INK, lw: 2.5 }, { t: 'line', a: [5, -10], b: [11, -10], stroke: 0xc9d1dc, lw: 2 }] },
    { id: 'bomb', name: 'Bombe', line: 'Bombe : éclate ses six voisines', onBubble: true, shape: 'bombe à mèche, étincelle clignotante',
        glyph: [{ t: 'circle', x: 0, y: 2, r: 11, fill: INK, stroke: WHITE, lw: 2.5 }, { t: 'line', a: [6, -7], b: [11, -14], stroke: WHITE, lw: 3 },
            { t: 'circle', x: -4, y: -2, r: 2.5, fill: WHITE },
            ...([[0, -5], [5, 0], [0, 5], [-5, 0]] as const).map(([dx, dy]): Prim => ({ t: 'line', a: [13, -16], b: [13 + dx, -16 + dy], stroke: 0xffd23f, lw: 2.5, pulse: true }))] },
    { id: 'ice2', name: 'Glace', line: 'Glace : deux éclats voisins la libèrent', onBubble: true, shape: 'double cadre carré',
        glyph: [{ t: 'rect', x: -16, y: -16, w: 32, h: 32, r: 3, fill: 0xe6f8ff, fillAlpha: 0.5, stroke: WHITE, lw: 3 },
            { t: 'rect', x: -10, y: -10, w: 20, h: 20, r: 2, stroke: 0x1d5f8a, lw: 2.5 },
            { t: 'line', a: [0, -6], b: [0, 6], stroke: 0x1d5f8a, lw: 2 }, { t: 'line', a: [-5, -3], b: [5, 3], stroke: 0x1d5f8a, lw: 2 }, { t: 'line', a: [-5, 3], b: [5, -3], stroke: 0x1d5f8a, lw: 2 }] },
    { id: 'ice1', name: 'Glace fêlée', line: 'Glace fêlée : un éclat voisin suffit', onBubble: true, shape: 'cadre simple fissuré',
        glyph: [{ t: 'rect', x: -16, y: -16, w: 32, h: 32, r: 3, fill: 0xe6f8ff, fillAlpha: 0.3, stroke: WHITE, lw: 3 },
            { t: 'line', a: [-13, -13], b: [-1, -3], stroke: 0x1d5f8a, lw: 2.5 }, { t: 'line', a: [-1, -3], b: [-4, 4], stroke: 0x1d5f8a, lw: 2.5 }, { t: 'line', a: [-4, 4], b: [13, 13], stroke: 0x1d5f8a, lw: 2.5 }] },
    { id: 'lock', name: 'Verrou', line: 'Verrou : un éclat voisin l’ouvre', onBubble: true, shape: 'cadenas',
        glyph: [{ t: 'arc', x: 0, y: -4, r: 7, from: Math.PI, to: 2 * Math.PI, stroke: INK, lw: 6 }, { t: 'arc', x: 0, y: -4, r: 7, from: Math.PI, to: 2 * Math.PI, stroke: 0xffe7a8, lw: 3 },
            { t: 'rect', x: -11, y: -4, w: 22, h: 16, r: 3, fill: 0xd9a441, stroke: INK, lw: 2 }, { t: 'circle', x: 0, y: 3, r: 2.5, fill: INK }] },
    { id: 'star', name: 'Étoile', line: 'Étoiles : coupez leurs attaches', onBubble: true, shape: 'étoile à cinq branches',
        glyph: [{ t: 'poly', pts: star(15, 6.5, 5), fill: 0xffd23f, stroke: INK, lw: 2.5 }] },
    { id: 'leaf', name: 'Feuille', line: 'Feuille : balaie toute sa rangée', onBubble: true, shape: 'feuille et flèches gauche-droite',
        glyph: [{ t: 'poly', pts: [[-11, 9], [-4, -6], [11, -9], [5, 6]], fill: 0xffb14a, stroke: 0x4a2206, lw: 2 }, { t: 'line', a: [-12, 10], b: [11, -9], stroke: 0x4a2206, lw: 2 },
            { t: 'poly', pts: [[-20, 0], [-14, -5], [-14, 5]], fill: WHITE, stroke: INK, lw: 1.5 }, { t: 'poly', pts: [[20, 0], [14, -5], [14, 5]], fill: WHITE, stroke: INK, lw: 1.5 }] },
    { id: 'crystal', name: 'Cristal', line: 'Cristal : fixe, retient ses voisines', onBubble: false, shape: 'hexagone à facettes',
        glyph: [{ t: 'poly', pts: hexagon(19), fill: 0x9fe8ff, stroke: 0x1f5f86, lw: 3 }, { t: 'poly', pts: hexagon(15), stroke: WHITE, lw: 1.5 },
            { t: 'line', a: [0, -15], b: [0, 15], stroke: 0x1f5f86, lw: 1.5 }, { t: 'line', a: [-13, -7.5], b: [13, 7.5], stroke: 0x1f5f86, lw: 1.5 }] },
    { id: 'prism', name: 'Prisme', line: 'Prisme : joker de toutes les couleurs', onBubble: false, shape: 'anneau en six segments, étincelle centrale',
        glyph: [{ t: 'circle', x: 0, y: 0, r: 18, fill: 0xf4f7ff, stroke: INK, lw: 1.5 },
            ...RAINBOW.map((stroke, i): Prim => ({ t: 'arc', x: 0, y: 0, r: 14, from: i * Math.PI / 3 + 0.12, to: (i + 1) * Math.PI / 3 - 0.12, stroke, lw: 5 })),
            { t: 'poly', pts: star(8, 2.5, 4), fill: INK }] },
    { id: 'rainbow', name: 'Tir arc-en-ciel', line: 'Arc-en-ciel : prend la couleur touchée', onBubble: true, shape: 'anneau blanc et pointillés qui tournent',
        glyph: [{ t: 'circle', x: 0, y: 0, r: 22, stroke: WHITE, lw: 3 },
            ...RAINBOW.map((stroke, i): Prim => ({ t: 'arc', x: 0, y: 0, r: 26, from: i * Math.PI / 3, to: i * Math.PI / 3 + 0.6, stroke, lw: 4, spin: true }))] },
    { id: 'bumper', name: 'Barre dorée', line: 'Barre dorée : la bille rebondit', onBubble: false, shape: 'barre rayée verticale',
        glyph: [{ t: 'rect', x: -5, y: -18, w: 10, h: 36, r: 4, fill: 0xffb867, stroke: INK, lw: 2 },
            ...[-10, -2, 6].map((y): Prim => ({ t: 'line', a: [-4, y + 4], b: [4, y - 2], stroke: INK, lw: 2 }))] },
];
/** On David's rainbow marble the prism keeps its colour-free trait: the dark sparkle, ringed in white. */
export const PRISM_MARK: readonly Prim[] = [{ t: 'circle', x: 0, y: 0, r: 9.5, fill: WHITE, fillAlpha: 0.9, stroke: INK, lw: 1.5 }, { t: 'poly', pts: star(8, 2.5, 4), fill: INK }];
export const SPECIAL = Object.fromEntries(SPECIALS.map(s => [s.id, s])) as Readonly<Record<SpecialId, Special>>;
/** Which special a board cell shows (P02 ice is a lock; ice counts its layers). */
export function cellSpecial(cell: { kind?: string; ice?: number }, catalogue?: string): SpecialId | null {
    switch (cell.kind) {
        case 'stone': case 'bomb': case 'star': case 'leaf': case 'crystal': case 'prism': return cell.kind;
        case 'ice': return catalogue === 'P02' ? 'lock' : cell.ice === 1 ? 'ice1' : 'ice2';
        default: return null;
    }
}
/** Minimal Phaser Graphics surface the glyphs need. */
export interface GlyphGraphics {
    fillStyle(color: number, alpha?: number): unknown;
    lineStyle(width: number, color: number, alpha?: number): unknown;
    fillCircle(x: number, y: number, r: number): unknown;
    strokeCircle(x: number, y: number, r: number): unknown;
    fillRoundedRect(x: number, y: number, w: number, h: number, r: number): unknown;
    strokeRoundedRect(x: number, y: number, w: number, h: number, r: number): unknown;
    fillPoints(points: { x: number; y: number }[], close?: boolean): unknown;
    strokePoints(points: { x: number; y: number }[], close?: boolean): unknown;
    lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
    beginPath(): unknown;
    arc(x: number, y: number, r: number, from: number, to: number): unknown;
    strokePath(): unknown;
}
/**
 * Draws a glyph centred on (x, y). `time` (ms) drives the blinking spark and the spinning ring;
 * pass 0 for a still image (reduced motion).
 */
export function drawGlyph(g: GlyphGraphics, glyph: readonly Prim[], x: number, y: number, time = 0, scale = 1): void {
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(time / 180)), spin = time / 900;
    for (const p of glyph) {
        if (p.t === 'circle') {
            const alpha = p.pulse ? pulse : 1;
            if (p.fill !== undefined) { g.fillStyle(p.fill, (p.fillAlpha ?? 1) * alpha); g.fillCircle(x + p.x * scale, y + p.y * scale, p.r * scale); }
            if (p.stroke !== undefined) { g.lineStyle((p.lw ?? 2) * scale, p.stroke, alpha); g.strokeCircle(x + p.x * scale, y + p.y * scale, p.r * scale); }
        } else if (p.t === 'rect') {
            if (p.fill !== undefined) { g.fillStyle(p.fill, p.fillAlpha ?? 1); g.fillRoundedRect(x + p.x * scale, y + p.y * scale, p.w * scale, p.h * scale, p.r * scale); }
            if (p.stroke !== undefined) { g.lineStyle((p.lw ?? 2) * scale, p.stroke, 1); g.strokeRoundedRect(x + p.x * scale, y + p.y * scale, p.w * scale, p.h * scale, p.r * scale); }
        } else if (p.t === 'poly') {
            const pts = p.pts.map(([px, py]) => ({ x: x + px * scale, y: y + py * scale }));
            if (p.fill !== undefined) { g.fillStyle(p.fill, 1); g.fillPoints(pts, true); }
            if (p.stroke !== undefined) { g.lineStyle((p.lw ?? 2) * scale, p.stroke, 1); g.strokePoints(pts, true); }
        } else if (p.t === 'line') {
            g.lineStyle(p.lw * scale, p.stroke, p.pulse ? pulse : 1); g.lineBetween(x + p.a[0] * scale, y + p.a[1] * scale, x + p.b[0] * scale, y + p.b[1] * scale);
        } else {
            const turn = p.spin ? spin : 0;
            g.lineStyle(p.lw * scale, p.stroke, 1); g.beginPath(); g.arc(x + p.x * scale, y + p.y * scale, p.r * scale, p.from + turn, p.to + turn); g.strokePath();
        }
    }
}
const css = (color: number, alpha = 1): string => `rgba(${String(color >> 16 & 255)},${String(color >> 8 & 255)},${String(color & 255)},${String(alpha)})`;
/** Same glyph on a 2D canvas context, for the pause legend. */
export function canvasGraphics(c: CanvasRenderingContext2D): GlyphGraphics {
    let fill = '#000', stroke = '#000', width = 1;
    const path = (pts: { x: number; y: number }[]): void => { c.beginPath(); pts.forEach((p, i) => { if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); c.closePath(); };
    const rounded = (x: number, y: number, w: number, h: number, r: number): void => { c.beginPath(); c.roundRect(x, y, w, h, r); };
    const self: GlyphGraphics = {
        fillStyle: (color, alpha = 1) => { fill = css(color, alpha); return self; },
        lineStyle: (w, color, alpha = 1) => { width = w; stroke = css(color, alpha); return self; },
        fillCircle: (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fillStyle = fill; c.fill(); return self; },
        strokeCircle: (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); return self; },
        fillRoundedRect: (x, y, w, h, r) => { rounded(x, y, w, h, r); c.fillStyle = fill; c.fill(); return self; },
        strokeRoundedRect: (x, y, w, h, r) => { rounded(x, y, w, h, r); c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); return self; },
        fillPoints: pts => { path(pts); c.fillStyle = fill; c.fill(); return self; },
        strokePoints: pts => { path(pts); c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = 'round'; c.stroke(); return self; },
        lineBetween: (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = 'round'; c.stroke(); return self; },
        beginPath: () => { c.beginPath(); return self; },
        arc: (x, y, r, from, to) => { c.arc(x, y, r, from, to); return self; },
        strokePath: () => { c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = 'round'; c.stroke(); return self; },
    };
    return self;
}
export const TIP_KEY = 'bubble-lab:specials-seen:v1';
interface TipStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/**
 * First-time tips: one line per special, shown once ever. Every storage access is guarded:
 * without storage (private mode, blocked site data) each tip shows once per session.
 */
export class SpecialTips {
    private seen = new Set<string>();
    current: SpecialId | null = null;
    remaining = 0;
    constructor(private storage?: () => TipStorage | undefined, readonly duration = 4000) {
        try {
            const raw = this.storage?.()?.getItem(TIP_KEY);
            const list: unknown = raw ? JSON.parse(raw) : [];
            if (Array.isArray(list)) for (const id of list) if (typeof id === 'string') this.seen.add(id);
        } catch { /* Unavailable or corrupt storage: start fresh. */ }
    }
    has(id: SpecialId): boolean { return this.seen.has(id); }
    /** Advances the shown tip by `delta` ms of play, then picks the next unseen special on the board. */
    update(present: Iterable<SpecialId>, delta: number): SpecialId | null {
        if (this.current) {
            this.remaining -= delta;
            if (this.remaining > 0) return this.current;
            this.current = null;
        }
        for (const id of present) {
            if (this.seen.has(id)) continue;
            this.seen.add(id); this.current = id; this.remaining = this.duration;
            try { this.storage?.()?.setItem(TIP_KEY, JSON.stringify([...this.seen])); } catch { /* Kept in memory only. */ }
            return id;
        }
        return null;
    }
    clear(): void { this.current = null; this.remaining = 0; }
}
