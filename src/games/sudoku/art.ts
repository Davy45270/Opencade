import type Phaser from 'phaser';
type G = Phaser.GameObjects.Graphics;
/**
 * Sudoku drawing, shared by the scene and the catalogue card (one source, no drift). Everything is code: the digits are
 * vector glyphs (no font, so a wider system font never moves them), tiles and frames follow the reference sheet
 * (rounded cartoon tiles, one colour per digit, blue grid frame, yellow selection). Logical stage 360 × 640.
 */
export const INK = 0x1e2a5a;
export const PALETTE = {
    sky: 0xeef1ff, skyLow: 0xf9f3ff, dots: 0xd9dcfb, panel: 0xffffff, panelEdge: 0xc9c2f2,
    frame: 0x4a8fe0, frameDark: 0x1d4f9a, cell: 0xffffff, cellAlt: 0xf1f5ff, thin: 0xb7c6e6,
    given: INK, player: 0x2f6fe0, conflict: 0xd8343f, conflictFill: 0xffdcdf, selected: 0xffd84a, selectedEdge: 0xe0a800,
    peer: 0xe2eeff, same: 0xbcd8ff, hint: 0x8e4fe0, hintFill: 0xf0e4ff, note: 0x434a78, done: 0x4cbb47,
    bubble: 0xfffbe8, bubbleEdge: 0xf0c541, button: 0xffffff, buttonEdge: 0x8f8bd6, pressed: 0xffe9a6,
} as const;
/** One colour per digit, as on the reference sheet's tiles. */
export const DIGIT_COLORS = [0x2f8be6, 0xee5fa7, 0xf2902f, 0xe9b20e, 0x43b23f, 0x1fb5cc, 0x9b5de5, 0x3a55c4, 0xe5484d] as const;
export interface Rect { x: number; y: number; w: number; h: number }
export interface PadKey extends Rect { value: number }
export type ActionId = 'notes' | 'undo' | 'hint';
export interface Layout { size: number; width: number; height: number; grid: Rect & { cell: number }; panel: Rect; pad: PadKey[]; actions: (Rect & { id: ActionId })[]; hud: Rect; hero: Rect; bubble: Rect }
/**
 * Where everything sits for an N × N grid on a W × H play area (the canvas fills the screen, 1 unit = 1 CSS px).
 * Pad keys and buttons keep 56 px; the grid takes what is left, up to the column width; spare height is shared out
 * between the bands so the game fills the screen instead of floating in the middle.
 */
