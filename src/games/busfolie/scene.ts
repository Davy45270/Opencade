import { fingerProof } from './finger';
import Phaser from 'phaser';
import './style.css';
import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { Engine, LEVELS, GAME_NAME, busName } from '../../engines/busfolie/engine';
import { TIPS } from '../../engines/busfolie/levels';
import { forwardSign, horizontal, isCar, legalMoves, occupied, type Bus, type Direction, type PassengerGroup } from '../../engines/busfolie/rules';
import { solve, type Move } from '../../engines/busfolie/solver';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { reserveHudRow } from '../../shell/hud';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, readValue, writeSave, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { canvasGraphics } from '../thumbnail-art';
import { COLORS, UI, arrow, backdrop, bulbIcon, canopy, cone, exitGate, passenger, pill, restartIcon, starIcon, tree, undoIcon, vehicle, yard } from './art';
/** Catalogue size before levels 31-60: an older save capped there opens level 31. */
const PREVIOUS_LEVEL_COUNT = 30;
export const RUN_KEY = 'arcade-lab:busfolie:run:v1';
export const busfolieButtons: readonly TouchButton[] = [
    { id: 'busfolie-undo', label: '', ariaLabel: 'Annuler le dernier coup', size: 56, placement: 'center', mode: 'tap' },
    { id: 'busfolie-hint', label: '', ariaLabel: 'Indice : le prochain coup de la solution la plus courte, expliqué', size: 56, placement: 'center', mode: 'tap' },
    { id: 'busfolie-restart', label: '', ariaLabel: 'Recommencer le niveau', size: 56, placement: 'center', mode: 'tap' },
];
/** Areas of the 360 × 640 world: HUD, the station where the line waits, the yard, the companion's tip box. */
export const STATION = { x: 8, y: 50, w: 344, h: 92 } as const;
export const YARD = { x: 0, y: 150, w: 360, h: 398 } as const;
/** « 1 coup », « 0 coup », « 2 coups ». */
const plural = (n: number, word: string): string => `${String(n)} ${word}${n > 1 ? 's' : ''}`;
const TIP = { y: 554, h: 82 } as const;
/** Fringe around the board, in cells: the kerb and the exit tabs. */
const FRINGE = 0.45;
const DRAG = 8, END_DELAY = 1300, BOARD_MS = 520, DRIVE_MS = 480;
interface View { s: number; ox: number; oy: number }
interface Drag { busId: string; x: number; y: number; offset: number; min: number; max: number; moved: boolean; touch: boolean }
interface Leaving { bus: Bus; x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right'; groups: PassengerGroup[]; t: number }
export interface BusfolieHook {
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { selected: string | null; dragging: string | null; boarding: number; leaving: string[]; view: View; panel: boolean; progression: string; cumulativeScore: number; character: ReturnType<GameCharacter['snapshot']>; fingerInput: { paused: boolean; selected: string | null } };
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    /** World point at the centre of a vehicle still on the board (null when it left). */
    busPoint(busId: string): { x: number; y: number } | null;
    /** World point at the centre of a board cell. */
    cellPoint(x: number, y: number): { x: number; y: number };
    /** World length of one cell. */
    cell(): number;
    /** The next move of a shortest line (not counted as a hint), or null. */
    nextMove(): Move | null;
    /** World vector of a finger drag that asks this move (cells along the bus axis). */
    moveVector(busId: string, direction: Direction, distance: number, departs: boolean): { x: number; y: number };
    /** Would this move take the bus off the board? */
    departs(busId: string, direction: Direction, distance: number): boolean;
    /** The frozen shortest line of a level ("BA f2"). */
    line(index: number): string[];
    /** World point of the cell to touch, the bus being selected, to ask this move (outside the board for a departure). */
    tapPoint(busId: string, direction: Direction, distance: number): { x: number; y: number } | null;
    /** The two arrow keys along a vehicle's axis. */
    axisKeys(busId: string): string[];
    /** World rectangle of the play area (station and yard). */
    playArea(): { y: number; height: number };
    /** The frozen trap of the level: the shortest line's first `at` moves, then the move into a dead end. */
    trap(): { before: Move[]; move: Move } | null;
}
declare global { interface Window { __BUSFOLIE_TEST__?: BusfolieHook } }
const parseMove = (text: string): Move => {
    const [busId = '', how = 'f1'] = text.split(' ');
    return { busId, direction: how.startsWith('f') ? 'forward' : 'backward', distance: Number(how.slice(1)), departs: false };
};
export class BusfolieScene extends Phaser.Scene {
    private hero = new GameCharacter(selectedCharacter());
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'busfolie', LEVELS.length), LEVELS.length, PREVIOUS_LEVEL_COUNT);
    private inputs = new Inputs();
    private manual = false;
    private selecting = false;
    private selected: string | null = null;
    private drag: Drag | null = null;
    private vis = new Map<string, { x: number; y: number }>();
    private leaving: Leaving[] = [];
    private view: View = { s: 40, ox: 0, oy: 0 };
    private ended = 0;
    private flash = 1;
    private shake = 0;
    private ui?: Phaser.GameObjects.Graphics;
    private texts: Record<'label' | 'moves' | 'tip' | 'banner', Phaser.GameObjects.Text> | null = null;
    private counts: Phaser.GameObjects.Text[] = [];
    private hud?: Phaser.GameObjects.Text;
    constructor(private session = new PlaySession(false)) { super('busfolie'); }
    private blocked(): boolean { return this.session.paused || this.selecting; }
    // ——— Lifecycle ———
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('busfolie');
        writeSave(browserStorage(), this.progress.save, 'busfolie'); // keeps the menu in step with a migrated save
        const cleanup = (): void => {
            this.save(); this.inputs.dispose(); document.body.classList.remove('busfolie'); reserveHudRow(false);
            delete window.__BUSFOLIE_TEST__; sound.stop();
        };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        reserveHudRow();
        this.ui = this.add.graphics();
        const text = (x: number, y: number, size: number, color = '#ffffff', bold = true): Phaser.GameObjects.Text =>
            this.add.text(x, y, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${String(size)}px`, fontStyle: bold ? 'bold' : 'normal', color }).setDepth(4);
        this.texts = {
            label: text(20, 15, 15), moves: text(300, 15, 15).setOrigin(0.5, 0),
            tip: text(70, TIP.y + 8, 12, '#ffffff', false).setWordWrapWidth(278).setLineSpacing(1),
            banner: text(180, 0, 22, '#ffffff').setOrigin(0.5).setStroke('#1d2235', 5).setDepth(6),
        };
        for (let k = 0; k < 6; k++) this.counts.push(text(0, 0, k === 0 ? 18 : 14, '#1d2235').setOrigin(0.5).setDepth(5));
        this.hud = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);
        renderTouchControls(this.inputs, busfolieButtons, (id, held) => { if (held) this.button(id); });
        this.dressButtons();
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.pointerDown(p); });
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.pointerMove(p); });
        this.input.on('pointerup', (p: Phaser.Input.Pointer) => { this.pointerUp(p); });
        this.inputs.on(document, 'keydown', event => { this.keydown(event as KeyboardEvent); });
        this.inputs.on(document, 'visibilitychange', () => { this.save(); });
        const retry = (): void => { this.progress.retry(); this.restart(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.progress.state === 'won') this.startLevel(this.engine.index + 1); });
        const levels = (): void => { this.selecting = !this.selecting; this.renderSelector(); this.sync(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', levels);
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : faire glisser les bus le long de leur route pour qu’ils embarquent leurs passagers et sortent`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__BUSFOLIE_TEST__ = this.testHook(receipts);
        // Resume the saved run (reload, return to the game), else the current progression level.
        let restored: Engine | null;
        try { restored = Engine.restore(JSON.parse(readValue(browserStorage(), RUN_KEY) ?? 'null')); } catch { restored = null; }
        if (restored && restored.index < this.progress.save.unlocked) { this.engine = restored; this.progress.start(restored.index, true); this.reset(); }
        else this.startLevel(this.progress.level, true);
    }
    private dressButtons(): void {
        const icon = (id: string, paint: (g: ReturnType<typeof canvasGraphics>) => void): void => {
            const c = document.createElement('canvas'); c.width = 112; c.height = 112; c.setAttribute('aria-hidden', 'true');
            const ctx = c.getContext('2d'); if (ctx) { ctx.scale(2, 2); paint(canvasGraphics(ctx)); }
            document.querySelector(`#${id}`)?.replaceChildren(c);
        };
        icon('busfolie-undo', g => { undoIcon(g, 6, 6, 44); });
        icon('busfolie-hint', g => { bulbIcon(g, 6, 6, 44); });
        icon('busfolie-restart', g => { restartIcon(g, 6, 6, 44); });
    }
    // ——— Levels ———
    private startLevel(index: number, fresh = false): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index); this.selecting = false; this.reset();
    }
    private restart(): void { this.engine.restart(); this.reset(); this.save(); }
    private reset(): void {
        const e = this.engine, w = e.level.board.width, h = e.level.board.height;
        const s = Math.floor(Math.min(YARD.w / (w + 2 * FRINGE), YARD.h / (h + 2 * FRINGE)) * 10) / 10;
        this.view = { s, ox: YARD.x + (YARD.w - w * s) / 2, oy: YARD.y + (YARD.h - h * s) / 2 };
        this.vis.clear(); this.leaving = []; this.drag = null; this.selected = null; this.ended = 0; this.flash = 1; this.shake = 0;
        this.snapVis(); this.sync();
    }
    private snapVis(): void {
        for (const [id, p] of Object.entries(this.engine.state.busPositions)) this.vis.set(id, { ...p });
        for (const id of [...this.vis.keys()]) if (!this.engine.state.busPositions[id]) this.vis.delete(id);
    }
    // ——— Geometry ———
    private cellXY(x: number, y: number): [number, number] { return [this.view.ox + x * this.view.s, this.view.oy + y * this.view.s]; }
    private cellAt(wx: number, wy: number): { x: number; y: number } {
        return { x: Math.floor((wx - this.view.ox) / this.view.s), y: Math.floor((wy - this.view.oy) / this.view.s) };
    }
    /** The vehicle under a world point, or the nearest one within 0.4 cell (a finger is wider than a line). */
    private busAt(wx: number, wy: number, exact = false): Bus | null {
        const s = this.view.s, e = this.engine;
        let best: Bus | null = null, bestD = exact ? 0 : 0.4 * s;
        for (const b of e.level.buses) {
            const p = e.state.busPositions[b.id]; if (!p) continue;
            const [x0, y0] = this.cellXY(p.x, p.y), x1 = x0 + (horizontal(b) ? b.length : 1) * s, y1 = y0 + (horizontal(b) ? 1 : b.length) * s;
            const dx = Math.max(x0 - wx, 0, wx - x1), dy = Math.max(y0 - wy, 0, wy - y1), d = Math.hypot(dx, dy);
            if (d === 0) return b;
            if (d < bestD) { bestD = d; best = b; }
        }
        return best;
    }
    /** How far a vehicle may slide along its axis (in cells, signed on the board coordinate), past the edge when it may
     * leave there now. */
    private range(b: Bus): { min: number; max: number } {
        const e = this.engine, p = e.state.busPositions[b.id]; if (!p) return { min: 0, max: 0 };
        const w = e.level.board.width, hz = horizontal(b), size = hz ? w : e.level.board.height, pos = hz ? p.x : p.y, busy = occupied(e.level, e.state, b.id);
        const free = (q: number): boolean => !busy.has(hz ? p.y * w + q : q * w + p.x);
        let min = 0, max = 0;
        while (pos + max + b.length < size && free(pos + max + b.length)) max++;
        while (pos + min - 1 >= 0 && free(pos + min - 1)) min--;
        const legal = legalMoves(e.level, e.state).filter(m => m.busId === b.id && m.departs);
        for (const m of legal) { const sign = forwardSign(b) * (m.direction === 'forward' ? 1 : -1); if (sign > 0) max += b.length; else min -= b.length; }
        return { min, max };
    }
    // ——— Input ———
    private button(id: string): void {
        if (this.blocked()) return;
        if (id === 'busfolie-undo') this.undo();
        else if (id === 'busfolie-hint') this.askHint();
        else if (id === 'busfolie-restart') { this.progress.retry(); this.restart(); sound.playEffect('undo'); }
    }
    private pointerDown(p: Phaser.Input.Pointer): void {
        if (this.blocked() || this.engine.status === 'won') return;
        const b = this.busAt(p.worldX, p.worldY);
        if (b && this.engine.status === 'playing') {
            const r = this.range(b);
            this.drag = { busId: b.id, x: p.worldX, y: p.worldY, offset: 0, min: r.min, max: r.max, moved: false, touch: p.wasTouch };
        } else this.drag = { busId: '', x: p.worldX, y: p.worldY, offset: 0, min: 0, max: 0, moved: false, touch: p.wasTouch };
    }
    private pointerMove(p: Phaser.Input.Pointer): void {
        const d = this.drag; if (!d || !p.isDown || !d.busId) return;
        const b = this.engine.bus(d.busId); if (!b) return;
        const along = horizontal(b) ? p.worldX - d.x : p.worldY - d.y;
        if (!d.moved && Math.abs(along) > DRAG) { d.moved = true; this.selected = d.busId; }
        if (d.moved) d.offset = Math.max(d.min, Math.min(d.max, along / this.view.s));
    }
    private pointerUp(p: Phaser.Input.Pointer): void {
        const d = this.drag; this.drag = null;
        if (!d || this.blocked() || this.engine.status === 'won') return;
        if (d.moved && d.busId) {
            const b = this.engine.bus(d.busId), at = this.engine.state.busPositions[d.busId]; if (!b || !at) return;
            const hz = horizontal(b), size = hz ? this.engine.level.board.width : this.engine.level.board.height, pos = hz ? at.x : at.y;
            // Past the edge by half a cell: the bus tries to leave there; otherwise it snaps to the nearest cell.
            const beyond = d.offset > 0 ? pos + d.offset + b.length - size : -(pos + d.offset);
            if (beyond >= 0.5) this.slide(b, d.offset > 0 ? size - pos : -(pos + b.length));
            else { const cells = Math.round(Math.max(d.offset > 0 ? -Infinity : -pos, Math.min(d.offset, size - b.length - pos))); if (cells) this.slide(b, cells); else this.sync(); }
            return;
        }
        // A tap: on a free cell or an exit in line with the selected bus, it drives there; on a vehicle it selects it
        // (a touch just beside a vehicle, off the selected lane, selects the nearest one).
        const exact = this.busAt(p.worldX, p.worldY, true), target = this.tapTarget(p.worldX, p.worldY);
        const b = this.selected ? this.engine.bus(this.selected) : undefined;
        if (!exact && b && target !== null) { this.slide(b, target); return; }
        const tapped = exact ?? this.busAt(p.worldX, p.worldY);
        if (tapped) { this.selected = this.selected === tapped.id ? null : tapped.id; sound.playEffect('select'); this.sync(); }
    }
    /** The signed cells a tap at (wx, wy) asks of the selected bus: a cell of its lane (its front goes there), or past
     * the edge (it leaves). Null when the tap is off its lane. */
    private tapTarget(wx: number, wy: number): number | null {
        const b = this.selected ? this.engine.bus(this.selected) : undefined, at = b ? this.engine.state.busPositions[b.id] : undefined;
        if (!b || !at) return null;
        const c = this.cellAt(wx, wy), hz = horizontal(b), size = hz ? this.engine.level.board.width : this.engine.level.board.height;
        const lane = hz ? c.y === at.y : c.x === at.x; if (!lane) return null;
        const q = hz ? c.x : c.y, pos = hz ? at.x : at.y;
        if (q >= pos && q < pos + b.length) return null;
        if (q >= size) return size - pos;
        if (q < 0) return -(pos + b.length);
        return q > pos ? q - (pos + b.length - 1) : q - pos;
    }
    /** Moves a vehicle by `cells` along its board coordinate (a departure when it goes past the edge). */
    private slide(b: Bus, cells: number): void {
        if (!cells) return;
        const sign = Math.sign(cells), direction: Direction = sign === forwardSign(b) ? 'forward' : 'backward';
        this.play(b.id, direction, Math.abs(cells));
    }
    private keydown(e: KeyboardEvent): void {
        if (this.blocked()) return;
        const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const d = dirs[e.code];
        if (d) {
            e.preventDefault();
            const b = this.selected ? this.engine.bus(this.selected) : undefined;
            if (b && this.engine.state.busPositions[b.id] && (horizontal(b) ? d[0] !== 0 : d[1] !== 0)) {
                const at = this.engine.state.busPositions[b.id], sign = horizontal(b) ? d[0] : d[1];
                if (at) {
                    const hz = horizontal(b), pos = hz ? at.x : at.y, size = hz ? this.engine.level.board.width : this.engine.level.board.height;
                    // At the edge, one more step is the departure.
                    const edge = sign > 0 ? pos + b.length >= size : pos <= 0;
                    this.slide(b, edge ? (sign > 0 ? size - pos : -(pos + b.length)) : sign);
                }
            } else this.selectToward(d[0], d[1]);
            return;
        }
        if (e.repeat) return;
        if (e.code === 'Tab' || e.code === 'KeyN') { e.preventDefault(); this.cycle(e.shiftKey ? -1 : 1); }
        else if (e.code === 'KeyZ' || e.code === 'Backspace') { e.preventDefault(); this.undo(); }
        else if (e.code === 'KeyH') { e.preventDefault(); this.askHint(); }
        else if (e.code === 'KeyR') { e.preventDefault(); this.progress.retry(); this.restart(); }
        else if (e.code === 'Escape' && this.selected) { this.selected = null; this.sync(); }
    }
    private onBoard(): Bus[] { return this.engine.level.buses.filter(b => this.engine.state.busPositions[b.id]); }
    private cycle(step: number): void {
        const list = this.onBoard(); if (!list.length) return;
        const i = list.findIndex(b => b.id === this.selected);
        this.selected = list[(i + step + list.length) % list.length]?.id ?? null; sound.playEffect('select'); this.sync();
    }
    /** Arrow across the selected bus's axis (or nothing selected): the nearest vehicle that way. */
    private selectToward(dx: number, dy: number): void {
        const centre = (b: Bus): [number, number] => { const p = this.engine.state.busPositions[b.id] ?? { x: 0, y: 0 }; return horizontal(b) ? [p.x + b.length / 2, p.y + 0.5] : [p.x + 0.5, p.y + b.length / 2]; };
        const cur = this.selected ? this.engine.bus(this.selected) : undefined;
        if (!cur || !this.engine.state.busPositions[cur.id]) { this.cycle(1); return; }
        const [cx, cy] = centre(cur);
        let best: Bus | null = null, bestScore = Infinity;
        for (const b of this.onBoard()) {
            if (b.id === cur.id) continue;
            const [x, y] = centre(b), along = (x - cx) * dx + (y - cy) * dy, across = Math.abs((x - cx) * dy) + Math.abs((y - cy) * dx);
            if (along <= 0.2) continue;
            const score = along + 2 * across; if (score < bestScore) { bestScore = score; best = b; }
        }
        if (best) { this.selected = best.id; sound.playEffect('select'); this.sync(); }
    }
    // ——— Actions ———
    private play(busId: string, direction: Direction, distance: number): void {
        if (this.blocked() || this.engine.status !== 'playing') return;
        const e = this.engine, bus = e.bus(busId), at = e.state.busPositions[busId], before = e.state.passengerQueueIndex;
        if (!e.move(busId, direction, distance)) {
            sound.playEffect('refused'); this.hero.impact = 200; this.shake = 1; this.sync(); return;
        }
        const types = e.events.map(ev => ev.type);
        if (bus && at && types.includes('BUS_DEPARTED')) {
            const side = (e.events.find(ev => ev.type === 'BUS_DEPARTED')?.payload as { side?: Leaving['side'] } | undefined)?.side ?? 'right';
            const v = this.vis.get(busId) ?? at;
            this.leaving.push({ bus, x: v.x, y: v.y, side, groups: e.level.passengerQueue.slice(before, e.state.passengerQueueIndex), t: 0 });
            this.vis.delete(busId); if (this.selected === busId) this.selected = null;
            sound.playEffect('board'); this.hero.move(0, true);
        } else sound.playEffect('move');
        if (types.includes('LEVEL_WON')) { this.ended = 0; this.hero.move(0, true); sound.playEffect('won'); this.finish(); }
        if (types.includes('LEVEL_BLOCKED')) { this.hero.impact = 700; sound.playEffect('blocked'); }
        this.save(); this.sync();
    }
    private undo(): void {
        if (this.blocked() || this.engine.status === 'won') return;
        if (!this.engine.undo()) { sound.playEffect('refused'); return; }
        this.leaving = []; this.snapVis(); sound.playEffect('undo'); this.save(); this.sync();
    }
    private askHint(): void {
        if (this.blocked() || this.engine.status === 'won') return;
        const h = this.engine.hint();
        if (h.move) { this.selected = h.move.busId; this.flash = 0; this.hero.move(0, true); sound.playEffect('hint'); }
        else sound.playEffect('nohint');
        this.save(); this.sync();
    }
    private finish(): void {
        this.progress.finish('won', this.engine.score); writeSave(browserStorage(), this.progress.save, 'busfolie');
        writeValue(browserStorage(), RUN_KEY, 'null');
    }
    private save(): void {
        const run = this.engine.serialize();
        if (run) writeValue(browserStorage(), RUN_KEY, JSON.stringify(run));
    }
    private renderSelector(): void { if (this.selecting) renderLevels(LEVELS, this.progress.save, index => { this.startLevel(index, true); this.sync(); }); }
    // ——— Test hook ———
    private testHook(receipts: ReturnType<typeof fingerReceipts>): BusfolieHook {
        return {
            ...fingerProof,
            fingerReceipts: receipts,
            read: () => ({ ...this.engine.snapshot(), selected: this.selected, dragging: this.drag?.moved ? this.drag.busId : null, boarding: this.leaving.filter(l => l.t < BOARD_MS).length, leaving: this.leaving.map(l => l.bus.id), view: { ...this.view }, panel: this.panelShown(), progression: this.progress.state, cumulativeScore: this.progress.total, character: this.hero.snapshot(), fingerInput: { paused: this.blocked(), selected: this.selected } }),
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
                this.manual = true;
                for (let left = ms; left > 0; left -= 1000 / 60) this.tick(Math.min(left, 1000 / 60));
                if (ms === 0) this.tick(0);
            },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            loadLevel: index => { this.startLevel(index, true); },
            busPoint: id => {
                const b = this.engine.bus(id), p = this.engine.state.busPositions[id]; if (!b || !p) return null;
                const [x, y] = this.cellXY(p.x, p.y), s = this.view.s;
                return { x: x + (horizontal(b) ? b.length : 1) * s / 2, y: y + (horizontal(b) ? 1 : b.length) * s / 2 };
            },
            cellPoint: (x, y) => { const [px, py] = this.cellXY(x, y); return { x: px + this.view.s / 2, y: py + this.view.s / 2 }; },
            cell: () => this.view.s,
            moveVector: (busId, direction, distance) => {
                const b = this.engine.bus(busId); if (!b) return { x: 0, y: 0 };
                const d = forwardSign(b) * (direction === 'forward' ? 1 : -1) * distance * this.view.s;
                return horizontal(b) ? { x: d, y: 0 } : { x: 0, y: d };
            },
            departs: (busId, direction, distance) => {
                const b = this.engine.bus(busId), p = this.engine.state.busPositions[busId]; if (!b || !p) return false;
                const hz = horizontal(b), pos = hz ? p.x : p.y, size = hz ? this.engine.level.board.width : this.engine.level.board.height;
                const to = pos + forwardSign(b) * (direction === 'forward' ? 1 : -1) * distance;
                return to < 0 || to + b.length > size;
            },
            line: index => (LEVELS[index]?.solution ?? '').split(', ').filter(Boolean),
            tapPoint: (busId, direction, distance) => {
                const b = this.engine.bus(busId), p = this.engine.state.busPositions[busId]; if (!b || !p) return null;
                const sign = forwardSign(b) * (direction === 'forward' ? 1 : -1), hz = horizontal(b), pos = hz ? p.x : p.y;
                const q = sign > 0 ? pos + b.length - 1 + distance : pos - distance;
                const [x, y] = hz ? this.cellXY(q, p.y) : this.cellXY(p.x, q);
                return { x: x + this.view.s / 2, y: y + this.view.s / 2 };
            },
            axisKeys: busId => { const b = this.engine.bus(busId); return b && horizontal(b) ? ['ArrowRight', 'ArrowLeft'] : ['ArrowDown', 'ArrowUp']; },
            playArea: () => ({ y: STATION.y, height: YARD.y + YARD.h - STATION.y }),
            nextMove: () => this.engine.status === 'playing' ? solve(this.engine.level, this.engine.state).actions?.[0] ?? null : null,
            trap: () => {
                const t = LEVELS[this.engine.index]?.trap, line = LEVELS[this.engine.index]?.solution.split(', ') ?? [];
                return t ? { before: line.slice(0, t.at).map(parseMove), move: parseMove(t.move) } : null;
            },
        };
    }
    // ——— Frame ———
    updatePaused(): void { this.draw(); }
    update(_time: number, delta: number): void { this.tick(this.manual ? 0 : Math.min(delta, 100)); }
    private tick(delta: number): void {
        const paused = this.blocked() || document.hidden, dt = paused ? 0 : delta;
        if (!paused) this.engine.advance(delta);
        // Vehicles glide to their cells; departing buses board, then drive out.
        const k = Math.min(1, dt / 70);
        for (const [id, p] of Object.entries(this.engine.state.busPositions)) {
            const v = this.vis.get(id) ?? { ...p };
            v.x += (p.x - v.x) * k; v.y += (p.y - v.y) * k;
            if (Math.abs(v.x - p.x) < 0.01) v.x = p.x; if (Math.abs(v.y - p.y) < 0.01) v.y = p.y;
            this.vis.set(id, v);
        }
        for (const l of this.leaving) l.t += dt;
        this.leaving = this.leaving.filter(l => l.t < BOARD_MS + DRIVE_MS);
        if (this.engine.status === 'won') { const was = this.ended; this.ended += dt; if (was < END_DELAY && this.ended >= END_DELAY) this.sync(); }
        if (this.flash < 1) this.flash = Math.min(1, this.flash + dt / 2600);
        this.shake = Math.max(0, this.shake - dt / 250);
        this.hero.advance(Math.min(delta, 100), paused, this.engine.status === 'won' ? 'won' : this.engine.status === 'blocked' ? 'lost' : 'playing', false);
        this.draw();
    }
    private panelShown(): boolean { return this.engine.status === 'won' && (this.ended >= END_DELAY || matchMedia('(prefers-reduced-motion: reduce)').matches); }
    private sync(): void {
        const e = this.engine, shown = this.panelShown() ? 'won' : 'playing';
        renderPanels(shown, this.progress.state, e.index, e.score, this.progress.total, this.selecting);
        const scores = document.querySelector('#result-scores');
        if (shown === 'won' && scores) scores.textContent = `${'★'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)} · ${plural(e.state.moves, 'coup')} (meilleur : ${String(e.par)}) · Score : ${String(e.score)} · Score cumulé : ${String(this.progress.total)}`;
        const set = (id: string, disabled: boolean, urge = false): void => {
            const b = document.querySelector<HTMLButtonElement>(`#${id}`); if (!b) return;
            b.disabled = disabled; b.classList.toggle('busfolie-urge', urge);
        };
        set('busfolie-undo', e.status === 'won' || e.state.history.length === 0, e.status === 'blocked');
        set('busfolie-hint', e.status !== 'playing');
        set('busfolie-restart', e.status === 'won', e.status === 'blocked');
        this.draw();
    }
    // ——— Drawing ———
    private draw(): void {
        const g = this.ui, t = this.texts; if (!g || !t) return;
        const e = this.engine, still = matchMedia('(prefers-reduced-motion: reduce)').matches, now = still ? 0 : e.time;
        g.clear();
        backdrop(g);
        tree(g, 14, 158, 26); tree(g, 348, 166, 24); tree(g, 18, 538, 24); tree(g, 344, 532, 26);
        // HUD: level, moves against the best line, stars.
        pill(g, 8, 8, 232, 32, UI.violet);
        const name = `${String(e.index + 1)} · ${e.name}`;
        t.label.setText(name.length > 26 ? `${name.slice(0, 25)}…` : name);
        pill(g, 246, 8, 106, 32, 0x2a3550); t.moves.setText(plural(e.state.moves, 'coup')).setX(299);
        this.drawStation(g, now);
        this.drawYard(g, now);
        for (let k = 0; k < 3; k++) starIcon(g, 340 - k * 18, 148 - 6, 6, k < 3 - (3 - e.stars));
        // Banner over the yard when blocked.
        const v = this.view, h = e.level.board.height;
        if (e.status === 'blocked') {
            const by = v.oy + h * v.s / 2;
            g.fillStyle(0xb3261e, 0.92); g.fillRoundedRect(28, by - 34, 304, 68, 16);
            g.lineStyle(3, 0xffffff, 0.9); g.strokeRoundedRect(28, by - 34, 304, 68, 16);
            t.banner.setText('Bloqué !\nAnnulez ou recommencez').setFontSize(18).setY(by).setVisible(true);
        } else if (e.status === 'won' && !this.panelShown()) {
            t.banner.setText('Bravo !').setFontSize(30).setY(v.oy + h * v.s / 2).setVisible(true);
        } else t.banner.setVisible(false);
        // Companion and tip box (never over the board).
        g.fillStyle(0x000000, 0.4); g.fillRoundedRect(4, TIP.y, 352, TIP.h, 14);
        this.hero.draw(g, 6, TIP.y + 8, 56);
        t.tip.setText(this.tipText());
        const waiting = e.state.remainingPassengerCount;
        const hudText = `BUS EN FOLIE · NIVEAU ${String(e.index + 1)}/${String(LEVELS.length)} · ${e.name} · SCORE ${String(e.score)} · COUPS ${String(e.state.moves)} · EN ATTENTE ${String(waiting)} · PARTIS ${String(e.state.departedBusIds.length)}${e.status === 'blocked' ? ' · BLOQUÉ' : ''}\n${t.tip.text}`;
        this.hud?.setText(hudText);
        const status = document.querySelector('#status'); if (status && status.textContent !== hudText) status.textContent = hudText;
    }
    private tipText(): string {
        const e = this.engine, h = e.lastHint;
        if (e.status === 'won') return `Bravo ! Tous les passagers sont partis en ${plural(e.state.moves, 'coup')} (meilleur : ${String(e.par)}).`;
        if (e.status === 'blocked') return 'Bloqué : plus aucune suite ne mène à la victoire (le solveur l’a vérifié). Annulez le dernier coup ou recommencez.';
        if (h) return `Indice : ${h.text}`;
        if (e.refused === 'WRONG_COLOR') return 'Pas encore : le groupe en tête de file n’est pas de cette couleur.';
        if (e.refused === 'OVER_CAPACITY') return 'Trop petit : le groupe en tête de file ne tient pas dans ce bus.';
        if (e.refused === 'WRONG_EXIT') return 'Cette sortie est d’une autre couleur.';
        if (e.refused === 'OUT_OF_BOUNDS') return 'Pas de sortie par ici pour ce véhicule.';
        if (e.refused === 'PATH_BLOCKED') return 'La route est encombrée.';
        if (this.selected) { const b = e.bus(this.selected); if (b) return `${busName(b).replace(/^./, c => c.toUpperCase())} : glissez-le, ou touchez une case de sa voie.${isCar(b) ? ' Une voiture ne sort jamais.' : ''}`; }
        return TIPS[e.index] ?? '';
    }
    private drawStation(g: Phaser.GameObjects.Graphics, now: number): void {
        const e = this.engine, q = e.level.passengerQueue, head = e.state.passengerQueueIndex;
        canopy(g, STATION.x, STATION.y, STATION.w, STATION.h);
        this.counts.forEach(c => c.setVisible(false));
        const groups = q.slice(head, head + 5);
        // Bay 1: the group that boards next, every passenger drawn; then the next groups, smaller, with their count.
        let x = STATION.x + 8;
        groups.forEach((grp, k) => {
            const big = k === 0, bw = big ? 128 : 48, by = STATION.y + 14, bh = STATION.h - 24, c = COLORS[grp.color];
            g.fillStyle(big ? 0xffffff : 0xf2f6fb); g.fillRoundedRect(x, by, bw, bh, 10);
            g.lineStyle(big ? 4 : 2, c); g.strokeRoundedRect(x, by, bw, bh, 10);
            if (big) {
                const n = grp.count, per = n > 4 ? Math.ceil(n / 2) : n, size = n > 4 ? 22 : 26;
                for (let i = 0; i < n; i++) {
                    const row = Math.floor(i / per), col = i % per, rowN = Math.min(per, n - row * per);
                    const px = x + 46 + (col - (rowN - 1) / 2) * (size * 0.95), py = by + (n > 4 ? 20 + row * 28 : 34);
                    passenger(g, grp.color, px, py, size, Math.sin(now / 200 + i) * 1.2);
                }
                g.fillStyle(c); g.fillCircle(x + bw - 18, by + bh / 2, 15);
                g.fillStyle(0xffffff); g.fillCircle(x + bw - 18, by + bh / 2, 12);
                this.counts[0]?.setText(String(grp.count)).setPosition(x + bw - 18, by + bh / 2).setVisible(true);
            } else {
                passenger(g, grp.color, x + bw / 2, by + 24, 24);
                this.counts[k]?.setText(`×${String(grp.count)}`).setPosition(x + bw / 2, by + bh - 12).setVisible(true);
            }
            x += bw + 6;
        });
        const more = q.length - head - groups.length;
        if (more > 0) { this.counts[5]?.setText(`+${String(more)}`).setPosition(STATION.x + STATION.w - 18, STATION.y + STATION.h / 2).setColor('#1d2235').setVisible(true); }
        if (!groups.length) this.counts[0]?.setText('Plus personne n’attend').setPosition(STATION.x + STATION.w / 2, STATION.y + STATION.h / 2).setVisible(true);
    }
    private drawYard(g: Phaser.GameObjects.Graphics, now: number): void {
        const e = this.engine, L = e.level, v = this.view, s = v.s, w = L.board.width, h = L.board.height;
        const shake = this.shake > 0 ? Math.sin(now / 16) * 3 * this.shake : 0, ox = v.ox + shake, oy = v.oy;
        yard(g, ox, oy, w, h, s);
        const hint = e.lastHint?.move && this.flash < 1 ? e.lastHint.move : null, pulse = 0.5 + 0.5 * Math.sin(now / 150);
        for (const ex of L.exits) {
            const glow = hint && hint.departs ? 1 : 0;
            exitGate(g, ex, ox, oy, w, h, s, glow * pulse);
        }
        for (const o of L.obstacles) cone(g, ox + (o.x + 0.5) * s, oy + (o.y + 0.5) * s, s);
        // Lane of the selected vehicle: dots on the cells it can reach.
        const sel = this.selected ? e.bus(this.selected) : undefined, selAt = sel ? e.state.busPositions[sel.id] : undefined;
        if (sel && selAt && e.status === 'playing' && !this.drag?.moved) {
            const r = this.range(sel), hz = horizontal(sel), pos = hz ? selAt.x : selAt.y, size = hz ? w : h;
            for (let d = r.min; d <= r.max; d++) {
                if (d === 0) continue;
                const q = d > 0 ? pos + sel.length - 1 + d : pos + d;
                if (q < 0 || q >= size) continue;
                const [cx, cy] = hz ? [ox + (q + 0.5) * s, oy + (selAt.y + 0.5) * s] : [ox + (selAt.x + 0.5) * s, oy + (q + 0.5) * s];
                g.fillStyle(0xffffff, 0.35); g.fillCircle(cx, cy, s * 0.13);
            }
        }
        // Vehicles at their gliding positions (the dragged one follows the finger).
        for (const b of L.buses) {
            const p = this.vis.get(b.id); if (!p) continue;
            let x = p.x, y = p.y;
            if (this.drag?.moved && this.drag.busId === b.id) { if (horizontal(b)) x += this.drag.offset; else y += this.drag.offset; }
            vehicle(g, b, ox + x * s, oy + y * s, s, { selected: this.selected === b.id && e.status === 'playing' });
            if (hint && hint.busId === b.id) {
                const sign = forwardSign(b) * (hint.direction === 'forward' ? 1 : -1), hz = horizontal(b);
                g.lineStyle(4, UI.gold, 0.5 + 0.5 * pulse); g.strokeRoundedRect(ox + x * s + 2, oy + y * s + 2, (hz ? b.length : 1) * s - 4, (hz ? 1 : b.length) * s - 4, s * 0.22);
                // Where it ends: an outline at the target cells, or an arrow out of the exit.
                const tx = hz ? x + sign * (hint.departs ? 0 : hint.distance) : x, ty = hz ? y : y + sign * (hint.departs ? 0 : hint.distance);
                if (!hint.departs) { g.lineStyle(3, 0xffffff, 0.4 + 0.5 * pulse); g.strokeRoundedRect(ox + tx * s + 4, oy + ty * s + 4, (hz ? b.length : 1) * s - 8, (hz ? 1 : b.length) * s - 8, s * 0.2); }
                const [ax, ay] = hz ? [ox + (sign > 0 ? x + b.length + 0.4 : x - 0.4) * s, oy + (y + 0.5) * s] : [ox + (x + 0.5) * s, oy + (sign > 0 ? y + b.length + 0.4 : y - 0.4) * s];
                arrow(g, ax, ay, s * 0.5, hz ? (sign > 0 ? 'right' : 'left') : (sign > 0 ? 'down' : 'up'), UI.gold);
            }
        }
        // Departures: the group walks from the station to the bus, the seats fill, then the bus drives out.
        for (const l of this.leaving) {
            const b = l.bus, hz = horizontal(b), board = Math.min(1, l.t / BOARD_MS), drive = Math.max(0, (l.t - BOARD_MS) / DRIVE_MS);
            const sign = l.side === 'right' || l.side === 'bottom' ? 1 : -1, size = hz ? w : h, pos = hz ? l.x : l.y;
            const edge = sign > 0 ? size - b.length : 0, at = pos + (edge - pos) * Math.min(1, board * 1.4) + sign * drive * (b.length + 1.5);
            const x = hz ? at : l.x, y = hz ? l.y : at, load = Math.round(board * l.groups.reduce((a, grp) => a + grp.count, 0));
            vehicle(g, b, ox + x * s, oy + y * s, s, { load, dim: drive * 0.6 });
            if (board < 1) {
                const [bx, by] = hz ? [ox + (x + b.length / 2) * s, oy + (y + 0.5) * s] : [ox + (x + 0.5) * s, oy + (y + b.length / 2) * s];
                let k = 0;
                for (const grp of l.groups) for (let i = 0; i < grp.count; i++, k++) {
                    const u = Math.min(1, Math.max(0, board * 1.6 - k * 0.08)), sx = STATION.x + 50 + (k % 4) * 20, sy = STATION.y + 40;
                    if (u >= 1) continue;
                    passenger(g, grp.color, sx + (bx - sx) * u, sy + (by - sy) * u - Math.sin(u * Math.PI) * 40, 20 * (1 - 0.4 * u));
                }
            }
        }
    }
}
