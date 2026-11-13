import { fingerProof } from './finger';
import Phaser from 'phaser';
import './style.css';
import { fingerReceipts } from '../finger-receipts';
import { GameCharacter } from '../../characters/game';
import { selectedCharacter } from '../../characters/selection';
import { Engine, LEVELS, GAME_NAME, recordTime, type Kind, type Records, type Tool } from '../../engines/demineur/engine';
import { CLASSIC, TIER_NAMES, TIPS, type Classic, type Theme } from '../../engines/demineur/levels';
import { hint as solverHint } from '../../engines/demineur/solver';
import { Inputs, renderTouchControls, type TouchButton } from '../../shell/input';
import { PlaySession } from '../../shell/pause';
import { reserveHudRow } from '../../shell/hud';
import { Progression } from '../../shell/progression';
import { browserStorage, readSave, readValue, writeSave, writeValue } from '../../shell/storage';
import { renderPanels } from '../../shell/panels';
import { renderLevels } from '../../shell/levels';
import { sound } from '../../shell/services';
import { canvasGraphics } from '../thumbnail-art';
import { THEMES, UI, backdrop, blast, bulbIcon, coveredTile, cross, digit, flag, frame, light, loupeIcon, mine, openTile, pickIcon, pill, question, starIcon, stopwatch } from './art';
export const RUN_KEY = 'arcade-lab:demineur:run:v1';
export const RECORDS_KEY = 'arcade-lab:demineur:records:v1';
export const demineurButtons: readonly TouchButton[] = [
    { id: 'demineur-tool', label: 'Creuser', ariaLabel: 'Outil : creuser ou poser un drapeau', size: 56, placement: 'center', mode: 'tap' },
    { id: 'demineur-hint', label: '', ariaLabel: 'Indice : une déduction certaine, expliquée', size: 56, placement: 'center', mode: 'tap' },
    { id: 'demineur-zoom', label: '', ariaLabel: 'Loupe : vue d’ensemble ou zoom', size: 56, placement: 'center', mode: 'tap' },
];
/** Board area of the 360 × 640 world, under the HUD and above the companion's tip box. */
export const AREA = { x: 8, y: 74, w: 344, h: 470 } as const;
const TIP = { y: 554, h: 82 } as const;
/** Cells smaller than this (world px ≈ CSS px on a 390 px phone) are hard to hit with a finger: the board zooms. */
export const MIN_TOUCH_CELL = 28;
export const ZOOM_CELL = 38;
const LONG_PRESS = 450, DRAG = 10, END_DELAY = 1300;
interface View { transposed: boolean; cols: number; rows: number; fit: number; zoomable: boolean; zoomed: boolean; cell: number; ox: number; oy: number }
interface Press { x: number; y: number; at: number; panned: boolean; done: boolean; touch: boolean; ox: number; oy: number }
export interface DemineurHook {
    fingerReceipts: ReturnType<typeof fingerReceipts>;
    read(): ReturnType<Engine['snapshot']> & { tool: Tool; view: View; panel: boolean; progression: string; cumulativeScore: number; records: Records; character: ReturnType<GameCharacter['snapshot']>; fingerInput: { paused: boolean; tool: Tool; zoomed: boolean } };
    advance(ms: number): void;
    hudText(): string;
    usefulArea(): { x: number; y: number; width: number; height: number };
    loadLevel(index: number, seed?: number): void;
    loadMode(kind: Classic | 'daily', seed?: number): void;
    /** World point at the centre of board cell (x, y), scrolled into view first. */
    cellPoint(x: number, y: number): { x: number; y: number };
    /** The next proven move from the solver (not counted as a hint), or null. */
    nextMove(): { x: number; y: number; tool: Tool } | null;
    /** A hidden mine (for the defeat test). */
    mineCell(): { x: number; y: number } | null;
}
declare global { interface Window { __DEMINEUR_TEST__?: DemineurHook } }
const clock = (ms: number): string => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const dayKey = (d = new Date()): number => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
export class DemineurScene extends Phaser.Scene {
    private hero = new GameCharacter(selectedCharacter());
    private engine = new Engine();
    private progress = new Progression(readSave(browserStorage(), 'demineur', LEVELS.length), LEVELS.length);
    private records: Records = {};
    private inputs = new Inputs();
    private manual = false;
    private selecting = false;
    private tool: Tool = 'dig';
    private view: View = { transposed: false, cols: 1, rows: 1, fit: 1, zoomable: false, zoomed: false, cell: 1, ox: 0, oy: 0 };
    private press: Press | null = null;
    private cursor = { x: 0, y: 0, shown: false };
    private boom: { i: number; t: number } | null = null;
    private ended = 0;
    private recordNote = '';
    private flash: { cells: number[]; t: number } = { cells: [], t: 1 };
    private coarse = false;
    private dirty = true;
    private ui?: Phaser.GameObjects.Graphics;
    private fx?: Phaser.GameObjects.Graphics;
    private board?: Phaser.GameObjects.Graphics;
    private texts: Record<'label' | 'mines' | 'time' | 'sub' | 'tip', Phaser.GameObjects.Text> | null = null;
    private hud?: Phaser.GameObjects.Text;
    constructor(private session = new PlaySession(false)) { super('demineur'); }
    private get kind(): Kind { return this.engine.kind; }
    private get theme(): Theme { return this.kind === 'progression' ? LEVELS[this.engine.index]?.theme ?? 'classique' : this.kind === 'daily' ? 'plage' : 'classique'; }
    private blocked(): boolean { return this.session.paused || this.selecting; }
    // ——— Lifecycle ———
    create(): void {
        const receipts = fingerReceipts(this.inputs);
        document.body.classList.add('demineur');
        this.coarse = matchMedia('(pointer: coarse)').matches;
        try {
            const r = JSON.parse(readValue(browserStorage(), RECORDS_KEY) ?? '{}') as Record<string, unknown> | null;
            for (const k of ['beginner', 'intermediate', 'expert', 'daily'] as const) { const v = r?.[k]; if (typeof v === 'number' && Number.isFinite(v) && v > 0) this.records[k] = v; }
        } catch { this.records = {}; }
        const cleanup = (): void => {
            this.save(); this.inputs.dispose(); document.body.classList.remove('demineur'); reserveHudRow(false);
            document.querySelector('#demineur-modes')?.remove(); delete window.__DEMINEUR_TEST__; sound.stop();
        };
        this.events.once('shutdown', cleanup); this.events.once('destroy', cleanup);
        reserveHudRow();
        this.ui = this.add.graphics();
        this.board = this.add.graphics();
        // Phaser 4: geometry masks are Canvas-only; under WebGL a mask is a filter (world space, main camera, as before).
        const mask = this.make.graphics({}, false); mask.fillStyle(0xffffff).fillRect(AREA.x, AREA.y, AREA.w, AREA.h);
        if (this.renderer.type === Phaser.WEBGL) this.board.enableFilters().filters?.external.addMask(mask);
        else this.board.setMask(mask.createGeometryMask());
        this.fx = this.add.graphics().setDepth(3);
        const text = (x: number, y: number, size: number, color = '#ffffff', bold = true): Phaser.GameObjects.Text =>
            this.add.text(x, y, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${String(size)}px`, fontStyle: bold ? 'bold' : 'normal', color }).setDepth(4);
        this.texts = {
            label: text(20, 15, 15), mines: text(222, 15, 16), time: text(304, 15, 16).setOrigin(0.5, 0),
            sub: text(180, 50, 12, '#ffffff', false).setOrigin(0.5, 0), tip: text(70, TIP.y + 8, 12, '#ffffff', false).setWordWrapWidth(276).setLineSpacing(1),
        };
        this.hud = this.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false);
        renderTouchControls(this.inputs, demineurButtons, (id, held) => { if (held) this.button(id); });
        this.dressButtons();
        this.input.mouse?.disableContextMenu();
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.pointerDown(p); });
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.pointerMove(p); });
        this.input.on('pointerup', () => { this.pointerUp(); });
        this.inputs.on(document, 'keydown', event => { this.keydown(event as KeyboardEvent); });
        this.inputs.on(document, 'visibilitychange', () => { this.save(); });
        const retry = (): void => { this.progress.retry(); this.restart(); };
        for (const id of ['retry-level', 'replay-level', 'restart']) this.inputs.on(document.querySelector(`#${id}`), 'click', retry);
        this.inputs.on(document.querySelector('#next-level'), 'click', () => { if (this.kind === 'progression' && this.progress.state === 'won') this.startLevel(this.engine.index + 1); });
        const levels = (): void => { this.selecting = !this.selecting; this.renderSelector(); this.sync(); };
        for (const id of ['levels', 'result-levels', 'close-levels']) this.inputs.on(document.querySelector(`#${id}`), 'click', levels);
        this.game.canvas.setAttribute('aria-label', `${GAME_NAME} : creuser les cases sûres, marquer les mines d’un drapeau`);
        if (new URLSearchParams(location.search).get('test') === '1') window.__DEMINEUR_TEST__ = this.testHook(receipts);
        // Resume the saved run (reload, return to the game), else the current progression grid.
        let restored: Engine | null;
        try { restored = Engine.restore(JSON.parse(readValue(browserStorage(), RUN_KEY) ?? 'null')); } catch { restored = null; }
        if (restored && (restored.kind !== 'progression' || restored.index < this.progress.save.unlocked)) {
            this.engine = restored; if (restored.kind === 'progression') this.progress.start(restored.index, true); this.reset();
        } else this.startLevel(this.progress.level, true);
    }
    private dressButtons(): void {
        const icon = (id: string, paint: (g: ReturnType<typeof canvasGraphics>) => void, size = 56): HTMLCanvasElement => {
            const c = document.createElement('canvas'); c.width = size * 2; c.height = size * 2; c.setAttribute('aria-hidden', 'true'); c.className = `${id}-icon`;
            const ctx = c.getContext('2d'); if (ctx) { ctx.scale(2, 2); paint(canvasGraphics(ctx)); }
            return c;
        };
        document.querySelector('#demineur-hint')?.replaceChildren(icon('hint', g => { bulbIcon(g, 6, 6, 44); }));
        this.paintTool(); this.paintZoom();
    }
    private paintTool(): void {
        const button = document.querySelector<HTMLButtonElement>('#demineur-tool'); if (!button) return;
        const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.setAttribute('aria-hidden', 'true');
        const ctx = c.getContext('2d');
        if (ctx) { ctx.scale(2, 2); const g = canvasGraphics(ctx); if (this.tool === 'flag') flag(g, 16, 16, 30); else pickIcon(g, 1, 1, 30); }
        const label = document.createElement('span'); label.textContent = this.tool === 'flag' ? 'Drapeau' : 'Creuser';
        button.replaceChildren(c, label);
        button.dataset.tool = this.tool; button.setAttribute('aria-pressed', String(this.tool === 'flag'));
        button.setAttribute('aria-label', this.tool === 'flag' ? 'Outil : drapeau (toucher pour creuser)' : 'Outil : creuser (toucher pour poser des drapeaux)');
    }
    private paintZoom(): void {
        const button = document.querySelector<HTMLButtonElement>('#demineur-zoom'); if (!button) return;
        const c = document.createElement('canvas'); c.width = 112; c.height = 112; c.setAttribute('aria-hidden', 'true');
        const ctx = c.getContext('2d'); if (ctx) { ctx.scale(2, 2); loupeIcon(canvasGraphics(ctx), 6, 6, 44, this.view.zoomed); }
        button.replaceChildren(c);
        button.style.display = this.view.zoomable ? '' : 'none';
        button.setAttribute('aria-pressed', String(this.view.zoomed));
    }
    // ——— Starting boards ———
    private startLevel(index: number, fresh = false): void {
        this.progress.start(index, fresh); this.engine.loadLevel(index); this.selecting = false; this.reset();
    }
    private startMode(kind: Classic | 'daily', seed = Date.now() % 2147483647): void {
        if (kind === 'daily') this.engine.loadDaily(dayKey()); else this.engine.loadClassic(kind, seed);
        this.selecting = false; this.reset();
    }
    private restart(): void {
        if (this.kind === 'progression') this.engine.loadLevel(this.engine.index);
        else this.engine.restart(this.kind === 'daily' ? this.engine.day : Date.now() % 2147483647);
        this.reset();
    }
    private reset(): void {
        this.boom = null; this.ended = 0; this.recordNote = ''; this.flash = { cells: [], t: 1 }; this.press = null;
        const e = this.engine, transposed = e.width > e.height, cols = transposed ? e.height : e.width, rows = transposed ? e.width : e.height;
        const fit = Math.min(AREA.w / cols, AREA.h / rows, 48), zoomable = fit < MIN_TOUCH_CELL;
        this.view = { transposed, cols, rows, fit, zoomable, zoomed: zoomable && this.coarse, cell: fit, ox: 0, oy: 0 };
        this.cursor = { x: Math.floor(e.width / 2), y: Math.floor(e.height / 2), shown: false };
        this.layout();
        const start = e.state.firstClick ?? { x: Math.floor(e.width / 2), y: Math.floor(e.height / 2) };
        this.centerOn(start.x, start.y);
        this.paintZoom(); this.sync();
    }
    // ——— View: fit, zoom, pan, transposition of wide boards ———
    private layout(): void {
        const v = this.view; v.cell = v.zoomed ? ZOOM_CELL : v.fit; this.clamp();
    }
    private clamp(): void {
        const v = this.view, bw = v.cols * v.cell, bh = v.rows * v.cell;
        v.ox = bw <= AREA.w ? AREA.x + (AREA.w - bw) / 2 : Math.min(AREA.x, Math.max(AREA.x + AREA.w - bw, v.ox));
        v.oy = bh <= AREA.h ? AREA.y + (AREA.h - bh) / 2 : Math.min(AREA.y, Math.max(AREA.y + AREA.h - bh, v.oy));
        this.dirty = true;
    }
    private display(x: number, y: number): [number, number] { return this.view.transposed ? [y, x] : [x, y]; }
    private cellXY(x: number, y: number): [number, number] { const [c, r] = this.display(x, y); return [this.view.ox + c * this.view.cell, this.view.oy + r * this.view.cell]; }
    private cellAt(wx: number, wy: number): { x: number; y: number } | null {
        if (wx < AREA.x || wx > AREA.x + AREA.w || wy < AREA.y || wy > AREA.y + AREA.h) return null;
        const c = Math.floor((wx - this.view.ox) / this.view.cell), r = Math.floor((wy - this.view.oy) / this.view.cell);
        if (c < 0 || r < 0 || c >= this.view.cols || r >= this.view.rows) return null;
        return this.view.transposed ? { x: r, y: c } : { x: c, y: r };
    }
    private centerOn(x: number, y: number): void {
        const [c, r] = this.display(x, y), v = this.view;
        v.ox = AREA.x + AREA.w / 2 - (c + 0.5) * v.cell; v.oy = AREA.y + AREA.h / 2 - (r + 0.5) * v.cell; this.clamp();
    }
    /** Brings cell (x, y) inside the view with a margin, without moving when it already is. */
    private reveal(x: number, y: number): void {
        const [px, py] = this.cellXY(x, y), m = this.view.cell;
        if (px < AREA.x + m || py < AREA.y + m || px > AREA.x + AREA.w - 2 * m || py > AREA.y + AREA.h - 2 * m) this.centerOn(x, y);
    }
    private setZoom(on: boolean, around?: { x: number; y: number }): void {
        if (!this.view.zoomable) return;
        const focus = around ?? this.cellAt(AREA.x + AREA.w / 2, AREA.y + AREA.h / 2) ?? { x: 0, y: 0 };
        this.view.zoomed = on; this.layout(); this.centerOn(focus.x, focus.y); this.paintZoom();
    }
    // ——— Input ———
    private button(id: string): void {
        if (this.blocked()) return;
        if (id === 'demineur-tool') { this.tool = this.tool === 'dig' ? 'flag' : 'dig'; this.paintTool(); sound.playEffect('tool'); this.sync(); }
        else if (id === 'demineur-hint') this.askHint();
        else if (id === 'demineur-zoom') { this.setZoom(!this.view.zoomed); this.sync(); }
    }
    private pointerDown(p: Phaser.Input.Pointer): void {
        if (this.blocked() || this.engine.status !== 'playing') return;
        this.cursor.shown = false;
        const touch = p.wasTouch;
        if (!touch && p.rightButtonDown()) { const c = this.cellAt(p.worldX, p.worldY); if (c) this.act(c.x, c.y, 'flag'); return; }
        this.press = { x: p.worldX, y: p.worldY, at: this.engine.time, panned: false, done: false, touch, ox: this.view.ox, oy: this.view.oy };
    }
    private pointerMove(p: Phaser.Input.Pointer): void {
        const press = this.press; if (!press || !p.isDown || press.done) return;
        const dx = p.worldX - press.x, dy = p.worldY - press.y;
        if (!press.panned && Math.hypot(dx, dy) > DRAG && (this.view.cols * this.view.cell > AREA.w || this.view.rows * this.view.cell > AREA.h)) press.panned = true;
        if (press.panned) { this.view.ox = press.ox + dx; this.view.oy = press.oy + dy; this.clamp(); }
    }
    private pointerUp(): void {
        const press = this.press; this.press = null;
        if (!press || press.done || press.panned || this.blocked()) return;
        const c = this.cellAt(press.x, press.y); if (!c) return;
        // Overview of a board too small for a finger: the touch zooms there instead of playing blind.
        if (press.touch && this.view.zoomable && !this.view.zoomed) { this.setZoom(true, c); this.sync(); return; }
        this.act(c.x, c.y, this.tool);
    }
    /** Long press: the other tool (a shortcut; the Dig/Flag switch never needs it). */
    private longPress(): void {
        const press = this.press;
        if (!press || press.done || press.panned || this.engine.time - press.at < LONG_PRESS) return;
        press.done = true;
        const c = this.cellAt(press.x, press.y); if (!c) return;
        if (this.view.zoomable && !this.view.zoomed && press.touch) return;
        this.act(c.x, c.y, this.tool === 'dig' ? 'flag' : 'dig');
    }
    private keydown(e: KeyboardEvent): void {
        if (this.blocked()) return;
        const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const move = moves[e.code];
        if (move) {
            e.preventDefault();
            // Arrows move on the screen: a transposed board swaps them back to board axes.
            const [dc, dr] = move, [dx, dy] = this.view.transposed ? [dr, dc] : [dc, dr];
            if (this.cursor.shown) this.cursor = { x: Math.min(this.engine.width - 1, Math.max(0, this.cursor.x + dx)), y: Math.min(this.engine.height - 1, Math.max(0, this.cursor.y + dy)), shown: true };
            this.cursor.shown = true; this.reveal(this.cursor.x, this.cursor.y); this.sync(); return;
        }
        if (e.repeat) return;
        const c = this.cursor;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); c.shown = true; this.act(c.x, c.y, 'dig'); }
        else if (e.code === 'KeyF' || e.code === 'KeyM') { e.preventDefault(); c.shown = true; this.act(c.x, c.y, 'flag'); }
        else if (e.code === 'KeyH') { e.preventDefault(); this.askHint(); }
        else if (e.code === 'KeyT') { e.preventDefault(); this.button('demineur-tool'); }
        else if (e.code === 'KeyZ') { e.preventDefault(); this.button('demineur-zoom'); }
        else if (e.code === 'KeyR') { e.preventDefault(); this.progress.retry(); this.restart(); }
    }
    // ——— Actions ———
    private act(x: number, y: number, tool: Tool): void {
        if (this.blocked() || this.engine.status !== 'playing') return;
        const e = this.engine, before = e.state.revealedSafeCount;
        if (!e.press(x, y, tool)) { if (e.refused !== 'INVALID_CHORD') sound.playEffect('refused'); this.hero.impact = 200; this.sync(); return; }
        const types = e.events.map(ev => ev.type), opened = e.state.revealedSafeCount - before;
        if (types.includes('GAME_LOST')) {
            const lost = e.events.find(ev => ev.type === 'GAME_LOST')?.payload as { x: number; y: number } | undefined;
            this.boom = { i: (lost?.y ?? y) * e.width + (lost?.x ?? x), t: 0 }; this.ended = 0; this.hero.impact = 600; sound.playEffect('boom');
        } else if (types.includes('GAME_WON')) { this.ended = 0; this.hero.move(0, true); sound.playEffect('won'); }
        else if (types.includes('MARK_CHANGED')) sound.playEffect(e.state.cells[y * e.width + x]?.mark === 'flag' ? 'flag' : 'unflag');
        else { sound.playEffect(opened > 6 ? 'cascade' : 'dig'); if (opened > 6) this.hero.move(0, true); }
        if (e.status !== 'playing') this.finish();
        this.flash = { cells: [], t: 1 };
        this.save(); this.sync();
    }
    private askHint(): void {
        if (this.blocked() || this.engine.status !== 'playing') return;
        const h = this.engine.hint();
        if (h.status !== 'unknown') { this.flash = { cells: h.cells, t: 0 }; const first = h.cells[0] ?? 0; this.reveal(first % this.engine.width, Math.floor(first / this.engine.width)); this.hero.move(0, true); sound.playEffect('hint'); }
        else sound.playEffect('nohint');
        this.save(); this.sync();
    }
    private finish(): void {
        const e = this.engine;
        if (e.kind === 'progression') { this.progress.finish(e.status === 'won' ? 'won' : 'lost', e.score); writeSave(browserStorage(), this.progress.save, 'demineur'); }
        else if (e.status === 'won') {
            const r = recordTime(this.records, e.kind, e.elapsedMs, e.assisted);
            this.records = r.records; this.recordNote = r.improved ? ' · Nouveau record !' : e.assisted ? ' · Aidée : hors records' : '';
            writeValue(browserStorage(), RECORDS_KEY, JSON.stringify(this.records));
        }
        writeValue(browserStorage(), RUN_KEY, 'null');
    }
    private save(): void {
        const run = this.engine.serialize();
        if (run) writeValue(browserStorage(), RUN_KEY, JSON.stringify(run));
    }
    private renderSelector(): void {
        document.querySelector('#demineur-modes')?.remove();
        if (!this.selecting) return;
        // 130 grids: tabs of ten, opened on the tier of the next grid to play.
        renderLevels(LEVELS, this.progress.save, index => { this.startLevel(index, true); this.sync(); },
            { size: 10, names: TIER_NAMES, current: Math.min(LEVELS.length - 1, this.progress.save.unlocked - 1) });
        const modes = document.createElement('div'); modes.id = 'demineur-modes';
        const title = document.createElement('p'); title.textContent = 'Classique (peut demander de deviner) et défi du jour :';
        modes.append(title);
        for (const kind of ['beginner', 'intermediate', 'expert', 'daily'] as const) {
            const b = document.createElement('button'); b.id = `demineur-mode-${kind}`;
            const c = kind === 'daily' ? null : CLASSIC[kind], best = this.records[kind];
            b.textContent = c ? `${c.name} ${String(c.width)}×${String(c.height)} · ${String(c.mines)}` : 'Défi du jour';
            if (best !== undefined) b.textContent += ` · ${clock(best)}`;
            b.addEventListener('click', () => { this.startMode(kind); });
            modes.append(b);
        }
        document.querySelector('#level-list')?.before(modes);
    }
    // ——— Test hook ———
    private testHook(receipts: ReturnType<typeof fingerReceipts>): DemineurHook {
        return {
            ...fingerProof,
            fingerReceipts: receipts,
            read: () => ({ ...this.engine.snapshot(), tool: this.tool, view: { ...this.view }, panel: this.panelShown(), progression: this.progress.state, cumulativeScore: this.progress.total, records: { ...this.records }, character: this.hero.snapshot(), fingerInput: { paused: this.blocked(), tool: this.tool, zoomed: this.view.zoomed } }),
            advance: ms => {
                if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
                this.manual = true;
                for (let left = ms; left > 0; left -= 1000 / 60) this.tick(Math.min(left, 1000 / 60));
                if (ms === 0) this.tick(0);
            },
            hudText: () => this.hud?.text ?? '',
            usefulArea: () => ({ x: 0, y: 0, width: 360, height: 640 }),
            loadLevel: index => { this.startLevel(index, true); },
            loadMode: (kind, seed) => { this.startMode(kind, seed); },
            cellPoint: (x, y) => { this.reveal(x, y); this.draw(); const [px, py] = this.cellXY(x, y); return { x: px + this.view.cell / 2, y: py + this.view.cell / 2 }; },
            nextMove: () => {
                const e = this.engine;
                if (e.status !== 'playing') return null;
                if (e.state.status === 'ready') return { x: Math.floor(e.width / 2), y: Math.floor(e.height / 2), tool: 'dig' };
                const h = solverHint(e.level, e.state.cells);
                if (h.status === 'safe_move') return { x: h.x, y: h.y, tool: 'dig' };
                if (h.status === 'mine_proven') { const i = h.cells.find(c => e.state.cells[c]?.mark !== 'flag') ?? h.cells[0] ?? 0; return { x: i % e.width, y: Math.floor(i / e.width), tool: 'flag' }; }
                return null;
            },
            mineCell: () => { const c = this.engine.state.cells.find(cell => cell.mine && !cell.revealed && cell.mark !== 'flag'); return c ? { x: c.x, y: c.y } : null; },
        };
    }
    // ——— Frame ———
    updatePaused(): void { this.draw(); }
    private wall = 0;
    /** Wall time between frames (capped at 1 s), not Phaser's smoothed delta: the clock must not lag at a low frame rate. */
    update(_time: number, delta: number): void {
        const now = performance.now(), real = this.wall ? Math.min(1000, now - this.wall) : delta;
        this.wall = now; this.tick(this.manual ? 0 : real);
    }
    private tick(delta: number): void {
        const paused = this.blocked() || document.hidden;
        const dt = paused ? 0 : delta;
        if (!paused) this.engine.advance(delta);
        this.longPress();
        if (this.boom) this.boom.t += dt;
        if (this.engine.status !== 'playing') { const was = this.ended; this.ended += dt; if (was < END_DELAY && this.ended >= END_DELAY) this.sync(); }
        if (this.flash.t < 1) this.flash.t = Math.min(1, this.flash.t + dt / 2400);
        this.hero.advance(Math.min(delta, 100), paused, this.engine.status, false);
        this.draw();
    }
    private panelShown(): boolean { return this.engine.status !== 'playing' && (this.ended >= END_DELAY || matchMedia('(prefers-reduced-motion: reduce)').matches); }
    private sync(): void {
        const e = this.engine;
        const shown = this.panelShown() ? e.status : 'playing';
        const state = e.kind === 'progression' ? this.progress.state : e.status === 'lost' ? 'lost' : 'classic';
        renderPanels(shown, state, e.index, e.score, this.progress.total, this.selecting);
        const title = document.querySelector('#result-title'), scores = document.querySelector('#result-scores');
        if (shown === 'won' && e.kind !== 'progression' && title) title.textContent = `${e.name} réussi en ${clock(e.elapsedMs)}`;
        if (shown === 'won' && scores) scores.textContent = `${'★'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)} · ${clock(e.elapsedMs)} · Score : ${String(e.score)}${e.kind === 'progression' ? ` · Score cumulé : ${String(this.progress.total)}` : this.recordNote}`;
        if (shown === 'lost' && scores) scores.textContent = e.noGuess ? 'Une mine ! Cette grille se résout sans deviner : l’indice montre toujours un coup sûr.' : 'Une mine ! En classique, il faut parfois deviner.';
        const retry = document.querySelector('#retry-level'); if (retry) retry.textContent = 'Rejouer';
        const hintButton = document.querySelector<HTMLButtonElement>('#demineur-hint');
        if (hintButton) hintButton.disabled = e.status !== 'playing';
        this.dirty = true; this.draw();
    }
    // ——— Drawing ———
    private draw(): void {
        const g = this.ui, b = this.board, t = this.texts, fx = this.fx; if (!g || !b || !t || !fx) return;
        const e = this.engine, theme = this.theme, still = matchMedia('(prefers-reduced-motion: reduce)').matches, now = still ? 0 : e.time;
        g.clear(); fx.clear();
        backdrop(g, theme);
        // HUD: board name, mines left, clock; a line saying whether the board can be solved without guessing.
        pill(g, 8, 8, 196, 32, UI.violet);
        const name = e.kind === 'progression' ? `${String(e.index + 1)} · ${e.name}` : e.name;
        t.label.setText(name.length > 22 ? `${name.slice(0, 21)}…` : name);
        pill(g, 210, 8, 66, 32, 0x2a3550); mine(g, 228, 24, 26); t.mines.setText(String(e.minesLeft)).setX(244);
        pill(g, 282, 8, 72, 32, 0x2a3550); stopwatch(g, 298, 24, 9); t.time.setText(clock(e.elapsedMs)).setX(328);
        if (e.kind === 'progression') for (let k = 0; k < 3; k++) starIcon(g, 30 + k * 20, 58, 7, k < e.stars);
        // With stars, the line starts after them (left-aligned) instead of running under them.
        if (e.kind === 'progression') t.sub.setOrigin(0, 0).setX(96); else t.sub.setOrigin(0.5, 0).setX(180);
        t.sub.setText(e.noGuess ? (e.kind === 'daily' ? 'Défi du jour · sans devinette' : 'Sans devinette : chaque coup se déduit') : 'Classique : il faudra peut-être deviner');
        // Board frame (the visible window of the board).
        const v = this.view, bw = Math.min(AREA.w, v.cols * v.cell), bh = Math.min(AREA.h, v.rows * v.cell);
        const fx0 = Math.max(AREA.x, v.ox), fy0 = Math.max(AREA.y, v.oy);
        frame(g, theme, fx0, fy0, bw, bh);
        if (this.dirty || this.boom || this.flash.t < 1 || e.status !== 'playing' || this.cursor.shown || this.press) this.drawBoard(b, theme, now);
        // Scroll hints when the board is larger than the window.
        if (v.cols * v.cell > AREA.w + 1 || v.rows * v.cell > AREA.h + 1) {
            fx.fillStyle(0x000000, 0.45);
            const sx = AREA.w / (v.cols * v.cell), sy = AREA.h / (v.rows * v.cell);
            fx.fillRoundedRect(AREA.x + (AREA.x - v.ox) * sx, AREA.y + AREA.h - 6, Math.min(1, sx) * AREA.w, 4, 2);
            fx.fillRoundedRect(AREA.x + AREA.w - 6, AREA.y + (AREA.y - v.oy) * sy, 4, Math.min(1, sy) * AREA.h, 2);
        }
        // Companion and tip box (never over the board).
        g.fillStyle(0x000000, 0.4); g.fillRoundedRect(4, TIP.y, 352, TIP.h, 14);
        this.hero.draw(g, 6, TIP.y + 8, 56);
        t.tip.setText(this.tipText());
        const hudText = `DÉMINEUR · ${e.kind === 'progression' ? `GRILLE ${String(e.index + 1)}/${String(LEVELS.length)}` : e.name.toUpperCase()} · ${e.name} · SCORE ${String(e.score)} · MINES ${String(e.minesLeft)} · TEMPS ${clock(e.elapsedMs)}\n${t.tip.text}`;
        this.hud?.setText(hudText);
        const status = document.querySelector('#status'); if (status && status.textContent !== hudText) status.textContent = hudText;
    }
    private tipText(): string {
        const e = this.engine, h = e.lastHint;
        if (e.status === 'lost') return e.noGuess ? 'Boum ! Une mine. Cette grille se déduisait : l’indice l’aurait montré.' : 'Boum ! En classique, certaines cases demandent de deviner.';
        if (e.status === 'won') return `Bravo ! ${clock(e.elapsedMs)}.${LEVELS[e.index]?.drawing && e.kind === 'progression' ? ' Regardez ce que dessinent les mines.' : ''}`;
        if (h) return `Indice : ${h.proof}`;
        if (e.state.status === 'ready') return 'Touchez n’importe quelle case : la première est toujours sûre.';
        if (this.view.zoomable && !this.view.zoomed && this.coarse) return 'Vue d’ensemble : touchez une zone pour zoomer, la loupe revient ici.';
        if (e.kind === 'progression') return TIPS[e.index] ?? '';
        return this.tool === 'flag' ? 'Outil Drapeau : chaque toucher pose ou retire un drapeau.' : 'Appui long ou outil Drapeau pour marquer ; toucher un chiffre complet ouvre ses voisines.';
    }
    private drawBoard(b: Phaser.GameObjects.Graphics, theme: Theme, now: number): void {
        this.dirty = false;
        b.clear();
        const e = this.engine, v = this.view, s = v.cell, cells = e.state.cells, w = e.width, lost = e.status === 'lost', won = e.status === 'won';
        const level = e.kind === 'progression' || e.kind === 'daily' ? e.level : null;
        const drawing = new Set<number>();
        if (won && level?.layout) level.layout.forEach((row, y) => { row.split('').forEach((ch, x) => { if (ch === '#') drawing.add(y * w + x); }); });
        const boomAt = this.boom ? cells[this.boom.i] : undefined;
        const unveil = (i: number): boolean => {
            if (!lost || !this.boom || !boomAt) return false;
            const c = cells[i]; if (!c) return false;
            return this.boom.t >= 250 + 60 * Math.hypot(c.x - boomAt.x, c.y - boomAt.y);
        };
        const shake = this.boom && this.boom.t < 300 ? Math.sin(this.boom.t / 18) * 3 * (1 - this.boom.t / 300) : 0;
        const pulse = 0.5 + 0.5 * Math.sin(now / 160);
        for (const [i, c] of cells.entries()) {
            const [x0, y0] = this.cellXY(c.x, c.y), x = x0 + shake;
            if (x + s < AREA.x || y0 + s < AREA.y || x > AREA.x + AREA.w || y0 > AREA.y + AREA.h) continue;
            const cx = x + s / 2, cy = y0 + s / 2;
            if (c.revealed) {
                openTile(b, theme, x, y0, s, c.mine ? UI.red : undefined);
                if (c.mine) mine(b, cx, cy, s, 1);
                else if (c.adjacent > 0) digit(b, c.adjacent, cx, cy, s);
            } else if (won && c.mine) {
                openTile(b, theme, x, y0, s, drawing.has(i) ? light(THEMES[theme].glow === 0xffffff ? UI.gold : THEMES[theme].glow, 0.15) : undefined);
                if (drawing.has(i)) { b.fillStyle(UI.gold, 0.9); b.fillRoundedRect(x + s * 0.08, y0 + s * 0.08, s * 0.84, s * 0.84, s * 0.2); }
                flag(b, cx, cy, s, drawing.has(i) ? 0xd02f72 : 0xe5322e);
            } else if (unveil(i) && c.mine && c.mark !== 'flag') { openTile(b, theme, x, y0, s, 0xd5dae4); mine(b, cx, cy, s); }
            else if (unveil(i) && !c.mine && c.mark === 'flag') { coveredTile(b, theme, x, y0, s); flag(b, cx, cy, s); cross(b, cx, cy, s); }
            else {
                const pressed = this.press && !this.press.panned && !this.press.done ? this.cellAt(this.press.x, this.press.y) : null;
                coveredTile(b, theme, x, y0, s, pressed && pressed.x === c.x && pressed.y === c.y ? 1 : 0);
                if (c.mark === 'flag') flag(b, cx, cy, s);
                else if (c.mark === 'question') question(b, cx, cy, s);
            }
            if (this.flash.t < 1 && this.flash.cells.includes(i)) {
                const mineHint = e.lastHint?.status === 'mine_proven';
                b.lineStyle(Math.max(2, s * 0.1), mineHint ? UI.red : UI.green, 0.5 + 0.5 * pulse); b.strokeRoundedRect(x + 1, y0 + 1, s - 2, s - 2, s * 0.2);
            }
        }
        // Sources of a hint: the numbers it reads, circled.
        const h = e.lastHint;
        if (h && h.status !== 'unknown' && this.flash.t < 1) for (const i of h.sources) {
            const c = cells[i]; if (!c) continue;
            const [x, y] = this.cellXY(c.x, c.y);
            b.lineStyle(Math.max(2, s * 0.09), UI.gold, 0.6 + 0.4 * pulse); b.strokeCircle(x + s / 2, y + s / 2, s * 0.48);
        }
        if (this.cursor.shown) { const [x, y] = this.cellXY(this.cursor.x, this.cursor.y); b.lineStyle(3, 0xffffff); b.strokeRoundedRect(x + 1, y + 1, s - 2, s - 2, s * 0.2); b.lineStyle(1.5, UI.ink); b.strokeRoundedRect(x + 3, y + 3, s - 6, s - 6, s * 0.16); }
        if (this.boom && boomAt && this.boom.t < 700) { const [x, y] = this.cellXY(boomAt.x, boomAt.y); blast(b, x + s / 2, y + s / 2, s, this.boom.t / 700); }
    }
}