export function layout(size: number, width = 360, height = 640): Layout {
    const margin = 8, column = Math.min(width - 2 * margin, 520), x0 = (width - column) / 2;
    const keys = [...Array.from({ length: size }, (_, i) => i + 1), 0];
    const perRow = Math.ceil(keys.length / (keys.length > 5 ? 2 : 1)), rows = Math.ceil(keys.length / perRow);
    const kh = 56, rowGap = 6, padH = rows * kh + (rows - 1) * rowGap, actionH = 56, hudH = 58, bubbleH = 52, frame = 9;
    const fixed = 4 + hudH + 6 + bubbleH + 8 + 2 * frame + 10 + padH + 10 + actionH + 6;
    const cell = Math.max(16, Math.floor(Math.min(column - 2 * frame, height - fixed, size === 4 ? 340 : 520) / size));
    const side = cell * size, spare = Math.max(0, height - fixed - side), gap = Math.min(28, spare / 5);
    let y = 4 + Math.max(0, spare - 5 * gap) / 2;
    const hud = { x: x0, y, w: column, h: hudH }; y += hudH + 6 + gap * .5;
    // The companion stands at the right of its speech bubble (the top right corner is the shell's ⏸ on phones).
    const bubble = { x: x0, y, w: column - 72, h: bubbleH }, hero = { x: x0 + column - 68, y: y - 10, w: 68, h: 68 }; y += bubbleH + 8 + gap;
    const panel = { x: x0, y, w: column, h: side + 2 * frame + 4 };
    const grid = { x: Math.round((width - side) / 2), y: Math.round(y + frame + 2), w: side, h: side, cell }; y += panel.h + 6 + gap * 1.5;
    const kw = Math.min(72, (column - (perRow - 1) * 8) / perRow), gapX = Math.min(12, (column - perRow * kw) / Math.max(1, perRow - 1));
    const pad = keys.map((value, k) => {
        const row = Math.floor(k / perRow), inRow = Math.min(perRow, keys.length - row * perRow), col = k % perRow;
        const left = (width - (inRow * kw + (inRow - 1) * gapX)) / 2;
        return { value, x: left + col * (kw + gapX), y: y + row * (kh + rowGap), w: kw, h: kh };
    });
    y += padH + 10 + gap;
    const aw = Math.min(150, (column - 18) / 3), ax = (width - 3 * aw - 18) / 2;
    const actions = (['notes', 'undo', 'hint'] as const).map((id, k) => ({ id, x: ax + k * (aw + 9), y, w: aw, h: actionH }));
    return { size, width, height, grid, panel, pad, actions, hud, hero, bubble };
}
export type Hit = { kind: 'cell'; index: number } | { kind: 'pad'; value: number } | { kind: 'action'; id: ActionId } | null;
const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
/** What a tap or a click at logical (x, y) touches. */
export function hitTest(l: Layout, x: number, y: number): Hit {
    if (inside(l.grid, x, y)) return { kind: 'cell', index: Math.floor((y - l.grid.y) / l.grid.cell) * l.size + Math.floor((x - l.grid.x) / l.grid.cell) };
    const key = l.pad.find(k => inside(k, x, y)); if (key) return { kind: 'pad', value: key.value };
    const action = l.actions.find(a => inside(a, x, y)); if (action) return { kind: 'action', id: action.id };
    return null;
}
/** How a cell reads. A conflict is never colour alone: hatching across the cell and a "!" badge in its corner (AC03). */
export interface CellLook { fill: number; digit: number; pattern: 'hatch' | null; badge: '!' | null; ring: number | null; bold: boolean }
export interface CellState { given: boolean; value: number; conflict: boolean; selected: boolean; peer: boolean; same: boolean; hint: boolean; altBox: boolean }
export function cellLook(s: CellState): CellLook {
    const fill = s.conflict ? PALETTE.conflictFill : s.selected ? PALETTE.selected : s.hint ? PALETTE.hintFill : s.same ? PALETTE.same : s.peer ? PALETTE.peer : s.altBox ? PALETTE.cellAlt : PALETTE.cell;
    return { fill, digit: s.conflict && !s.given ? PALETTE.conflict : s.given ? PALETTE.given : PALETTE.player,
        pattern: s.conflict ? 'hatch' : null, badge: s.conflict ? '!' : null, ring: s.selected ? PALETTE.selectedEdge : s.hint ? PALETTE.hint : null, bold: s.given };
}
// Vector digits on a unit box (x 0..1, y 0..1): polylines and elliptic arcs, round joints.
type Stroke = readonly (readonly [number, number])[];
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): [number, number][] {
    const steps = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 15)), out: [number, number][] = [];
    for (let i = 0; i <= steps; i++) { const a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return out;
}
const six: Stroke[] = [arc(.5, .68, .46, .31, 0, 360), arc(.96, .68, .92, .66, 252, 180)];
export const GLYPHS: Record<number, readonly Stroke[]> = {
    1: [[[.22, .22], [.56, 0], [.56, 1]], [[.24, 1], [.88, 1]]],
    2: [[...arc(.5, .28, .44, .28, 200, 382), [.04, 1], [.98, 1]]],
    3: [arc(.5, .25, .42, .25, 205, 450), arc(.5, .72, .48, .28, 270, 520)],
    4: [[[.72, 1], [.72, 0], [.02, .68], [1, .68]]],
    5: [[[.9, 0], [.18, 0], [.12, .45]], arc(.5, .68, .48, .32, 220, 520)],
    6: six,
    7: [[[0, 0], [1, 0], [.34, 1]]],
    8: [arc(.5, .25, .4, .25, 0, 360), arc(.5, .72, .48, .28, 0, 360)],
    9: six.map(s => s.map(([x, y]) => [1 - x, 1 - y] as const)),
};
/** Digit `d` centred on (cx, cy), `h` tall, stroke `weight` × h; `outline` paints a darker rim under it first. */
export function digit(g: G, d: number, cx: number, cy: number, h: number, color: number, weight = .14, outline?: number): void {
    const strokes = GLYPHS[d]; if (!strokes) return;
    const w = h * .58, x0 = cx - w / 2, y0 = cy - h / 2;
    const pass = (width: number, c: number): void => {
        g.lineStyle(width, c, 1); g.fillStyle(c, 1);
        for (const s of strokes) {
            const pts = s.map(([x, y]) => ({ x: x0 + x * w, y: y0 + y * h }));
            g.strokePoints(pts, false, false);
            for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
        }
    };
    if (outline !== undefined) pass(h * weight + Math.max(2, h * .08), outline);
    pass(h * weight, color);
}
/** Soft sky and polka dots over the whole play area (baked once per size: it never moves). */
export function backdrop(g: G, width = 360, height = 640): void {
    g.fillStyle(PALETTE.sky); g.fillRect(0, 0, width, height);
    g.fillStyle(PALETTE.skyLow); g.fillRect(0, height / 2, width, height / 2);
    g.fillStyle(PALETTE.dots, .6);
    for (let y = 10; y < height; y += 26) for (let x = Math.round(y / 26) % 2 ? 4 : 17; x < width; x += 26) g.fillCircle(x, y, 2);
}
export interface GridView {
    size: number; boxRows: number; boxCols: number;
    givens: readonly number[]; values: readonly number[]; notes: readonly (readonly number[])[];
    selected: number | null; conflicts: readonly number[]; hintCells: readonly number[];
}
function hatch(g: G, x: number, y: number, s: number, color: number): void {
    g.lineStyle(Math.max(1.5, s * .05), color, .55);
    for (let k = -s; k < s; k += s / 5) g.lineBetween(x + Math.max(0, k), y + Math.max(0, -k), x + Math.min(s, s + k), y + Math.min(s, s - k));
}
/** The board: frame, cells (highlights, conflict hatching and badge), digits and notes. */
export function drawGrid(g: G, l: Layout, v: GridView): void {
    const { x, y, cell } = l.grid, n = v.size, side = cell * n, p = l.panel;
    g.fillStyle(PALETTE.panelEdge, .5); g.fillRoundedRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4, 18);
    g.fillStyle(PALETTE.panel); g.fillRoundedRect(p.x, p.y, p.w, p.h, 16);
    g.fillStyle(PALETTE.frameDark); g.fillRoundedRect(x - 9, y - 7, side + 18, side + 18, 14);
    g.fillStyle(PALETTE.frame); g.fillRoundedRect(x - 8, y - 8, side + 16, side + 16, 13);
    g.fillStyle(PALETTE.cell); g.fillRect(x - 1, y - 1, side + 2, side + 2);
    const sel = v.selected, selValue = sel === null ? 0 : v.values[sel] ?? 0, bad = new Set(v.conflicts), hinted = new Set(v.hintCells);
    const boxOf = (i: number): number => Math.floor(Math.floor(i / n) / v.boxRows) * (n / v.boxCols) + Math.floor(i % n / v.boxCols);
    for (let i = 0; i < n * n; i++) {
        const r = Math.floor(i / n), c = i % n, cx = x + c * cell, cy = y + r * cell, value = v.values[i] ?? 0, b = boxOf(i);
        const peer = sel !== null && (Math.floor(sel / n) === r || sel % n === c || boxOf(sel) === b);
        const look = cellLook({ given: Boolean(v.givens[i]), value, conflict: bad.has(i), selected: sel === i, peer, same: selValue > 0 && value === selValue, hint: hinted.has(i),
            altBox: (Math.floor(b / (n / v.boxCols)) + b % (n / v.boxCols)) % 2 === 1 });
        g.fillStyle(look.fill); g.fillRect(cx, cy, cell, cell);
        if (look.pattern) hatch(g, cx, cy, cell, PALETTE.conflict);
        if (value) digit(g, value, cx + cell / 2, cy + cell / 2 + 1, cell * .58, look.digit, look.bold ? .15 : .12);
        else {
            const notes = v.notes[i] ?? [], across = n === 6 ? 3 : n === 4 ? 2 : 3, rowsN = Math.ceil(n / across);
            for (const d of notes) {
                // Inset from the cell border so the selection ring never covers a note.
                const inset = cell * .08, sub = cell - 2 * inset, k = d - 1;
                const nx = cx + inset + (k % across + .5) * sub / across, ny = cy + inset + (Math.floor(k / across) + .5) * sub / rowsN;
                digit(g, d, nx, ny, sub / rowsN * .84, sel !== null && d === selValue ? PALETTE.player : PALETTE.note, .15);
            }
        }
        if (look.badge) {
            const bx = cx + cell - cell * .17, by = cy + cell * .17, br = Math.max(5, cell * .15);
            g.fillStyle(PALETTE.conflict); g.fillCircle(bx, by, br);
            g.lineStyle(Math.max(1.6, br * .32), PALETTE.cell); g.lineBetween(bx, by - br * .55, bx, by + br * .1); g.fillStyle(PALETTE.cell); g.fillCircle(bx, by + br * .5, br * .17);
        }
    }
    // Thin cell lines, then thick block lines.
    g.lineStyle(1, PALETTE.thin);
    for (let k = 1; k < n; k++) { g.lineBetween(x + k * cell, y, x + k * cell, y + side); g.lineBetween(x, y + k * cell, x + side, y + k * cell); }
    g.lineStyle(3, PALETTE.frameDark);
    for (let k = v.boxCols; k < n; k += v.boxCols) g.lineBetween(x + k * cell, y, x + k * cell, y + side);
    for (let k = v.boxRows; k < n; k += v.boxRows) g.lineBetween(x, y + k * cell, x + side, y + k * cell);
    g.strokeRect(x, y, side, side);
    // Rings on top of the lines: selection (yellow) or hinted cells (purple).
    for (const i of [...hinted, ...(sel === null ? [] : [sel])]) {
        const cx = x + i % n * cell, cy = y + Math.floor(i / n) * cell;
        g.lineStyle(3, i === sel ? PALETTE.selectedEdge : PALETTE.hint); g.strokeRoundedRect(cx + 1.5, cy + 1.5, cell - 3, cell - 3, Math.min(8, cell * .18));
    }
}
function tile(g: G, r: Rect, color: number, pressed = false): void {
    g.fillStyle(0x000000, .18); g.fillRoundedRect(r.x + 1, r.y + 4, r.w, r.h, 14);
    g.fillStyle(color); g.fillRoundedRect(r.x, r.y + (pressed ? 3 : 0), r.w, r.h - 1, 14);
    g.fillStyle(0xffffff, .28); g.fillRoundedRect(r.x + 5, r.y + 4 + (pressed ? 3 : 0), r.w - 10, r.h * .32, 9);
}
/** Number pad: a coloured tile per digit (dimmed with a tick once all N are placed), and the eraser. */
export function drawPad(g: G, l: Layout, counts: readonly number[], notesMode: boolean): void {
    for (const k of l.pad) {
        if (k.value === 0) {
            tile(g, k, PALETTE.button);
            g.lineStyle(2, PALETTE.buttonEdge); g.strokeRoundedRect(k.x, k.y, k.w, k.h - 1, 14);
            // Eraser: a tilted pink block with a blue sleeve, ink outline (as on the reference sheet).
            const cx = k.x + k.w / 2, cy = k.y + k.h / 2, s = Math.min(k.w, k.h) * .3;
            const at = (u: number, v: number) => ({ x: cx + (u - v) * s * .72, y: cy + (u + v) * s * .72 - (u - v) * s * .1 });
            const body = [at(-1.2, -.5), at(1.2, -.5), at(1.2, .5), at(-1.2, .5)], sleeve = [at(-.1, -.5), at(.55, -.5), at(.55, .5), at(-.1, .5)];
            g.fillStyle(0xf47fae); g.fillPoints(body, true);
            g.fillStyle(0x6fa8ff); g.fillPoints(sleeve, true);
            g.lineStyle(2.5, INK); g.strokePoints(body, true, true);
            continue;
        }
        const full = (counts[k.value - 1] ?? 0) >= l.size, color = DIGIT_COLORS[k.value - 1] ?? INK;
        tile(g, k, full ? 0xc9cbd6 : color);
        if (notesMode) {
            // Notes mode: a small digit in the corner of a white window, as a pencilled candidate.
            g.fillStyle(0xffffff, .92); g.fillRoundedRect(k.x + 8, k.y + 7, k.w - 16, k.h - 15, 9);
            digit(g, k.value, k.x + k.w * .34, k.y + k.h * .36, k.h * .34, full ? 0x8b8ea0 : color, .16);
        } else digit(g, k.value, k.x + k.w / 2, k.y + k.h / 2 - 1, k.h * .56, 0xffffff, .16, full ? 0x8b8ea0 : INK);
        if (full) { g.lineStyle(4, PALETTE.done); g.strokePoints([{ x: k.x + k.w - 22, y: k.y + 12 }, { x: k.x + k.w - 15, y: k.y + 19 }, { x: k.x + k.w - 5, y: k.y + 6 }], false, false); }
    }
}
/** Notes (pencil), Undo (curved arrow) and Hint (bulb) buttons; the notes button stays pressed while notes mode is on. */
export function drawActions(g: G, l: Layout, notesMode: boolean, canUndo: boolean): void {
    for (const a of l.actions) {
        const on = a.id === 'notes' && notesMode;
        tile(g, a, on ? PALETTE.pressed : PALETTE.button, on);
        g.lineStyle(on ? 3 : 2, on ? PALETTE.selectedEdge : PALETTE.buttonEdge); g.strokeRoundedRect(a.x, a.y + (on ? 3 : 0), a.w, a.h - 1, 14);
        const cx = a.x + 24, cy = a.y + a.h / 2 + (on ? 3 : 0);
        if (a.id === 'notes') {
            g.fillStyle(0xf4b740); g.fillPoints([{ x: cx - 11, y: cy + 7 }, { x: cx + 5, y: cy - 9 }, { x: cx + 10, y: cy - 4 }, { x: cx - 6, y: cy + 12 }], true);
            g.fillStyle(0xf47fae); g.fillPoints([{ x: cx + 5, y: cy - 9 }, { x: cx + 8, y: cy - 12 }, { x: cx + 13, y: cy - 7 }, { x: cx + 10, y: cy - 4 }], true);
            g.fillStyle(INK); g.fillTriangle(cx - 11, cy + 7, cx - 6, cy + 12, cx - 13, cy + 14);
        } else if (a.id === 'undo') {
            const color = canUndo ? 0x9b5de5 : 0xb9b6cc;
            g.lineStyle(4, color); g.beginPath(); g.arc(cx + 1, cy + 2, 9, Math.PI * 1.1, Math.PI * 2.35, false); g.strokePath();
            g.fillStyle(color); g.fillTriangle(cx - 14, cy - 3, cx - 3, cy - 3, cx - 9, cy + 6);
        } else {
            g.fillStyle(0xffd23f); g.fillCircle(cx, cy - 3, 9); g.fillStyle(0xb7bccb); g.fillRoundedRect(cx - 5, cy + 5, 10, 7, 2);
            g.lineStyle(2, 0xe0a800); g.strokeCircle(cx, cy - 3, 9);
        }
    }
}
/** Speech bubble of the companion, pointing right to the character. */
export function bubble(g: G, l: Layout, tone: 'tip' | 'hint' | 'error' | 'win'): void {
    const b = l.bubble, edge = tone === 'hint' ? PALETTE.hint : tone === 'error' ? PALETTE.conflict : tone === 'win' ? PALETTE.done : PALETTE.bubbleEdge;
    g.fillStyle(PALETTE.bubble); g.fillRoundedRect(b.x, b.y, b.w, b.h, 14);
    g.lineStyle(2.5, edge); g.strokeRoundedRect(b.x, b.y, b.w, b.h, 14);
    const ty = b.y + b.h / 2;
    g.fillStyle(PALETTE.bubble); g.fillTriangle(b.x + b.w - 1.5, ty - 9, b.x + b.w - 1.5, ty + 9, b.x + b.w + 10, ty + 2);
    g.lineStyle(2.5, edge); g.lineBetween(b.x + b.w, ty - 9, b.x + b.w + 10, ty + 2); g.lineBetween(b.x + b.w + 10, ty + 2, b.x + b.w, ty + 9);
}
/** Stars for the HUD and the result (filled up to `count`). */
export function starRow(g: G, x: number, y: number, r: number, count: number): void {
    for (let k = 0; k < 3; k++) {
        const pts = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, s = i % 2 ? r * .45 : r; return { x: x + k * r * 2.3 + Math.cos(a) * s, y: y + Math.sin(a) * s }; });
        g.fillStyle(k < count ? 0xffc928 : 0xd9dbe6); g.fillPoints(pts, true);
        g.lineStyle(1.5, k < count ? 0xd08a00 : 0xb4b7c6); g.strokePoints(pts, true, true);
    }
}
